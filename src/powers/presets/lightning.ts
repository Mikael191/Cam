import type { ElementPreset } from '../powerTypes'
import { drawCometTail, drawGlow, drawRing, emitRadialBurst, randRange } from '../presetUtils'

const drawArc = (
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  radius: number,
  jaggedness = 0.5,
): void => {
  ctx.beginPath()
  const segments = 9
  for (let i = 0; i <= segments; i += 1) {
    const t = i / segments
    const angle = t * Math.PI * 2
    const offset = (Math.random() - 0.5) * radius * jaggedness
    const px = x + Math.cos(angle) * (radius + offset)
    const py = y + Math.sin(angle) * (radius + offset)
    if (i === 0) {
      ctx.moveTo(px, py)
    } else {
      ctx.lineTo(px, py)
    }
  }
  ctx.closePath()
  ctx.stroke()
}

export const lightningPreset: ElementPreset = {
  id: 'lightning',
  label: 'Raio',
  primary: '#d2ccff',
  secondary: '#8ab6ff',
  glow: '#7a90ff',
  baseRadius: 23,
  drawHeld: (ctx, power, nowMs, width, height) => {
    const px = power.x * width
    const py = power.y * height
    const radius = 15 + power.charge * 34
    const pulse = 0.94 + Math.sin(nowMs * 0.038) * 0.14

    drawGlow(ctx, px, py, radius * 3.2 * pulse, [
      [0, 'rgba(248, 243, 255, 0.94)'],
      [0.36, 'rgba(166, 205, 255, 0.56)'],
      [1, 'rgba(116, 130, 255, 0)'],
    ])
    drawRing(ctx, px, py, radius * 1.36, 'rgba(223, 236, 255, 0.95)', 0.58, 1.4)

    ctx.strokeStyle = 'rgba(226, 235, 255, 0.95)'
    ctx.lineWidth = 1.8
    drawArc(ctx, px, py, radius * 1.2, 0.75)
    ctx.lineWidth = 1
    drawArc(ctx, px, py, radius * 0.8, 0.45)
  },
  drawProjectile: (ctx, projectile, nowMs, width, height) => {
    const px = projectile.x * width
    const py = projectile.y * height
    const prevX = projectile.prevX * width
    const prevY = projectile.prevY * height
    const radius = projectile.radius * (0.88 + Math.sin(nowMs * 0.05 + projectile.seed) * 0.12)

    drawCometTail(ctx, prevX, prevY, px, py, 'rgba(199, 221, 255, 0.95)', 0.7, radius * 0.32)
    drawGlow(ctx, px, py, radius * 2.6, [
      [0, 'rgba(250, 244, 255, 0.95)'],
      [0.26, 'rgba(176, 213, 255, 0.68)'],
      [1, 'rgba(125, 138, 255, 0)'],
    ])

    ctx.save()
    ctx.globalCompositeOperation = 'lighter'
    ctx.fillStyle = 'rgba(244, 238, 255, 0.92)'
    ctx.beginPath()
    ctx.arc(px, py, radius, 0, Math.PI * 2)
    ctx.fill()
    ctx.restore()

    ctx.strokeStyle = `rgba(140, 190, 255, ${0.68 + Math.random() * 0.28})`
    ctx.lineWidth = 1.5
    drawArc(ctx, px, py, radius * 1.5, 0.8)

    ctx.strokeStyle = 'rgba(232, 245, 255, 0.85)'
    ctx.lineWidth = 0.9
    drawArc(ctx, px, py, radius * 0.95, 0.55)
    drawRing(ctx, px, py, radius * 1.95, 'rgba(157, 194, 255, 0.74)', 0.42, 1.1)

    if (Math.random() > 0.58) {
      ctx.strokeStyle = 'rgba(220, 235, 255, 0.8)'
      ctx.lineWidth = 2
      ctx.beginPath()
      ctx.moveTo(px, py)
      ctx.lineTo(
        px + randRange(-1, 1) * radius * 8,
        py + randRange(-1, 1) * radius * 8 + Math.sin(nowMs * 0.03) * 3,
      )
      ctx.stroke()
    }
  },
  emitCast: (power, spawn) => {
    emitRadialBurst(spawn, {
      x: power.x,
      y: power.y,
      count: 14,
      speedMin: 100,
      speedMax: 280,
      lifeMin: 0.08,
      lifeMax: 0.2,
      sizeMin: 1.2,
      sizeMax: 2.3,
      colorA: '#f0edff',
      colorB: '#8ab6ff',
      alpha: 0.9,
      drag: 0.78,
      shape: 'line',
      blend: 'lighter',
    })
  },
  emitRelease: (projectile, spawn) => {
    emitRadialBurst(spawn, {
      x: projectile.x,
      y: projectile.y,
      count: Math.round(16 + projectile.charge * 16),
      speedMin: 120,
      speedMax: 340,
      lifeMin: 0.08,
      lifeMax: 0.24,
      sizeMin: 1.2,
      sizeMax: 2.8,
      colorA: '#eae9ff',
      colorB: '#9ec3ff',
      alpha: 0.94,
      drag: 0.76,
      shape: 'line',
      blend: 'lighter',
    })
  },
  emitTrail: (projectile, spawn) => {
    if (Math.random() > 0.72) {
      return
    }
    const speed = 90 + Math.random() * 140
    const angle = Math.random() * Math.PI * 2
    spawn({
      x: projectile.x,
      y: projectile.y,
      vx: Math.cos(angle) * speed + projectile.vx * 0.2,
      vy: Math.sin(angle) * speed + projectile.vy * 0.2,
      life: 0.1 + Math.random() * 0.14,
      size: 1.4 + Math.random() * 2.3,
      color: '#d8e6ff',
      alpha: 0.9,
      drag: 0.78,
      shape: 'line',
      rotation: angle,
      spin: randRange(-8, 8),
      sizeDecay: randRange(1.2, 3.5),
      blend: 'lighter',
    })
  },
  emitImpact: (projectile, spawn) => {
    emitRadialBurst(spawn, {
      x: projectile.x,
      y: projectile.y,
      count: Math.round(26 + projectile.charge * 12),
      speedMin: 140,
      speedMax: 360,
      lifeMin: 0.07,
      lifeMax: 0.2,
      sizeMin: 1.3,
      sizeMax: 2.7,
      colorA: '#f0eeff',
      colorB: '#8ab6ff',
      alpha: 0.9,
      drag: 0.76,
      shape: 'line',
      blend: 'lighter',
    })
  },
}
