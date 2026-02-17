import type { CalibrationStage } from '../vision/gestures'

type CalibrateModalProps = {
  open: boolean
  running: boolean
  stage: CalibrationStage
  progress: number
  pinchCount: number
  onStart: () => void
  onClose: () => void
}

const stageMessage = (stage: CalibrationStage): string => {
  if (stage === 'open_palm') {
    return 'Mostre a mao aberta por 2 segundos.'
  }
  if (stage === 'pinch') {
    return 'Agora faca pinch 2 vezes (indicador + dedao).'
  }
  if (stage === 'done') {
    return 'Calibracao concluida. Thresholds atualizados.'
  }
  return 'Pronto para calibrar.'
}

const CalibrateModal = ({
  open,
  running,
  stage,
  progress,
  pinchCount,
  onStart,
  onClose,
}: CalibrateModalProps) => {
  if (!open) {
    return null
  }

  return (
    <div
      className="absolute inset-0 z-[80] flex items-center justify-center bg-black/72 p-4 backdrop-blur-sm"
      role="dialog"
      aria-modal="true"
      aria-labelledby="calibration-title"
      data-ui-control="true"
    >
      <div className="w-full max-w-lg rounded-2xl border border-white/15 bg-panel p-6 text-white shadow-premium">
        <div className="mb-4 flex items-center justify-between">
          <h2 id="calibration-title" className="text-lg font-semibold tracking-wide">
            Calibracao Rapida
          </h2>
          <button
            onClick={onClose}
            className="rounded-lg border border-white/20 px-3 py-1 text-xs text-white/80 hover:bg-white/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-300/80"
          >
            {running ? 'Cancelar' : 'Fechar'}
          </button>
        </div>

        <p className="mb-4 text-sm text-white/80">{stageMessage(stage)}</p>

        <div className="mb-3 h-3 w-full overflow-hidden rounded-full bg-white/10">
          <div
            className="h-full rounded-full bg-gradient-to-r from-cyan-300 to-sky-500 transition-all"
            style={{ width: `${Math.max(0, Math.min(100, progress * 100))}%` }}
          />
        </div>

        <div className="mb-6 flex items-center justify-between text-xs text-white/70">
          <span>Etapa: {stage.toUpperCase()}</span>
          <span>Pinch capturados: {pinchCount}/2</span>
        </div>

        <div className="flex gap-2">
          <button
            onClick={onStart}
            disabled={running}
            className="rounded-xl border border-cyan-300/45 bg-cyan-500/20 px-4 py-2 text-sm text-cyan-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-300/80 disabled:cursor-not-allowed disabled:opacity-40"
          >
            {running ? 'Calibrando...' : 'Iniciar Calibracao'}
          </button>
        </div>
      </div>
    </div>
  )
}

export default CalibrateModal
