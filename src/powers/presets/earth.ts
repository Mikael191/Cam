import type { ElementPreset } from '../powerTypes'
import { drawCometTail, drawGlow, drawRing, emitRadialBurst, randRange } from '../presetUtils'

const drawRock = (ctx: CanvasRenderingContext2D, radius: number): void => {
  ctx.beginPath()
  ctx.moveTo(-radius * 0.9, -radius * 0.25)
  ctx.lineTo(-radius * 0.3, -radius)
  ctx.lineTo(radius * 0.7, -radius * 0.55)
  ctx.lineTo(radius, radius * 0.2)
  ctx.lineTo(radius * 0.25, radius)
  ctx.lineTo(-radius * 0.85, radius * 0.55)
  ctx.closePath()
  ctx.fill()
}

export const earthPreset: ElementPreset = {
  id: 'earth',
  label: 'Terra',
  primary: '#b68d56',
  secondary: '#d7bb8a',
  glow: '#8f724f',
  baseRadius: 25,
  drawHeld: (ctx, power, nowMs, width, height) => {
    const px = power.x * width
    const py = power.y * height
    const radius = 15 + power.charge * 34
    drawGlow(ctx, px, py, radius * 2.3, [
      [0, 'rgba(214, 190, 147, 0.52)'],
      [0.44, 'rgba(166, 130, 84, 0.34)'],
      [1, 'rgba(110, 84, 56, 0)'],
    ], 'source-over')

    ctx.save()
    ctx.translate(px, py)
    ctx.rotate(nowMs * 0.0009)
    ctx.fillStyle = 'rgba(182, 141, 86, 0.88)'
    drawRock(ctx, radius)
    ctx.fillStyle = 'rgba(215, 187, 138, 0.55)'
    ctx.rotate(-nowMs * 0.0016)
    drawRock(ctx, radius * 0.62)
    for (let i = 0; i < 4; i += 1) {
      const angle = nowMs * 0.0016 + (Math.PI * 2 * i) / 4
      const orbit = radius * (1.2 + i * 0.08)
      const rx = Math.cos(angle) * orbit
      const ry = Math.sin(angle) * orbit * 0.72
      ctx.save()
      ctx.translate(rx, ry)
      ctx.rotate(-angle * 1.4)
      ctx.fillStyle = i % 2 === 0 ? 'rgba(161, 124, 75, 0.84)' : 'rgba(211, 182, 136, 0.75)'
      drawRock(ctx, radius * 0.23)
      ctx.restore()
    }
    ctx.restore()
    drawRing(ctx, px, py, radius * 1.28, 'rgba(207, 178, 127, 0.76)', 0.42, 1.5)
  },
  drawProjectile: (ctx, projectile, nowMs, width, height) => {
    const px = projectile.x * width
    const py = projectile.y * height
    const prevX = projectile.prevX * width
    const prevY = projectile.prevY * height
    const radius = projectile.radius
    drawCometTail(ctx, prevX, prevY, px, py, 'rgba(188, 151, 95, 0.75)', 0.42, radius * 0.34)
    drawGlow(ctx, px, py, radius * 1.9, [
      [0, 'rgba(230, 209, 169, 0.58)'],
      [0.5, 'rgba(165, 129, 82, 0.34)'],
      [1, 'rgba(111, 86, 56, 0)'],
    ], 'source-over')
    ctx.save()
    ctx.translate(px, py)
    ctx.rotate(nowMs * 0.002 + projectile.rotation + projectile.seed)
    ctx.fillStyle = 'rgba(160, 124, 76, 0.95)'
    drawRock(ctx, radius * 1.2)
    ctx.fillStyle = 'rgba(214, 187, 140, 0.45)'
    drawRock(ctx, radius * 0.72)
    ctx.restore()
    drawRing(ctx, px, py, radius * 1.45, 'rgba(212, 186, 146, 0.72)', 0.36, 1.2)
  },
  emitCast: (power, spawn) => {
    emitRadialBurst(spawn, {
      x: power.x,
      y: power.y,
      count: 12,
      speedMin: 50,
      speedMax: 140,
      lifeMin: 0.2,
      lifeMax: 0.45,
      sizeMin: 1.8,
      sizeMax: 3.8,
      colorA: '#b68d56',
      colorB: '#d7bb8a',
      alpha: 0.62,
      drag: 0.9,
      shape: 'square',
      blend: 'source-over',
    })
  },
  emitRelease: (projectile, spawn) => {
    emitRadialBurst(spawn, {
      x: projectile.x,
      y: projectile.y,
      count: Math.round(14 + projectile.charge * 12),
      speedMin: 70,
      speedMax: 220,
      lifeMin: 0.2,
      lifeMax: 0.5,
      sizeMin: 2.1,
      sizeMax: 4.5,
      colorA: '#a88356',
      colorB: '#d7bb8a',
      alpha: 0.72,
      drag: 0.88,
      shape: 'square',
      blend: 'source-over',
    })
  },
  emitTrail: (projectile, spawn) => {
    if (Math.random() > 0.84) {
      return
    }
    for (let i = 0; i < 2; i += 1) {
      spawn({
        x: projectile.x + randRange(-0.015, 0.015),
        y: projectile.y + randRange(-0.015, 0.015),
        vx: -projectile.vx * randRange(0.06, 0.14) + randRange(-24, 24),
        vy: -projectile.vy * randRange(0.06, 0.14) + randRange(-24, 24),
        life: randRange(0.22, 0.44),
        size: randRange(1.8, 3.4),
        color: Math.random() > 0.5 ? '#b68d56' : '#d7bb8a',
        alpha: 0.6,
        drag: 0.88,
        shape: Math.random() > 0.4 ? 'square' : 'circle',
        blend: 'source-over',
        gravity: randRange(18, 48),
        sizeDecay: randRange(0.25, 1.3),
        spin: randRange(-4.8, 4.8),
      })
    }
  },
  emitImpact: (projectile, spawn) => {
    emitRadialBurst(spawn, {
      x: projectile.x,
      y: projectile.y,
      count: Math.round(26 + projectile.charge * 16),
      speedMin: 70,
      speedMax: 240,
      lifeMin: 0.18,
      lifeMax: 0.52,
      sizeMin: 2,
      sizeMax: 4.8,
      colorA: '#a88356',
      colorB: '#d7bb8a',
      alpha: 0.74,
      drag: 0.86,
      shape: 'square',
      blend: 'source-over',
      gravity: 38,
    })
  },
}
