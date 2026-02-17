import type { PowerElement } from '../powers/powerTypes'
import { ELEMENT_COLORS, ELEMENT_LABELS } from '../powers/presets'
import type { QualityPreset } from '../store/appStore'

type HudProps = {
  selectedElement: PowerElement
  trackingStatus: 'idle' | 'starting' | 'running' | 'error'
  trackingError: string | null
  gestureLabel: string
  gestureConfidence: number
  pinchRatio: number
  metrics: {
    inferenceFps: number
    renderFps: number
    latencyMs: number
    handsDetected: number
  }
  settings: {
    mirror: boolean
    debugLandmarks: boolean
    showMiniPreview: boolean
    quality: QualityPreset
    delegate: 'GPU' | 'CPU'
    minDetectionConfidence: number
    minPresenceConfidence: number
    minTrackingConfidence: number
  }
  onQualityChange: (quality: QualityPreset) => void
  onDelegateChange: (delegate: 'GPU' | 'CPU') => void
  onToggleMirror: () => void
  onToggleDebugLandmarks: () => void
  onToggleMiniPreview: () => void
  onOpenTutorial: () => void
  onOpenCalibration: () => void
  onDetectionConfidenceChange: (value: number) => void
  onPresenceConfidenceChange: (value: number) => void
  onTrackingConfidenceChange: (value: number) => void
}

const statusLabelMap: Record<HudProps['trackingStatus'], string> = {
  idle: 'Idle',
  starting: 'Iniciando camera',
  running: 'Tracking ativo',
  error: 'Erro de tracking',
}

