import { create } from 'zustand'
import { createJSONStorage, persist } from 'zustand/middleware'
import type { PowerElement } from '../powers/powerTypes'
import type { TrackedHand } from '../vision/handTracker'
import {
  DEFAULT_THRESHOLDS,
  type CalibrationStage,
  type GestureThresholds,
} from '../vision/gestures'
import {
  MAX_LOG_ENTRIES,
  shouldCaptureLog,
  type LogEntry,
  type LogLevel,
} from './logger'

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

export type TrackingStatus = 'idle' | 'starting' | 'running' | 'error'

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

export type SettingsState = {
  mirror: boolean
  debugLandmarks: boolean
  showMiniPreview: boolean
  quality: QualityPreset
  minDetectionConfidence: number
  minPresenceConfidence: number
  minTrackingConfidence: number
  delegate: 'GPU' | 'CPU'
  mouseKeyboardDebug: boolean
  loggerLevel: LogLevel
  showLogPanel: boolean
}

type PersistedSlice = {
  selectedElement: PowerElement
  tutorialDismissed: boolean
  settings: SettingsState
  gestureThresholds: GestureThresholds
}

type AppState = {
  selectedElement: PowerElement
  radialOpen: boolean
  radialCenter: { x: number; y: number } | null
  radialHover: PowerElement | null
  tutorialOpen: boolean
  tutorialDismissed: boolean
  trackingStatus: TrackingStatus
  trackingError: string | null
  trackingHint: string | null
  settings: SettingsState
  metrics: MetricsState
  gestureDebug: GestureDebugState
  gestureThresholds: GestureThresholds
  hands: TrackedHand[]
  powerHolding: boolean
  powerCharge: number
  calibration: CalibrationState
  logs: LogEntry[]
  setSelectedElement: (element: PowerElement) => void
  setRadial: (
    open: boolean,
    center?: { x: number; y: number } | null,
    hover?: PowerElement | null,
  ) => void
  setRadialHover: (element: PowerElement | null) => void
  setTutorialOpen: (open: boolean) => void
  setTutorialDismissed: (dismissed: boolean) => void
  setTrackingStatus: (status: TrackingStatus, error?: string | null) => void
  setTrackingHint: (hint: string | null) => void
  setMetrics: (metrics: Partial<MetricsState>) => void
  setGestureDebug: (debug: GestureDebugState) => void
  setHands: (hands: TrackedHand[]) => void
  setPowerState: (holding: boolean, charge: number) => void
  setGestureThresholds: (thresholds: GestureThresholds) => void
  updateSettings: (settings: Partial<SettingsState>) => void
  setCalibrationModal: (open: boolean) => void
  setCalibrationState: (state: Partial<CalibrationState>) => void
  addLog: (level: LogLevel, message: string, context?: string) => void
  clearLogs: () => void
}

const STORE_VERSION = 2
const STORE_KEY = 'hand-ar-powers:v2'

const DEFAULT_SETTINGS: SettingsState = {
  mirror: true,
  debugLandmarks: false,
  showMiniPreview: false,
  quality: 'low',
  minDetectionConfidence: 0.55,
  minPresenceConfidence: 0.5,
  minTrackingConfidence: 0.5,
  delegate: 'GPU',
  mouseKeyboardDebug: false,
  loggerLevel: 'info',
  showLogPanel: false,
}

const DEFAULT_STATE = {
  selectedElement: 'fire' as PowerElement,
  radialOpen: false,
  radialCenter: null,
  radialHover: null,
  tutorialOpen: true,
  tutorialDismissed: false,
  trackingStatus: 'idle' as TrackingStatus,
  trackingError: null,
  trackingHint: null,
  settings: DEFAULT_SETTINGS,
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
    stage: 'idle' as CalibrationStage,
    progress: 0,
    pinchCount: 0,
  },
  logs: [] as LogEntry[],
}

export const useAppStore = create<AppState>()(
  persist(
    (set) => ({
      ...DEFAULT_STATE,
      setSelectedElement: (selectedElement) => set(() => ({ selectedElement })),
      setRadial: (radialOpen, radialCenter = null, radialHover = null) =>
        set(() => ({ radialOpen, radialCenter, radialHover })),
      setRadialHover: (radialHover) => set(() => ({ radialHover })),
      setTutorialOpen: (tutorialOpen) => set(() => ({ tutorialOpen })),
      setTutorialDismissed: (tutorialDismissed) => set(() => ({ tutorialDismissed })),
      setTrackingStatus: (trackingStatus, trackingError = null) =>
        set((state) => {
          if (
            state.trackingStatus === trackingStatus &&
            state.trackingError === trackingError
          ) {
            return state
          }
          return { trackingStatus, trackingError }
        }),
      setTrackingHint: (trackingHint) =>
        set((state) => (state.trackingHint === trackingHint ? state : { trackingHint })),
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
      addLog: (level, message, context) =>
        set((state) => {
          if (!shouldCaptureLog(level, state.settings.loggerLevel)) {
            return state
          }
          const entry: LogEntry = {
            id: state.logs.length > 0 ? state.logs[state.logs.length - 1].id + 1 : 1,
            timestampMs: Date.now(),
            level,
            message,
            context,
          }
          const logs = [...state.logs, entry]
          if (logs.length > MAX_LOG_ENTRIES) {
            logs.splice(0, logs.length - MAX_LOG_ENTRIES)
          }
          return { logs }
        }),
      clearLogs: () => set(() => ({ logs: [] })),
    }),
    {
      name: STORE_KEY,
      version: STORE_VERSION,
      storage: createJSONStorage(() => localStorage),
      partialize: (state): PersistedSlice => ({
        selectedElement: state.selectedElement,
        tutorialDismissed: state.tutorialDismissed,
        settings: state.settings,
        gestureThresholds: state.gestureThresholds,
      }),
      migrate: (persistedState) => {
        const persisted = (persistedState as Partial<PersistedSlice>) ?? {}
        return {
          ...DEFAULT_STATE,
          selectedElement: persisted.selectedElement ?? DEFAULT_STATE.selectedElement,
          tutorialDismissed: persisted.tutorialDismissed ?? false,
          tutorialOpen: !(persisted.tutorialDismissed ?? false),
          settings: {
            ...DEFAULT_SETTINGS,
            ...(persisted.settings ?? {}),
          },
          gestureThresholds: {
            ...DEFAULT_THRESHOLDS,
            ...(persisted.gestureThresholds ?? {}),
          },
          logs: [],
        } as unknown as AppState
      },
      onRehydrateStorage: () => (state) => {
        if (!state) {
          return
        }
        state.setTutorialOpen(!state.tutorialDismissed)
      },
    },
  ),
)
