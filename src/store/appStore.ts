import { create } from 'zustand'
import type { PowerElement } from '../powers/powerTypes'
import type { TrackedHand } from '../vision/handTracker'
import {
  DEFAULT_THRESHOLDS,
  type CalibrationStage,
  type GestureThresholds,
} from '../vision/gestures'

export type QualityPreset = 'low' | 'medium' | 'high'

export type QualityConfig = {
  width: number
  height: number
  inferenceFps: number
}

export const QUALITY_PRESETS: Record<QualityPreset, QualityConfig> = {
  low: { width: 640, height: 360, inferenceFps: 24 },
  medium: { width: 960, height: 540, inferenceFps: 27 },
  high: { width: 1280, height: 720, inferenceFps: 30 },
}

type TrackingStatus = 'idle' | 'starting' | 'running' | 'error'

type MetricsState = {
  inferenceFps: number
  renderFps: number
  latencyMs: number
  handsDetected: number
}

type GestureDebugState = {
  label: string
  confidence: number
  pinchRatio: number
}

type CalibrationState = {
  modalOpen: boolean
  running: boolean
  stage: CalibrationStage
  progress: number
  pinchCount: number
}

type SettingsState = {
  mirror: boolean
  debugLandmarks: boolean
  showMiniPreview: boolean
  quality: QualityPreset
  minDetectionConfidence: number
  minPresenceConfidence: number
  minTrackingConfidence: number
  delegate: 'GPU' | 'CPU'
}

type AppState = {
  selectedElement: PowerElement
  radialOpen: boolean
  radialCenter: { x: number; y: number } | null
  radialHover: PowerElement | null
  tutorialOpen: boolean
  trackingStatus: TrackingStatus
  trackingError: string | null
  settings: SettingsState
  metrics: MetricsState
  gestureDebug: GestureDebugState
  gestureThresholds: GestureThresholds
  hands: TrackedHand[]
  powerHolding: boolean
  powerCharge: number
  calibration: CalibrationState
  setSelectedElement: (element: PowerElement) => void
  setRadial: (
    open: boolean,
    center?: { x: number; y: number } | null,
    hover?: PowerElement | null,
  ) => void
  setRadialHover: (element: PowerElement | null) => void
  setTutorialOpen: (open: boolean) => void
  setTrackingStatus: (status: TrackingStatus, error?: string | null) => void
  setMetrics: (metrics: Partial<MetricsState>) => void
  setGestureDebug: (debug: GestureDebugState) => void
  setHands: (hands: TrackedHand[]) => void
  setPowerState: (holding: boolean, charge: number) => void
  setGestureThresholds: (thresholds: GestureThresholds) => void
  updateSettings: (settings: Partial<SettingsState>) => void
  setCalibrationModal: (open: boolean) => void
  setCalibrationState: (state: Partial<CalibrationState>) => void
}

export const useAppStore = create<AppState>((set) => ({
  selectedElement: 'fire',
  radialOpen: false,
  radialCenter: null,
  radialHover: null,
  tutorialOpen: true,
  trackingStatus: 'idle',
  trackingError: null,
  settings: {
    mirror: true,
    debugLandmarks: false,
    showMiniPreview: false,
    quality: 'low',
    minDetectionConfidence: 0.55,
    minPresenceConfidence: 0.5,
    minTrackingConfidence: 0.5,
    delegate: 'GPU',
  },
  metrics: {
    inferenceFps: 0,
    renderFps: 0,
    latencyMs: 0,
    handsDetected: 0,
  },
  gestureDebug: {
    label: 'NO_HAND',
    confidence: 0,
    pinchRatio: 1,
  },
  gestureThresholds: DEFAULT_THRESHOLDS,
  hands: [],
  powerHolding: false,
  powerCharge: 0,
  calibration: {
    modalOpen: false,
    running: false,
    stage: 'idle',
    progress: 0,
    pinchCount: 0,
  },
  setSelectedElement: (selectedElement) => set(() => ({ selectedElement })),
  setRadial: (radialOpen, radialCenter = null, radialHover = null) =>
    set(() => ({
      radialOpen,
      radialCenter,
      radialHover,
    })),
  setRadialHover: (radialHover) => set(() => ({ radialHover })),
  setTutorialOpen: (tutorialOpen) => set(() => ({ tutorialOpen })),
  setTrackingStatus: (trackingStatus, trackingError = null) =>
    set(() => ({ trackingStatus, trackingError })),
  setMetrics: (metrics) =>
    set((state) => ({
      metrics: {
        ...state.metrics,
        ...metrics,
      },
    })),
  setGestureDebug: (gestureDebug) => set(() => ({ gestureDebug })),
  setHands: (hands) =>
    set((state) => ({
      hands,
      metrics: {
        ...state.metrics,
        handsDetected: hands.length,
      },
    })),
  setPowerState: (powerHolding, powerCharge) =>
    set(() => ({
      powerHolding,
      powerCharge,
    })),
  setGestureThresholds: (gestureThresholds) => set(() => ({ gestureThresholds })),
  updateSettings: (settings) =>
    set((state) => ({
      settings: {
        ...state.settings,
        ...settings,
      },
    })),
  setCalibrationModal: (modalOpen) =>
    set((state) => ({
      calibration: {
        ...state.calibration,
        modalOpen,
      },
    })),
  setCalibrationState: (nextState) =>
    set((state) => ({
      calibration: {
        ...state.calibration,
        ...nextState,
      },
    })),
}))
