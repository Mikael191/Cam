import { clamp, distance3D } from '../utils/math'

export type Landmark = {
  x: number
  y: number
  z: number
}

export type HandGestureInput = {
  landmarks: Landmark[]
  score: number
}

export type GestureEvents = {
  pinchTap: boolean
  pinchHoldStart: boolean
  pinchEnd: boolean
  openPalmHold: boolean
}

export type GestureFrame = {
  handPresent: boolean
  pinch: boolean
  openPalm: boolean
  fist: boolean
  label: string
  confidence: number
  pinchDurationMs: number
  events: GestureEvents
}

export type GestureThresholds = {
  pinchRatio: number
  pinchTapMaxMs: number
  pinchHoldMs: number
  openPalmHoldMs: number
}

const INDEXES = {
  wrist: 0,
  thumbIp: 3,
  thumbTip: 4,
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

const DEFAULT_THRESHOLDS: GestureThresholds = {
  pinchRatio: 0.35,
  pinchTapMaxMs: 260,
  pinchHoldMs: 350,
  openPalmHoldMs: 700,
}

export class GestureEngine {
  private readonly thresholds: GestureThresholds
  private pinchActive = false
  private pinchStartedAt = 0
  private pinchHoldEmitted = false
  private openPalmStartedAt = 0
  private openPalmEmitted = false

  constructor(thresholds?: Partial<GestureThresholds>) {
    this.thresholds = {
      ...DEFAULT_THRESHOLDS,
      ...thresholds,
    }
  }

  reset(): void {
    this.pinchActive = false
    this.pinchStartedAt = 0
    this.pinchHoldEmitted = false
    this.openPalmStartedAt = 0
    this.openPalmEmitted = false
  }

  update(hand: HandGestureInput | null, nowMs: number): GestureFrame {
    const events: GestureEvents = {
      pinchTap: false,
      pinchHoldStart: false,
      pinchEnd: false,
      openPalmHold: false,
    }

    if (!hand || hand.landmarks.length < 21) {
      if (this.pinchActive) {
        events.pinchEnd = true
      }
      this.reset()
      return {
        handPresent: false,
        pinch: false,
        openPalm: false,
        fist: false,
        label: 'NO_HAND',
        confidence: 0,
        pinchDurationMs: 0,
        events,
      }
    }

    const lm = hand.landmarks
    const wrist = lm[INDEXES.wrist]
    const middleMcp = lm[INDEXES.middleMcp]
    const palmSize = Math.max(distance3D(wrist, middleMcp), 0.02)

    const thumbTip = lm[INDEXES.thumbTip]
    const indexTip = lm[INDEXES.indexTip]
    const pinchDistance = distance3D(thumbTip, indexTip)
    const pinchRatio = pinchDistance / palmSize
    const pinch = pinchRatio < this.thresholds.pinchRatio

    const indexExtended = fingerExtended(
      lm[INDEXES.indexTip],
      lm[INDEXES.indexPip],
      lm[INDEXES.indexMcp],
      wrist,
    )
    const middleExtended = fingerExtended(
      lm[INDEXES.middleTip],
      lm[INDEXES.middlePip],
      lm[INDEXES.middleMcp],
      wrist,
    )
    const ringExtended = fingerExtended(
      lm[INDEXES.ringTip],
      lm[INDEXES.ringPip],
      lm[INDEXES.ringMcp],
      wrist,
    )
    const pinkyExtended = fingerExtended(
      lm[INDEXES.pinkyTip],
      lm[INDEXES.pinkyPip],
      lm[INDEXES.pinkyMcp],
      wrist,
    )
    const thumbExtended = thumbIsExtended(
      lm[INDEXES.thumbTip],
      lm[INDEXES.thumbIp],
      lm[INDEXES.indexMcp],
      wrist,
    )

    const extendedCount = [
      thumbExtended,
      indexExtended,
      middleExtended,
      ringExtended,
      pinkyExtended,
    ].filter(Boolean).length

    const avgTipToWrist =
      (distance3D(lm[INDEXES.indexTip], wrist) +
        distance3D(lm[INDEXES.middleTip], wrist) +
        distance3D(lm[INDEXES.ringTip], wrist) +
        distance3D(lm[INDEXES.pinkyTip], wrist)) /
      4

    const openPalm = extendedCount >= 4 && !pinch
    const fist = extendedCount <= 1 && avgTipToWrist < palmSize * 2.0 && !pinch

    if (pinch && !this.pinchActive) {
      this.pinchActive = true
      this.pinchStartedAt = nowMs
      this.pinchHoldEmitted = false
    } else if (pinch && this.pinchActive) {
      const pinchDuration = nowMs - this.pinchStartedAt
      if (!this.pinchHoldEmitted && pinchDuration >= this.thresholds.pinchHoldMs) {
        this.pinchHoldEmitted = true
        events.pinchHoldStart = true
      }
    } else if (!pinch && this.pinchActive) {
      const pinchDuration = nowMs - this.pinchStartedAt
      if (!this.pinchHoldEmitted && pinchDuration <= this.thresholds.pinchTapMaxMs) {
        events.pinchTap = true
      }
      events.pinchEnd = true
      this.pinchActive = false
      this.pinchHoldEmitted = false
      this.pinchStartedAt = 0
    }

    if (openPalm) {
      if (!this.openPalmStartedAt) {
        this.openPalmStartedAt = nowMs
        this.openPalmEmitted = false
      } else if (
        !this.openPalmEmitted &&
        nowMs - this.openPalmStartedAt >= this.thresholds.openPalmHoldMs
      ) {
        this.openPalmEmitted = true
        events.openPalmHold = true
      }
    } else {
      this.openPalmStartedAt = 0
      this.openPalmEmitted = false
    }

    const pinchDurationMs = this.pinchActive ? nowMs - this.pinchStartedAt : 0
    const confidence = clamp(hand.score * 0.75 + (pinch || openPalm || fist ? 0.2 : 0.1), 0, 1)

    return {
      handPresent: true,
      pinch: this.pinchActive || pinch,
      openPalm,
      fist,
      label: resolveLabel(this.pinchActive, this.pinchHoldEmitted, openPalm, fist),
      confidence,
      pinchDurationMs,
      events,
    }
  }
}

const resolveLabel = (
  pinchActive: boolean,
  pinchHoldEmitted: boolean,
  openPalm: boolean,
  fist: boolean,
): string => {
  if (pinchActive) {
    return pinchHoldEmitted ? 'PINCH_HOLD' : 'PINCH'
  }
  if (openPalm) {
    return 'OPEN_PALM'
  }
  if (fist) {
    return 'FIST'
  }
  return 'IDLE'
}

const fingerExtended = (tip: Landmark, pip: Landmark, mcp: Landmark, wrist: Landmark): boolean => {
  const tipDistance = distance3D(tip, wrist)
  const pipDistance = distance3D(pip, wrist)
  const mcpDistance = distance3D(mcp, wrist)
  return tipDistance > pipDistance * 1.04 && pipDistance > mcpDistance * 0.96
}

const thumbIsExtended = (
  thumbTip: Landmark,
  thumbIp: Landmark,
  indexMcp: Landmark,
  wrist: Landmark,
): boolean => {
  const tipVsPalm = distance3D(thumbTip, indexMcp)
  const ipVsPalm = distance3D(thumbIp, indexMcp)
  const tipVsWrist = distance3D(thumbTip, wrist)
  const ipVsWrist = distance3D(thumbIp, wrist)
  return tipVsPalm > ipVsPalm * 1.05 && tipVsWrist > ipVsWrist
}
