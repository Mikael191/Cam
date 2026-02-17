import type { ElementPreset } from '../powerTypes'

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
    const radius = 14 + power.charge * 30
    ctx.save()
    ctx.translate(px, py)
    ctx.rotate(nowMs * 0.0008)
    ctx.fillStyle = 'rgba(182, 141, 86, 0.88)'
    drawRock(ctx, radius)
    ctx.fillStyle = 'rgba(215, 187, 138, 0.55)'
    ctx.rotate(-nowMs * 0.0016)
    drawRock(ctx, radius * 0.62)
    ctx.restore()
    ctx.fillStyle = 'rgba(188, 151, 95, 0.22)'
    ctx.beginPath()
    ctx.arc(px, py, radius * 2.2, 0, Math.PI * 2)
    ctx.fill()
  },
  drawProjectile: (ctx, projectile, nowMs, width, height) => {
    const px = projectile.x * width
    const py = projectile.y * height
    const radius = projectile.radius
    ctx.save()
    ctx.translate(px, py)
    ctx.rotate(nowMs * 0.002 + projectile.id)
    ctx.fillStyle = 'rgba(160, 124, 76, 0.95)'
    drawRock(ctx, radius * 1.2)
    ctx.fillStyle = 'rgba(214, 187, 140, 0.45)'
    drawRock(ctx, radius * 0.72)
    ctx.restore()
  },
  emitTrail: (projectile, spawn) => {
    if (Math.random() > 0.7) {
      return
    }
    spawn({
      x: projectile.x + (Math.random() - 0.5) * 0.02,
      y: projectile.y + (Math.random() - 0.5) * 0.02,
      vx: -projectile.vx * (0.06 + Math.random() * 0.14),
      vy: -projectile.vy * (0.06 + Math.random() * 0.14),
      life: 0.3 + Math.random() * 0.35,
      size: 2 + Math.random() * 3,
      color: Math.random() > 0.5 ? '#b68d56' : '#d7bb8a',
      alpha: 0.58,
      drag: 0.92,
      shape: Math.random() > 0.55 ? 'square' : 'circle',
    })
  },
  emitImpact: (projectile, spawn) => {
    for (let i = 0; i < 24; i += 1) {
      const angle = Math.random() * Math.PI * 2
      const speed = 50 + Math.random() * 200
      spawn({
        x: projectile.x,
        y: projectile.y,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed,
        life: 0.2 + Math.random() * 0.5,
        size: 2 + Math.random() * 4,
        color: Math.random() > 0.55 ? '#a88356' : '#d7bb8a',
        alpha: 0.74,
        drag: 0.9,
        shape: Math.random() > 0.4 ? 'square' : 'circle',
      })
    }
  },
}
