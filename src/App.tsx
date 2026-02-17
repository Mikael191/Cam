import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { clamp, distance2D } from './utils/math'
import { CalibrationSession, GestureEngine } from './vision/gestures'
import { HandTracker, type TrackerFrame, type TrackedHand } from './vision/handTracker'
import { PowerSystem } from './powers/powerSystem'
import type { PowerElement, ThrowSample } from './powers/powerTypes'
import { ELEMENT_ORDER } from './powers/presets'
import {
  QUALITY_PRESETS,
  type QualityPreset,
  useAppStore,
} from './store/appStore'
import VideoLayer from './render/VideoLayer'
import EffectsCanvas from './render/EffectsCanvas'
import HUD from './ui/HUD'
import RadialMenu from './ui/RadialMenu'
import TutorialModal from './ui/TutorialModal'
import CalibrateModal from './ui/CalibrateModal'

const RADIAL_INNER_RADIUS = 0.06
const RADIAL_OUTER_RADIUS = 0.24

const pickDominantHand = (hands: TrackedHand[]): TrackedHand | null => {
  if (hands.length === 0) {
    return null
  }
  const sorted = [...hands].sort((a, b) => {
    if (b.confidence === a.confidence) {
      return a.slotId - b.slotId
    }
    return b.confidence - a.confidence
  })
  return sorted[0]
}

const mapXWithMirror = (x: number, mirror: boolean): number => (mirror ? 1 - x : x)

const resolveRadialHover = (
  cursor: { x: number; y: number },
  center: { x: number; y: number },
): PowerElement | null => {
  const radius = distance2D(cursor, center)
  if (radius < RADIAL_INNER_RADIUS || radius > RADIAL_OUTER_RADIUS) {
    return null
  }
  const angle = Math.atan2(cursor.y - center.y, cursor.x - center.x)
  const normalized = (angle + Math.PI / 2 + Math.PI * 2) % (Math.PI * 2)
  const segment = (Math.PI * 2) / ELEMENT_ORDER.length
  const index = Math.floor(normalized / segment) % ELEMENT_ORDER.length
  return ELEMENT_ORDER[index]
}

const computeThrowVelocity = (samples: ThrowSample[], nowMs: number): { vx: number; vy: number } => {
  if (samples.length < 2) {
    return { vx: 0, vy: -0.35 }
  }

  const recent: ThrowSample[] = []
  for (let i = samples.length - 1; i >= 0; i -= 1) {
    if (nowMs - samples[i].timestampMs > 260) {
      break
    }
    recent.unshift(samples[i])
  }

  if (recent.length < 2) {
    return { vx: 0, vy: -0.35 }
  }

  const first = recent[0]
  const last = recent[recent.length - 1]
  const dt = Math.max(0.016, (last.timestampMs - first.timestampMs) / 1000)

  let vx = ((last.point.x - first.point.x) / dt) * 1.35
  let vy = ((last.point.y - first.point.y) / dt) * 1.35

  const speed = Math.hypot(vx, vy)
  const maxSpeed = 2.9
  if (speed > maxSpeed) {
    const scale = maxSpeed / speed
    vx *= scale
    vy *= scale
  }

  if (speed < 0.24) {
    vy -= 0.35
  }

  return {
    vx: clamp(vx, -3, 3),
    vy: clamp(vy, -3, 3),
  }
}

const pushThrowSample = (buffer: ThrowSample[], x: number, y: number, timestampMs: number): void => {
  buffer.push({ point: { x, y }, timestampMs })
  if (buffer.length > 12) {
    buffer.shift()
  }
}

