import type { ElementPreset } from '../powerTypes'
import { drawCometTail, drawGlow, drawRing, emitRadialBurst, randRange } from '../presetUtils'

export const waterPreset: ElementPreset = {
  id: 'water',
  label: 'Agua',
  primary: '#53b7ff',
  secondary: '#a5e8ff',
  glow: '#64d5ff',
  baseRadius: 25,
  drawHeld: (ctx, power, nowMs, width, height) => {
    const px = power.x * width
    const py = power.y * height
    const radius = 17 + power.charge * 35
    const wave = 1 + Math.sin(nowMs * 0.009) * 0.08

    drawGlow(ctx, px, py, radius * 2.5, [
      [0, 'rgba(218, 250, 255, 0.85)'],
      [0.35, 'rgba(96, 197, 255, 0.62)'],
      [1, 'rgba(74, 165, 255, 0)'],
    ])
    drawRing(ctx, px, py, radius * wave, 'rgba(182, 243, 255, 0.86)', 0.58, 1.9)
    drawRing(
      ctx,
      px,
      py,
      radius * (1.45 + Math.sin(nowMs * 0.0042) * 0.1),
      'rgba(145, 222, 255, 0.68)',
      0.42,
      1.3,
    )

    ctx.save()
    ctx.globalCompositeOperation = 'lighter'
    ctx.fillStyle = 'rgba(226, 252, 255, 0.52)'
    for (let i = 0; i < 3; i += 1) {
      const offsetAngle = nowMs * 0.0019 + i * (Math.PI / 1.5)
      const ox = Math.cos(offsetAngle) * radius * 0.24
      const oy = Math.sin(offsetAngle) * radius * 0.16
      ctx.beginPath()
      ctx.ellipse(px + ox, py + oy, radius * 0.6, radius * 0.46, offsetAngle, 0, Math.PI * 2)
      ctx.fill()
    }
    ctx.restore()
  },
  drawProjectile: (ctx, projectile, nowMs, width, height) => {
    const px = projectile.x * width
    const py = projectile.y * height
    const prevX = projectile.prevX * width
    const prevY = projectile.prevY * height
    const radius = projectile.radius
    const wobble = Math.sin(nowMs * 0.02 + projectile.id) * radius * 0.12

    drawCometTail(ctx, prevX, prevY, px, py, 'rgba(125, 212, 255, 0.8)', 0.45, radius * 0.3)
    drawGlow(ctx, px, py, radius * 2.2, [
      [0, 'rgba(228, 252, 255, 0.8)'],
      [0.34, 'rgba(115, 207, 255, 0.58)'],
      [1, 'rgba(79, 171, 255, 0)'],
    ])

    ctx.fillStyle = 'rgba(140, 220, 255, 0.62)'
    ctx.beginPath()
    ctx.ellipse(px, py, radius * 1.08, radius * 0.92 + wobble, 0, 0, Math.PI * 2)
    ctx.fill()
    drawRing(ctx, px, py, radius * 1.2, 'rgba(210, 247, 255, 0.85)', 0.62, 1.25)

    const ringPhase = ((nowMs * 0.002 + projectile.id * 0.3) % 1) * 1.2
    drawRing(
      ctx,
      px,
      py,
      radius * (1.42 + ringPhase),
      `rgba(179, 245, 255, ${0.56 - ringPhase * 0.35})`,
      0.5,
      1,
    )
  },
  emitCast: (power, spawn) => {
    emitRadialBurst(spawn, {
      x: power.x,
      y: power.y,
      count: 16,
      speedMin: 70,
      speedMax: 180,
      lifeMin: 0.2,
      lifeMax: 0.42,
      sizeMin: 1.5,
      sizeMax: 3.3,
      colorA: '#c8f4ff',
      colorB: '#54b7ff',
      alpha: 0.58,
      drag: 0.9,
      blend: 'lighter',
    })
  },
  emitRelease: (projectile, spawn) => {
    emitRadialBurst(spawn, {
      x: projectile.x,
      y: projectile.y,
      count: Math.round(14 + projectile.charge * 14),
      speedMin: 80,
      speedMax: 220,
      lifeMin: 0.2,
      lifeMax: 0.48,
      sizeMin: 2,
      sizeMax: 4,
      colorA: '#a8edff',
      colorB: '#53b7ff',
      alpha: 0.62,
      drag: 0.9,
      blend: 'lighter',
    })
  },
  emitTrail: (projectile, spawn) => {
    for (let i = 0; i < 2; i += 1) {
      spawn({
        x: projectile.x + randRange(-0.006, 0.006),
        y: projectile.y + randRange(-0.006, 0.006),
        vx: -projectile.vx * randRange(0.1, 0.2) + randRange(-56, 56),
        vy: -projectile.vy * randRange(0.1, 0.2) + randRange(-56, 56),
        life: randRange(0.18, 0.42),
        size: randRange(1.6, 3.8),
        color: Math.random() > 0.45 ? '#a8edff' : '#53b7ff',
        alpha: 0.62,
        drag: 0.9,
        blend: 'lighter',
        sizeDecay: randRange(0.3, 1.5),
        spin: randRange(-3.2, 3.2),
      })
    }
  },
  emitImpact: (projectile, spawn) => {
    emitRadialBurst(spawn, {
      x: projectile.x,
      y: projectile.y,
      count: Math.round(22 + projectile.charge * 14),
      speedMin: 90,
      speedMax: 260,
      lifeMin: 0.18,
      lifeMax: 0.44,
      sizeMin: 1.8,
      sizeMax: 3.9,
      colorA: '#d0f6ff',
      colorB: '#53b7ff',
      alpha: 0.68,
      drag: 0.88,
      blend: 'lighter',
    })
  },
}
