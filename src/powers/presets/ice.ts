import type { ElementPreset } from '../powerTypes'
import { drawCometTail, drawGlow, drawRing, emitRadialBurst, randRange } from '../presetUtils'

const drawCrystal = (ctx: CanvasRenderingContext2D, x: number, y: number, radius: number): void => {
  ctx.beginPath()
  ctx.moveTo(x, y - radius)
  ctx.lineTo(x + radius * 0.5, y - radius * 0.2)
  ctx.lineTo(x + radius * 0.2, y + radius)
  ctx.lineTo(x - radius * 0.2, y + radius)
  ctx.lineTo(x - radius * 0.5, y - radius * 0.2)
  ctx.closePath()
  ctx.fill()
}

export const icePreset: ElementPreset = {
  id: 'ice',
  label: 'Gelo',
  primary: '#9ee6ff',
  secondary: '#d8f9ff',
  glow: '#6dc8ff',
  baseRadius: 24,
  drawHeld: (ctx, power, nowMs, width, height) => {
    const px = power.x * width
    const py = power.y * height
    const radius = 17 + power.charge * 34
    drawGlow(ctx, px, py, radius * 2.6, [
      [0, 'rgba(236, 253, 255, 0.72)'],
      [0.42, 'rgba(173, 243, 255, 0.46)'],
      [1, 'rgba(96, 188, 255, 0)'],
    ])

    ctx.save()
    ctx.translate(px, py)
    ctx.rotate(nowMs * 0.0015)
    ctx.fillStyle = 'rgba(176, 244, 255, 0.72)'
    for (let i = 0; i < 5; i += 1) {
      ctx.save()
      ctx.rotate(((Math.PI * 2) / 5) * i)
      drawCrystal(ctx, 0, 0, radius * (0.58 + i * 0.04))
      ctx.restore()
    }
    ctx.strokeStyle = 'rgba(212, 249, 255, 0.68)'
    ctx.lineWidth = 1.1
    for (let i = 0; i < 6; i += 1) {
      const angle = ((Math.PI * 2) / 6) * i
      ctx.beginPath()
      ctx.moveTo(Math.cos(angle) * radius * 0.35, Math.sin(angle) * radius * 0.35)
      ctx.lineTo(Math.cos(angle) * radius * 1.35, Math.sin(angle) * radius * 1.35)
      ctx.stroke()
    }
    ctx.restore()
    drawRing(
      ctx,
      px,
      py,
      radius * (1.12 + Math.sin(nowMs * 0.003) * 0.04),
      'rgba(213, 250, 255, 0.9)',
      0.48,
      1.4,
    )
  },
  drawProjectile: (ctx, projectile, nowMs, width, height) => {
    const px = projectile.x * width
    const py = projectile.y * height
    const prevX = projectile.prevX * width
    const prevY = projectile.prevY * height
    const radius = projectile.radius

    drawCometTail(ctx, prevX, prevY, px, py, 'rgba(165, 233, 255, 0.8)', 0.44, radius * 0.27)
    drawGlow(ctx, px, py, radius * 2.15, [
      [0, 'rgba(244, 254, 255, 0.78)'],
      [0.34, 'rgba(182, 241, 255, 0.54)'],
      [1, 'rgba(110, 200, 255, 0)'],
    ])

    ctx.save()
    ctx.translate(px, py)
    ctx.rotate(nowMs * 0.0025 + projectile.seed * 4)
    ctx.fillStyle = 'rgba(190, 245, 255, 0.88)'
    drawCrystal(ctx, 0, 0, radius * 1.15)
    ctx.strokeStyle = 'rgba(231, 252, 255, 0.85)'
    ctx.lineWidth = 1
    ctx.stroke()
    ctx.restore()
    drawRing(ctx, px, py, radius * 1.64, 'rgba(222, 253, 255, 0.94)', 0.56, 1.5)
    drawRing(ctx, px, py, radius * (1.95 + Math.sin(nowMs * 0.004 + projectile.seed) * 0.2), 'rgba(176, 231, 255, 0.65)', 0.36, 1.1)
  },
  emitCast: (power, spawn) => {
    emitRadialBurst(spawn, {
      x: power.x,
      y: power.y,
      count: 14,
      speedMin: 60,
      speedMax: 190,
      lifeMin: 0.22,
      lifeMax: 0.4,
      sizeMin: 1.8,
      sizeMax: 3.9,
      colorA: '#b8f4ff',
      colorB: '#e2fbff',
      alpha: 0.62,
      drag: 0.9,
      shape: 'square',
      blend: 'lighter',
    })
  },
  emitRelease: (projectile, spawn) => {
    emitRadialBurst(spawn, {
      x: projectile.x,
      y: projectile.y,
      count: Math.round(12 + projectile.charge * 12),
      speedMin: 100,
      speedMax: 260,
      lifeMin: 0.24,
      lifeMax: 0.52,
      sizeMin: 1.8,
      sizeMax: 4.2,
      colorA: '#d7f9ff',
      colorB: '#9ee6ff',
      alpha: 0.76,
      drag: 0.88,
      shape: 'square',
      blend: 'lighter',
    })
  },
  emitTrail: (projectile, spawn) => {
    const count = projectile.charge > 0.65 ? 2 : 1
    for (let i = 0; i < count; i += 1) {
      spawn({
        x: projectile.x + randRange(-0.005, 0.005),
        y: projectile.y + randRange(-0.005, 0.005),
        vx: -projectile.vx * randRange(0.08, 0.18) + randRange(-42, 42),
        vy: -projectile.vy * randRange(0.08, 0.18) + randRange(-42, 42),
        life: randRange(0.28, 0.52),
        size: randRange(1.8, 3.7),
        color: Math.random() > 0.55 ? '#dffbff' : '#9ee6ff',
        alpha: 0.64,
        drag: 0.9,
        shape: Math.random() > 0.4 ? 'square' : 'circle',
        rotation: randRange(0, Math.PI),
        spin: randRange(-6.8, 6.8),
        sizeDecay: randRange(0.4, 1.9),
        blend: 'lighter',
      })
    }
  },
  emitImpact: (projectile, spawn) => {
    emitRadialBurst(spawn, {
      x: projectile.x,
      y: projectile.y,
      count: Math.round(20 + projectile.charge * 18),
      speedMin: 110,
      speedMax: 300,
      lifeMin: 0.22,
      lifeMax: 0.45,
      sizeMin: 1.7,
      sizeMax: 4.1,
      colorA: '#e4fbff',
      colorB: '#9de9ff',
      alpha: 0.8,
      drag: 0.86,
      shape: 'square',
      blend: 'lighter',
    })
  },
}
