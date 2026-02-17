import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { clamp, distance2D } from './utils/math'
import { CalibrationSession, GestureEngine } from './vision/gestures'
import type {
  HandTrackerOptions,
  TrackerFrame,
  TrackedHand,
} from './vision/handTracker'
import { PowerSystem } from './powers/powerSystem'
import { ELEMENT_ORDER } from './powers/presets'
import { ThrowVelocityTracker } from './vision/motion'
import {
  QUALITY_PRESETS,
  type QualityPreset,
  useAppStore,
} from './core/appStore'
import type { LogLevel } from './core/logger'
import VideoLayer from './render/VideoLayer'
import EffectsCanvas from './render/EffectsCanvas'
import HUD from './ui/HUD'
import TutorialModal from './ui/TutorialModal'
import CalibrateModal from './ui/CalibrateModal'
import PermissionScreen from './ui/PermissionScreen'

const TRACKING_GRACE_MS = 250
const LIGHTNING_LINK_MIN = 0.08
const LIGHTNING_LINK_MAX = 0.22
const MOCK_HANDS_MODE = import.meta.env.VITE_MOCK_HANDS === '1'

type TrackerRuntime = {
  start: (
    video: HTMLVideoElement,
    options: HandTrackerOptions,
    onFrame: (frame: TrackerFrame) => void,
    onError: (error: Error) => void,
  ) => Promise<void>
  stop: () => Promise<void>
  dispose: () => void
  getStream: () => MediaStream | null
}

type MouseDebugState = {
  active: boolean
  startedAtMs: number
  tracker: ThrowVelocityTracker
}

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

type DualLightningLink = {
  active: boolean
  left: { x: number; y: number } | null
  right: { x: number; y: number } | null
  intensity: number
}

const resolveDualLightningLink = (
  hands: TrackedHand[],
  mirror: boolean,
): DualLightningLink => {
  if (hands.length < 2) {
    return { active: false, left: null, right: null, intensity: 0 }
  }

  const sorted = [...hands].sort((a, b) => b.confidence - a.confidence)
  const first = {
    x: mapXWithMirror(sorted[0].palm.x, mirror),
    y: sorted[0].palm.y,
  }
  const second = {
    x: mapXWithMirror(sorted[1].palm.x, mirror),
    y: sorted[1].palm.y,
  }
  const averageHandSize =
    (sorted[0].bbox.width + sorted[0].bbox.height + sorted[1].bbox.width + sorted[1].bbox.height) * 0.25
  const threshold = clamp(averageHandSize * 1.78, LIGHTNING_LINK_MIN, LIGHTNING_LINK_MAX)
  const distance = distance2D(first, second)
  const active = distance <= threshold
  const intensity = active
    ? clamp((threshold - distance) / Math.max(threshold * 0.68, 0.04), 0, 1)
    : 0

  const left = first.x <= second.x ? first : second
  const right = first.x <= second.x ? second : first
  return { active, left, right, intensity }
}

const normalizePointer = (event: PointerEvent): { x: number; y: number } => ({
  x: clamp(event.clientX / Math.max(window.innerWidth, 1), 0, 1),
  y: clamp(event.clientY / Math.max(window.innerHeight, 1), 0, 1),
})

const isControlTarget = (target: EventTarget | null): boolean => {
  if (!(target instanceof HTMLElement)) {
    return false
  }
  return target.closest('[data-ui-control="true"]') !== null
}

const toFriendlyCameraError = (error: unknown): string => {
  if (error instanceof DOMException) {
    if (error.name === 'NotAllowedError') {
      return 'Permissao negada. Libere camera para este site nas configuracoes do navegador.'
    }
    if (error.name === 'NotFoundError') {
      return 'Nenhuma camera encontrada no dispositivo.'
    }
    if (error.name === 'NotReadableError') {
      return 'Camera ocupada por outro app/aba. Feche o uso concorrente e tente novamente.'
    }
  }

  if (error instanceof Error) {
    return error.message
  }

  return 'Nao foi possivel acessar a camera.'
}

