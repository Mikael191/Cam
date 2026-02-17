import type { ElementPreset } from '../powerTypes'

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
    const radius = 16 + power.charge * 32
    const wave = 1 + Math.sin(nowMs * 0.008) * 0.08

    const fill = ctx.createRadialGradient(px, py, 0, px, py, radius * 1.9)
    fill.addColorStop(0, 'rgba(203, 247, 255, 0.9)')
    fill.addColorStop(0.4, 'rgba(83, 183, 255, 0.7)')
    fill.addColorStop(1, 'rgba(74, 165, 255, 0)')
    ctx.fillStyle = fill
    ctx.beginPath()
    ctx.arc(px, py, radius * 1.9, 0, Math.PI * 2)
    ctx.fill()

    ctx.strokeStyle = 'rgba(173, 237, 255, 0.75)'
    ctx.lineWidth = 2
    ctx.beginPath()
    ctx.arc(px, py, radius * wave, 0, Math.PI * 2)
    ctx.stroke()
  },
  drawProjectile: (ctx, projectile, nowMs, width, height) => {
    const px = projectile.x * width
    const py = projectile.y * height
    const radius = projectile.radius
    const wobble = Math.sin(nowMs * 0.02 + projectile.id) * radius * 0.12

    ctx.fillStyle = 'rgba(140, 220, 255, 0.62)'
    ctx.beginPath()
    ctx.ellipse(px, py, radius * 1.08, radius * 0.92 + wobble, 0, 0, Math.PI * 2)
    ctx.fill()
    ctx.strokeStyle = 'rgba(210, 247, 255, 0.85)'
    ctx.lineWidth = 1.2
    ctx.beginPath()
    ctx.arc(px, py, radius * 1.2, 0, Math.PI * 2)
    ctx.stroke()

    const ringPhase = ((nowMs * 0.002 + projectile.id * 0.3) % 1) * 1.2
    ctx.strokeStyle = `rgba(179, 245, 255, ${0.5 - ringPhase * 0.35})`
    ctx.beginPath()
    ctx.arc(px, py, radius * (1.4 + ringPhase), 0, Math.PI * 2)
    ctx.stroke()
  },
  emitTrail: (projectile, spawn) => {
    spawn({
      x: projectile.x,
      y: projectile.y,
      vx: -projectile.vx * (0.1 + Math.random() * 0.2) + (Math.random() - 0.5) * 50,
      vy: -projectile.vy * (0.1 + Math.random() * 0.2) + (Math.random() - 0.5) * 50,
      life: 0.25 + Math.random() * 0.35,
      size: 2 + Math.random() * 3.5,
      color: Math.random() > 0.45 ? '#a8edff' : '#53b7ff',
      alpha: 0.55,
      drag: 0.93,
    })
  },
  emitImpact: (projectile, spawn) => {
    for (let i = 0; i < 22; i += 1) {
      const angle = (Math.PI * 2 * i) / 22
      const speed = 70 + Math.random() * 170
      spawn({
        x: projectile.x,
        y: projectile.y,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed,
        life: 0.25 + Math.random() * 0.35,
        size: 2 + Math.random() * 3,
        color: '#a5e8ff',
        alpha: 0.65,
        drag: 0.9,
      })
    }
  },
}
