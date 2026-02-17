import type { ElementPreset } from '../powerTypes'

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
  drawHeld: (ctx, power, _nowMs, width, height) => {
    const px = power.x * width
    const py = power.y * height
    const radius = 14 + power.charge * 30
    const pulse = 0.8 + Math.random() * 0.45
    ctx.globalCompositeOperation = 'lighter'
    const glow = ctx.createRadialGradient(px, py, radius * 0.1, px, py, radius * 2.6)
    glow.addColorStop(0, 'rgba(242, 236, 255, 0.85)')
    glow.addColorStop(0.6, 'rgba(138, 182, 255, 0.38)')
    glow.addColorStop(1, 'rgba(122, 144, 255, 0)')
    ctx.fillStyle = glow
    ctx.beginPath()
    ctx.arc(px, py, radius * 2.6 * pulse, 0, Math.PI * 2)
    ctx.fill()
    ctx.globalCompositeOperation = 'source-over'

    ctx.strokeStyle = 'rgba(226, 235, 255, 0.95)'
    ctx.lineWidth = 1.8
    drawArc(ctx, px, py, radius * 1.2, 0.75)
    ctx.lineWidth = 1
    drawArc(ctx, px, py, radius * 0.8, 0.45)
  },
  drawProjectile: (ctx, projectile, nowMs, width, height) => {
    const px = projectile.x * width
    const py = projectile.y * height
    const radius = projectile.radius * (0.9 + Math.random() * 0.18)

    ctx.globalCompositeOperation = 'lighter'
    ctx.fillStyle = 'rgba(244, 238, 255, 0.9)'
    ctx.beginPath()
    ctx.arc(px, py, radius, 0, Math.PI * 2)
    ctx.fill()
    ctx.globalCompositeOperation = 'source-over'

    ctx.strokeStyle = `rgba(140, 190, 255, ${0.65 + Math.random() * 0.35})`
    ctx.lineWidth = 1.5
    drawArc(ctx, px, py, radius * 1.5, 0.8)

    ctx.strokeStyle = 'rgba(232, 245, 255, 0.85)'
    ctx.lineWidth = 0.9
    drawArc(ctx, px, py, radius * 0.95, 0.55)

    if (Math.random() > 0.7) {
      ctx.strokeStyle = 'rgba(220, 235, 255, 0.8)'
      ctx.lineWidth = 2
      ctx.beginPath()
      ctx.moveTo(px, py)
      ctx.lineTo(
        px + (Math.random() - 0.5) * radius * 8,
        py + (Math.random() - 0.5) * radius * 8 + Math.sin(nowMs * 0.03) * 3,
      )
      ctx.stroke()
    }
  },
  emitTrail: (projectile, spawn) => {
    if (Math.random() > 0.72) {
      return
    }
    const speed = 80 + Math.random() * 120
    const angle = Math.random() * Math.PI * 2
    spawn({
      x: projectile.x,
      y: projectile.y,
      vx: Math.cos(angle) * speed + projectile.vx * 0.2,
      vy: Math.sin(angle) * speed + projectile.vy * 0.2,
      life: 0.12 + Math.random() * 0.12,
      size: 1.8 + Math.random() * 2,
      color: '#d8e6ff',
      alpha: 0.85,
      drag: 0.82,
      shape: 'line',
      rotation: angle,
    })
  },
  emitImpact: (projectile, spawn) => {
    for (let i = 0; i < 24; i += 1) {
      const angle = Math.random() * Math.PI * 2
      const speed = 120 + Math.random() * 320
      spawn({
        x: projectile.x,
        y: projectile.y,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed,
        life: 0.08 + Math.random() * 0.18,
        size: 1.5 + Math.random() * 1.8,
        color: Math.random() > 0.55 ? '#f0eeff' : '#8ab6ff',
        alpha: 0.9,
        drag: 0.78,
        shape: 'line',
        rotation: angle,
      })
    }
  },
}
