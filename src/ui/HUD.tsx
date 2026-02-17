import { ELEMENT_COLORS, ELEMENT_LABELS } from '../powers/presets'
import type { PowerElement } from '../powers/powerTypes'
import type { LogEntry, LogLevel } from '../core/logger'
import { formatLogTime } from '../core/logger'
import type { QualityPreset, SettingsState, TrackingStatus } from '../core/appStore'

type HUDProps = {
  selectedElement: PowerElement
  trackingStatus: TrackingStatus
  trackingError: string | null
  trackingHint: string | null
  gestureLabel: string
  gestureConfidence: number
  pinchRatio: number
  metrics: {
    inferenceFps: number
    renderFps: number
    latencyMs: number
    handsDetected: number
  }
  settings: SettingsState
  logs: LogEntry[]
  onQualityChange: (quality: QualityPreset) => void
  onDelegateChange: (delegate: 'GPU' | 'CPU') => void
  onToggleMirror: () => void
  onToggleDebugLandmarks: () => void
  onToggleMiniPreview: () => void
  onToggleMouseKeyboardDebug: () => void
  onToggleLogPanel: () => void
  onLoggerLevelChange: (level: LogLevel) => void
  onClearLogs: () => void
  onOpenTutorial: () => void
  onOpenCalibration: () => void
  onDetectionConfidenceChange: (value: number) => void
  onPresenceConfidenceChange: (value: number) => void
  onTrackingConfidenceChange: (value: number) => void
}

const statusLabelMap: Record<TrackingStatus, string> = {
  idle: 'Aguardando permissao',
  starting: 'Iniciando tracking',
  running: 'Tracking ativo',
  error: 'Erro de tracking',
}

const HAND_STATUS = {
  on: 'Mao detectada',
  off: 'Sem mao detectada',
}

