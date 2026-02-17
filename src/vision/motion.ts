import { clamp } from '../utils/math'
import type { ThrowSample } from '../powers/powerTypes'

type VelocityEstimate = {
  vx: number
  vy: number
}

export class ThrowVelocityTracker {
  private readonly samples: ThrowSample[] = []
  private readonly maxSamples: number
  private readonly timeWindowMs: number

  constructor(maxSamples = 14, timeWindowMs = 280) {
    this.maxSamples = maxSamples
    this.timeWindowMs = timeWindowMs
  }

  reset(): void {
    this.samples.length = 0
  }

  push(x: number, y: number, timestampMs: number): void {
    this.samples.push({
      point: { x, y },
      timestampMs,
    })
    if (this.samples.length > this.maxSamples) {
      this.samples.shift()
    }
    this.prune(timestampMs)
  }

  estimate(nowMs: number, speedScale = 1.35): VelocityEstimate {
    this.prune(nowMs)
    if (this.samples.length < 2) {
      return { vx: 0, vy: -0.36 }
    }

    const regression = weightedLinearVelocity(this.samples)
    const instant = instantVelocity(this.samples)

    let vx = (regression.vx * 0.68 + instant.vx * 0.32) * speedScale
    let vy = (regression.vy * 0.68 + instant.vy * 0.32) * speedScale

    const speed = Math.hypot(vx, vy)
    const maxSpeed = 3.2
    if (speed > maxSpeed) {
      const k = maxSpeed / speed
      vx *= k
      vy *= k
    }
    if (speed < 0.25) {
      vy -= 0.33
    }
    return {
      vx: clamp(vx, -3.2, 3.2),
      vy: clamp(vy, -3.2, 3.2),
    }
  }

  private prune(nowMs: number): void {
    const cutoff = nowMs - this.timeWindowMs
    while (this.samples.length > 2 && this.samples[0].timestampMs < cutoff) {
      this.samples.shift()
    }
  }
}

const weightedLinearVelocity = (samples: ThrowSample[]): VelocityEstimate => {
  const firstTime = samples[0].timestampMs
  const lastTime = samples[samples.length - 1].timestampMs
  const span = Math.max(1, lastTime - firstTime)

  let sumW = 0
  let sumWT = 0
  let sumWTT = 0
  let sumWX = 0
  let sumWXT = 0
  let sumWY = 0
  let sumWYT = 0

  for (const sample of samples) {
    const t = (sample.timestampMs - firstTime) / 1000
    const age = (sample.timestampMs - firstTime) / span
    const w = 0.35 + age * age
    sumW += w
    sumWT += w * t
    sumWTT += w * t * t
    sumWX += w * sample.point.x
    sumWXT += w * sample.point.x * t
    sumWY += w * sample.point.y
    sumWYT += w * sample.point.y * t
  }

  const denominator = sumW * sumWTT - sumWT * sumWT
  if (Math.abs(denominator) < 1e-6) {
    return instantVelocity(samples)
  }

  return {
    vx: (sumW * sumWXT - sumWT * sumWX) / denominator,
    vy: (sumW * sumWYT - sumWT * sumWY) / denominator,
  }
}

const instantVelocity = (samples: ThrowSample[]): VelocityEstimate => {
  const last = samples[samples.length - 1]
  const prev = samples[samples.length - 2]
  const dt = Math.max(0.016, (last.timestampMs - prev.timestampMs) / 1000)
  return {
    vx: (last.point.x - prev.point.x) / dt,
    vy: (last.point.y - prev.point.y) / dt,
  }
}
