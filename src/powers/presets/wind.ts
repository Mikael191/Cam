import type { ElementPreset } from '../powerTypes'
import { drawCometTail, drawGlow, drawRing, emitRadialBurst, randRange } from '../presetUtils'

const drawSpiral = (
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  radius: number,
  phase: number,
): void => {
  ctx.beginPath()
  const turns = 2.6
  const steps = 60
  for (let i = 0; i <= steps; i += 1) {
    const t = i / steps
    const angle = phase + t * Math.PI * 2 * turns
    const localRadius = radius * t
    const px = x + Math.cos(angle) * localRadius
    const py = y + Math.sin(angle) * localRadius
    if (i === 0) {
      ctx.moveTo(px, py)
    } else {
      ctx.lineTo(px, py)
    }
  }
  ctx.stroke()
}

export const windPreset: ElementPreset = {
  id: 'wind',
  label: 'Vento',
  primary: '#d7f5e4',
  secondary: '#9af0c2',
  glow: '#79dfb2',
  baseRadius: 24,
  drawHeld: (ctx, power, nowMs, width, height) => {
    const px = power.x * width
    const py = power.y * height
    const radius = 18 + power.charge * 34
    const phase = nowMs * 0.003
    drawGlow(ctx, px, py, radius * 2.3, [
      [0, 'rgba(233, 255, 245, 0.72)'],
      [0.4, 'rgba(154, 240, 194, 0.44)'],
      [1, 'rgba(92, 202, 156, 0)'],
    ])

    ctx.strokeStyle = 'rgba(182, 249, 214, 0.75)'
    ctx.lineWidth = 1.4
    drawSpiral(ctx, px, py, radius, phase)
    ctx.strokeStyle = 'rgba(134, 234, 185, 0.55)'
    drawSpiral(ctx, px, py, radius * 0.75, -phase * 1.1)
    drawRing(ctx, px, py, radius * (1.3 + Math.sin(nowMs * 0.0023) * 0.07), 'rgba(198, 255, 229, 0.66)', 0.42, 1.2)
  },
  drawProjectile: (ctx, projectile, nowMs, width, height) => {
    const px = projectile.x * width
    const py = projectile.y * height
    const prevX = projectile.prevX * width
    const prevY = projectile.prevY * height
    const radius = projectile.radius * (0.9 + Math.sin(nowMs * 0.01) * 0.08)
    drawCometTail(ctx, prevX, prevY, px, py, 'rgba(197, 255, 231, 0.85)', 0.52, radius * 0.24)
    drawGlow(ctx, px, py, radius * 2.1, [
      [0, 'rgba(230, 255, 242, 0.65)'],
      [0.45, 'rgba(137, 232, 184, 0.38)'],
      [1, 'rgba(94, 214, 162, 0)'],
    ])
    ctx.strokeStyle = 'rgba(210, 255, 233, 0.75)'
    ctx.lineWidth = 1.6
    drawSpiral(ctx, px, py, radius * 1.4, nowMs * 0.007 + projectile.id)
    ctx.strokeStyle = 'rgba(154, 240, 194, 0.45)'
    drawSpiral(ctx, px, py, radius, -nowMs * 0.009)
    drawRing(ctx, px, py, radius * 1.7, 'rgba(202, 255, 235, 0.72)', 0.44, 1.1)
  },
  emitCast: (power, spawn) => {
    emitRadialBurst(spawn, {
      x: power.x,
      y: power.y,
      count: 14,
      speedMin: 90,
      speedMax: 210,
      lifeMin: 0.12,
      lifeMax: 0.26,
      sizeMin: 1.4,
      sizeMax: 2.6,
      colorA: '#bfffdc',
      colorB: '#8ceebf',
      alpha: 0.58,
      drag: 0.82,
      shape: 'line',
      blend: 'lighter',
    })
  },
  emitRelease: (projectile, spawn) => {
    emitRadialBurst(spawn, {
      x: projectile.x,
      y: projectile.y,
      count: Math.round(16 + projectile.charge * 12),
      speedMin: 120,
      speedMax: 280,
      lifeMin: 0.14,
      lifeMax: 0.28,
      sizeMin: 1.4,
      sizeMax: 2.8,
      colorA: '#dcffe9',
      colorB: '#9af0c2',
      alpha: 0.62,
      drag: 0.78,
      shape: 'line',
      blend: 'lighter',
    })
  },
  emitTrail: (projectile, spawn, nowMs) => {
    const angle = nowMs * 0.014 + projectile.id
    for (let i = 0; i < 2; i += 1) {
      const local = angle + i * Math.PI
      spawn({
        x: projectile.x + Math.cos(local) * 0.01,
        y: projectile.y + Math.sin(local) * 0.01,
        vx: -projectile.vx * 0.12 + Math.cos(local) * randRange(80, 140),
        vy: -projectile.vy * 0.12 + Math.sin(local) * randRange(80, 140),
        life: randRange(0.14, 0.28),
        size: randRange(1.5, 2.6),
        color: '#c8ffe5',
        alpha: 0.54,
        drag: 0.82,
        shape: 'line',
        rotation: local,
        spin: randRange(-3.4, 3.4),
        sizeDecay: randRange(1, 2.8),
        blend: 'lighter',
      })
    }
  },
  emitImpact: (projectile, spawn) => {
    emitRadialBurst(spawn, {
      x: projectile.x,
      y: projectile.y,
      count: Math.round(24 + projectile.charge * 12),
      speedMin: 100,
      speedMax: 220,
      lifeMin: 0.11,
      lifeMax: 0.24,
      sizeMin: 1.4,
      sizeMax: 2.4,
      colorA: '#dfffea',
      colorB: '#9af0c2',
      alpha: 0.55,
      drag: 0.78,
      shape: 'line',
      blend: 'lighter',
    })
  },
}
