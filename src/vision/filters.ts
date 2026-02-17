import { clamp, distance2D } from '../utils/math'

export type Point3 = { x: number; y: number; z: number }

class LowPassFilter {
  private initialized = false
  private value = 0

  filter(next: number, alpha: number): number {
    if (!this.initialized) {
      this.initialized = true
      this.value = next
      return next
    }
    this.value = alpha * next + (1 - alpha) * this.value
    return this.value
  }
}

export class OneEuroFilter {
  private readonly minimumCutoff: number
  private readonly beta: number
  private readonly derivativeCutoff: number
  private readonly valueFilter = new LowPassFilter()
  private readonly derivativeFilter = new LowPassFilter()
  private previousValue = 0
  private initialized = false

  constructor(minimumCutoff = 1.25, beta = 0.12, derivativeCutoff = 1) {
    this.minimumCutoff = minimumCutoff
    this.beta = beta
    this.derivativeCutoff = derivativeCutoff
  }

  reset(): void {
    this.initialized = false
    this.previousValue = 0
  }

  filter(nextValue: number, dt: number): number {
    const safeDt = Math.max(dt, 1 / 120)
    if (!this.initialized) {
      this.initialized = true
      this.previousValue = nextValue
      return this.valueFilter.filter(nextValue, 1)
    }

    const derivative = (nextValue - this.previousValue) / safeDt
    this.previousValue = nextValue

    const filteredDerivative = this.derivativeFilter.filter(
      derivative,
      alphaFor(safeDt, this.derivativeCutoff),
    )
    const cutoff = this.minimumCutoff + this.beta * Math.abs(filteredDerivative)
    return this.valueFilter.filter(nextValue, alphaFor(safeDt, cutoff))
  }
}

const alphaFor = (dt: number, cutoff: number): number => {
  const tau = 1 / (2 * Math.PI * cutoff)
  return 1 / (1 + tau / dt)
}

export class OneEuroPointFilter {
  private readonly fx = new OneEuroFilter()
  private readonly fy = new OneEuroFilter()
  private readonly fz = new OneEuroFilter()
  private previous: Point3 | null = null

  reset(): void {
    this.fx.reset()
    this.fy.reset()
    this.fz.reset()
    this.previous = null
  }

  filter(next: Point3, dt: number, maxJump = 0.22): Point3 {
    let clamped = next
    if (this.previous) {
      const jump = distance2D(this.previous, next)
      if (jump > maxJump) {
        const scale = maxJump / jump
        clamped = {
          x: this.previous.x + (next.x - this.previous.x) * scale,
          y: this.previous.y + (next.y - this.previous.y) * scale,
          z: this.previous.z + (next.z - this.previous.z) * scale,
        }
      }
    }

    const filtered = {
      x: this.fx.filter(clamped.x, dt),
      y: this.fy.filter(clamped.y, dt),
      z: this.fz.filter(clamped.z, dt),
    }
    filtered.x = clamp(filtered.x, -0.5, 1.5)
    filtered.y = clamp(filtered.y, -0.5, 1.5)
    filtered.z = clamp(filtered.z, -1.5, 1.5)
    this.previous = filtered
    return filtered
  }
}

export class LandmarkFilterSet {
  private readonly filters: OneEuroPointFilter[] = Array.from({ length: 21 }, () => new OneEuroPointFilter())

  reset(): void {
    for (const filter of this.filters) {
      filter.reset()
    }
  }

  filterLandmarks(landmarks: Point3[], dt: number, outlierJump = 0.22): Point3[] {
    const next: Point3[] = []
    for (let i = 0; i < 21; i += 1) {
      const point = landmarks[i]
      const safePoint = point ?? landmarks[Math.max(0, i - 1)] ?? { x: 0, y: 0, z: 0 }
      next.push(this.filters[i].filter(safePoint, dt, outlierJump))
    }
    return next
  }
}
