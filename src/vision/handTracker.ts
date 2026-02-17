import { FilesetResolver, HandLandmarker } from '@mediapipe/tasks-vision'
import { clamp, distance2D, median } from '../utils/math'
import { LandmarkFilterSet } from './filters'
import { HAND_CONNECTIONS } from './handGeometry'

const DEFAULT_WASM_ROOT = 'https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@0.10.32/wasm'
const DEFAULT_MODEL_ASSET =
  'https://storage.googleapis.com/mediapipe-models/hand_landmarker/hand_landmarker/float16/1/hand_landmarker.task'

export { HAND_CONNECTIONS }

export type HandednessLabel = 'Left' | 'Right'

export type HandLandmark = {
  x: number
  y: number
  z: number
}

export type TrackedHand = {
  slotId: 0 | 1
  handedness: HandednessLabel
  confidence: number
  staleMs: number
  lost: boolean
  landmarks: HandLandmark[]
  rawLandmarks: HandLandmark[]
  palm: { x: number; y: number }
  indexTip: { x: number; y: number }
  bbox: { x: number; y: number; width: number; height: number }
}

export type TrackerFrame = {
  timestampMs: number
  inferenceFps: number
  inferenceLatencyMs: number
  hands: TrackedHand[]
}

export type HandTrackerOptions = {
  webcamWidth: number
  webcamHeight: number
  inferenceFps: number
  maxHands: number
  minHandDetectionConfidence: number
  minHandPresenceConfidence: number
  minTrackingConfidence: number
  delegate: 'GPU' | 'CPU'
  hysteresisMs: number
}

type SlotState = {
  id: 0 | 1
  filters: LandmarkFilterSet
  lastSeenAtMs: number
  lastPalm: { x: number; y: number } | null
  lastRawPalm: { x: number; y: number } | null
  smoothed: HandLandmark[] | null
  raw: HandLandmark[] | null
  scoreHistory: number[]
  handednessVotes: HandednessLabel[]
  stableHandedness: HandednessLabel
}

type Detection = {
  landmarks: HandLandmark[]
  handedness: HandednessLabel
  score: number
}

const createSlot = (id: 0 | 1): SlotState => ({
  id,
  filters: new LandmarkFilterSet(),
  lastSeenAtMs: 0,
  lastPalm: null,
  lastRawPalm: null,
  smoothed: null,
  raw: null,
  scoreHistory: [],
  handednessVotes: [],
  stableHandedness: id === 0 ? 'Right' : 'Left',
})

export class HandTracker {
  private landmarker: HandLandmarker | null = null
  private stream: MediaStream | null = null
  private running = false
  private rafId = 0
  private lastInferAtMs = 0
  private previousFrameAtMs = 0
  private readonly slots: [SlotState, SlotState] = [createSlot(0), createSlot(1)]
  private inferenceTimes: number[] = []

  async start(
    video: HTMLVideoElement,
    options: HandTrackerOptions,
    onFrame: (frame: TrackerFrame) => void,
    onError: (error: Error) => void,
  ): Promise<void> {
    await this.stop()
    if (this.landmarker) {
      this.landmarker.close()
      this.landmarker = null
    }
    this.running = true
    this.lastInferAtMs = 0
    this.previousFrameAtMs = 0
    this.inferenceTimes = []
    this.resetSlots()

    try {
      await this.ensureLandmarker(options)
      this.stream = await navigator.mediaDevices.getUserMedia({
        video: {
          facingMode: 'user',
          width: { ideal: options.webcamWidth },
          height: { ideal: options.webcamHeight },
          frameRate: { ideal: 30, max: 60 },
        },
        audio: false,
      })

      video.srcObject = this.stream
      video.playsInline = true
      video.muted = true
      await video.play()

      this.loop(video, options, onFrame, onError)
    } catch (error) {
      const safe = error instanceof Error ? error : new Error('Nao foi possivel iniciar camera.')
      onError(safe)
      await this.stop()
      throw safe
    }
  }

  async stop(): Promise<void> {
    this.running = false
    if (this.rafId) {
      cancelAnimationFrame(this.rafId)
      this.rafId = 0
    }
    if (this.stream) {
      for (const track of this.stream.getTracks()) {
        track.stop()
      }
      this.stream = null
    }
    this.resetSlots()
  }

  dispose(): void {
    if (this.landmarker) {
      this.landmarker.close()
      this.landmarker = null
    }
  }

  getStream(): MediaStream | null {
    return this.stream
  }

