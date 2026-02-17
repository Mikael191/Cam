import { clamp } from '../../utils/math'
import type { ElementPreset } from '../powerTypes'
import {
  drawCometTail,
  drawGlow,
  drawRing,
  emitRadialBurst,
  randRange,
  randSign,
} from '../presetUtils'

export const firePreset: ElementPreset = {
  id: 'fire',
  label: 'Fogo',
  primary: '#ff6723',
  secondary: '#ffd166',
  glow: '#ff8a3b',
  baseRadius: 26,
  drawHeld: (ctx, power, nowMs, width, height) => {
    const px = power.x * width
    const py = power.y * height
    const flicker = 0.82 + Math.sin(nowMs * 0.018) * 0.18 + Math.cos(nowMs * 0.024) * 0.05
    const radius = (18 + power.charge * 42) * flicker

    drawGlow(ctx, px, py, radius * 2.9, [
      [0, 'rgba(255, 248, 220, 0.9)'],
      [0.25, 'rgba(255, 183, 78, 0.75)'],
      [0.65, 'rgba(255, 91, 36, 0.42)'],
      [1, 'rgba(255, 53, 14, 0)'],
    ])
    drawRing(ctx, px, py, radius * 1.22, 'rgba(255, 198, 116, 0.7)', 0.6, 1.6)

    const core = ctx.createRadialGradient(px, py, radius * 0.04, px, py, radius * 0.9)
    core.addColorStop(0, '#fff4cf')
    core.addColorStop(0.34, '#ffcb75')
    core.addColorStop(1, '#ff7d2b')
    ctx.save()
    ctx.globalCompositeOperation = 'lighter'
    ctx.fillStyle = core
    ctx.beginPath()
    ctx.arc(px, py, radius * 0.92, 0, Math.PI * 2)
    ctx.fill()
    ctx.restore()

    ctx.save()
    ctx.translate(px, py)
    ctx.globalCompositeOperation = 'lighter'
    for (let i = 0; i < 7; i += 1) {
      const angle = (Math.PI * 2 * i) / 7 + nowMs * 0.0012 * randSign()
      const flameLen = radius * randRange(0.55, 1.15)
      const flameWidth = radius * randRange(0.18, 0.32)
      ctx.rotate(angle)
      ctx.fillStyle = i % 2 === 0 ? 'rgba(255, 175, 73, 0.56)' : 'rgba(255, 115, 43, 0.44)'
      ctx.beginPath()
      ctx.moveTo(-flameWidth, 0)
      ctx.bezierCurveTo(-flameWidth * 0.4, -flameLen * 0.45, flameWidth * 0.5, -flameLen * 0.6, 0, -flameLen)
      ctx.bezierCurveTo(flameWidth * 0.6, -flameLen * 0.62, flameWidth * 0.45, -flameLen * 0.25, flameWidth, 0)
      ctx.closePath()
      ctx.fill()
      ctx.rotate(-angle)
    }
    ctx.restore()
  },
  drawProjectile: (ctx, projectile, nowMs, width, height) => {
    const px = projectile.x * width
    const py = projectile.y * height
    const prevX = projectile.prevX * width
    const prevY = projectile.prevY * height
    const lifeRatio = clamp(projectile.life / projectile.maxLife, 0, 1)
    const flicker = 0.88 + Math.sin((nowMs + projectile.seed * 10) * 0.028) * 0.16
    const radius = projectile.radius * flicker

    drawCometTail(
      ctx,
      prevX - projectile.vx * 0.07,
      prevY - projectile.vy * 0.07,
      px,
      py,
      'rgba(255, 126, 58, 0.9)',
      0.55 + projectile.charge * 0.25,
      radius * 0.34,
    )
    drawGlow(ctx, px, py, radius * 2.8, [
      [0, `rgba(255, 241, 199, ${0.92 * lifeRatio})`],
      [0.2, `rgba(255, 198, 112, ${0.74 * lifeRatio})`],
      [0.55, `rgba(255, 96, 34, ${0.44 * lifeRatio})`],
      [1, 'rgba(255, 61, 19, 0)'],
    ])
    drawRing(ctx, px, py, radius * 1.36, 'rgba(255, 205, 128, 0.8)', 0.4 * lifeRatio, 1.2)
  },
  emitCast: (power, spawn) => {
    emitRadialBurst(spawn, {
      x: power.x,
      y: power.y,
      count: 18,
      speedMin: 80,
      speedMax: 230,
      lifeMin: 0.14,
      lifeMax: 0.33,
      sizeMin: 1.4,
      sizeMax: 3.2,
      colorA: '#ffd27a',
      colorB: '#ff7e39',
      drag: 0.88,
      blend: 'lighter',
    })
  },
  emitRelease: (projectile, spawn) => {
    emitRadialBurst(spawn, {
      x: projectile.x,
      y: projectile.y,
      count: Math.round(10 + projectile.charge * 14),
      speedMin: 90,
      speedMax: 270,
      lifeMin: 0.2,
      lifeMax: 0.42,
      sizeMin: 2,
      sizeMax: 4.4,
      colorA: '#ffaf55',
      colorB: '#ff5c24',
      drag: 0.9,
      blend: 'lighter',
    })
  },
  emitTrail: (projectile, spawn) => {
    const intensity = clamp(projectile.charge * 1.2 + 0.35, 0.2, 1.4)
    for (let i = 0; i < 3; i += 1) {
      const spread = randRange(-130, 130)
      const angularBoost = randRange(-80, 80)
      spawn({
        x: projectile.x,
        y: projectile.y,
        vx: -projectile.vx * randRange(0.18, 0.31) + spread + angularBoost,
        vy: -projectile.vy * randRange(0.13, 0.28) + spread * 0.28 - angularBoost * 0.22,
        life: randRange(0.18, 0.34),
        size: randRange(2.2, 4.8) * intensity,
        color: Math.random() > 0.6 ? '#ffd166' : '#ff6723',
        alpha: 0.72,
        drag: 0.9,
        blend: 'lighter',
        shape: Math.random() > 0.7 ? 'line' : 'circle',
        rotation: randRange(0, Math.PI * 2),
        spin: randRange(-7.2, 7.2),
        sizeDecay: randRange(1.4, 3.1),
      })
    }
  },
  emitImpact: (projectile, spawn) => {
    emitRadialBurst(spawn, {
      x: projectile.x,
      y: projectile.y,
      count: Math.round(22 + projectile.charge * 16),
      speedMin: 140,
      speedMax: 340,
      lifeMin: 0.18,
      lifeMax: 0.44,
      sizeMin: 2.6,
      sizeMax: 5.5,
      colorA: '#ff8e32',
      colorB: '#ffd37e',
      drag: 0.89,
      blend: 'lighter',
    })
  },
}