const HUD = ({
  selectedElement,
  trackingStatus,
  trackingError,
  gestureLabel,
  gestureConfidence,
  pinchRatio,
  metrics,
  settings,
  onQualityChange,
  onDelegateChange,
  onToggleMirror,
  onToggleDebugLandmarks,
  onToggleMiniPreview,
  onOpenTutorial,
  onOpenCalibration,
  onDetectionConfidenceChange,
  onPresenceConfidenceChange,
  onTrackingConfidenceChange,
}: HudProps) => {
  const elementColor = ELEMENT_COLORS[selectedElement]

  return (
    <>
      <div className="absolute left-4 top-4 z-40 flex items-center gap-3 rounded-2xl border border-white/15 bg-black/45 px-4 py-2 shadow-premium backdrop-blur-md">
        <span
          className="h-3 w-3 rounded-full"
          style={{
            background: `linear-gradient(135deg, ${elementColor.primary}, ${elementColor.secondary})`,
          }}
        />
        <div className="text-xs uppercase tracking-[0.18em] text-white/65">Elemento</div>
        <div className="text-sm font-semibold text-white">{ELEMENT_LABELS[selectedElement]}</div>
      </div>

      <div className="absolute right-4 top-4 z-40 flex flex-wrap items-center justify-end gap-2">
        <button
          onClick={onOpenCalibration}
          className="rounded-xl border border-white/20 bg-black/45 px-3 py-2 text-xs text-white/85 hover:bg-black/60"
        >
          Calibrar
        </button>
        <button
          onClick={onOpenTutorial}
          className="rounded-xl border border-white/20 bg-black/45 px-3 py-2 text-xs text-white/85 hover:bg-black/60"
        >
          Tutorial
        </button>

        <label className="rounded-xl border border-white/20 bg-black/45 px-3 py-2 text-xs text-white/80">
          Qualidade
          <select
            className="ml-2 rounded bg-black/40 px-2 py-1 text-xs"
            value={settings.quality}
            onChange={(event) => onQualityChange(event.target.value as QualityPreset)}
          >
            <option value="low">Low</option>
            <option value="medium">Med</option>
            <option value="high">High</option>
          </select>
        </label>

        <label className="rounded-xl border border-white/20 bg-black/45 px-3 py-2 text-xs text-white/80">
          Delegate
          <select
            className="ml-2 rounded bg-black/40 px-2 py-1 text-xs"
            value={settings.delegate}
            onChange={(event) => onDelegateChange(event.target.value as 'GPU' | 'CPU')}
          >
            <option value="GPU">GPU</option>
            <option value="CPU">CPU</option>
          </select>
        </label>

        <button
          onClick={onToggleMirror}
          className={`rounded-xl border px-3 py-2 text-xs ${
            settings.mirror
              ? 'border-cyan-300/50 bg-cyan-500/20 text-cyan-100'
              : 'border-white/20 bg-black/45 text-white/85'
          }`}
        >
          Espelho
        </button>

        <button
          onClick={onToggleDebugLandmarks}
          className={`rounded-xl border px-3 py-2 text-xs ${
            settings.debugLandmarks
              ? 'border-cyan-300/50 bg-cyan-500/20 text-cyan-100'
              : 'border-white/20 bg-black/45 text-white/85'
          }`}
        >
          Debug
        </button>

        <button
          onClick={onToggleMiniPreview}
          className={`rounded-xl border px-3 py-2 text-xs ${
            settings.showMiniPreview
              ? 'border-cyan-300/50 bg-cyan-500/20 text-cyan-100'
              : 'border-white/20 bg-black/45 text-white/85'
          }`}
        >
          Mini preview
        </button>
      </div>

      <div className="absolute bottom-4 left-1/2 z-40 w-[min(780px,calc(100%-2rem))] -translate-x-1/2 rounded-2xl border border-white/15 bg-black/45 px-4 py-3 shadow-premium backdrop-blur-md">
        <div className="grid grid-cols-2 gap-x-4 gap-y-2 text-xs text-white/80 md:grid-cols-4">
          <div>
            <span className="text-white/55">Status:</span> {statusLabelMap[trackingStatus]}
          </div>
          <div>
            <span className="text-white/55">Gesto:</span> {gestureLabel}
          </div>
          <div>
            <span className="text-white/55">Confianca:</span> {(gestureConfidence * 100).toFixed(0)}%
          </div>
          <div>
            <span className="text-white/55">Pinch ratio:</span> {pinchRatio.toFixed(2)}
          </div>
          <div>
            <span className="text-white/55">Hands:</span> {metrics.handsDetected}
          </div>
          <div>
            <span className="text-white/55">Infer:</span> {metrics.inferenceFps.toFixed(1)} FPS
          </div>
          <div>
            <span className="text-white/55">Render:</span> {metrics.renderFps.toFixed(1)} FPS
          </div>
          <div>
            <span className="text-white/55">Latencia:</span> {metrics.latencyMs.toFixed(1)} ms
          </div>
        </div>
        <div className="mt-3 grid gap-2 text-[11px] text-white/75 md:grid-cols-3">
          <label className="rounded-lg border border-white/10 bg-black/30 px-2 py-2">
            Detection {settings.minDetectionConfidence.toFixed(2)}
            <input
              type="range"
              min={0.2}
              max={0.95}
              step={0.01}
              value={settings.minDetectionConfidence}
              onChange={(event) =>
                onDetectionConfidenceChange(Number.parseFloat(event.target.value))
              }
              className="mt-1 w-full accent-cyan-300"
            />
          </label>
          <label className="rounded-lg border border-white/10 bg-black/30 px-2 py-2">
            Presence {settings.minPresenceConfidence.toFixed(2)}
            <input
              type="range"
              min={0.2}
              max={0.95}
              step={0.01}
              value={settings.minPresenceConfidence}
              onChange={(event) =>
                onPresenceConfidenceChange(Number.parseFloat(event.target.value))
              }
              className="mt-1 w-full accent-cyan-300"
            />
          </label>
          <label className="rounded-lg border border-white/10 bg-black/30 px-2 py-2">
            Tracking {settings.minTrackingConfidence.toFixed(2)}
            <input
              type="range"
              min={0.2}
              max={0.95}
              step={0.01}
              value={settings.minTrackingConfidence}
              onChange={(event) =>
                onTrackingConfidenceChange(Number.parseFloat(event.target.value))
              }
              className="mt-1 w-full accent-cyan-300"
            />
          </label>
        </div>
        {trackingError ? <div className="mt-2 text-xs text-red-200/90">{trackingError}</div> : null}
      </div>
    </>
  )
}

export default HUD