const App = () => {
  const selectedElement = useAppStore((state) => state.selectedElement)
  const radialOpen = useAppStore((state) => state.radialOpen)
  const radialCenter = useAppStore((state) => state.radialCenter)
  const radialHover = useAppStore((state) => state.radialHover)
  const tutorialOpen = useAppStore((state) => state.tutorialOpen)
  const trackingStatus = useAppStore((state) => state.trackingStatus)
  const trackingError = useAppStore((state) => state.trackingError)
  const settings = useAppStore((state) => state.settings)
  const metrics = useAppStore((state) => state.metrics)
  const gestureDebug = useAppStore((state) => state.gestureDebug)
  const gestureThresholds = useAppStore((state) => state.gestureThresholds)
  const calibration = useAppStore((state) => state.calibration)

  const setSelectedElement = useAppStore((state) => state.setSelectedElement)
  const setRadial = useAppStore((state) => state.setRadial)
  const setRadialHover = useAppStore((state) => state.setRadialHover)
  const setTutorialOpen = useAppStore((state) => state.setTutorialOpen)
  const setTrackingStatus = useAppStore((state) => state.setTrackingStatus)
  const setMetrics = useAppStore((state) => state.setMetrics)
  const setHands = useAppStore((state) => state.setHands)
  const setPowerState = useAppStore((state) => state.setPowerState)
  const setGestureDebug = useAppStore((state) => state.setGestureDebug)
  const setGestureThresholds = useAppStore((state) => state.setGestureThresholds)
  const updateSettings = useAppStore((state) => state.updateSettings)
  const setCalibrationModal = useAppStore((state) => state.setCalibrationModal)
  const setCalibrationState = useAppStore((state) => state.setCalibrationState)

  const videoRef = useRef<HTMLVideoElement>(null)
  const trackerRef = useRef<HandTracker>(new HandTracker())
  const gestureEngineRef = useRef<GestureEngine>(new GestureEngine(useAppStore.getState().gestureThresholds))
  const calibrationSessionRef = useRef<CalibrationSession>(new CalibrationSession())
  const powerSystemRef = useRef<PowerSystem>(new PowerSystem())
  const throwSamplesRef = useRef<ThrowSample[]>([])
  const pinchWasActiveRef = useRef(false)
  const lastHandSeenAtMsRef = useRef(0)

  const [stream, setStream] = useState<MediaStream | null>(null)
  const [trackerFrame, setTrackerFrame] = useState<TrackerFrame | null>(null)

  const powerSystem = useMemo(() => powerSystemRef.current, [])

  useEffect(() => {
    powerSystem.setSelectedElement(selectedElement)
  }, [powerSystem, selectedElement])

  useEffect(() => {
    gestureEngineRef.current.setThresholds(gestureThresholds)
  }, [gestureThresholds])

  const handleRenderFps = useCallback((fps: number) => {
    useAppStore.getState().setMetrics({ renderFps: fps })
  }, [])

  const handleFrame = useCallback((frame: TrackerFrame) => {
    setTrackerFrame(frame)

    const store = useAppStore.getState()
    const dominant = pickDominantHand(frame.hands)
    const mirror = store.settings.mirror

    setHands(frame.hands)
    setMetrics({
      inferenceFps: frame.inferenceFps,
      latencyMs: frame.inferenceLatencyMs,
    })

    const gesture = gestureEngineRef.current.update(dominant, frame.timestampMs)
    setGestureDebug({
      label: gesture.label,
      confidence: gesture.confidence,
      pinchRatio: gesture.pinchRatio,
    })

    if (dominant) {
      lastHandSeenAtMsRef.current = frame.timestampMs
      pushThrowSample(
        throwSamplesRef.current,
        mapXWithMirror(dominant.indexTip.x, mirror),
        dominant.indexTip.y,
        frame.timestampMs,
      )
    }

    if (store.calibration.running) {
      const calibrationUpdate = calibrationSessionRef.current.update(dominant, gesture, frame.timestampMs)
      setCalibrationState({
        stage: calibrationUpdate.stage,
        progress: calibrationUpdate.progress,
        pinchCount: calibrationUpdate.pinchCount,
      })

      if (calibrationUpdate.completed && calibrationUpdate.result) {
        setGestureThresholds(calibrationUpdate.result)
        gestureEngineRef.current.setThresholds(calibrationUpdate.result)
        setCalibrationState({
          running: false,
          stage: 'done',
          progress: 1,
          pinchCount: calibrationUpdate.pinchCount,
        })
      }

      const summary = powerSystem.getSummary()
      setPowerState(summary.holding, summary.charge)
      return
    }

    if (gesture.events.fistHold) {
      powerSystem.dissipateAll()
      throwSamplesRef.current = []
      pinchWasActiveRef.current = false
      setRadial(false, null, null)
      const summary = powerSystem.getSummary()
      setPowerState(summary.holding, summary.charge)
      return
    }

    if (store.radialOpen) {
      let hover: PowerElement | null = null
      if (dominant && store.radialCenter) {
        hover = resolveRadialHover(
          {
            x: mapXWithMirror(dominant.palm.x, mirror),
            y: dominant.palm.y,
          },
          store.radialCenter,
        )
      }
      setRadialHover(hover)

      if (gesture.events.pinchTap && hover) {
        setSelectedElement(hover)
        powerSystem.setSelectedElement(hover)
        setRadial(false, null, null)
      }

      if (!dominant && frame.timestampMs - lastHandSeenAtMsRef.current > 320) {
        setRadial(false, null, null)
      }

      const summary = powerSystem.getSummary()
      setPowerState(summary.holding, summary.charge)
      return
    }

    if (gesture.events.openPalmHold && dominant) {
      setRadial(
        true,
        {
          x: mapXWithMirror(dominant.palm.x, mirror),
          y: dominant.palm.y,
        },
        store.selectedElement,
      )
      return
    }

    const pinchStarted = gesture.pinch && !pinchWasActiveRef.current
    pinchWasActiveRef.current = gesture.pinch

    if (dominant) {
      const anchorX = mapXWithMirror(dominant.indexTip.x, mirror)
      const anchorY = dominant.indexTip.y

      if (pinchStarted && !powerSystem.hasHeldPower()) {
        powerSystem.invokeAt(dominant.handedness, anchorX, anchorY, frame.timestampMs)
      }

      if (powerSystem.hasHeldPower()) {
        const charge = gesture.pinch
          ? clamp(
              (gesture.pinchDurationMs - store.gestureThresholds.pinchHoldMs) / 900,
              0,
              1,
            )
          : 0
        powerSystem.updateHeld(anchorX, anchorY, charge)
      }
    }

    if (gesture.events.pinchEnd && powerSystem.hasHeldPower()) {
      const { vx, vy } = computeThrowVelocity(throwSamplesRef.current, frame.timestampMs)
      powerSystem.release(vx, vy)
      throwSamplesRef.current = []
    }

    const summary = powerSystem.getSummary()
    setPowerState(summary.holding, summary.charge)
  }, [powerSystem, setGestureDebug, setGestureThresholds, setHands, setMetrics, setPowerState, setRadial, setRadialHover, setSelectedElement, setCalibrationState])

  useEffect(() => {
    const video = videoRef.current
    const tracker = trackerRef.current
    if (!video) {
      return
    }

    let cancelled = false

    const startTracker = async () => {
      const store = useAppStore.getState()
      const qualityConfig = QUALITY_PRESETS[store.settings.quality]

      setTrackingStatus('starting', null)

      try {
        await tracker.start(
          video,
          {
            webcamWidth: qualityConfig.width,
            webcamHeight: qualityConfig.height,
            inferenceFps: qualityConfig.inferenceFps,
            maxHands: 2,
            minHandDetectionConfidence: store.settings.minDetectionConfidence,
            minHandPresenceConfidence: store.settings.minPresenceConfidence,
            minTrackingConfidence: store.settings.minTrackingConfidence,
            delegate: store.settings.delegate,
            hysteresisMs: 250,
          },
          handleFrame,
          (error) => {
            if (!cancelled) {
              setTrackingStatus('error', error.message)
            }
          },
        )

        if (cancelled) {
          return
        }

        setStream(tracker.getStream())
        setTrackingStatus('running', null)
      } catch (error) {
        if (cancelled) {
          return
        }
        const message = error instanceof Error ? error.message : 'Falha ao iniciar camera.'
        const gpuLikelyUnsupported = /gpu|delegate|webgl|wasm/i.test(message)
        if (store.settings.delegate === 'GPU' && gpuLikelyUnsupported) {
          updateSettings({ delegate: 'CPU' })
          setTrackingStatus('starting', 'GPU indisponivel. Fallback para CPU...')
          return
        }
        setTrackingStatus('error', message)
      }
    }

    void startTracker()

    return () => {
      cancelled = true
      setStream(null)
      void tracker.stop()
    }
  }, [
    settings.quality,
    settings.minDetectionConfidence,
    settings.minPresenceConfidence,
    settings.minTrackingConfidence,
    settings.delegate,
    handleFrame,
    setTrackingStatus,
    updateSettings,
  ])

  useEffect(() => {
    const tracker = trackerRef.current
    return () => {
      void tracker.stop()
      tracker.dispose()
    }
  }, [])

  useEffect(() => {
    if (calibration.stage !== 'done' || !calibration.modalOpen) {
      return
    }

    const timeoutId = setTimeout(() => {
      setCalibrationModal(false)
      setCalibrationState({ stage: 'idle', progress: 0, pinchCount: 0 })
    }, 1100)

    return () => {
      clearTimeout(timeoutId)
    }
  }, [calibration.stage, calibration.modalOpen, setCalibrationModal, setCalibrationState])

  const selectElement = useCallback(
    (element: PowerElement) => {
      setSelectedElement(element)
      powerSystem.setSelectedElement(element)
      setRadial(false, null, null)
    },
    [powerSystem, setRadial, setSelectedElement],
  )

  const startCalibration = useCallback(() => {
    calibrationSessionRef.current.start(performance.now())
    gestureEngineRef.current.reset()
    pinchWasActiveRef.current = false
    throwSamplesRef.current = []
    powerSystem.dissipateAll()
    setRadial(false, null, null)
    setCalibrationState({
      running: true,
      stage: 'open_palm',
      progress: 0,
      pinchCount: 0,
    })
  }, [powerSystem, setCalibrationState, setRadial])

  const closeCalibration = useCallback(() => {
    calibrationSessionRef.current.stop()
    setCalibrationModal(false)
    setCalibrationState({
      running: false,
      stage: 'idle',
      progress: 0,
      pinchCount: 0,
    })
  }, [setCalibrationModal, setCalibrationState])

  const setQuality = (preset: QualityPreset) => updateSettings({ quality: preset })

  return (
    <main className="relative h-screen w-screen overflow-hidden bg-black">
      <VideoLayer
        videoRef={videoRef}
        stream={stream}
        mirror={settings.mirror}
        showMiniPreview={settings.showMiniPreview}
      />

      <EffectsCanvas
        powerSystem={powerSystem}
        frame={trackerFrame}
        debugLandmarks={settings.debugLandmarks}
        mirror={settings.mirror}
        onRenderFps={handleRenderFps}
      />

      <HUD
        selectedElement={selectedElement}
        trackingStatus={trackingStatus}
        trackingError={trackingError}
        gestureLabel={gestureDebug.label}
        gestureConfidence={gestureDebug.confidence}
        pinchRatio={gestureDebug.pinchRatio}
        metrics={metrics}
        settings={settings}
        onQualityChange={setQuality}
        onDelegateChange={(delegate) => updateSettings({ delegate })}
        onToggleMirror={() => updateSettings({ mirror: !settings.mirror })}
        onToggleDebugLandmarks={() =>
          updateSettings({ debugLandmarks: !settings.debugLandmarks })
        }
        onToggleMiniPreview={() =>
          updateSettings({ showMiniPreview: !settings.showMiniPreview })
        }
        onOpenTutorial={() => setTutorialOpen(true)}
        onOpenCalibration={() => setCalibrationModal(true)}
        onDetectionConfidenceChange={(value) => updateSettings({ minDetectionConfidence: value })}
        onPresenceConfidenceChange={(value) => updateSettings({ minPresenceConfidence: value })}
        onTrackingConfidenceChange={(value) => updateSettings({ minTrackingConfidence: value })}
      />

      <RadialMenu
        open={radialOpen}
        center={radialCenter}
        hover={radialHover}
        selected={selectedElement}
        onSelect={selectElement}
      />

      <TutorialModal open={tutorialOpen} onClose={() => setTutorialOpen(false)} />

      <CalibrateModal
        open={calibration.modalOpen}
        running={calibration.running}
        stage={calibration.stage}
        progress={calibration.progress}
        pinchCount={calibration.pinchCount}
        onStart={startCalibration}
        onClose={closeCalibration}
      />
    </main>
  )
}

export default App