const HUD = ({
  selectedElement,
  trackingStatus,
  trackingError,
  trackingHint,
  gestureLabel,
  gestureConfidence,
  pinchRatio,
  metrics,
  settings,
  logs,
  onQualityChange,
  onDelegateChange,
  onToggleMirror,
  onToggleDebugLandmarks,
  onToggleMiniPreview,
  onToggleMouseKeyboardDebug,
  onToggleLogPanel,
  onLoggerLevelChange,
  onClearLogs,
  onOpenTutorial,
  onOpenCalibration,
  onDetectionConfidenceChange,
  onPresenceConfidenceChange,
  onTrackingConfidenceChange,
}: HUDProps) => {
  const elementColor = ELEMENT_COLORS[selectedElement]
  const handDetected = metrics.handsDetected > 0

  return (
    <>
      <header
        className="absolute left-4 top-4 right-4 z-40 flex flex-wrap items-start justify-between gap-3"
        data-ui-control="true"
      >
        <div className="flex items-center gap-3 rounded-2xl border border-white/15 bg-black/45 px-4 py-3 shadow-premium backdrop-blur-md">
          <span
            className="h-3 w-3 rounded-full"
            aria-hidden
            style={{
              background: `linear-gradient(135deg, ${elementColor.primary}, ${elementColor.secondary})`,
            }}
          />
          <div>
            <div className="text-[10px] uppercase tracking-[0.2em] text-white/55">Elemento Atual</div>
            <div className="text-sm font-semibold text-white">{ELEMENT_LABELS[selectedElement]}</div>
          </div>
        </div>

        <div className="flex flex-wrap items-center justify-end gap-2">
          <button
            type="button"
            onClick={onOpenCalibration}
            className="rounded-xl border border-white/20 bg-black/45 px-3 py-2 text-xs text-white/85 hover:bg-black/60 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-300/80"
          >
            Calibrar
          </button>
          <button
            type="button"
            onClick={onOpenTutorial}
            className="rounded-xl border border-white/20 bg-black/45 px-3 py-2 text-xs text-white/85 hover:bg-black/60 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-300/80"
          >
            Rever tutorial
          </button>

          <label className="rounded-xl border border-white/20 bg-black/45 px-3 py-2 text-xs text-white/80">
            Qualidade
            <select
              className="ml-2 rounded bg-black/40 px-2 py-1 text-xs focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-300/80"
              value={settings.quality}
              onChange={(event) => onQualityChange(event.target.value as QualityPreset)}
              aria-label="Qualidade da camera"
            >
              <option value="low">Low</option>
              <option value="medium">Med</option>
              <option value="high">High</option>
            </select>
          </label>

          <label className="rounded-xl border border-white/20 bg-black/45 px-3 py-2 text-xs text-white/80">
            Delegate
            <select
              className="ml-2 rounded bg-black/40 px-2 py-1 text-xs focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-300/80"
              value={settings.delegate}
              onChange={(event) => onDelegateChange(event.target.value as 'GPU' | 'CPU')}
              aria-label="Delegate de inferencia"
            >
              <option value="GPU">GPU</option>
              <option value="CPU">CPU</option>
            </select>
          </label>

          <ToggleButton
            active={settings.mirror}
            label="Espelho"
            onClick={onToggleMirror}
          />
          <ToggleButton
            active={settings.debugLandmarks}
            label="Debug"
            onClick={onToggleDebugLandmarks}
          />
          <ToggleButton
            active={settings.showMiniPreview}
            label="Mini preview"
            onClick={onToggleMiniPreview}
          />
          <ToggleButton
            active={settings.mouseKeyboardDebug}
            label="Mouse/Teclado"
            onClick={onToggleMouseKeyboardDebug}
          />
          <ToggleButton
            active={settings.showLogPanel}
            label="Logs"
            onClick={onToggleLogPanel}
          />
        </div>
      </header>

      {trackingHint ? (
        <div
          className="absolute left-1/2 top-24 z-40 -translate-x-1/2 rounded-full border border-yellow-300/40 bg-yellow-400/15 px-4 py-2 text-xs text-yellow-100"
          aria-live="polite"
        >
          {trackingHint}
        </div>
      ) : null}

      <section
        className="absolute bottom-4 left-1/2 z-40 w-[min(980px,calc(100%-1.5rem))] -translate-x-1/2 rounded-2xl border border-white/15 bg-black/45 px-4 py-3 shadow-premium backdrop-blur-md"
        data-ui-control="true"
        aria-label="Painel de status"
      >
        <div className="grid grid-cols-2 gap-x-4 gap-y-2 text-xs text-white/80 md:grid-cols-5">
          <StatusLine label="Status" value={statusLabelMap[trackingStatus]} />
          <StatusLine label="Mao" value={handDetected ? HAND_STATUS.on : HAND_STATUS.off} />
          <StatusLine label="Gesto" value={gestureLabel} />
          <StatusLine label="Confianca" value={`${(gestureConfidence * 100).toFixed(0)}%`} />
          <StatusLine label="Pinch ratio" value={pinchRatio.toFixed(2)} />
          <StatusLine label="Hands" value={`${metrics.handsDetected}`} />
          <StatusLine label="Infer FPS" value={metrics.inferenceFps.toFixed(1)} />
          <StatusLine label="Render FPS" value={metrics.renderFps.toFixed(1)} />
          <StatusLine label="Latencia" value={`${metrics.latencyMs.toFixed(1)} ms`} />
          <StatusLine
            label="Atalhos"
            value={settings.mouseKeyboardDebug ? '1-6: elemento / Mouse: cast' : 'Ative Mouse/Teclado'}
          />
        </div>

        <div className="mt-3 grid gap-2 text-[11px] text-white/75 md:grid-cols-3">
          <RangeField
            label={`Detection ${settings.minDetectionConfidence.toFixed(2)}`}
            value={settings.minDetectionConfidence}
            onChange={onDetectionConfidenceChange}
          />
          <RangeField
            label={`Presence ${settings.minPresenceConfidence.toFixed(2)}`}
            value={settings.minPresenceConfidence}
            onChange={onPresenceConfidenceChange}
          />
          <RangeField
            label={`Tracking ${settings.minTrackingConfidence.toFixed(2)}`}
            value={settings.minTrackingConfidence}
            onChange={onTrackingConfidenceChange}
          />
        </div>

        {trackingError ? (
          <div className="mt-2 rounded-lg border border-red-300/35 bg-red-400/10 px-3 py-2 text-xs text-red-100" role="alert">
            {trackingError}
          </div>
        ) : null}
      </section>

      {settings.showLogPanel ? (
        <section
          className="absolute bottom-[14.4rem] right-4 z-40 w-[min(480px,calc(100%-1.5rem))] rounded-2xl border border-white/15 bg-black/55 p-3 shadow-premium backdrop-blur-md"
          data-ui-control="true"
          aria-label="Painel de logs"
        >
          <div className="mb-2 flex items-center justify-between gap-2">
            <div className="text-xs uppercase tracking-[0.2em] text-white/60">Logs</div>
            <div className="flex items-center gap-2">
              <label className="text-xs text-white/70">
                Nivel
                <select
                  value={settings.loggerLevel}
                  onChange={(event) => onLoggerLevelChange(event.target.value as LogLevel)}
                  className="ml-2 rounded bg-black/40 px-2 py-1 text-xs"
                  aria-label="Nivel de log"
                >
                  <option value="debug">debug</option>
                  <option value="info">info</option>
                  <option value="warn">warn</option>
                  <option value="error">error</option>
                </select>
              </label>
              <button
                type="button"
                onClick={onClearLogs}
                className="rounded border border-white/20 px-2 py-1 text-xs text-white/80 hover:bg-white/10"
              >
                Limpar
              </button>
            </div>
          </div>

          <div className="max-h-40 overflow-y-auto rounded-lg border border-white/10 bg-black/35 p-2 text-xs">
            {logs.length === 0 ? (
              <p className="text-white/50">Sem eventos no nivel atual.</p>
            ) : (
              <ul className="space-y-1">
                {logs.slice(-24).map((entry) => (
                  <li key={entry.id} className="font-mono text-[11px] text-white/85">
                    <span className="text-white/50">[{formatLogTime(entry.timestampMs)}]</span>{' '}
                    <span className={levelClassName(entry.level)}>{entry.level.toUpperCase()}</span>{' '}
                    <span>{entry.message}</span>
                    {entry.context ? <span className="text-white/50"> ({entry.context})</span> : null}
                  </li>
                ))}
              </ul>
            )}
          </div>
        </section>
      ) : null}
    </>
  )
}

