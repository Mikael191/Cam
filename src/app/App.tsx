import { useEffect, useRef } from 'react'
import { SceneCanvas } from '../three/SceneCanvas'
import { toNdc } from '../utils/math'
import { throttle } from '../utils/throttle'
import { GestureEngine } from '../vision/gestures'
import { drawHandDebug, HandTracker } from '../vision/handTracker'
import type { TrackerFrame } from '../vision/handTracker'
import { EmaSmoother2D } from '../vision/smoothing'
import { useVoxelStore } from '../world/voxelStore'

const ACTION_RATE_LIMIT_MS = 80
const HOLD_ACTION_DELAY_MS = 210

const App = () => {
  const videoRef = useRef<HTMLVideoElement | null>(null)
  const overlayCanvasRef = useRef<HTMLCanvasElement | null>(null)
  const trackerRef = useRef<HandTracker | null>(null)
  const gestureEngineRef = useRef(new GestureEngine())
  const pointerSmootherRef = useRef(new EmaSmoother2D(0.42))
  const lastActionRef = useRef(0)

  const settings = useVoxelStore((state) => state.settings)
  const mode = useVoxelStore((state) => state.mode)

  useEffect(() => {
    useVoxelStore.getState().refreshSnapshots()
    useVoxelStore.getState().loadLiveScene()
    useVoxelStore.getState().setMode('build')

    const persist = throttle(() => {
      useVoxelStore.getState().saveLiveScene()
    }, 1000)
    const unsubscribe = useVoxelStore.subscribe((state, previous) => {
      if (state.voxelVersion !== previous.voxelVersion) {
        persist()
      }
    })
    return () => {
      unsubscribe()
      persist.flush()
    }
  }, [])

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      const target = event.target as HTMLElement | null
      const isTextInput =
        target?.tagName === 'INPUT' || target?.tagName === 'TEXTAREA' || target?.isContentEditable
      if (isTextInput) {
        return
      }
      const store = useVoxelStore.getState()
      if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === 'z') {
        event.preventDefault()
        if (event.shiftKey) {
          store.redo()
        } else {
          store.undo()
        }
        return
      }
      if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === 'y') {
        event.preventDefault()
        store.redo()
      }
    }
    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [])

  useEffect(() => {
    const video = videoRef.current
    if (!video) {
      return
    }

    if (!trackerRef.current) {
      trackerRef.current = new HandTracker()
    }
    const tracker = trackerRef.current
    const gestureEngine = gestureEngineRef.current
    const pointerSmoother = pointerSmootherRef.current

    let active = true
    useVoxelStore.getState().setTrackingStatus('starting', null)

    const clearOverlay = () => {
      const canvas = overlayCanvasRef.current
      if (!canvas) {
        return
      }
      const ctx = canvas.getContext('2d')
      if (!ctx) {
        return
      }
      ctx.clearRect(0, 0, canvas.width, canvas.height)
    }

    const onFrame = (frame: TrackerFrame) => {
      if (!active) {
        return
      }
      const store = useVoxelStore.getState()
      store.setVisionStats(frame.inferenceFps, frame.hands.length)
      const primary = frame.hands[0] ?? null
      const gesture = gestureEngine.update(
        primary ? { landmarks: primary.landmarks, score: primary.score } : null,
        frame.timestampMs,
      )
      store.setGesture({
        label: gesture.label,
        confidence: gesture.confidence,
      })

      if (!primary) {
        pointerSmoother.reset()
        store.setPointer({
          x: store.pointer.x,
          y: store.pointer.y,
          active: false,
          source: 'hand',
        })
        clearOverlay()
        return
      }

      const indexTip = primary.landmarks[8]
      const normalized = {
        x: store.settings.mirrorInput ? 1 - indexTip.x : indexTip.x,
        y: indexTip.y,
      }
      const smoothed = pointerSmoother.update(normalized)
      const ndc = toNdc(smoothed)
      store.setPointer({
        x: ndc.x,
        y: ndc.y,
        active: true,
        source: 'hand',
      })

      if (store.settings.showLandmarks && store.settings.showWebcam) {
        const canvas = overlayCanvasRef.current
        const currentVideo = videoRef.current
        if (canvas && currentVideo?.videoWidth && currentVideo.videoHeight) {
          if (
            canvas.width !== currentVideo.videoWidth ||
            canvas.height !== currentVideo.videoHeight
          ) {
            canvas.width = currentVideo.videoWidth
            canvas.height = currentVideo.videoHeight
          }
          drawHandDebug(canvas, frame.hands, store.settings.mirrorInput)
        }
      } else {
        clearOverlay()
      }

      if (gesture.events.openPalmHold) {
        const nextMode = store.mode === 'erase' ? 'build' : 'erase'
        store.setMode(nextMode)
      }

      if (gesture.events.pinchTap) {
        if (store.mode === 'erase') {
          store.eraseAtCursor()
        } else {
          store.placeAtCursor()
        }
      }

      if (
        gesture.pinch &&
        gesture.pinchDurationMs >= HOLD_ACTION_DELAY_MS &&
        frame.timestampMs - lastActionRef.current > ACTION_RATE_LIMIT_MS
      ) {
        if (store.mode === 'erase') {
          if (store.eraseAtCursor()) {
            lastActionRef.current = frame.timestampMs
          }
        } else if (store.placeAtCursor()) {
          lastActionRef.current = frame.timestampMs
        }
      }
    }

    const start = async () => {
      try {
        await tracker.start(
          video,
          onFrame,
          (error) => {
            useVoxelStore.getState().setTrackingStatus('error', error.message)
          },
          {
            webcamWidth: settings.webcamWidth,
            webcamHeight: settings.webcamHeight,
            inferenceFps: settings.inferenceFps,
            maxHands: 2,
          },
        )
        if (active) {
          useVoxelStore.getState().setTrackingStatus('running', null)
        }
      } catch (error) {
        const message =
          error instanceof Error ? error.message : 'Nao foi possivel iniciar o hand tracker.'
        useVoxelStore.getState().setTrackingStatus('error', message)
      }
    }

    void start()

    return () => {
      active = false
      gestureEngine.reset()
      pointerSmoother.reset()
      void tracker.stop()
    }
  }, [settings.inferenceFps, settings.webcamWidth, settings.webcamHeight, settings.mirrorInput])

  useEffect(() => {
    return () => {
      trackerRef.current?.dispose()
      trackerRef.current = null
    }
  }, [])

  return (
    <main className="relative h-screen w-screen overflow-hidden bg-black">
      <video
        ref={videoRef}
        className="absolute inset-0 h-full w-full object-cover"
        style={{ transform: settings.mirrorInput ? 'scaleX(-1)' : undefined }}
      />
      <canvas
        ref={overlayCanvasRef}
        className="pointer-events-none absolute inset-0 h-full w-full object-cover"
        style={{ transform: settings.mirrorInput ? 'scaleX(-1)' : undefined }}
      />
      <SceneCanvas />
      <div className="pointer-events-none absolute left-3 top-3 rounded-lg bg-black/45 px-3 py-2 text-xs text-slate-100">
        <p>
          Modo: <span className="font-semibold">{mode.toUpperCase()}</span>
        </p>
        <p>Pinch: acao | Open palm hold: alterna build/erase</p>
      </div>
    </main>
  )
}

export default App
