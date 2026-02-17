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
const MAX_RINGS = 220
const PARTICLE_VELOCITY_SCALE = 1 / 920

const PRESETS: Record<PowerElement, ElementPreset> = {
  fire: firePreset,
  ice: icePreset,
  lightning: lightningPreset,
  water: waterPreset,
  wind: windPreset,
  earth: earthPreset,
}

type RingEffect = {
  active: boolean
  x: number
  y: number
  radius: number
  growth: number
  life: number
  maxLife: number
  color: string
  alpha: number
  lineWidth: number
  fillAlpha: number
  blend: GlobalCompositeOperation
}

type RingSpawn = {
  x: number
  y: number
  radius: number
  growth: number
  life: number
  color: string
  alpha: number
  lineWidth: number
  fillAlpha?: number
  blend?: GlobalCompositeOperation
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
    spin: 0,
    sizeDecay: 0,
    gravity: 0,
    blend: 'source-over',
  }))
  private rings: RingEffect[] = Array.from({ length: MAX_RINGS }, () => ({
    active: false,
    x: 0,
    y: 0,
    radius: 0,
    growth: 0,
    life: 0,
    maxLife: 1,
    color: '#ffffff',
    alpha: 1,
    lineWidth: 1.2,
    fillAlpha: 0,
    blend: 'lighter',
  }))
  private nextParticleIndex = 0
  private nextRingIndex = 0
  private idSequence = 1
  private heldEmissionAccumulator = 0

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
      id: this.idSequence,
      element: this.selectedElement,
      handLabel,
      x,
      y,
      charge: 0,
      startedAtMs: nowMs,
    }
    this.idSequence += 1

    const preset = PRESETS[this.selectedElement]
    preset.emitCast?.(this.heldPower, this.spawnParticle)
    this.spawnRing({
      x,
      y,
      radius: 0.02,
      growth: 0.34,
      life: 0.28,
      color: preset.secondary,
      alpha: 0.76,
      lineWidth: 2.4,
      fillAlpha: 0.2,
      blend: 'lighter',
    })
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
    const projectile: PowerProjectile = {
      id: held.id,
      element: held.element,
      x: held.x,
      y: held.y,
      prevX: held.x,
      prevY: held.y,
      vx: vx * chargeScale,
      vy: vy * chargeScale,
      radius: preset.baseRadius * (0.64 + held.charge * 0.96),
      charge: held.charge,
      life: 1.1 + held.charge * 1.24,
      maxLife: 1.1 + held.charge * 1.24,
      bounces: 0,
      rotation: 0,
      spin: (Math.random() - 0.5) * 4.4,
      seed: Math.random(),
      trailAccumulator: 0,
    }

    this.projectiles.push(projectile)
    preset.emitRelease?.(projectile, this.spawnParticle)
    this.spawnRing({
      x: projectile.x,
      y: projectile.y,
      radius: 0.02,
      growth: 0.42 + held.charge * 0.24,
      life: 0.24 + held.charge * 0.18,
      color: preset.glow,
      alpha: 0.74,
      lineWidth: 2.1 + held.charge * 1.2,
      fillAlpha: 0.17 + held.charge * 0.12,
      blend: 'lighter',
    })

    this.heldPower = null
    this.heldEmissionAccumulator = 0
  }

  cancelHeldPower(): void {
    if (!this.heldPower) {
      return
    }
    const preset = PRESETS[this.heldPower.element]
    preset.emitImpact(
      {
        id: this.heldPower.id,
        element: this.heldPower.element,
        x: this.heldPower.x,
        y: this.heldPower.y,
        prevX: this.heldPower.x,
        prevY: this.heldPower.y,
        vx: 0,
        vy: 0,
        radius: preset.baseRadius * 0.8,
        charge: this.heldPower.charge,
        life: 0.4,
        maxLife: 0.4,
        bounces: 0,
        rotation: 0,
        spin: 0,
        seed: 0,
        trailAccumulator: 0,
      },
      this.spawnParticle,
    )
    this.spawnRing({
      x: this.heldPower.x,
      y: this.heldPower.y,
      radius: 0.03,
      growth: 0.32,
      life: 0.26,
      color: preset.secondary,
      alpha: 0.68,
      lineWidth: 1.9,
      fillAlpha: 0.14,
      blend: 'lighter',
    })
    this.heldPower = null
    this.heldEmissionAccumulator = 0
  }

  dissipateAll(): void {
    this.heldPower = null
    this.projectiles = []
    this.heldEmissionAccumulator = 0
    for (const particle of this.particles) {
      particle.active = false
    }
    for (const ring of this.rings) {
      ring.active = false
    }
  }

  update(dt: number): void {
    if (this.heldPower) {
      this.emitHeldAura(dt, this.heldPower)
    }

    for (let i = this.projectiles.length - 1; i >= 0; i -= 1) {
      const projectile = this.projectiles[i]
      projectile.prevX = projectile.x
      projectile.prevY = projectile.y
      projectile.x += projectile.vx * dt
      projectile.y += projectile.vy * dt
      projectile.vx *= 0.992
      projectile.vy *= 0.992
      projectile.rotation += projectile.spin * dt
      projectile.life -= dt

      const preset = PRESETS[projectile.element]
      projectile.trailAccumulator += dt * (24 + projectile.charge * 34)
      const trailBursts = Math.min(4, Math.floor(projectile.trailAccumulator))
      if (trailBursts > 0) {
        projectile.trailAccumulator -= trailBursts
        for (let k = 0; k < trailBursts; k += 1) {
          preset.emitTrail(projectile, this.spawnParticle, performance.now())
        }
      }

      const outOfBounds =
        projectile.x < 0 || projectile.x > 1 || projectile.y < 0 || projectile.y > 1
      if (outOfBounds) {
        if (projectile.bounces < 1) {
          projectile.bounces += 1
          projectile.x = clamp(projectile.x, 0, 1)
          projectile.y = clamp(projectile.y, 0, 1)
          if (projectile.x <= 0 || projectile.x >= 1) {
            projectile.vx *= -0.66
          }
          if (projectile.y <= 0 || projectile.y >= 1) {
            projectile.vy *= -0.66
          }
          projectile.life *= 0.7
          this.spawnRing({
            x: projectile.x,
            y: projectile.y,
            radius: 0.016,
            growth: 0.28,
            life: 0.18,
            color: preset.secondary,
            alpha: 0.55,
            lineWidth: 1.5,
            fillAlpha: 0.08,
            blend: 'lighter',
          })
        } else {
          this.emitProjectileEnd(preset, projectile)
          this.projectiles.splice(i, 1)
          continue
        }
      }

      if (projectile.life <= 0) {
        this.emitProjectileEnd(preset, projectile)
        this.projectiles.splice(i, 1)
      }
    }

    for (const particle of this.particles) {
      if (!particle.active) {
        continue
      }
      particle.life -= dt
      if (particle.life <= 0 || particle.size <= 0.05) {
        particle.active = false
        continue
      }
      particle.vx *= particle.drag
      particle.vy = particle.vy * particle.drag + particle.gravity * dt
      particle.x += particle.vx * dt
      particle.y += particle.vy * dt
      particle.rotation += particle.spin * dt
      particle.size = Math.max(0.05, particle.size - particle.sizeDecay * dt)
    }

    for (const ring of this.rings) {
      if (!ring.active) {
        continue
      }
      ring.life -= dt
      if (ring.life <= 0) {
        ring.active = false
        continue
      }
      ring.radius += ring.growth * dt
    }
  }

  render(ctx: CanvasRenderingContext2D, width: number, height: number, nowMs: number): void {
    ctx.clearRect(0, 0, width, height)

    this.renderRings(ctx, width, height)

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
      ctx.globalCompositeOperation = particle.blend
      ctx.globalAlpha = alpha
      ctx.fillStyle = particle.color
      ctx.strokeStyle = particle.color
      ctx.translate(px, py)
      ctx.rotate(particle.rotation)
      if (particle.shape === 'line') {
        ctx.lineWidth = Math.max(0.8, particle.size * 0.42)
        ctx.beginPath()
        ctx.moveTo(-particle.size * 1.8, 0)
        ctx.lineTo(particle.size * 1.8, 0)
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

    ctx.globalCompositeOperation = 'source-over'
    ctx.globalAlpha = 1
  }

  private emitHeldAura(dt: number, heldPower: HeldPower): void {
    const preset = PRESETS[heldPower.element]
    this.heldEmissionAccumulator += dt * (15 + heldPower.charge * 24)
    const emissions = Math.min(6, Math.floor(this.heldEmissionAccumulator))
    if (emissions > 0) {
      this.heldEmissionAccumulator -= emissions
      for (let i = 0; i < emissions; i += 1) {
        const angle = Math.random() * Math.PI * 2
        const speed = 70 + Math.random() * 160
        this.spawnParticle({
          x: heldPower.x + (Math.random() - 0.5) * 0.008,
          y: heldPower.y + (Math.random() - 0.5) * 0.008,
          vx: Math.cos(angle) * speed,
          vy: Math.sin(angle) * speed,
          life: 0.12 + Math.random() * 0.22,
          size: 1.2 + Math.random() * 2.8,
          color: Math.random() > 0.5 ? preset.secondary : preset.primary,
          alpha: 0.62,
          drag: 0.86,
          blend: 'lighter',
          sizeDecay: 0.8 + Math.random() * 2.1,
          spin: (Math.random() - 0.5) * 8,
          shape: Math.random() > 0.7 ? 'line' : 'circle',
        })
      }
    }

    if (Math.random() < dt * (2.6 + heldPower.charge * 4.6)) {
      this.spawnRing({
        x: heldPower.x,
        y: heldPower.y,
        radius: 0.012 + heldPower.charge * 0.01,
        growth: 0.24 + heldPower.charge * 0.22,
        life: 0.14 + heldPower.charge * 0.1,
        color: preset.secondary,
        alpha: 0.4 + heldPower.charge * 0.35,
        lineWidth: 1 + heldPower.charge * 1.5,
        fillAlpha: 0.06 + heldPower.charge * 0.16,
        blend: 'lighter',
      })
    }
  }

  private emitProjectileEnd(preset: ElementPreset, projectile: PowerProjectile): void {
    preset.emitImpact(projectile, this.spawnParticle)
    this.spawnRing({
      x: projectile.x,
      y: projectile.y,
      radius: 0.02,
      growth: 0.42 + projectile.charge * 0.2,
      life: 0.24 + projectile.charge * 0.2,
      color: preset.glow,
      alpha: 0.72,
      lineWidth: 1.8 + projectile.charge * 1.3,
      fillAlpha: 0.1 + projectile.charge * 0.15,
      blend: 'lighter',
    })
  }

  private spawnParticle: SpawnParticle = (entry: ParticleSpawn) => {
    const particle = this.particles[this.nextParticleIndex]
    this.nextParticleIndex = (this.nextParticleIndex + 1) % this.particles.length

    particle.active = true
    particle.x = entry.x
    particle.y = entry.y
    particle.vx = entry.vx * PARTICLE_VELOCITY_SCALE
    particle.vy = entry.vy * PARTICLE_VELOCITY_SCALE
    particle.life = entry.life
    particle.maxLife = entry.life
    particle.size = entry.size
    particle.color = entry.color
    particle.alpha = entry.alpha ?? 0.8
    particle.drag = entry.drag ?? 0.93
    particle.shape = entry.shape ?? 'circle'
    particle.rotation = entry.rotation ?? 0
    particle.spin = entry.spin ?? 0
    particle.sizeDecay = entry.sizeDecay ?? 0
    particle.gravity = (entry.gravity ?? 0) * PARTICLE_VELOCITY_SCALE
    particle.blend = entry.blend ?? 'source-over'
  }

  private spawnRing(entry: RingSpawn): void {
    const ring = this.rings[this.nextRingIndex]
    this.nextRingIndex = (this.nextRingIndex + 1) % this.rings.length

    ring.active = true
    ring.x = entry.x
    ring.y = entry.y
    ring.radius = entry.radius
    ring.growth = entry.growth
    ring.life = entry.life
    ring.maxLife = entry.life
    ring.color = entry.color
    ring.alpha = entry.alpha
    ring.lineWidth = entry.lineWidth
    ring.fillAlpha = entry.fillAlpha ?? 0
    ring.blend = entry.blend ?? 'lighter'
  }

  private renderRings(ctx: CanvasRenderingContext2D, width: number, height: number): void {
    for (const ring of this.rings) {
      if (!ring.active) {
        continue
      }
      const lifeRatio = clamp(ring.life / ring.maxLife, 0, 1)
      const alpha = ring.alpha * lifeRatio
      if (alpha <= 0.01) {
        continue
      }
      const px = ring.x * width
      const py = ring.y * height
      const radiusPx = ring.radius * Math.min(width, height)
      ctx.save()
      ctx.globalCompositeOperation = ring.blend
      ctx.globalAlpha = alpha
      if (ring.fillAlpha > 0.01) {
        ctx.fillStyle = ring.color
        ctx.globalAlpha = alpha * ring.fillAlpha
        ctx.beginPath()
        ctx.arc(px, py, radiusPx, 0, Math.PI * 2)
        ctx.fill()
        ctx.globalAlpha = alpha
      }
      ctx.strokeStyle = ring.color
      ctx.lineWidth = ring.lineWidth * (0.8 + (1 - lifeRatio) * 0.4)
      ctx.beginPath()
      ctx.arc(px, py, radiusPx, 0, Math.PI * 2)
      ctx.stroke()
      ctx.restore()
    }
  }
}
