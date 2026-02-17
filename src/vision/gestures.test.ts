import { describe, expect, it } from 'vitest'
import { DEFAULT_THRESHOLDS, GestureEngine } from './gestures'
import type { HandLandmark, TrackedHand } from './handTracker'

const createBaseLandmarks = (): HandLandmark[] => [
  { x: 0.5, y: 0.82, z: 0 },
  { x: 0.44, y: 0.74, z: 0 },
  { x: 0.4, y: 0.66, z: 0 },
  { x: 0.35, y: 0.61, z: 0 },
  { x: 0.28, y: 0.57, z: 0 },
  { x: 0.45, y: 0.66, z: 0 },
  { x: 0.45, y: 0.58, z: 0 },
  { x: 0.47, y: 0.49, z: 0 },
  { x: 0.52, y: 0.38, z: 0 },
  { x: 0.51, y: 0.66, z: 0 },
  { x: 0.51, y: 0.57, z: 0 },
  { x: 0.52, y: 0.48, z: 0 },
  { x: 0.53, y: 0.37, z: 0 },
  { x: 0.57, y: 0.67, z: 0 },
  { x: 0.57, y: 0.59, z: 0 },
  { x: 0.58, y: 0.51, z: 0 },
  { x: 0.6, y: 0.42, z: 0 },
  { x: 0.62, y: 0.69, z: 0 },
  { x: 0.63, y: 0.62, z: 0 },
  { x: 0.64, y: 0.55, z: 0 },
  { x: 0.66, y: 0.48, z: 0 },
]

const createHand = (mode: 'open' | 'pinch' | 'fist'): TrackedHand => {
  const landmarks = createBaseLandmarks()

  if (mode === 'pinch') {
    landmarks[4] = { x: 0.48, y: 0.46, z: 0 }
    landmarks[8] = { x: 0.5, y: 0.45, z: 0 }
  }

  if (mode === 'fist') {
    landmarks[4] = { x: 0.41, y: 0.76, z: 0 }
    landmarks[8] = { x: 0.5, y: 0.74, z: 0 }
    landmarks[12] = { x: 0.51, y: 0.74, z: 0 }
    landmarks[16] = { x: 0.52, y: 0.75, z: 0 }
    landmarks[20] = { x: 0.53, y: 0.76, z: 0 }
  }

  return {
    slotId: 0,
    handedness: 'Right',
    confidence: 0.95,
    staleMs: 0,
    lost: false,
    landmarks,
    rawLandmarks: landmarks,
    palm: { x: landmarks[0].x, y: landmarks[0].y },
    indexTip: { x: landmarks[8].x, y: landmarks[8].y },
    bbox: { x: 0.28, y: 0.35, width: 0.38, height: 0.47 },
  }
}

describe('GestureEngine', () => {
  it('emite pinch tap para pinch curto', () => {
    const engine = new GestureEngine({
      ...DEFAULT_THRESHOLDS,
      pinchEnter: 0.55,
      pinchExit: 0.75,
    })

    engine.update(createHand('pinch'), 0)
    engine.update(createHand('pinch'), 40)
    engine.update(createHand('pinch'), 80)
    const releaseFrames = [120, 160, 200, 240, 280, 320, 360, 400].map((time) =>
      engine.update(createHand('open'), time),
    )
    const frame = releaseFrames.find((entry) => entry.events.pinchEnd)

    expect(frame).toBeDefined()
    expect(frame?.events.pinchTap).toBe(true)
    expect(frame?.events.pinchEnd).toBe(true)
  })

  it('emite pinch hold start apos hold minimo', () => {
    const engine = new GestureEngine({
      ...DEFAULT_THRESHOLDS,
      pinchEnter: 0.55,
      pinchExit: 0.75,
    })

    engine.update(createHand('pinch'), 0)
    engine.update(createHand('pinch'), 40)
    engine.update(createHand('pinch'), 80)
    const holdFrame = engine.update(createHand('pinch'), 470)
    const releaseFrames = [560, 600, 640, 680, 720].map((time) =>
      engine.update(createHand('open'), time),
    )
    const releaseFrame = releaseFrames.find((entry) => entry.events.pinchEnd)

    expect(holdFrame.events.pinchHoldStart).toBe(true)
    expect(releaseFrame).toBeDefined()
    expect(releaseFrame?.events.pinchTap).toBe(false)
    expect(releaseFrame?.events.pinchEnd).toBe(true)
  })

  it('abre open palm hold apos duracao configurada', () => {
    const engine = new GestureEngine(DEFAULT_THRESHOLDS)

    engine.update(createHand('open'), 0)
    engine.update(createHand('open'), 40)
    const frame = engine.update(createHand('open'), 690)

    expect(frame.events.openPalmHold).toBe(true)
  })

  it('emite fist hold com debounce', () => {
    const engine = new GestureEngine(DEFAULT_THRESHOLDS)

    engine.update(createHand('fist'), 0)
    engine.update(createHand('fist'), 40)
    const frame = engine.update(createHand('fist'), 450)

    expect(frame.events.fistHold).toBe(true)
  })
})
