import { clamp } from '../utils/math'
import type {
  ElementPreset,
  HeldPower,
  Particle,
  ParticleSpawn,
  PowerElement,
  PowerProjectile,
  SpawnParticle,
} from './powerTypes'
import { earthPreset } from './presets/earth'
import { firePreset } from './presets/fire'
import { icePreset } from './presets/ice'
import { lightningPreset } from './presets/lightning'
import { waterPreset } from './presets/water'
import { windPreset } from './presets/wind'

const MAX_PROJECTILES = 50
const MAX_PARTICLES = 6000

const PRESETS: Record<PowerElement, ElementPreset> = {
  fire: firePreset,
  ice: icePreset,
  lightning: lightningPreset,
  water: waterPreset,
  wind: windPreset,
  earth: earthPreset,
}

export type PowerSummary = {
  holding: boolean
  charge: number
  projectileCount: number
}

export class PowerSystem {
  private selectedElement: PowerElement = 'fire'
  private heldPower: HeldPower | null = null
  private projectiles: PowerProjectile[] = []
  private particles: Particle[] = Array.from({ length: MAX_PARTICLES }, () => ({
    active: false,
    x: 0,
    y: 0,
    vx: 0,
    vy: 0,
    life: 0,
    maxLife: 1,
    size: 1,
    color: '#ffffff',
    alpha: 1,
    drag: 0.95,
    shape: 'circle',
    rotation: 0,
  }))
  private nextParticleIndex = 0
  private idSequence = 1

  getSelectedElement(): PowerElement {
    return this.selectedElement
  }

  setSelectedElement(element: PowerElement): void {
    this.selectedElement = element
  }

  hasHeldPower(): boolean {
    return Boolean(this.heldPower)
  }

  getSummary(): PowerSummary {
    return {
      holding: Boolean(this.heldPower),
      charge: this.heldPower?.charge ?? 0,
      projectileCount: this.projectiles.length,
    }
  }

  invokeAt(handLabel: 'Left' | 'Right', x: number, y: number, nowMs: number): void {
    if (this.heldPower) {
      return
    }
    this.heldPower = {
      id: this.idSequence += 1,
      element: this.selectedElement,
      handLabel,
      x,
      y,
      charge: 0,
      startedAtMs: nowMs,
    }
    const preset = PRESETS[this.selectedElement]
    for (let i = 0; i < 8; i += 1) {
      this.spawnParticle({
        x,
        y,
        vx: (Math.random() - 0.5) * 120,
        vy: (Math.random() - 0.5) * 120,
        life: 0.14 + Math.random() * 0.16,
        size: 1.5 + Math.random() * 2.8,
        color: preset.secondary,
        alpha: 0.7,
      })
    }
  }

  updateHeld(x: number, y: number, charge: number): void {
    if (!this.heldPower) {
      return
    }
    this.heldPower.x = x
    this.heldPower.y = y
    this.heldPower.charge = clamp(charge, 0, 1)
  }

  release(vx: number, vy: number): void {
    if (!this.heldPower) {
      return
    }
    if (this.projectiles.length >= MAX_PROJECTILES) {
      this.projectiles.shift()
    }
    const held = this.heldPower
    const preset = PRESETS[held.element]
    const chargeScale = 1 + held.charge * 1.5
    this.projectiles.push({
      id: held.id,
      element: held.element,
      x: held.x,
      y: held.y,
      vx: vx * chargeScale,
      vy: vy * chargeScale,
      radius: preset.baseRadius * (0.6 + held.charge * 0.9),
      charge: held.charge,
      life: 1.2 + held.charge * 1.2,
      maxLife: 1.2 + held.charge * 1.2,
      bounces: 0,
    })
    this.heldPower = null
  }

  cancelHeldPower(): void {
    if (!this.heldPower) {
      return
    }
    const preset = PRESETS[this.heldPower.element]
    for (let i = 0; i < 20; i += 1) {
      const angle = (Math.PI * 2 * i) / 20
      const speed = 45 + Math.random() * 90
      this.spawnParticle({
        x: this.heldPower.x,
        y: this.heldPower.y,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed,
        life: 0.12 + Math.random() * 0.18,
        size: 1.8 + Math.random() * 2.2,
        color: preset.primary,
        alpha: 0.6,
      })
    }
    this.heldPower = null
  }

