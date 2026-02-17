import type { PowerElement } from '../powers/powerTypes'
import { ELEMENT_COLORS, ELEMENT_LABELS, ELEMENT_ORDER } from '../powers/presets'

type RadialMenuProps = {
  open: boolean
  center: { x: number; y: number } | null
  hover: PowerElement | null
  selected: PowerElement
  onSelect: (element: PowerElement) => void
}

const RadialMenu = ({ open, center, hover, selected, onSelect }: RadialMenuProps) => {
  if (!open || !center) {
    return null
  }

  const radius = 94
  const angleStep = (Math.PI * 2) / ELEMENT_ORDER.length

  return (
    <div
      className="pointer-events-none absolute z-50"
      style={{
        left: `${center.x * 100}%`,
        top: `${center.y * 100}%`,
        transform: 'translate(-50%, -50%)',
      }}
    >
      <div className="absolute left-1/2 top-1/2 h-52 w-52 -translate-x-1/2 -translate-y-1/2 rounded-full border border-white/18 bg-black/45 shadow-premium backdrop-blur-md" />

      {ELEMENT_ORDER.map((element, index) => {
        const angle = -Math.PI / 2 + angleStep * index
        const x = Math.cos(angle) * radius
        const y = Math.sin(angle) * radius
        const colors = ELEMENT_COLORS[element]
        const active = hover === element || selected === element

        return (
          <button
            key={element}
            type="button"
            onClick={() => onSelect(element)}
            className="pointer-events-auto absolute left-1/2 top-1/2 flex h-14 w-14 -translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-full border text-[10px] font-medium uppercase tracking-[0.15em] text-white transition"
            style={{
              transform: `translate(calc(-50% + ${x}px), calc(-50% + ${y}px))`,
              borderColor: active ? `${colors.secondary}` : 'rgba(255,255,255,0.25)',
              background: active
                ? `radial-gradient(circle, ${colors.secondary}88 0%, ${colors.primary}44 60%, rgba(0,0,0,0.45) 100%)`
                : 'rgba(0, 0, 0, 0.46)',
              boxShadow: active ? `0 0 30px ${colors.primary}88` : 'none',
            }}
          >
            {ELEMENT_LABELS[element]}
          </button>
        )
      })}

      <div className="absolute left-1/2 top-1/2 flex h-16 w-16 -translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-full border border-white/35 bg-black/60 text-[10px] uppercase tracking-[0.17em] text-white/90">
        Escolha
      </div>
    </div>
  )
}

export default RadialMenu
