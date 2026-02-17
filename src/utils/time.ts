import { clamp } from './math'

export class FpsCounter {
  private startedAtMs = 0
  private frames = 0
  private value = 0

  update(nowMs: number): number {
    if (!this.startedAtMs) {
      this.startedAtMs = nowMs
      this.frames = 0
      return this.value
    }
    this.frames += 1
    const elapsed = nowMs - this.startedAtMs
    if (elapsed < 500) {
      return this.value
    }
    this.value = (this.frames * 1000) / elapsed
    this.frames = 0
    this.startedAtMs = nowMs
    return this.value
  }
}

export const deltaSeconds = (previousMs: number, nowMs: number): number =>
  clamp((nowMs - previousMs) / 1000, 0.001, 0.08)