  private async ensureLandmarker(options: HandTrackerOptions): Promise<void> {
    if (this.landmarker) {
      return
    }
    const vision = await FilesetResolver.forVisionTasks(DEFAULT_WASM_ROOT)
    this.landmarker = await HandLandmarker.createFromOptions(vision, {
      baseOptions: {
        modelAssetPath: DEFAULT_MODEL_ASSET,
        delegate: options.delegate,
      },
      runningMode: 'VIDEO',
      numHands: options.maxHands,
      minHandDetectionConfidence: options.minHandDetectionConfidence,
      minHandPresenceConfidence: options.minHandPresenceConfidence,
      minTrackingConfidence: options.minTrackingConfidence,
    })
  }

  private loop(
    video: HTMLVideoElement,
    options: HandTrackerOptions,
    onFrame: (frame: TrackerFrame) => void,
    onError: (error: Error) => void,
  ): void {
    const tick = () => {
      if (!this.running || !this.landmarker) {
        return
      }
      const nowMs = performance.now()
      const intervalMs = 1000 / Math.max(1, options.inferenceFps)
      if (nowMs - this.lastInferAtMs >= intervalMs) {
        this.lastInferAtMs = nowMs
        const startedAt = performance.now()
        try {
          const raw = this.landmarker.detectForVideo(video, nowMs)
          const detected: Detection[] = raw.landmarks.map((entry, index) => ({
            landmarks: entry.map((point) => ({ x: point.x, y: point.y, z: point.z })),
            handedness: raw.handednesses[index]?.[0]?.categoryName === 'Left' ? 'Left' : 'Right',
            score: raw.handednesses[index]?.[0]?.score ?? 0.5,
          }))
          const dt = this.previousFrameAtMs
            ? clamp((nowMs - this.previousFrameAtMs) / 1000, 1 / 120, 1 / 12)
            : 1 / options.inferenceFps
          this.previousFrameAtMs = nowMs
          const hands = this.updateSlots(detected, nowMs, options.hysteresisMs, dt)
          const latency = performance.now() - startedAt
          this.recordInference(nowMs)
          onFrame({
            timestampMs: nowMs,
            inferenceFps: this.measureInferenceFps(nowMs),
            inferenceLatencyMs: latency,
            hands,
          })
        } catch (error) {
          const safe = error instanceof Error ? error : new Error('Falha na inferencia de maos.')
          onError(safe)
        }
      }
      this.rafId = requestAnimationFrame(tick)
    }
    this.rafId = requestAnimationFrame(tick)
  }

  private updateSlots(
    detections: Detection[],
    nowMs: number,
    hysteresisMs: number,
    dt: number,
  ): TrackedHand[] {
    const assignments = this.assignDetections(detections)

    for (const slot of this.slots) {
      const assignedIndex = assignments[slot.id]
      if (assignedIndex == null) {
        continue
      }
      const detection = detections[assignedIndex]
      const rawPalm = detection.landmarks[0]
      const palmSpeed = slot.lastRawPalm
        ? distance2D(slot.lastRawPalm, rawPalm) / Math.max(dt, 1 / 120)
        : 0
      slot.lastRawPalm = { x: rawPalm.x, y: rawPalm.y }

      const handScale = Math.max(distance2D(detection.landmarks[0], detection.landmarks[9]), 0.035)
      const jump = slot.lastPalm ? distance2D(slot.lastPalm, rawPalm) : 0
      const jumpRatio = handScale > 0 ? jump / handScale : 0
      const likelyOutlier = Boolean(
        slot.lastPalm &&
          (jumpRatio > 4.2 || jump > 0.35) &&
          detection.score < 0.84,
      )
      if (likelyOutlier) {
        pushFixed(slot.scoreHistory, Math.max(0.2, detection.score * 0.82), 8)
        continue
      }

      const adaptiveJump = clamp(
        0.12 + palmSpeed * 0.017 + (1 - detection.score) * 0.1,
        0.1,
        0.31,
      )

      slot.raw = detection.landmarks
      slot.smoothed = slot.filters.filterLandmarks(detection.landmarks, dt, adaptiveJump)
      slot.lastSeenAtMs = nowMs
      slot.lastPalm = slot.smoothed[0]
        ? { x: slot.smoothed[0].x, y: slot.smoothed[0].y }
        : slot.lastPalm
      pushFixed(slot.scoreHistory, detection.score, 8)
      pushFixed(slot.handednessVotes, detection.handedness, 10)
      slot.stableHandedness = majorityLabel(slot.handednessVotes, slot.stableHandedness)
    }

    const output: TrackedHand[] = []
    for (const slot of this.slots) {
      const staleMs = nowMs - slot.lastSeenAtMs
      if (!slot.smoothed || !slot.raw) {
        continue
      }
      if (staleMs > hysteresisMs) {
        continue
      }
      const bbox = computeBoundingBox(slot.smoothed)
      const freshness = clamp(1 - staleMs / Math.max(120, hysteresisMs), 0.5, 1)
      const confidence = clamp(median(slot.scoreHistory) * freshness, 0, 1)
      output.push({
        slotId: slot.id,
        handedness: slot.stableHandedness,
        confidence,
        staleMs,
        lost: staleMs > 42,
        landmarks: slot.smoothed,
        rawLandmarks: slot.raw,
        palm: { x: slot.smoothed[0].x, y: slot.smoothed[0].y },
        indexTip: { x: slot.smoothed[8].x, y: slot.smoothed[8].y },
        bbox,
      })
    }
    return output.sort((a, b) => a.slotId - b.slotId)
  }

