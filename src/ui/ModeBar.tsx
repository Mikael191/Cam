import { useVoxelStore } from '../world/voxelStore'
import type { VoxelMode } from '../world/voxelTypes'

const MODES: Array<{ id: VoxelMode; label: string; hint: string }> = [
  { id: 'build', label: 'Build', hint: 'Pinch tap coloca' },
  { id: 'erase', label: 'Erase', hint: 'Pinch/Fist apaga' },
  { id: 'move', label: 'Move', hint: 'Pinch hold arrasta' },
  { id: 'text', label: 'Text', hint: 'Pinch carimba' },
]

export const ModeBar = () => {
  const mode = useVoxelStore((state) => state.mode)
  const setMode = useVoxelStore((state) => state.setMode)
  const undo = useVoxelStore((state) => state.undo)
  const redo = useVoxelStore((state) => state.redo)
  const radialOpen = useVoxelStore((state) => state.radialOpen)

  return (
    <div className="pointer-events-auto absolute left-1/2 top-4 z-20 w-[min(94vw,860px)] -translate-x-1/2 rounded-2xl border border-white/10 bg-panel/85 p-3 shadow-premium backdrop-blur">
      <div className="flex flex-wrap items-center gap-2">
        <span className="mr-2 rounded-full bg-accent/20 px-3 py-1 text-xs font-semibold tracking-wide text-accent">
          MODE: {mode.toUpperCase()}
        </span>
        {MODES.map((entry) => (
          <button
            key={entry.id}
            type="button"
            onClick={() => setMode(entry.id)}
            className={`rounded-xl border px-3 py-2 text-sm ${
              mode === entry.id
                ? 'border-accentStrong bg-accentStrong/20 text-white'
                : 'border-white/15 bg-panelSoft/70 text-slate-200 hover:border-accent/60'
            }`}
          >
            <span className="font-semibold">{entry.label}</span>
            <span className="ml-2 text-xs text-slate-300">{entry.hint}</span>
          </button>
        ))}
        <div className="ml-auto flex items-center gap-2">
          <button
            type="button"
            onClick={() => undo()}
            className="rounded-xl border border-white/15 bg-panelSoft px-3 py-2 text-sm font-medium hover:border-accent/60"
          >
            Undo
          </button>
          <button
            type="button"
            onClick={() => redo()}
            className="rounded-xl border border-white/15 bg-panelSoft px-3 py-2 text-sm font-medium hover:border-accent/60"
          >
            Redo
          </button>
        </div>
      </div>
      {radialOpen && (
        <p className="mt-2 text-xs text-accent">
          Menu radial aberto: mova o cursor e use pinch tap para selecionar.
        </p>
      )}
    </div>
  )
}
