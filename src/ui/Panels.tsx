import { useRef, useState } from 'react'
import type { RefObject } from 'react'
import { useVoxelStore } from '../world/voxelStore'
import type { QualityPreset, VoxelMode } from '../world/voxelTypes'

type PanelsProps = {
  videoRef: RefObject<HTMLVideoElement | null>
  overlayCanvasRef: RefObject<HTMLCanvasElement | null>
  onEnableCamera: () => void
}

const modeLabels: Record<VoxelMode, string> = {
  build: 'BUILD',
  erase: 'ERASE',
  move: 'MOVE',
  text: 'TEXT',
}

export const Panels = ({ videoRef, overlayCanvasRef, onEnableCamera }: PanelsProps) => {
  const mode = useVoxelStore((state) => state.mode)
  const textInput = useVoxelStore((state) => state.textInput)
  const settings = useVoxelStore((state) => state.settings)
  const snapshots = useVoxelStore((state) => state.snapshots)
  const gesture = useVoxelStore((state) => state.gesture)
  const handsDetected = useVoxelStore((state) => state.handsDetected)
  const inferenceFps = useVoxelStore((state) => state.inferenceFps)
  const trackingStatus = useVoxelStore((state) => state.trackingStatus)
  const trackingError = useVoxelStore((state) => state.trackingError)

  const setTextInput = useVoxelStore((state) => state.setTextInput)
  const stampTextAtCursor = useVoxelStore((state) => state.stampTextAtCursor)
  const toggleWebcam = useVoxelStore((state) => state.toggleWebcam)
  const toggleLandmarks = useVoxelStore((state) => state.toggleLandmarks)
  const toggleMouseFallback = useVoxelStore((state) => state.toggleMouseFallback)
  const toggleMirrorInput = useVoxelStore((state) => state.toggleMirrorInput)
  const setQuality = useVoxelStore((state) => state.setQuality)
  const saveSnapshot = useVoxelStore((state) => state.saveSnapshot)
  const loadSnapshot = useVoxelStore((state) => state.loadSnapshot)
  const refreshSnapshots = useVoxelStore((state) => state.refreshSnapshots)
  const clearWorld = useVoxelStore((state) => state.clearWorld)
  const exportSceneJson = useVoxelStore((state) => state.exportSceneJson)
  const importSceneJson = useVoxelStore((state) => state.importSceneJson)

  const [snapshotName, setSnapshotName] = useState('slot-1')
  const [selectedSnapshot, setSelectedSnapshot] = useState('')
  const fileInputRef = useRef<HTMLInputElement | null>(null)

  const handleExportJson = () => {
    const json = exportSceneJson()
    const blob = new Blob([json], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `hand-builder-${Date.now()}.json`
    a.click()
    URL.revokeObjectURL(url)
  }

  const handleImportFile = async (file: File) => {
    const content = await file.text()
    const imported = importSceneJson(content)
    if (!imported) {
      window.alert('Falha ao importar JSON. Verifique o formato.')
      return
    }
    refreshSnapshots()
  }

  return (
    <>
      <aside className="pointer-events-auto absolute left-4 top-24 z-20 w-[320px] rounded-2xl border border-white/10 bg-panel/90 p-4 shadow-premium backdrop-blur">
        <div className="mb-4">
          <h3 className="text-sm font-semibold uppercase tracking-wider text-accent">Status</h3>
          <div className="mt-2 grid grid-cols-2 gap-2 text-xs">
            <div className="rounded-lg border border-white/10 bg-black/20 p-2">
              <p className="text-slate-300">Modo</p>
              <p className="font-semibold text-white">{modeLabels[mode]}</p>
            </div>
            <div className="rounded-lg border border-white/10 bg-black/20 p-2">
              <p className="text-slate-300">Tracking</p>
              <p className="font-semibold text-white">{trackingStatus.toUpperCase()}</p>
            </div>
            <div className="rounded-lg border border-white/10 bg-black/20 p-2">
              <p className="text-slate-300">FPS inferencia</p>
              <p className="font-semibold text-white">{inferenceFps.toFixed(1)}</p>
            </div>
            <div className="rounded-lg border border-white/10 bg-black/20 p-2">
              <p className="text-slate-300">Maos</p>
              <p className="font-semibold text-white">{handsDetected}</p>
            </div>
          </div>
          <div className="mt-2 rounded-lg border border-white/10 bg-black/20 p-2 text-xs">
            <p className="text-slate-300">Gesto</p>
            <p className="font-semibold text-white">
              {gesture.label} ({Math.round(gesture.confidence * 100)}%)
            </p>
            {trackingError && <p className="mt-1 text-red-300">{trackingError}</p>}
          </div>
        </div>

        <div className="mb-4">
          <h3 className="text-sm font-semibold uppercase tracking-wider text-accent">Vision</h3>
          <div className="mt-2 space-y-2 text-xs">
            <div className="flex items-center justify-between rounded-lg border border-white/10 bg-black/20 p-2">
              <span>Preview webcam</span>
              <button
                type="button"
                onClick={toggleWebcam}
                className="rounded-lg border border-white/20 px-2 py-1"
              >
                {settings.showWebcam ? 'On' : 'Off'}
              </button>
            </div>
            <div className="flex items-center justify-between rounded-lg border border-white/10 bg-black/20 p-2">
              <span>Debug landmarks</span>
              <button
                type="button"
                onClick={toggleLandmarks}
                className="rounded-lg border border-white/20 px-2 py-1"
              >
                {settings.showLandmarks ? 'On' : 'Off'}
              </button>
            </div>
            <div className="flex items-center justify-between rounded-lg border border-white/10 bg-black/20 p-2">
              <span>Mouse fallback</span>
              <button
                type="button"
                onClick={toggleMouseFallback}
                className="rounded-lg border border-white/20 px-2 py-1"
              >
                {settings.mouseFallback ? 'On' : 'Off'}
              </button>
            </div>
            <div className="flex items-center justify-between rounded-lg border border-white/10 bg-black/20 p-2">
              <span>Mirror input</span>
              <button
                type="button"
                onClick={toggleMirrorInput}
                className="rounded-lg border border-white/20 px-2 py-1"
              >
                {settings.mirrorInput ? 'On' : 'Off'}
              </button>
            </div>
            <label className="flex items-center justify-between rounded-lg border border-white/10 bg-black/20 p-2">
              <span>Qualidade</span>
              <select
                value={settings.quality}
                onChange={(event) => setQuality(event.target.value as QualityPreset)}
                className="rounded-lg border border-white/20 bg-panel px-2 py-1"
              >
                <option value="low">Low</option>
                <option value="medium">Medium</option>
                <option value="high">High</option>
              </select>
            </label>
            <button
              type="button"
              onClick={onEnableCamera}
              className="w-full rounded-lg border border-accent/60 bg-accent/15 px-2 py-2 text-left font-semibold"
            >
              Reiniciar webcam/tracker
            </button>
          </div>
        </div>

        <div className="mb-4">
          <h3 className="text-sm font-semibold uppercase tracking-wider text-accent">Texto</h3>
          <div className="mt-2 rounded-lg border border-white/10 bg-black/20 p-2">
            <input
              value={textInput}
              maxLength={32}
              onChange={(event) => setTextInput(event.target.value)}
              className="w-full rounded-lg border border-white/20 bg-panelSoft px-2 py-2 text-sm"
              placeholder="Digite A-Z, 0-9 e espaco"
            />
            <button
              type="button"
              onClick={() => stampTextAtCursor()}
              className="mt-2 w-full rounded-lg border border-accentStrong/70 bg-accentStrong/20 px-2 py-2 text-sm font-semibold"
            >
              Stamp no Cursor
            </button>
          </div>
        </div>

        <div className="mb-4">
          <h3 className="text-sm font-semibold uppercase tracking-wider text-accent">
            Persistencia
          </h3>
          <div className="mt-2 space-y-2 text-xs">
            <div className="flex gap-2">
              <input
                value={snapshotName}
                onChange={(event) => setSnapshotName(event.target.value)}
                className="min-w-0 flex-1 rounded-lg border border-white/20 bg-panelSoft px-2 py-2"
                placeholder="Nome snapshot"
              />
              <button
                type="button"
                onClick={() => {
                  const ok = saveSnapshot(snapshotName)
                  if (ok) {
                    refreshSnapshots()
                  }
                }}
                className="rounded-lg border border-white/20 bg-panelSoft px-3 py-2 font-semibold"
              >
                Save
              </button>
            </div>
            <div className="flex gap-2">
              <select
                value={selectedSnapshot}
                onChange={(event) => setSelectedSnapshot(event.target.value)}
                className="min-w-0 flex-1 rounded-lg border border-white/20 bg-panelSoft px-2 py-2"
              >
                <option value="">Selecione snapshot</option>
                {snapshots.map((snapshot) => (
                  <option key={`${snapshot.name}-${snapshot.savedAt}`} value={snapshot.name}>
                    {snapshot.name} ({new Date(snapshot.savedAt).toLocaleString()})
                  </option>
                ))}
              </select>
              <button
                type="button"
                onClick={() => {
                  if (selectedSnapshot) {
                    loadSnapshot(selectedSnapshot)
                  }
                }}
                className="rounded-lg border border-white/20 bg-panelSoft px-3 py-2 font-semibold"
              >
                Load
              </button>
            </div>
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={handleExportJson}
                className="rounded-lg border border-white/20 bg-panelSoft px-3 py-2 font-semibold"
              >
                Export JSON
              </button>
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                className="rounded-lg border border-white/20 bg-panelSoft px-3 py-2 font-semibold"
              >
                Import JSON
              </button>
            </div>
            <button
              type="button"
              onClick={() => clearWorld()}
              className="w-full rounded-lg border border-red-400/40 bg-red-500/10 px-3 py-2 font-semibold text-red-100"
            >
              Limpar Mundo
            </button>
          </div>
          <input
            ref={fileInputRef}
            type="file"
            accept="application/json"
            className="hidden"
            onChange={(event) => {
              const file = event.target.files?.[0]
              if (file) {
                void handleImportFile(file)
              }
              event.target.value = ''
            }}
          />
        </div>
      </aside>

      {settings.showWebcam && (
        <div className="pointer-events-none absolute bottom-4 right-4 z-20 w-[280px] overflow-hidden rounded-2xl border border-white/15 bg-black/35 shadow-premium">
          <div className="relative aspect-video w-full">
            <video
              ref={videoRef}
              className="absolute inset-0 h-full w-full object-cover"
              style={{ transform: settings.mirrorInput ? 'scaleX(-1)' : undefined }}
            />
            <canvas
              ref={overlayCanvasRef}
              className="absolute inset-0 h-full w-full object-cover"
              style={{ transform: settings.mirrorInput ? 'scaleX(-1)' : undefined }}
            />
          </div>
          <div className="border-t border-white/10 p-2 text-[11px] text-slate-200">
            Camera preview + landmarks
          </div>
        </div>
      )}
    </>
  )
}
