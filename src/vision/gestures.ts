import { clamp, distance3D, median } from '../utils/math'
import type { TrackedHand } from './handTracker'

export type GestureThresholds = {
  pinchEnter: number
  pinchExit: number
  pinchTapMaxMs: number
  pinchHoldMs: number
  openPalmHoldMs: number
  fistHoldMs: number
}

export type GestureEvents = {
  pinchTap: boolean
  pinchHoldStart: boolean
  pinchEnd: boolean
  openPalmHold: boolean
  fistHold: boolean
}

export type GestureFrame = {
  handPresent: boolean
  pinch: boolean
  openPalm: boolean
  fist: boolean
  pinchRatio: number
  confidence: number
  label: string
  pinchDurationMs: number
  events: GestureEvents
}

export type CalibrationStage = 'idle' | 'open_palm' | 'pinch' | 'done'

export type CalibrationUpdate = {
  stage: CalibrationStage
  progress: number
  pinchCount: number
  completed: boolean
  result: GestureThresholds | null
}

const INDEX = {
  wrist: 0,
  thumbTip: 4,
  thumbIp: 3,
  indexMcp: 5,
  indexPip: 6,
  indexTip: 8,
  middleMcp: 9,
  middlePip: 10,
  middleTip: 12,
  ringMcp: 13,
  ringPip: 14,
  ringTip: 16,
  pinkyMcp: 17,
  pinkyPip: 18,
  pinkyTip: 20,
}

export const DEFAULT_THRESHOLDS: GestureThresholds = {
  pinchEnter: 0.33,
  pinchExit: 0.42,
  pinchTapMaxMs: 200,
  pinchHoldMs: 350,
  openPalmHoldMs: 600,
  fistHoldMs: 350,
}

export class GestureEngine {
  private thresholds: GestureThresholds
  private pinchActive = false
  private pinchStartedAtMs = 0
  private pinchHoldEmitted = false
  private pinchRatioEma = 1
  private pinchVelocityEma = 0
  private pinchEnterFrames = 0
  private pinchExitFrames = 0
  private lastUpdateMs = 0
  private openPalmFrames = 0
  private fistFrames = 0
  private openPalmStartedAtMs = 0
  private openPalmEmitted = false
  private fistStartedAtMs = 0
  private fistEmitted = false

  constructor(thresholds: GestureThresholds = DEFAULT_THRESHOLDS) {
    this.thresholds = thresholds
  }

  setThresholds(thresholds: GestureThresholds): void {
    this.thresholds = thresholds
  }

  reset(): void {
    this.pinchActive = false
    this.pinchStartedAtMs = 0
    this.pinchHoldEmitted = false
    this.pinchRatioEma = 1
    this.pinchVelocityEma = 0
    this.pinchEnterFrames = 0
    this.pinchExitFrames = 0
    this.lastUpdateMs = 0
    this.openPalmFrames = 0
    this.fistFrames = 0
    this.openPalmStartedAtMs = 0
    this.openPalmEmitted = false
    this.fistStartedAtMs = 0
    this.fistEmitted = false
  }

