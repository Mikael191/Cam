type TutorialModalProps = {
  open: boolean
  onClose: () => void
}

const TutorialModal = ({ open, onClose }: TutorialModalProps) => {
  if (!open) {
    return null
  }

  return (
    <div className="absolute inset-0 z-[70] flex items-center justify-center bg-black/72 p-4 backdrop-blur-sm">
      <div className="w-full max-w-xl rounded-2xl border border-white/15 bg-panel p-6 text-white shadow-premium">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-lg font-semibold tracking-wide">Tutorial de Gestos</h2>
          <button
            onClick={onClose}
            className="rounded-lg border border-white/20 px-3 py-1 text-xs text-white/80 hover:bg-white/10"
          >
            Fechar
          </button>
        </div>

        <div className="space-y-4 text-sm text-white/85">
          <div className="flex items-center gap-3 rounded-xl border border-white/10 bg-black/20 p-3">
            <GestureIcon type="open" />
            <div>
              <div className="font-medium">Abra a mao para escolher elemento</div>
              <div className="text-white/65">Mantenha aberta por ~600ms para abrir o menu radial.</div>
            </div>
          </div>

          <div className="flex items-center gap-3 rounded-xl border border-white/10 bg-black/20 p-3">
            <GestureIcon type="pinch" />
            <div>
              <div className="font-medium">Belisque para invocar</div>
              <div className="text-white/65">Junte indicador + dedao para criar o orb na sua mao.</div>
            </div>
          </div>

          <div className="flex items-center gap-3 rounded-xl border border-white/10 bg-black/20 p-3">
            <GestureIcon type="hold" />
            <div>
              <div className="font-medium">Segure o belisco para carregar</div>
              <div className="text-white/65">A energia cresce ate o limite enquanto o pinch continua.</div>
            </div>
          </div>

          <div className="flex items-center gap-3 rounded-xl border border-white/10 bg-black/20 p-3">
            <GestureIcon type="release" />
            <div>
              <div className="font-medium">Solte para lancar</div>
              <div className="text-white/65">A velocidade do lancamento vem do movimento real da sua mao.</div>
            </div>
          </div>

          <div className="flex items-center gap-3 rounded-xl border border-white/10 bg-black/20 p-3">
            <GestureIcon type="fist" />
            <div>
              <div className="font-medium">Punho fechado para cancelar</div>
              <div className="text-white/65">Segure o punho por ~350ms para dissipar os poderes ativos.</div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

type IconProps = {
  type: 'open' | 'pinch' | 'hold' | 'release' | 'fist'
}

const GestureIcon = ({ type }: IconProps) => {
  const stroke = '#d8f1ff'

  if (type === 'open') {
    return (
      <svg width="52" height="52" viewBox="0 0 52 52" fill="none" aria-hidden>
        <rect x="5" y="5" width="42" height="42" rx="12" stroke={stroke} strokeOpacity="0.35" />
        <path d="M17 34V22M22 34V16M27 34V14M32 34V18M36 34V22" stroke={stroke} strokeWidth="2.4" strokeLinecap="round" />
      </svg>
    )
  }

  if (type === 'pinch') {
    return (
      <svg width="52" height="52" viewBox="0 0 52 52" fill="none" aria-hidden>
        <rect x="5" y="5" width="42" height="42" rx="12" stroke={stroke} strokeOpacity="0.35" />
        <path d="M18 34L24 24M34 34L28 24" stroke={stroke} strokeWidth="2.4" strokeLinecap="round" />
        <circle cx="26" cy="24" r="3.5" fill="#8fdfff" />
      </svg>
    )
  }

  if (type === 'hold') {
    return (
      <svg width="52" height="52" viewBox="0 0 52 52" fill="none" aria-hidden>
        <rect x="5" y="5" width="42" height="42" rx="12" stroke={stroke} strokeOpacity="0.35" />
        <circle cx="26" cy="26" r="9" stroke={stroke} strokeWidth="2.2" />
        <path d="M26 26V18" stroke={stroke} strokeWidth="2.2" strokeLinecap="round" />
      </svg>
    )
  }

  if (type === 'release') {
    return (
      <svg width="52" height="52" viewBox="0 0 52 52" fill="none" aria-hidden>
        <rect x="5" y="5" width="42" height="42" rx="12" stroke={stroke} strokeOpacity="0.35" />
        <path d="M14 27H33" stroke={stroke} strokeWidth="2.4" strokeLinecap="round" />
        <path d="M29 21L37 27L29 33" stroke={stroke} strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    )
  }

  return (
    <svg width="52" height="52" viewBox="0 0 52 52" fill="none" aria-hidden>
      <rect x="5" y="5" width="42" height="42" rx="12" stroke={stroke} strokeOpacity="0.35" />
      <path d="M18 34V24M23 34V23M28 34V24M33 34V26M18 34H34" stroke={stroke} strokeWidth="2.4" strokeLinecap="round" />
    </svg>
  )
}

export default TutorialModal