  dissipateAll(): void {
    this.heldPower = null
    this.projectiles = []
    for (const particle of this.particles) {
      particle.active = false
    }
  }

  update(dt: number): void {
    for (let i = this.projectiles.length - 1; i >= 0; i -= 1) {
      const projectile = this.projectiles[i]
      projectile.x += projectile.vx * dt
      projectile.y += projectile.vy * dt
      projectile.vx *= 0.991
      projectile.vy *= 0.991
      projectile.life -= dt

      const preset = PRESETS[projectile.element]
      preset.emitTrail(projectile, this.spawnParticle, performance.now())

      if (projectile.x < 0 || projectile.x > 1 || projectile.y < 0 || projectile.y > 1) {
        if (projectile.bounces < 1) {
          projectile.bounces += 1
          projectile.x = clamp(projectile.x, 0, 1)
          projectile.y = clamp(projectile.y, 0, 1)
          if (projectile.x <= 0 || projectile.x >= 1) {
            projectile.vx *= -0.62
          }
          if (projectile.y <= 0 || projectile.y >= 1) {
            projectile.vy *= -0.62
          }
          projectile.life *= 0.7
        } else {
          preset.emitImpact(projectile, this.spawnParticle)
          this.projectiles.splice(i, 1)
          continue
        }
      }

      if (projectile.life <= 0) {
        preset.emitImpact(projectile, this.spawnParticle)
        this.projectiles.splice(i, 1)
      }
    }

    for (const particle of this.particles) {
      if (!particle.active) {
        continue
      }
      particle.life -= dt
      if (particle.life <= 0) {
        particle.active = false
        continue
      }
      particle.x += particle.vx * dt
      particle.y += particle.vy * dt
      particle.vx *= particle.drag
      particle.vy *= particle.drag
    }
  }

  render(ctx: CanvasRenderingContext2D, width: number, height: number, nowMs: number): void {
    ctx.clearRect(0, 0, width, height)
    for (const projectile of this.projectiles) {
      const preset = PRESETS[projectile.element]
      preset.drawProjectile(ctx, projectile, nowMs, width, height)
    }
    for (const particle of this.particles) {
      if (!particle.active) {
        continue
      }
      const alpha = (particle.life / particle.maxLife) * particle.alpha
      if (alpha <= 0.01) {
        continue
      }
      const px = particle.x * width
      const py = particle.y * height
      ctx.save()
      ctx.globalAlpha = alpha
      ctx.fillStyle = particle.color
      ctx.strokeStyle = particle.color
      ctx.translate(px, py)
      ctx.rotate(particle.rotation)
      if (particle.shape === 'line') {
        ctx.lineWidth = 1.2
        ctx.beginPath()
        ctx.moveTo(-particle.size * 1.6, 0)
        ctx.lineTo(particle.size * 1.6, 0)
        ctx.stroke()
      } else if (particle.shape === 'square') {
        const s = particle.size * 0.9
        ctx.fillRect(-s, -s, s * 2, s * 2)
      } else {
        ctx.beginPath()
        ctx.arc(0, 0, particle.size, 0, Math.PI * 2)
        ctx.fill()
      }
      ctx.restore()
    }
    if (this.heldPower) {
      const preset = PRESETS[this.heldPower.element]
      preset.drawHeld(ctx, this.heldPower, nowMs, width, height)
    }
  }

  private spawnParticle: SpawnParticle = (entry: ParticleSpawn) => {
    const particle = this.particles[this.nextParticleIndex]
    this.nextParticleIndex = (this.nextParticleIndex + 1) % this.particles.length
    particle.active = true
    particle.x = entry.x
    particle.y = entry.y
    particle.vx = entry.vx
    particle.vy = entry.vy
    particle.life = entry.life
    particle.maxLife = entry.life
    particle.size = entry.size
    particle.color = entry.color
    particle.alpha = entry.alpha ?? 0.8
    particle.drag = entry.drag ?? 0.93
    particle.shape = entry.shape ?? 'circle'
    particle.rotation = entry.rotation ?? 0
  }
}