  update(hand: TrackedHand | null, nowMs: number): GestureFrame {
    const events: GestureEvents = {
      pinchTap: false,
      pinchHoldStart: false,
      pinchEnd: false,
      openPalmHold: false,
      fistHold: false,
    }

    if (!hand) {
      if (this.pinchActive) {
        events.pinchEnd = true
      }
      this.reset()
      return {
        handPresent: false,
        pinch: false,
        openPalm: false,
        fist: false,
        pinchRatio: 1,
        confidence: 0,
        label: 'NO_HAND',
        pinchDurationMs: 0,
        events,
      }
    }

    const lm = hand.landmarks
    const wrist = lm[INDEX.wrist]
    const middleMcp = lm[INDEX.middleMcp]
    const palmSize = Math.max(distance3D(wrist, middleMcp), 0.03)
    const frameDtMs = this.lastUpdateMs ? clamp(nowMs - this.lastUpdateMs, 8, 80) : 16
    this.lastUpdateMs = nowMs

    const pinchDistance = distance3D(lm[INDEX.thumbTip], lm[INDEX.indexTip])
    const pinchRatio = pinchDistance / palmSize
    const pinchVelocity = (pinchRatio - this.pinchRatioEma) / Math.max(0.016, frameDtMs / 1000)
    this.pinchVelocityEma = this.pinchVelocityEma * 0.62 + pinchVelocity * 0.38
    this.pinchRatioEma = this.pinchRatioEma * 0.62 + pinchRatio * 0.38

    const stability = clamp(
      hand.confidence * 0.72 + (1 - clamp(hand.staleMs / 260, 0, 1)) * 0.28,
      0.42,
      1,
    )
    const adaptivePinch = resolveAdaptivePinchThresholds(this.thresholds, stability)

    let pinch = this.pinchActive
    if (!this.pinchActive) {
      const entering = this.pinchRatioEma < adaptivePinch.enter && this.pinchVelocityEma < 1.24
      this.pinchEnterFrames = entering ? this.pinchEnterFrames + 1 : 0
      if (this.pinchEnterFrames >= 2) {
        this.pinchActive = true
        this.pinchStartedAtMs = nowMs
        this.pinchHoldEmitted = false
        this.pinchExitFrames = 0
        pinch = true
      } else {
        pinch = false
      }
    } else {
      const exiting = this.pinchRatioEma > adaptivePinch.exit || this.pinchVelocityEma > 2.36
      this.pinchExitFrames = exiting ? this.pinchExitFrames + 1 : 0
      if (this.pinchExitFrames >= 2) {
        const duration = nowMs - this.pinchStartedAtMs
        if (!this.pinchHoldEmitted && duration <= this.thresholds.pinchTapMaxMs) {
          events.pinchTap = true
        }
        events.pinchEnd = true
        this.pinchActive = false
        this.pinchStartedAtMs = 0
        this.pinchHoldEmitted = false
        this.pinchEnterFrames = 0
        this.pinchExitFrames = 0
        pinch = false
      } else {
        pinch = true
      }
    }

    const indexExtended = fingerExtended(lm[INDEX.indexTip], lm[INDEX.indexPip], lm[INDEX.indexMcp], wrist)
    const middleExtended = fingerExtended(
      lm[INDEX.middleTip],
      lm[INDEX.middlePip],
      lm[INDEX.middleMcp],
      wrist,
    )
    const ringExtended = fingerExtended(lm[INDEX.ringTip], lm[INDEX.ringPip], lm[INDEX.ringMcp], wrist)
    const pinkyExtended = fingerExtended(
      lm[INDEX.pinkyTip],
      lm[INDEX.pinkyPip],
      lm[INDEX.pinkyMcp],
      wrist,
    )
    const thumbExtended = thumbExtendedScore(
      lm[INDEX.thumbTip],
      lm[INDEX.thumbIp],
      lm[INDEX.indexMcp],
      wrist,
    )

    const extendedCount = [thumbExtended, indexExtended, middleExtended, ringExtended, pinkyExtended]
      .filter(Boolean).length
    const openPalmCandidate = extendedCount >= 4 && !pinch
    const fistCandidate = extendedCount <= 1 && !pinch

    this.openPalmFrames = openPalmCandidate ? Math.min(8, this.openPalmFrames + 1) : 0
    this.fistFrames = fistCandidate ? Math.min(8, this.fistFrames + 1) : 0

    const frameGate = hand.confidence < 0.55 || hand.staleMs > 60 ? 3 : 2
    const openPalm = this.openPalmFrames >= frameGate
    const fist = this.fistFrames >= frameGate

    if (this.pinchActive && !this.pinchHoldEmitted) {
      if (nowMs - this.pinchStartedAtMs >= this.thresholds.pinchHoldMs) {
        this.pinchHoldEmitted = true
        events.pinchHoldStart = true
      }
    }

    if (openPalm) {
      if (!this.openPalmStartedAtMs) {
        this.openPalmStartedAtMs = nowMs
        this.openPalmEmitted = false
      } else if (
        !this.openPalmEmitted &&
        nowMs - this.openPalmStartedAtMs >= this.thresholds.openPalmHoldMs
      ) {
        this.openPalmEmitted = true
        events.openPalmHold = true
      }
    } else {
      this.openPalmStartedAtMs = 0
      this.openPalmEmitted = false
    }

    if (fist) {
      if (!this.fistStartedAtMs) {
        this.fistStartedAtMs = nowMs
        this.fistEmitted = false
      } else if (!this.fistEmitted && nowMs - this.fistStartedAtMs >= this.thresholds.fistHoldMs) {
        this.fistEmitted = true
        events.fistHold = true
      }
    } else {
      this.fistStartedAtMs = 0
      this.fistEmitted = false
    }

    const pinchDurationMs = this.pinchActive ? nowMs - this.pinchStartedAtMs : 0
    const confidence = clamp(0.5 + hand.confidence * 0.4 + (pinch || openPalm || fist ? 0.1 : 0), 0, 1)

    return {
      handPresent: true,
      pinch,
      openPalm,
      fist,
      pinchRatio: this.pinchRatioEma,
      confidence,
      label: resolveGestureLabel(pinch, this.pinchHoldEmitted, openPalm, fist),
      pinchDurationMs,
      events,
    }
  }
}

export class CalibrationSession {
  private running = false
  private stage: CalibrationStage = 'idle'
  private stageStartedAtMs = 0
  private openHoldProgress = 0
  private pinchRatios: number[] = []
  private pinchCount = 0
  private lastPinch = false
  private result: GestureThresholds | null = null

