import { useCallback, useEffect, useRef, useState } from 'react'
import { SceneCanvas } from '../three/SceneCanvas'
import { ModeBar } from '../ui/ModeBar'
import { Panels } from '../ui/Panels'
import { RadialMenu } from '../ui/RadialMenu'
import { pickModeFromPointer } from '../ui/radialUtils'
import { TutorialModal } from '../ui/TutorialModal'
import { toNdc } from '../utils/math'
import { throttle } from '../utils/throttle'
import { GestureEngine } from '../vision/gestures'
import { drawHandDebug, HandTracker } from '../vision/handTracker'
import type { TrackerFrame } from '../vision/handTracker'
import { EmaSmoother2D } from '../vision/smoothing'
import { useVoxelStore } from '../world/voxelStore'

const ERASER_RATE_LIMIT_MS = 90

const App = () => {
  const videoRef = useRef<HTMLVideoElement | null>(null)
  const overlayCanvasRef = useRef<HTMLCanvasElement | null>(null)
  const trackerRef = useRef<HandTracker | null>(null)
  const gestureEngineRef = useRef(new GestureEngine())
  const pointerSmootherRef = useRef(new EmaSmoother2D(0.42))
  const lastFistEraseRef = useRef(0)
  const textHoldRef = useRef(false)
  const [trackerNonce, setTrackerNonce] = useState(0)

  const settings = useVoxelStore((state) => state.settings)

  const requestTrackerRestart = useCallback(() => {
    setTrackerNonce((value) => value + 1)
  }, [])

  useEffect(() => {
    useVoxelStore.getState().refreshSnapshots()
    useVoxelStore.getState().loadLiveScene()

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
        return
      }
      if (event.key === '1') {
        store.setMode('build')
      } else if (event.key === '2') {
        store.setMode('erase')
      } else if (event.key === '3') {
        store.setMode('move')
      } else if (event.key === '4') {
        store.setMode('text')
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
        textHoldRef.current = false
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
        store.setRadialOpen(true)
      }

      if (store.radialOpen && gesture.events.pinchTap) {
        const mode = pickModeFromPointer(store.pointer)
        if (mode) {
          store.setMode(mode)
        }
        store.setRadialOpen(false)
        return
      }

      if (store.mode === 'build' && gesture.events.pinchTap) {
        store.placeAtCursor()
      }

      if (store.mode === 'erase') {
        if (gesture.events.pinchTap) {
          store.eraseAtCursor()
        }
        if (gesture.fist && frame.timestampMs - lastFistEraseRef.current > ERASER_RATE_LIMIT_MS) {
          if (store.eraseAtCursor()) {
            lastFistEraseRef.current = frame.timestampMs
          }
        }
      }

      if (store.mode === 'move') {
        if (gesture.events.pinchHoldStart) {
          store.beginMoveDragFromHover()
        }
        if (gesture.pinch && store.moveDragFrom) {
          store.updateMoveDragTargetFromCursor()
        }
        if (gesture.events.pinchEnd && store.moveDragFrom) {
          store.commitMoveDrag()
        }
      }

      if (store.mode === 'text') {
        if (gesture.events.pinchTap) {
          store.stampTextAtCursor()
        }
        if (gesture.events.pinchHoldStart) {
          textHoldRef.current = true
        }
        if (gesture.events.pinchEnd && textHoldRef.current) {
          store.stampTextAtCursor()
          textHoldRef.current = false
        }
      }

      if (gesture.events.pinchEnd) {
        textHoldRef.current = false
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
  }, [
    trackerNonce,
    settings.inferenceFps,
    settings.webcamWidth,
    settings.webcamHeight,
    settings.mirrorInput,
  ])

  useEffect(() => {
    return () => {
      trackerRef.current?.dispose()
      trackerRef.current = null
    }
  }, [])

  return (
    <main className="relative h-screen w-screen overflow-hidden">
      <SceneCanvas />
      <div className="pointer-events-none absolute inset-0 bg-gradient-to-b from-[#00000066] via-transparent to-[#00000033]" />
      <ModeBar />
      <Panels
        videoRef={videoRef}
        overlayCanvasRef={overlayCanvasRef}
        onEnableCamera={requestTrackerRestart}
      />
      <RadialMenu />
      <TutorialModal onEnableCamera={requestTrackerRestart} />
    </main>
  )
}

export default App
