import { FilesetResolver, HandLandmarker } from '@mediapipe/tasks-vision'
import type { Landmark } from './gestures'

const DEFAULT_WASM_ROOT = 'https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@0.10.32/wasm'
const DEFAULT_MODEL_ASSET =
  'https://storage.googleapis.com/mediapipe-models/hand_landmarker/hand_landmarker/float16/1/hand_landmarker.task'

const HAND_CONNECTIONS: Array<[number, number]> = [
  [0, 1],
  [1, 2],
  [2, 3],
  [3, 4],
  [0, 5],
  [5, 6],
  [6, 7],
  [7, 8],
  [5, 9],
  [9, 10],
  [10, 11],
  [11, 12],
  [9, 13],
  [13, 14],
  [14, 15],
  [15, 16],
  [13, 17],
  [17, 18],
  [18, 19],
  [19, 20],
  [0, 17],
]

export type TrackedHand = {
  landmarks: Landmark[]
  handedness: 'Left' | 'Right'
  score: number
}

export type TrackerFrame = {
  timestampMs: number
  inferenceFps: number
  hands: TrackedHand[]
}

export type TrackerOptions = {
  webcamWidth: number
  webcamHeight: number
  inferenceFps: number
  maxHands?: number
  modelAssetPath?: string
  wasmRoot?: string
}

export class HandTracker {
  private handLandmarker: HandLandmarker | null = null
  private stream: MediaStream | null = null
  private running = false
  private rafId = 0
  private lastInferenceMs = 0
  private fpsWindowStartMs = 0
  private inferCounter = 0
  private measuredInferenceFps = 0

  async start(
    video: HTMLVideoElement,
    onFrame: (frame: TrackerFrame) => void,
    onError: (error: Error) => void,
    options: TrackerOptions,
  ): Promise<void> {
    await this.stop()
    this.running = true
    this.lastInferenceMs = 0
    this.fpsWindowStartMs = performance.now()
    this.inferCounter = 0
    this.measuredInferenceFps = 0

    try {
      await this.ensureLandmarker(options)
      this.stream = await navigator.mediaDevices.getUserMedia({
        video: {
          facingMode: 'user',
          width: { ideal: options.webcamWidth },
          height: { ideal: options.webcamHeight },
        },
        audio: false,
      })

      video.srcObject = this.stream
      video.muted = true
      video.playsInline = true
      await video.play()
      this.loop(video, onFrame, onError, options)
    } catch (error) {
      const safeError =
        error instanceof Error ? error : new Error('Falha ao iniciar webcam/hand tracker.')
      onError(safeError)
      await this.stop()
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
  }

  dispose(): void {
    if (this.handLandmarker) {
      this.handLandmarker.close()
      this.handLandmarker = null
    }
  }

  private async ensureLandmarker(options: TrackerOptions): Promise<void> {
    if (this.handLandmarker) {
      return
    }
    const vision = await FilesetResolver.forVisionTasks(options.wasmRoot ?? DEFAULT_WASM_ROOT)
    this.handLandmarker = await HandLandmarker.createFromOptions(vision, {
      baseOptions: {
        modelAssetPath: options.modelAssetPath ?? DEFAULT_MODEL_ASSET,
        delegate: 'GPU',
      },
      numHands: options.maxHands ?? 2,
      runningMode: 'VIDEO',
      minTrackingConfidence: 0.5,
      minHandDetectionConfidence: 0.5,
      minHandPresenceConfidence: 0.4,
    })
  }

  private loop(
    video: HTMLVideoElement,
    onFrame: (frame: TrackerFrame) => void,
    onError: (error: Error) => void,
    options: TrackerOptions,
  ): void {
    const tick = () => {
      if (!this.running || !this.handLandmarker) {
        return
      }

      const nowMs = performance.now()
      const intervalMs = 1000 / Math.max(1, options.inferenceFps)
      if (nowMs - this.lastInferenceMs >= intervalMs) {
        this.lastInferenceMs = nowMs
        try {
          const result = this.handLandmarker.detectForVideo(video, nowMs)
          const hands = this.mapHands(result)
          this.inferCounter += 1
          const elapsed = nowMs - this.fpsWindowStartMs
          if (elapsed >= 1000) {
            this.measuredInferenceFps = (this.inferCounter * 1000) / elapsed
            this.fpsWindowStartMs = nowMs
            this.inferCounter = 0
          }
          onFrame({
            timestampMs: nowMs,
            inferenceFps: this.measuredInferenceFps,
            hands,
          })
        } catch (error) {
          const safeError =
            error instanceof Error ? error : new Error('Falha na inferencia de maos.')
          onError(safeError)
        }
      }

      this.rafId = requestAnimationFrame(tick)
    }

    this.rafId = requestAnimationFrame(tick)
  }

  private mapHands(result: {
    landmarks: Array<Array<{ x: number; y: number; z: number }>>
    handednesses: Array<Array<{ categoryName: string; score: number }>>
  }): TrackedHand[] {
    const hands: TrackedHand[] = []
    for (let i = 0; i < result.landmarks.length; i += 1) {
      const landmarks = result.landmarks[i]
      const handedness = result.handednesses[i]?.[0]
      hands.push({
        landmarks: landmarks.map((landmark) => ({
          x: landmark.x,
          y: landmark.y,
          z: landmark.z,
        })),
        handedness: handedness?.categoryName === 'Left' ? 'Left' : 'Right',
        score: handedness?.score ?? 0.5,
      })
    }
    return hands
  }
}

export const drawHandDebug = (
  canvas: HTMLCanvasElement,
  hands: TrackedHand[],
  mirrorInput: boolean,
): void => {
  const ctx = canvas.getContext('2d')
  if (!ctx) {
    return
  }

  const width = canvas.width
  const height = canvas.height
  ctx.clearRect(0, 0, width, height)
  ctx.lineWidth = 2
  ctx.strokeStyle = '#5ec2ff'
  ctx.fillStyle = '#7fffd4'

  for (const hand of hands) {
    for (const [startIndex, endIndex] of HAND_CONNECTIONS) {
      const a = hand.landmarks[startIndex]
      const b = hand.landmarks[endIndex]
      const ax = (mirrorInput ? 1 - a.x : a.x) * width
      const ay = a.y * height
      const bx = (mirrorInput ? 1 - b.x : b.x) * width
      const by = b.y * height
      ctx.beginPath()
      ctx.moveTo(ax, ay)
      ctx.lineTo(bx, by)
      ctx.stroke()
    }

    for (const point of hand.landmarks) {
      const x = (mirrorInput ? 1 - point.x : point.x) * width
      const y = point.y * height
      ctx.beginPath()
      ctx.arc(x, y, 2.8, 0, Math.PI * 2)
      ctx.fill()
    }
  }
}
