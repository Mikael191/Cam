import { clamp } from '../utils/math'
import type {
  HandLandmark,
  HandTrackerOptions,
  TrackerFrame,
  TrackedHand,
} from './handTracker'

export class MockHandTracker {
  private running = false
  private rafId = 0
  private lastInferAtMs = 0
  private inferenceTimes: number[] = []

  async start(
    _video: HTMLVideoElement,
    options: HandTrackerOptions,
    onFrame: (frame: TrackerFrame) => void,
    onError: (error: Error) => void,
  ): Promise<void> {
    try {
      await this.stop()
      this.running = true
      this.lastInferAtMs = 0
      this.inferenceTimes = []
      this.loop(options, onFrame)
    } catch (error) {
      const safe = error instanceof Error ? error : new Error('Falha no mock tracker.')
      onError(safe)
    }
  }

  async stop(): Promise<void> {
    this.running = false
    if (this.rafId) {
      cancelAnimationFrame(this.rafId)
      this.rafId = 0
    }
  }

  dispose(): void {
    // Sem recursos externos no mock.
  }

  getStream(): MediaStream | null {
    return null
  }

  private loop(
    options: HandTrackerOptions,
    onFrame: (frame: TrackerFrame) => void,
  ): void {
    const tick = () => {
      if (!this.running) {
        return
      }

      const nowMs = performance.now()
      const intervalMs = 1000 / Math.max(1, options.inferenceFps)
      if (nowMs - this.lastInferAtMs >= intervalMs) {
        this.lastInferAtMs = nowMs

        const hands = [createMockHand(nowMs)]
        this.recordInference(nowMs)

        onFrame({
          timestampMs: nowMs,
          inferenceFps: this.measureInferenceFps(nowMs),
          inferenceLatencyMs: 2,
          hands,
        })
      }

      this.rafId = requestAnimationFrame(tick)
    }

    this.rafId = requestAnimationFrame(tick)
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
}

const createMockHand = (nowMs: number): TrackedHand => {
  const t = nowMs * 0.001
  const centerX = 0.5 + Math.sin(t * 0.9) * 0.08
  const centerY = 0.56 + Math.cos(t * 0.7) * 0.04
  const pinchPhase = ((Math.sin(t * 1.8) + 1) * 0.5)
  const pinchOffset = 0.015 + pinchPhase * 0.045

  const landmarks: HandLandmark[] = [
    { x: centerX, y: centerY + 0.2, z: 0 },
    { x: centerX - 0.06, y: centerY + 0.13, z: 0 },
    { x: centerX - 0.085, y: centerY + 0.06, z: 0 },
    { x: centerX - 0.105, y: centerY + 0.005, z: 0 },
    { x: centerX - pinchOffset, y: centerY - 0.04, z: 0 },
    { x: centerX - 0.035, y: centerY + 0.06, z: 0 },
    { x: centerX - 0.03, y: centerY - 0.005, z: 0 },
    { x: centerX - 0.02, y: centerY - 0.07, z: 0 },
    { x: centerX + pinchOffset, y: centerY - 0.04, z: 0 },
    { x: centerX + 0.01, y: centerY + 0.05, z: 0 },
    { x: centerX + 0.015, y: centerY - 0.02, z: 0 },
    { x: centerX + 0.02, y: centerY - 0.09, z: 0 },
    { x: centerX + 0.048, y: centerY + 0.07, z: 0 },
    { x: centerX + 0.055, y: centerY + 0.01, z: 0 },
    { x: centerX + 0.06, y: centerY - 0.045, z: 0 },
    { x: centerX + 0.062, y: centerY - 0.09, z: 0 },
    { x: centerX + 0.078, y: centerY + 0.11, z: 0 },
    { x: centerX + 0.09, y: centerY + 0.055, z: 0 },
    { x: centerX + 0.098, y: centerY + 0.005, z: 0 },
    { x: centerX + 0.105, y: centerY - 0.04, z: 0 },
    { x: centerX + 0.112, y: centerY - 0.078, z: 0 },
  ].map((point) => ({
    x: clamp(point.x, 0.08, 0.92),
    y: clamp(point.y, 0.08, 0.92),
    z: point.z,
  }))

  const bbox = computeBoundingBox(landmarks)

  return {
    slotId: 0,
    handedness: 'Right',
    confidence: 0.95,
    staleMs: 0,
    lost: false,
    landmarks,
    rawLandmarks: landmarks,
    palm: { x: landmarks[0].x, y: landmarks[0].y },
    indexTip: { x: landmarks[8].x, y: landmarks[8].y },
    bbox,
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
