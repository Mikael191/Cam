import type { ElementPreset } from '../powerTypes'

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
    const radius = 18 + power.charge * 30
    const phase = nowMs * 0.003
    ctx.strokeStyle = 'rgba(182, 249, 214, 0.75)'
    ctx.lineWidth = 1.4
    drawSpiral(ctx, px, py, radius, phase)
    ctx.strokeStyle = 'rgba(134, 234, 185, 0.55)'
    drawSpiral(ctx, px, py, radius * 0.75, -phase * 1.1)
  },
  drawProjectile: (ctx, projectile, nowMs, width, height) => {
    const px = projectile.x * width
    const py = projectile.y * height
    const radius = projectile.radius * (0.9 + Math.sin(nowMs * 0.01) * 0.08)
    ctx.strokeStyle = 'rgba(210, 255, 233, 0.75)'
    ctx.lineWidth = 1.6
    drawSpiral(ctx, px, py, radius * 1.4, nowMs * 0.007 + projectile.id)
    ctx.strokeStyle = 'rgba(154, 240, 194, 0.45)'
    drawSpiral(ctx, px, py, radius, -nowMs * 0.009)
  },
  emitTrail: (projectile, spawn, nowMs) => {
    const angle = nowMs * 0.014 + projectile.id
    spawn({
      x: projectile.x + Math.cos(angle) * 0.01,
      y: projectile.y + Math.sin(angle) * 0.01,
      vx: -projectile.vx * 0.12 + Math.cos(angle) * 90,
      vy: -projectile.vy * 0.12 + Math.sin(angle) * 90,
      life: 0.18 + Math.random() * 0.22,
      size: 2 + Math.random() * 2,
      color: '#c8ffe5',
      alpha: 0.5,
      drag: 0.88,
      shape: 'line',
      rotation: angle,
    })
  },
  emitImpact: (projectile, spawn) => {
    for (let i = 0; i < 20; i += 1) {
      const angle = (Math.PI * 2 * i) / 20
      const speed = 90 + Math.random() * 160
      spawn({
        x: projectile.x,
        y: projectile.y,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed,
        life: 0.12 + Math.random() * 0.2,
        size: 1.5 + Math.random() * 2,
        color: '#bfffdc',
        alpha: 0.55,
        drag: 0.82,
        shape: 'line',
        rotation: angle,
      })
    }
  },
}
