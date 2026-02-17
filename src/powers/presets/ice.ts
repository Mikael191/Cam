import type { ElementPreset } from '../powerTypes'

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
    const radius = 16 + power.charge * 28
    ctx.save()
    ctx.translate(px, py)
    ctx.rotate(nowMs * 0.0012)
    ctx.fillStyle = 'rgba(170, 240, 255, 0.7)'
    for (let i = 0; i < 4; i += 1) {
      ctx.save()
      ctx.rotate((Math.PI / 2) * i)
      drawCrystal(ctx, 0, 0, radius * (0.65 + i * 0.05))
      ctx.restore()
    }
    ctx.restore()
    const glow = ctx.createRadialGradient(px, py, 0, px, py, radius * 2.2)
    glow.addColorStop(0, 'rgba(220, 249, 255, 0.55)')
    glow.addColorStop(1, 'rgba(90, 180, 255, 0)')
    ctx.fillStyle = glow
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
    ctx.fillStyle = 'rgba(190, 245, 255, 0.88)'
    drawCrystal(ctx, 0, 0, radius * 1.15)
    ctx.restore()
    ctx.strokeStyle = 'rgba(210, 250, 255, 0.95)'
    ctx.lineWidth = 1.5
    ctx.beginPath()
    ctx.arc(px, py, radius * 1.6, 0, Math.PI * 2)
    ctx.stroke()
  },
  emitTrail: (projectile, spawn) => {
    spawn({
      x: projectile.x,
      y: projectile.y,
      vx: -projectile.vx * (0.08 + Math.random() * 0.18),
      vy: -projectile.vy * (0.08 + Math.random() * 0.18),
      life: 0.4 + Math.random() * 0.35,
      size: 2 + Math.random() * 3,
      color: '#c9f5ff',
      alpha: 0.6,
      drag: 0.94,
      shape: Math.random() > 0.5 ? 'square' : 'circle',
      rotation: Math.random() * Math.PI,
    })
  },
  emitImpact: (projectile, spawn) => {
    for (let i = 0; i < 16; i += 1) {
      const angle = (Math.PI * 2 * i) / 16 + Math.random() * 0.2
      const speed = 90 + Math.random() * 190
      spawn({
        x: projectile.x,
        y: projectile.y,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed,
        life: 0.35 + Math.random() * 0.25,
        size: 2 + Math.random() * 4,
        color: '#d8f9ff',
        alpha: 0.8,
        drag: 0.9,
        shape: 'square',
      })
    }
  },
}
