import { clamp } from '../utils/math'
import type { ParticleSpawn, SpawnParticle } from './powerTypes'

export const randRange = (min: number, max: number): number => min + Math.random() * (max - min)

export const randSign = (): number => (Math.random() > 0.5 ? 1 : -1)

export const drawGlow = (
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  radius: number,
  stops: Array<[number, string]>,
  blend: GlobalCompositeOperation = 'lighter',
): void => {
  ctx.save()
  ctx.globalCompositeOperation = blend
  const gradient = ctx.createRadialGradient(x, y, Math.max(0.1, radius * 0.1), x, y, radius)
  for (const [offset, color] of stops) {
    gradient.addColorStop(clamp(offset, 0, 1), color)
  }
  ctx.fillStyle = gradient
  ctx.beginPath()
  ctx.arc(x, y, radius, 0, Math.PI * 2)
  ctx.fill()
  ctx.restore()
}

export const drawRing = (
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  radius: number,
  color: string,
  alpha: number,
  width = 1.2,
): void => {
  if (alpha <= 0.01 || radius <= 0.1) {
    return
  }
  ctx.save()
  ctx.globalAlpha = clamp(alpha, 0, 1)
  ctx.strokeStyle = color
  ctx.lineWidth = width
  ctx.beginPath()
  ctx.arc(x, y, radius, 0, Math.PI * 2)
  ctx.stroke()
  ctx.restore()
}

export const drawCometTail = (
  ctx: CanvasRenderingContext2D,
  fromX: number,
  fromY: number,
  toX: number,
  toY: number,
  color: string,
  alpha: number,
  width: number,
): void => {
  ctx.save()
  ctx.globalCompositeOperation = 'lighter'
  ctx.globalAlpha = clamp(alpha, 0, 1)
  const gradient = ctx.createLinearGradient(fromX, fromY, toX, toY)
  gradient.addColorStop(0, 'rgba(255,255,255,0)')
  gradient.addColorStop(1, color)
  ctx.strokeStyle = gradient
  ctx.lineWidth = width
  ctx.lineCap = 'round'
  ctx.beginPath()
  ctx.moveTo(fromX, fromY)
  ctx.lineTo(toX, toY)
  ctx.stroke()
  ctx.restore()
}

type BurstOptions = {
  x: number
  y: number
  count: number
  speedMin: number
  speedMax: number
  lifeMin: number
  lifeMax: number
  sizeMin: number
  sizeMax: number
  colorA: string
  colorB: string
  alpha?: number
  drag?: number
  gravity?: number
  shape?: ParticleSpawn['shape']
  blend?: ParticleSpawn['blend']
}

export const emitRadialBurst = (spawn: SpawnParticle, options: BurstOptions): void => {
  for (let i = 0; i < options.count; i += 1) {
    const angle = (Math.PI * 2 * i) / options.count + randRange(-0.18, 0.18)
    const speed = randRange(options.speedMin, options.speedMax)
    spawn({
      x: options.x,
      y: options.y,
      vx: Math.cos(angle) * speed,
      vy: Math.sin(angle) * speed,
      life: randRange(options.lifeMin, options.lifeMax),
      size: randRange(options.sizeMin, options.sizeMax),
      color: Math.random() > 0.5 ? options.colorA : options.colorB,
      alpha: options.alpha ?? 0.78,
      drag: options.drag ?? 0.9,
      gravity: options.gravity ?? 0,
      shape: options.shape ?? 'circle',
      blend: options.blend ?? 'lighter',
      spin: randRange(-4.4, 4.4),
      sizeDecay: randRange(0.2, 2.2),
    })
  }
}