const App = () => {
  const selectedElement = useAppStore((state) => state.selectedElement)
  const tutorialOpen = useAppStore((state) => state.tutorialOpen)
  const trackingStatus = useAppStore((state) => state.trackingStatus)
  const trackingError = useAppStore((state) => state.trackingError)
  const trackingHint = useAppStore((state) => state.trackingHint)
  const settings = useAppStore((state) => state.settings)
  const metrics = useAppStore((state) => state.metrics)
  const gestureDebug = useAppStore((state) => state.gestureDebug)
  const gestureThresholds = useAppStore((state) => state.gestureThresholds)
  const calibration = useAppStore((state) => state.calibration)
  const logs = useAppStore((state) => state.logs)

  const setSelectedElement = useAppStore((state) => state.setSelectedElement)
  const setTutorialOpen = useAppStore((state) => state.setTutorialOpen)
  const setTutorialDismissed = useAppStore((state) => state.setTutorialDismissed)
  const setTrackingStatus = useAppStore((state) => state.setTrackingStatus)
  const setTrackingHint = useAppStore((state) => state.setTrackingHint)
  const setMetrics = useAppStore((state) => state.setMetrics)
  const setHands = useAppStore((state) => state.setHands)
  const setPowerState = useAppStore((state) => state.setPowerState)
  const setGestureDebug = useAppStore((state) => state.setGestureDebug)
  const setGestureThresholds = useAppStore((state) => state.setGestureThresholds)
  const updateSettings = useAppStore((state) => state.updateSettings)
  const setCalibrationModal = useAppStore((state) => state.setCalibrationModal)
  const setCalibrationState = useAppStore((state) => state.setCalibrationState)
  const addLog = useAppStore((state) => state.addLog)
  const clearLogs = useAppStore((state) => state.clearLogs)

  const videoRef = useRef<HTMLVideoElement>(null)
  const trackerRef = useRef<TrackerRuntime | null>(null)
  const gestureEngineRef = useRef<GestureEngine>(new GestureEngine(gestureThresholds))
  const calibrationSessionRef = useRef<CalibrationSession>(new CalibrationSession())
  const powerSystemRef = useRef<PowerSystem>(new PowerSystem())
  const throwVelocityRef = useRef<ThrowVelocityTracker>(new ThrowVelocityTracker())
  const pinchWasActiveRef = useRef(false)
  const lastHandSeenAtMsRef = useRef(0)
  const mouseDebugRef = useRef<MouseDebugState>({
    active: false,
    startedAtMs: 0,
    tracker: new ThrowVelocityTracker(16, 320),
  })

  const [stream, setStream] = useState<MediaStream | null>(null)
  const [trackerFrame, setTrackerFrame] = useState<TrackerFrame | null>(null)
  const [cameraActivated, setCameraActivated] = useState(false)
  const [activationNonce, setActivationNonce] = useState(0)
  const [isLoadingModel, setIsLoadingModel] = useState(false)

  const powerSystem = useMemo(() => powerSystemRef.current, [])

  useEffect(() => {
    powerSystem.setSelectedElement(selectedElement)
  }, [powerSystem, selectedElement])

  useEffect(() => {
    gestureEngineRef.current.setThresholds(gestureThresholds)
  }, [gestureThresholds])

  const ensureTrackerRuntime = useCallback(async (): Promise<TrackerRuntime> => {
    if (trackerRef.current) {
      return trackerRef.current
    }

    if (MOCK_HANDS_MODE) {
      const module = await import('./vision/mockTracker')
      trackerRef.current = new module.MockHandTracker()
      return trackerRef.current
    }

    const module = await import('./vision/handTracker')
    trackerRef.current = new module.HandTracker()
    return trackerRef.current
  }, [])

  const handleRenderFps = useCallback((fps: number) => {
    useAppStore.getState().setMetrics({ renderFps: fps })
  }, [])

  const handleFrame = useCallback(
    (frame: TrackerFrame) => {
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
        setTrackingHint(dominant.lost ? 'Perdi sua mao por um instante. Continue na frente da camera.' : null)

        throwVelocityRef.current.push(
          mapXWithMirror(dominant.indexTip.x, mirror),
          dominant.indexTip.y,
          frame.timestampMs,
        )
      } else if (frame.timestampMs - lastHandSeenAtMsRef.current > TRACKING_GRACE_MS) {
        setTrackingHint('Perdi sua mao. Tente aproximar e abrir a palma.')
      }

      if (store.calibration.running) {
        const calibrationUpdate = calibrationSessionRef.current.update(
          dominant,
          gesture,
          frame.timestampMs,
        )
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
          addLog('info', 'Calibracao concluida')
        }

        const summary = powerSystem.getSummary()
        setPowerState(summary.holding, summary.charge)
        return
      }

      if (gesture.events.fistHold) {
        powerSystem.dissipateAll()
        throwVelocityRef.current.reset()
        pinchWasActiveRef.current = false
        addLog('info', 'Poderes dissipados por gesto fist hold')
        const summary = powerSystem.getSummary()
        setPowerState(summary.holding, summary.charge)
        return
      }

      if (store.selectedElement === 'lightning') {
        const link = resolveDualLightningLink(frame.hands, mirror)
        powerSystem.setDualLightning(link.active, link.left, link.right, link.intensity)

        if (link.active) {
          if (powerSystem.hasHeldPower()) {
            powerSystem.cancelHeldPower()
          }
          throwVelocityRef.current.reset()
          pinchWasActiveRef.current = false
          setTrackingHint('Raio ativo: mantenha as duas maos proximas para sustentar a descarga.')
          const summary = powerSystem.getSummary()
          setPowerState(summary.holding, summary.charge)
          return
        }

        if (frame.hands.length < 2) {
          setTrackingHint('Raio: mostre as duas maos para canalizar energia eletrica.')
        } else {
          setTrackingHint('Raio: aproxime as maos para fechar o circuito.')
        }
        const summary = powerSystem.getSummary()
        setPowerState(summary.holding, summary.charge)
        return
      } else {
        powerSystem.setDualLightning(false, null, null, 0)
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
            ? clamp((gesture.pinchDurationMs - store.gestureThresholds.pinchHoldMs) / 900, 0, 1)
            : 0
          powerSystem.updateHeld(anchorX, anchorY, charge)
        }
      }

      if (gesture.events.pinchEnd && powerSystem.hasHeldPower()) {
        const { vx, vy } = throwVelocityRef.current.estimate(frame.timestampMs, 1.42)
        powerSystem.release(vx, vy)
        throwVelocityRef.current.reset()
      }

      const summary = powerSystem.getSummary()
      setPowerState(summary.holding, summary.charge)
    },
    [
      addLog,
      powerSystem,
      setCalibrationState,
      setGestureDebug,
      setGestureThresholds,
      setHands,
      setMetrics,
      setPowerState,
      setTrackingHint,
    ],
  )

  useEffect(() => {
    if (!cameraActivated) {
      return
    }

    const video = videoRef.current
    if (!video) {
      return
    }

    let cancelled = false

    const startTracker = async () => {
      const store = useAppStore.getState()
      const qualityConfig = QUALITY_PRESETS[store.settings.quality]

      setTrackingStatus('starting', null)
      setTrackingHint(null)
      setIsLoadingModel(true)
      addLog('info', 'Inicializando tracker', `${store.settings.quality}/${store.settings.delegate}`)

      try {
        const runtime = await ensureTrackerRuntime()

        await runtime.start(
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
            hysteresisMs: TRACKING_GRACE_MS,
          },
          handleFrame,
          (error) => {
            if (!cancelled) {
              setTrackingStatus('error', error.message)
              addLog('error', error.message, 'tracker-loop')
            }
          },
        )

        if (cancelled) {
          return
        }

        setStream(runtime.getStream())
        setTrackingStatus('running', null)
        addLog('info', 'Tracker em execucao')
      } catch (error) {
        if (cancelled) {
          return
        }

        const message = toFriendlyCameraError(error)
        const gpuLikelyUnsupported = /gpu|delegate|webgl|wasm/i.test(message)

        if (store.settings.delegate === 'GPU' && gpuLikelyUnsupported) {
          updateSettings({ delegate: 'CPU' })
          setTrackingStatus('starting', 'GPU indisponivel. Mudando para CPU...')
          addLog('warn', 'GPU indisponivel, fallback para CPU')
          return
        }

        setTrackingStatus('error', message)
        addLog('error', message, 'tracker-start')
      } finally {
        if (!cancelled) {
          setIsLoadingModel(false)
        }
      }
    }

    void startTracker()

    return () => {
      cancelled = true
      setStream(null)
      const tracker = trackerRef.current
      if (tracker) {
        void tracker.stop()
      }
    }
  }, [
    activationNonce,
    addLog,
    cameraActivated,
    ensureTrackerRuntime,
    handleFrame,
    settings.quality,
    settings.minDetectionConfidence,
    settings.minPresenceConfidence,
    settings.minTrackingConfidence,
    settings.delegate,
    setTrackingHint,
    setTrackingStatus,
    updateSettings,
  ])

  useEffect(() => {
    return () => {
      const tracker = trackerRef.current
      if (tracker) {
        void tracker.stop()
        tracker.dispose()
      }
    }
  }, [])

  useEffect(() => {
    if (calibration.stage !== 'done' || !calibration.modalOpen) {
      return
    }

    const timeoutId = setTimeout(() => {
      setCalibrationModal(false)
      setCalibrationState({ stage: 'idle', progress: 0, pinchCount: 0 })
    }, 1200)

    return () => {
      clearTimeout(timeoutId)
    }
  }, [calibration.stage, calibration.modalOpen, setCalibrationModal, setCalibrationState])

  useEffect(() => {
    if (!settings.mouseKeyboardDebug) {
      mouseDebugRef.current.active = false
      return
    }

    const onPointerDown = (event: PointerEvent) => {
      if (event.button !== 0 || isControlTarget(event.target)) {
        return
      }

      const nowMs = performance.now()
      const point = normalizePointer(event)
      const mouseState = mouseDebugRef.current
      mouseState.active = true
      mouseState.startedAtMs = nowMs
      mouseState.tracker.reset()
      mouseState.tracker.push(point.x, point.y, nowMs)

      if (powerSystem.getSelectedElement() === 'lightning') {
        mouseState.active = false
        return
      }

      if (!powerSystem.hasHeldPower()) {
        powerSystem.invokeAt('Right', point.x, point.y, nowMs)
      }
    }

    const onPointerMove = (event: PointerEvent) => {
      const mouseState = mouseDebugRef.current
      if (!mouseState.active) {
        return
      }

      const nowMs = performance.now()
      const point = normalizePointer(event)
      mouseState.tracker.push(point.x, point.y, nowMs)
      const charge = clamp((nowMs - mouseState.startedAtMs - gestureThresholds.pinchHoldMs) / 900, 0, 1)
      powerSystem.updateHeld(point.x, point.y, charge)
      const summary = powerSystem.getSummary()
      setPowerState(summary.holding, summary.charge)
    }

    const onPointerUp = (event: PointerEvent) => {
      if (event.button !== 0) {
        return
      }
      const mouseState = mouseDebugRef.current
      if (!mouseState.active) {
        return
      }

      mouseState.active = false
      const nowMs = performance.now()
      const velocity = mouseState.tracker.estimate(nowMs, 1.55)
      if (powerSystem.hasHeldPower()) {
        powerSystem.release(velocity.vx, velocity.vy)
      }
      mouseState.tracker.reset()
      const summary = powerSystem.getSummary()
      setPowerState(summary.holding, summary.charge)
    }

    const onContextMenu = (event: MouseEvent) => {
      if (isControlTarget(event.target)) {
        return
      }
      event.preventDefault()
      powerSystem.dissipateAll()
      const summary = powerSystem.getSummary()
      setPowerState(summary.holding, summary.charge)
      addLog('debug', 'Dissipar via clique direito (debug input)')
    }

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.repeat) {
        return
      }
      const target = event.target as HTMLElement | null
      if (target && ['INPUT', 'SELECT', 'TEXTAREA'].includes(target.tagName)) {
        return
      }

      if (event.key >= '1' && event.key <= '6') {
        const index = Number.parseInt(event.key, 10) - 1
        const element = ELEMENT_ORDER[index]
        if (element) {
          setSelectedElement(element)
          powerSystem.setSelectedElement(element)
          powerSystem.setDualLightning(false, null, null, 0)
          addLog('debug', `Elemento via teclado: ${element}`)
        }
        return
      }

      if (event.key.toLowerCase() === 'x') {
        powerSystem.dissipateAll()
        const summary = powerSystem.getSummary()
        setPowerState(summary.holding, summary.charge)
        addLog('debug', 'Dissipar via tecla X')
        return
      }

      if (event.key.toLowerCase() === 'h') {
        setTutorialOpen(true)
        return
      }

      if (event.key.toLowerCase() === 'l') {
        updateSettings({ showLogPanel: !useAppStore.getState().settings.showLogPanel })
      }
    }

    window.addEventListener('pointerdown', onPointerDown)
    window.addEventListener('pointermove', onPointerMove)
    window.addEventListener('pointerup', onPointerUp)
    window.addEventListener('contextmenu', onContextMenu)
    window.addEventListener('keydown', onKeyDown)

    return () => {
      window.removeEventListener('pointerdown', onPointerDown)
      window.removeEventListener('pointermove', onPointerMove)
      window.removeEventListener('pointerup', onPointerUp)
      window.removeEventListener('contextmenu', onContextMenu)
      window.removeEventListener('keydown', onKeyDown)
    }
  }, [
    addLog,
    gestureThresholds.pinchHoldMs,
    powerSystem,
    setPowerState,
    setSelectedElement,
    setTutorialOpen,
    settings.mouseKeyboardDebug,
    updateSettings,
  ])

  useEffect(() => {
    const onWindowError = (event: ErrorEvent) => {
      addLog('error', event.message, 'window-error')
    }
    window.addEventListener('error', onWindowError)
    return () => {
      window.removeEventListener('error', onWindowError)
    }
  }, [addLog])

  const selectElement = useCallback(
    (element: (typeof ELEMENT_ORDER)[number]) => {
      setSelectedElement(element)
      powerSystem.setSelectedElement(element)
      powerSystem.setDualLightning(false, null, null, 0)
      setTrackingHint(null)
    },
    [powerSystem, setSelectedElement, setTrackingHint],
  )

  const startCalibration = useCallback(() => {
    calibrationSessionRef.current.start(performance.now())
    gestureEngineRef.current.reset()
    pinchWasActiveRef.current = false
    throwVelocityRef.current.reset()
    powerSystem.dissipateAll()
    setCalibrationState({
      running: true,
      stage: 'open_palm',
      progress: 0,
      pinchCount: 0,
    })
    addLog('info', 'Calibracao iniciada')
  }, [addLog, powerSystem, setCalibrationState])

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

  const activateCamera = useCallback(() => {
    setCameraActivated(true)
    setActivationNonce((value) => value + 1)
    setTrackingStatus('starting', null)
    addLog('info', 'Ativacao solicitada', MOCK_HANDS_MODE ? 'mock' : 'camera')
  }, [addLog, setTrackingStatus])

  const setQuality = (preset: QualityPreset) => updateSettings({ quality: preset })

  const showPermissionScreen =
    !cameraActivated ||
    (trackingStatus === 'error' && !MOCK_HANDS_MODE && stream === null)

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
        trackingHint={trackingHint}
        gestureLabel={gestureDebug.label}
        gestureConfidence={gestureDebug.confidence}
        pinchRatio={gestureDebug.pinchRatio}
        metrics={metrics}
        settings={settings}
        logs={logs}
        onQualityChange={setQuality}
        onDelegateChange={(delegate) => updateSettings({ delegate })}
        onToggleMirror={() => updateSettings({ mirror: !settings.mirror })}
        onToggleDebugLandmarks={() =>
          updateSettings({ debugLandmarks: !settings.debugLandmarks })
        }
        onToggleMiniPreview={() =>
          updateSettings({ showMiniPreview: !settings.showMiniPreview })
        }
        onToggleMouseKeyboardDebug={() =>
          updateSettings({ mouseKeyboardDebug: !settings.mouseKeyboardDebug })
        }
        onToggleLogPanel={() => updateSettings({ showLogPanel: !settings.showLogPanel })}
        onLoggerLevelChange={(level: LogLevel) => updateSettings({ loggerLevel: level })}
        onClearLogs={clearLogs}
        onOpenTutorial={() => setTutorialOpen(true)}
        onOpenCalibration={() => setCalibrationModal(true)}
        onSelectElement={selectElement}
        onDetectionConfidenceChange={(value) => updateSettings({ minDetectionConfidence: value })}
        onPresenceConfidenceChange={(value) => updateSettings({ minPresenceConfidence: value })}
        onTrackingConfidenceChange={(value) => updateSettings({ minTrackingConfidence: value })}
      />

      <TutorialModal
        open={tutorialOpen}
        onClose={() => {
          setTutorialOpen(false)
          setTutorialDismissed(true)
        }}
      />

      <CalibrateModal
        open={calibration.modalOpen}
        running={calibration.running}
        stage={calibration.stage}
        progress={calibration.progress}
        pinchCount={calibration.pinchCount}
        onStart={startCalibration}
        onClose={closeCalibration}
      />

      {showPermissionScreen ? (
        <PermissionScreen
          loading={isLoadingModel || trackingStatus === 'starting'}
          error={trackingStatus === 'error' ? trackingError : null}
          isMockMode={MOCK_HANDS_MODE}
          onActivate={activateCamera}
        />
      ) : null}
    </main>
  )
}

export default App