type ToggleButtonProps = {
  active: boolean
  label: string
  onClick: () => void
}

const ToggleButton = ({ active, label, onClick }: ToggleButtonProps) => (
  <button
    type="button"
    aria-pressed={active}
    onClick={onClick}
    className={`rounded-xl border px-3 py-2 text-xs focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-300/80 ${
      active
        ? 'border-cyan-300/50 bg-cyan-500/20 text-cyan-100'
        : 'border-white/20 bg-black/45 text-white/85'
    }`}
  >
    {label}
  </button>
)

type StatusLineProps = {
  label: string
  value: string
}

const StatusLine = ({ label, value }: StatusLineProps) => (
  <div>
    <span className="text-white/55">{label}:</span> {value}
  </div>
)

type RangeFieldProps = {
  label: string
  value: number
  onChange: (value: number) => void
}

const RangeField = ({ label, value, onChange }: RangeFieldProps) => (
  <label className="rounded-lg border border-white/10 bg-black/30 px-2 py-2">
    {label}
    <input
      type="range"
      min={0.2}
      max={0.95}
      step={0.01}
      value={value}
      onChange={(event) => onChange(Number.parseFloat(event.target.value))}
      className="mt-1 w-full accent-cyan-300"
    />
  </label>
)

const levelClassName = (level: LogLevel): string => {
  if (level === 'error') {
    return 'text-red-300'
  }
  if (level === 'warn') {
    return 'text-yellow-300'
  }
  if (level === 'info') {
    return 'text-cyan-300'
  }
  return 'text-zinc-300'
}

export default HUD
