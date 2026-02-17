import { clamp, lerp } from '../utils/math'

export type Vec2 = {
  x: number
  y: number
}

export type Vec3 = {
  x: number
  y: number
  z: number
}

export class EmaSmoother2D {
  private value: Vec2 | null = null
  private readonly alpha: number

  constructor(alpha: number) {
    this.alpha = alpha
  }

  reset(): void {
    this.value = null
  }

  update(next: Vec2): Vec2 {
    const safeAlpha = clamp(this.alpha, 0.01, 1)
    if (!this.value) {
      this.value = next
      return this.value
    }
    this.value = {
      x: lerp(this.value.x, next.x, safeAlpha),
      y: lerp(this.value.y, next.y, safeAlpha),
    }
    return this.value
  }
}

export class EmaSmoother3D {
  private value: Vec3 | null = null
  private readonly alpha: number

  constructor(alpha: number) {
    this.alpha = alpha
  }

  reset(): void {
    this.value = null
  }

  update(next: Vec3): Vec3 {
    const safeAlpha = clamp(this.alpha, 0.01, 1)
    if (!this.value) {
      this.value = next
      return this.value
    }
    this.value = {
      x: lerp(this.value.x, next.x, safeAlpha),
      y: lerp(this.value.y, next.y, safeAlpha),
      z: lerp(this.value.z, next.z, safeAlpha),
    }
    return this.value
  }
}
