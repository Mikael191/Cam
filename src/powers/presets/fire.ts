import { clamp } from '../../utils/math'
import type { ElementPreset } from '../powerTypes'

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
    const flicker = 0.82 + Math.sin(nowMs * 0.02) * 0.18 + Math.random() * 0.06
    const radius = (18 + power.charge * 36) * flicker
    const gradient = ctx.createRadialGradient(px, py, radius * 0.1, px, py, radius * 1.6)
    gradient.addColorStop(0, '#ffe29a')
    gradient.addColorStop(0.28, '#ffb347')
    gradient.addColorStop(0.6, '#ff6723')
    gradient.addColorStop(1, 'rgba(255, 62, 0, 0)')
    ctx.globalCompositeOperation = 'lighter'
    ctx.fillStyle = gradient
    ctx.beginPath()
    ctx.arc(px, py, radius * 1.6, 0, Math.PI * 2)
    ctx.fill()
    ctx.globalCompositeOperation = 'source-over'
  },
  drawProjectile: (ctx, projectile, nowMs, width, height) => {
    const px = projectile.x * width
    const py = projectile.y * height
    const flicker = 0.85 + Math.sin((nowMs + projectile.id) * 0.03) * 0.15
    const radius = projectile.radius * flicker
    const gradient = ctx.createRadialGradient(px, py, radius * 0.2, px, py, radius * 2.5)
    gradient.addColorStop(0, '#fff4be')
    gradient.addColorStop(0.2, '#ffc468')
    gradient.addColorStop(0.5, '#ff7a29')
    gradient.addColorStop(1, 'rgba(255, 78, 14, 0)')
    ctx.globalCompositeOperation = 'lighter'
    ctx.fillStyle = gradient
    ctx.beginPath()
    ctx.arc(px, py, radius * 2.5, 0, Math.PI * 2)
    ctx.fill()
    ctx.globalCompositeOperation = 'source-over'
  },
  emitTrail: (projectile, spawn) => {
    const intensity = clamp(projectile.charge * 1.2 + 0.35, 0.2, 1.4)
    for (let i = 0; i < 2; i += 1) {
      const spread = (Math.random() - 0.5) * 120
      spawn({
        x: projectile.x,
        y: projectile.y,
        vx: -projectile.vx * (0.16 + Math.random() * 0.25) + spread,
        vy: -projectile.vy * (0.12 + Math.random() * 0.22) + spread * 0.35,
        life: 0.22 + Math.random() * 0.2,
        size: 2.5 + Math.random() * 4 * intensity,
        color: Math.random() > 0.6 ? '#ffd166' : '#ff6723',
        alpha: 0.7,
        drag: 0.95,
      })
    }
  },
  emitImpact: (projectile, spawn) => {
    for (let i = 0; i < 18; i += 1) {
      const angle = (Math.PI * 2 * i) / 18 + Math.random() * 0.2
      const speed = 120 + Math.random() * 240
      spawn({
        x: projectile.x,
        y: projectile.y,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed,
        life: 0.25 + Math.random() * 0.35,
        size: 3 + Math.random() * 4,
        color: Math.random() > 0.5 ? '#ff7a29' : '#ffd166',
        alpha: 0.85,
        drag: 0.92,
      })
    }
  },
}
