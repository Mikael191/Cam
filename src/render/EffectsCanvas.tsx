import { useEffect, useRef } from 'react'
import { FpsCounter, deltaSeconds } from '../utils/time'
import type { TrackerFrame } from '../vision/handTracker'
import { HAND_CONNECTIONS } from '../vision/handTracker'
import { clamp } from '../utils/math'
import { PowerSystem } from '../powers/powerSystem'

type EffectsCanvasProps = {
  powerSystem: PowerSystem
  frame: TrackerFrame | null
  debugLandmarks: boolean
  mirror: boolean
  onRenderFps: (fps: number) => void
}

type SizeState = {
  width: number
  height: number
  dpr: number
}

const drawDebug = (
  ctx: CanvasRenderingContext2D,
  frame: TrackerFrame,
  width: number,
  height: number,
  mirror: boolean,
): void => {
  const mapX = (x: number) => (mirror ? 1 - x : x) * width
  const mapY = (y: number) => y * height

  for (const hand of frame.hands) {
    const bboxX = mapX(hand.bbox.x)
    const bboxY = mapY(hand.bbox.y)
    const bboxWidth = hand.bbox.width * width
    const bboxHeight = hand.bbox.height * height
    const drawX = mirror ? bboxX - bboxWidth : bboxX

    ctx.save()
    ctx.strokeStyle = hand.handedness === 'Left' ? 'rgba(144, 197, 255, 0.82)' : 'rgba(255, 173, 142, 0.82)'
    ctx.lineWidth = 1.2
    ctx.strokeRect(drawX, bboxY, bboxWidth, bboxHeight)

    ctx.strokeStyle = 'rgba(180, 230, 255, 0.66)'
    ctx.lineWidth = 1.1
    for (const [a, b] of HAND_CONNECTIONS) {
      const from = hand.landmarks[a]
      const to = hand.landmarks[b]
      ctx.beginPath()
      ctx.moveTo(mapX(from.x), mapY(from.y))
      ctx.lineTo(mapX(to.x), mapY(to.y))
      ctx.stroke()
    }

    const pointSize = clamp(2 + hand.confidence * 2, 2, 4)
    for (const point of hand.landmarks) {
      ctx.fillStyle = 'rgba(225, 246, 255, 0.9)'
      ctx.beginPath()
      ctx.arc(mapX(point.x), mapY(point.y), pointSize, 0, Math.PI * 2)
      ctx.fill()
    }

    ctx.restore()
  }
}

const EffectsCanvas = ({
  powerSystem,
  frame,
  debugLandmarks,
  mirror,
  onRenderFps,
}: EffectsCanvasProps) => {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const frameRef = useRef<TrackerFrame | null>(frame)
  const debugRef = useRef(debugLandmarks)
  const mirrorRef = useRef(mirror)
  const onRenderFpsRef = useRef(onRenderFps)
  const sizeRef = useRef<SizeState>({ width: 1, height: 1, dpr: 1 })
  const fpsRef = useRef(new FpsCounter())

  useEffect(() => {
    frameRef.current = frame
  }, [frame])

  useEffect(() => {
    debugRef.current = debugLandmarks
  }, [debugLandmarks])

  useEffect(() => {
    mirrorRef.current = mirror
  }, [mirror])

  useEffect(() => {
    onRenderFpsRef.current = onRenderFps
  }, [onRenderFps])

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) {
      return
    }
    const ctx = canvas.getContext('2d', { alpha: true, desynchronized: true })
    if (!ctx) {
      return
    }

    const resize = () => {
      const width = Math.max(1, window.innerWidth)
      const height = Math.max(1, window.innerHeight)
      const dpr = Math.min(2, window.devicePixelRatio || 1)
      canvas.width = Math.round(width * dpr)
      canvas.height = Math.round(height * dpr)
      canvas.style.width = `${width}px`
      canvas.style.height = `${height}px`
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0)
      sizeRef.current = { width, height, dpr }
    }

    let rafId = 0
    let previousMs = performance.now()

    const render = () => {
      const nowMs = performance.now()
      const dt = deltaSeconds(previousMs, nowMs)
      previousMs = nowMs

      const { width, height } = sizeRef.current
      powerSystem.update(dt)
      powerSystem.render(ctx, width, height, nowMs)

      if (debugRef.current && frameRef.current) {
        drawDebug(ctx, frameRef.current, width, height, mirrorRef.current)
      }

      const fps = fpsRef.current.update(nowMs)
      onRenderFpsRef.current(fps)
      rafId = requestAnimationFrame(render)
    }

    resize()
    window.addEventListener('resize', resize)
    rafId = requestAnimationFrame(render)

    return () => {
      cancelAnimationFrame(rafId)
      window.removeEventListener('resize', resize)
    }
  }, [powerSystem])

  return <canvas ref={canvasRef} className="pointer-events-none absolute inset-0 z-20" />
}

export default EffectsCanvas
