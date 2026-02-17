import { useVoxelStore } from '../world/voxelStore'
import type { ReactNode } from 'react'

type TutorialModalProps = {
  onEnableCamera: () => void
}

const GestureCard = ({
  title,
  description,
  children,
}: {
  title: string
  description: string
  children: ReactNode
}) => (
  <div className="rounded-2xl border border-white/10 bg-panelSoft/80 p-3">
    <div className="mb-2 h-16 w-full rounded-xl bg-black/30 p-2">{children}</div>
    <h4 className="text-sm font-semibold text-white">{title}</h4>
    <p className="mt-1 text-xs text-slate-300">{description}</p>
  </div>
)

export const TutorialModal = ({ onEnableCamera }: TutorialModalProps) => {
  const open = useVoxelStore((state) => state.tutorialOpen)
  const setOpen = useVoxelStore((state) => state.setTutorialOpen)

  if (!open) {
    return null
  }

  return (
    <div className="absolute inset-0 z-40 flex items-center justify-center bg-black/60 p-4 backdrop-blur">
      <div className="w-full max-w-3xl rounded-3xl border border-white/10 bg-panel p-6 shadow-premium">
        <h2 className="text-2xl font-bold">Hand-Controlled Block Builder</h2>
        <p className="mt-2 text-sm text-slate-300">
          Permita webcam e use os gestos para construir com blocos 3D.
        </p>

        <div className="mt-5 grid gap-3 md:grid-cols-3">
          <GestureCard
            title="PINCH"
            description="Tap: confirmar acao. Hold (>350ms): iniciar drag/move."
          >
            <svg viewBox="0 0 120 60" className="h-full w-full">
              <circle cx="40" cy="30" r="11" fill="#5ec2ff" />
              <circle cx="72" cy="30" r="11" fill="#7fffd4" />
              <line x1="52" y1="30" x2="60" y2="30" stroke="#e2e8f0" strokeWidth="3" />
            </svg>
          </GestureCard>
          <GestureCard
            title="OPEN PALM"
            description="Mantenha por 700ms para abrir menu radial de modos."
          >
            <svg viewBox="0 0 120 60" className="h-full w-full">
              <rect x="24" y="18" width="72" height="28" rx="8" fill="#5ec2ff" opacity="0.35" />
              <line x1="32" y1="12" x2="32" y2="48" stroke="#5ec2ff" strokeWidth="4" />
              <line x1="46" y1="10" x2="46" y2="50" stroke="#5ec2ff" strokeWidth="4" />
              <line x1="60" y1="9" x2="60" y2="51" stroke="#5ec2ff" strokeWidth="4" />
              <line x1="74" y1="10" x2="74" y2="50" stroke="#5ec2ff" strokeWidth="4" />
              <line x1="88" y1="12" x2="88" y2="48" stroke="#5ec2ff" strokeWidth="4" />
            </svg>
          </GestureCard>
          <GestureCard
            title="FIST"
            description="No modo ERASE, punho fechado remove blocos continuamente."
          >
            <svg viewBox="0 0 120 60" className="h-full w-full">
              <rect x="28" y="18" width="64" height="26" rx="10" fill="#ff7f7f" opacity="0.55" />
              <circle cx="40" cy="30" r="6" fill="#ff7f7f" />
              <circle cx="52" cy="30" r="6" fill="#ff7f7f" />
              <circle cx="64" cy="30" r="6" fill="#ff7f7f" />
              <circle cx="76" cy="30" r="6" fill="#ff7f7f" />
            </svg>
          </GestureCard>
        </div>

        <div className="mt-5 rounded-2xl border border-white/10 bg-black/25 p-4 text-xs text-slate-200">
          <p>Build: pinch tap adiciona bloco no ghost.</p>
          <p>Erase: pinch tap apaga bloco em hover.</p>
          <p>Move: pinch hold pega bloco, solte para reposicionar.</p>
          <p>Text: digite texto, posicione cursor e pinch para carimbar.</p>
        </div>

        <div className="mt-6 flex flex-wrap justify-end gap-2">
          <button
            type="button"
            onClick={() => setOpen(false)}
            className="rounded-xl border border-white/15 bg-panelSoft px-4 py-2 text-sm hover:border-accent/60"
          >
            Fechar
          </button>
          <button
            type="button"
            onClick={() => {
              onEnableCamera()
              setOpen(false)
            }}
            className="rounded-xl border border-accentStrong/70 bg-accentStrong/20 px-4 py-2 text-sm font-semibold hover:border-accentStrong"
          >
            Habilitar Webcam
          </button>
        </div>
      </div>
    </div>
  )
}
