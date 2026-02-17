import type { Vec2 } from '../utils/math'

export type PowerElement = 'fire' | 'ice' | 'lightning' | 'water' | 'wind' | 'earth'

export type HeldPower = {
  id: number
  element: PowerElement
  handLabel: 'Left' | 'Right'
  x: number
  y: number
  charge: number
  startedAtMs: number
}

export type PowerProjectile = {
  id: number
  element: PowerElement
  x: number
  y: number
  vx: number
  vy: number
  radius: number
  charge: number
  life: number
  maxLife: number
  bounces: number
}

export type ParticleShape = 'circle' | 'square' | 'line'

export type Particle = {
  active: boolean
  x: number
  y: number
  vx: number
  vy: number
  life: number
  maxLife: number
  size: number
  color: string
  alpha: number
  drag: number
  shape: ParticleShape
  rotation: number
}

export type ParticleSpawn = {
  x: number
  y: number
  vx: number
  vy: number
  life: number
  size: number
  color: string
  alpha?: number
  drag?: number
  shape?: ParticleShape
  rotation?: number
}

export type SpawnParticle = (entry: ParticleSpawn) => void

export type ElementPreset = {
  id: PowerElement
  label: string
  primary: string
  secondary: string
  glow: string
  baseRadius: number
  drawHeld: (
    ctx: CanvasRenderingContext2D,
    power: HeldPower,
    nowMs: number,
    width: number,
    height: number,
  ) => void
  drawProjectile: (
    ctx: CanvasRenderingContext2D,
    projectile: PowerProjectile,
    nowMs: number,
    width: number,
    height: number,
  ) => void
  emitTrail: (projectile: PowerProjectile, spawn: SpawnParticle, nowMs: number) => void
  emitImpact: (projectile: PowerProjectile, spawn: SpawnParticle) => void
}

export type ThrowSample = {
  point: Vec2
  timestampMs: number
}
