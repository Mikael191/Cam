import { useMemo } from 'react'
import { pickModeFromPointer } from './radialUtils'
import { useVoxelStore } from '../world/voxelStore'
import type { VoxelMode } from '../world/voxelTypes'

const OPTIONS: Array<{ id: VoxelMode; label: string; style: string }> = [
  { id: 'build', label: 'BUILD', style: 'left-[72%] top-1/2 -translate-y-1/2' },
  { id: 'erase', label: 'ERASE', style: 'left-1/2 top-[18%] -translate-x-1/2' },
  { id: 'move', label: 'MOVE', style: 'left-[10%] top-1/2 -translate-y-1/2' },
  { id: 'text', label: 'TEXT', style: 'left-1/2 top-[78%] -translate-x-1/2' },
]

export const RadialMenu = () => {
  const open = useVoxelStore((state) => state.radialOpen)
  const pointer = useVoxelStore((state) => state.pointer)
  const setMode = useVoxelStore((state) => state.setMode)
  const setRadialOpen = useVoxelStore((state) => state.setRadialOpen)

  const hovered = useMemo(() => pickModeFromPointer(pointer), [pointer])

  if (!open) {
    return null
  }

  return (
    <div className="pointer-events-none absolute inset-0 z-30 flex items-center justify-center bg-black/40 backdrop-blur-sm">
      <div className="relative h-56 w-56 rounded-full border border-white/20 bg-panel/90 shadow-premium">
        <div className="absolute left-1/2 top-1/2 h-14 w-14 -translate-x-1/2 -translate-y-1/2 rounded-full border border-accent/70 bg-accent/20" />
        {OPTIONS.map((option) => (
          <button
            key={option.id}
            type="button"
            onClick={() => {
              setMode(option.id)
              setRadialOpen(false)
            }}
            className={`pointer-events-auto absolute rounded-xl border px-3 py-2 text-xs font-semibold tracking-widest ${
              option.style
            } ${
              hovered === option.id
                ? 'border-accentStrong bg-accentStrong/20 text-white'
                : 'border-white/20 bg-panelSoft/90 text-slate-200'
            }`}
          >
            {option.label}
          </button>
        ))}
      </div>
    </div>
  )
}