  start(nowMs: number): void {
    this.running = true
    this.stage = 'open_palm'
    this.stageStartedAtMs = nowMs
    this.openHoldProgress = 0
    this.pinchRatios = []
    this.pinchCount = 0
    this.lastPinch = false
    this.result = null
  }

  stop(): void {
    this.running = false
    this.stage = 'idle'
  }

  isRunning(): boolean {
    return this.running
  }

  update(hand: TrackedHand | null, gesture: GestureFrame, nowMs: number): CalibrationUpdate {
    if (!this.running) {
      return {
        stage: this.stage,
        progress: 0,
        pinchCount: this.pinchCount,
        completed: false,
        result: this.result,
      }
    }

    if (this.stage === 'open_palm') {
      if (gesture.openPalm && hand) {
        const elapsed = nowMs - this.stageStartedAtMs
        this.openHoldProgress = clamp(elapsed / 2000, 0, 1)
        if (this.openHoldProgress >= 1) {
          this.stage = 'pinch'
          this.stageStartedAtMs = nowMs
        }
      } else {
        this.stageStartedAtMs = nowMs
        this.openHoldProgress = 0
      }
      return {
        stage: this.stage,
        progress: this.openHoldProgress,
        pinchCount: this.pinchCount,
        completed: false,
        result: null,
      }
    }

    if (this.stage === 'pinch') {
      const currentPinch = gesture.pinch && handPresentWithConfidence(hand)
      if (currentPinch && !this.lastPinch) {
        this.pinchCount += 1
        this.pinchRatios.push(gesture.pinchRatio)
      }
      this.lastPinch = currentPinch

      if (this.pinchCount >= 2) {
        const base = median(this.pinchRatios)
        const enter = clamp(base * 1.25, 0.2, 0.45)
        const exit = clamp(enter * 1.28, enter + 0.05, 0.62)
        this.result = {
          ...DEFAULT_THRESHOLDS,
          pinchEnter: enter,
          pinchExit: exit,
        }
        this.stage = 'done'
        this.running = false
        return {
          stage: 'done',
          progress: 1,
          pinchCount: this.pinchCount,
          completed: true,
          result: this.result,
        }
      }
      return {
        stage: this.stage,
        progress: clamp(this.pinchCount / 2, 0, 1),
        pinchCount: this.pinchCount,
        completed: false,
        result: null,
      }
    }

    return {
      stage: this.stage,
      progress: this.stage === 'done' ? 1 : 0,
      pinchCount: this.pinchCount,
      completed: this.stage === 'done',
      result: this.result,
    }
  }
}

const resolveGestureLabel = (
  pinch: boolean,
  pinchHolding: boolean,
  openPalm: boolean,
  fist: boolean,
): string => {
  if (pinch) {
    return pinchHolding ? 'PINCH_HOLD' : 'PINCH'
  }
  if (openPalm) {
    return 'OPEN_PALM'
  }
  if (fist) {
    return 'FIST'
  }
  return 'IDLE'
}

const resolveAdaptivePinchThresholds = (
  thresholds: GestureThresholds,
  stability: number,
): { enter: number; exit: number } => {
  const instability = 1 - clamp(stability, 0, 1)
  const enter = clamp(thresholds.pinchEnter * (1 + instability * 0.2), 0.18, 0.58)
  const exit = clamp(
    thresholds.pinchExit * (1 + instability * 0.16),
    enter + 0.04,
    0.72,
  )
  return { enter, exit }
}

const fingerExtended = (
  tip: { x: number; y: number; z: number },
  pip: { x: number; y: number; z: number },
  mcp: { x: number; y: number; z: number },
  wrist: { x: number; y: number; z: number },
): boolean => {
  const tipDistance = distance3D(tip, wrist)
  const pipDistance = distance3D(pip, wrist)
  const mcpDistance = distance3D(mcp, wrist)
  return tipDistance > pipDistance * 1.03 && pipDistance > mcpDistance * 0.95
}

const thumbExtendedScore = (
  tip: { x: number; y: number; z: number },
  ip: { x: number; y: number; z: number },
  indexMcp: { x: number; y: number; z: number },
  wrist: { x: number; y: number; z: number },
): boolean => {
  const tipPalm = distance3D(tip, indexMcp)
  const ipPalm = distance3D(ip, indexMcp)
  const tipWrist = distance3D(tip, wrist)
  const ipWrist = distance3D(ip, wrist)
  return tipPalm > ipPalm * 1.04 && tipWrist >= ipWrist
}

const handPresentWithConfidence = (hand: TrackedHand | null): boolean =>
  Boolean(hand && hand.confidence > 0.35 && hand.staleMs < 240)