  private assignDetections(detections: Detection[]): Array<number | null> {
    const assignments: Array<number | null> = [null, null]
    if (detections.length === 0) {
      return assignments
    }
    if (detections.length === 1) {
      if (!this.slots[0].lastPalm && this.slots[1].lastPalm) {
        assignments[1] = 0
      } else if (this.slots[0].lastPalm && this.slots[1].lastPalm) {
        const p0 = detections[0].landmarks[0]
        const d0 = distance2D(this.slots[0].lastPalm, p0)
        const d1 = distance2D(this.slots[1].lastPalm, p0)
        assignments[d0 <= d1 ? 0 : 1] = 0
      } else {
        assignments[0] = 0
      }
      return assignments
    }

    const palms = detections.map((entry) => entry.landmarks[0])
    const slotsPalm = this.slots.map((slot) => slot.lastPalm)
    const cost00 = slotsPalm[0] ? distance2D(slotsPalm[0], palms[0]) : 0.4
    const cost01 = slotsPalm[0] ? distance2D(slotsPalm[0], palms[1]) : 0.4
    const cost10 = slotsPalm[1] ? distance2D(slotsPalm[1], palms[0]) : 0.4
    const cost11 = slotsPalm[1] ? distance2D(slotsPalm[1], palms[1]) : 0.4
    if (cost00 + cost11 <= cost01 + cost10) {
      assignments[0] = 0
      assignments[1] = 1
    } else {
      assignments[0] = 1
      assignments[1] = 0
    }
    return assignments
  }

  private recordInference(nowMs: number): void {
    this.inferenceTimes.push(nowMs)
    const cutoff = nowMs - 1000
    while (this.inferenceTimes.length > 2 && this.inferenceTimes[0] < cutoff) {
      this.inferenceTimes.shift()
    }
  }

  private measureInferenceFps(nowMs: number): number {
    const cutoff = nowMs - 1000
    let count = 0
    for (let i = this.inferenceTimes.length - 1; i >= 0; i -= 1) {
      if (this.inferenceTimes[i] >= cutoff) {
        count += 1
      } else {
        break
      }
    }
    return count
  }

  private resetSlots(): void {
    for (const slot of this.slots) {
      slot.filters.reset()
      slot.lastSeenAtMs = 0
      slot.lastPalm = null
      slot.lastRawPalm = null
      slot.raw = null
      slot.smoothed = null
      slot.scoreHistory = []
      slot.handednessVotes = []
      slot.stableHandedness = slot.id === 0 ? 'Right' : 'Left'
    }
  }
}

const computeBoundingBox = (
  landmarks: HandLandmark[],
): { x: number; y: number; width: number; height: number } => {
  let minX = Infinity
  let maxX = -Infinity
  let minY = Infinity
  let maxY = -Infinity
  for (const point of landmarks) {
    minX = Math.min(minX, point.x)
    maxX = Math.max(maxX, point.x)
    minY = Math.min(minY, point.y)
    maxY = Math.max(maxY, point.y)
  }
  return {
    x: minX,
    y: minY,
    width: maxX - minX,
    height: maxY - minY,
  }
}

const majorityLabel = (
  values: HandednessLabel[],
  fallback: HandednessLabel,
): HandednessLabel => {
  if (values.length === 0) {
    return fallback
  }
  let leftCount = 0
  let rightCount = 0
  for (const value of values) {
    if (value === 'Left') {
      leftCount += 1
    } else {
      rightCount += 1
    }
  }
  if (leftCount === rightCount) {
    return fallback
  }
  return leftCount > rightCount ? 'Left' : 'Right'
}

const pushFixed = <T>(array: T[], value: T, max: number): void => {
  array.push(value)
  if (array.length > max) {
    array.shift()
  }
}
