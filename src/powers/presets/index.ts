import type { PowerElement } from '../powerTypes'
import { earthPreset } from './earth'
import { firePreset } from './fire'
import { icePreset } from './ice'
import { lightningPreset } from './lightning'
import { waterPreset } from './water'
import { windPreset } from './wind'

export const ELEMENT_ORDER: PowerElement[] = ['fire', 'ice', 'lightning', 'water', 'wind', 'earth']

export const ELEMENT_LABELS: Record<PowerElement, string> = {
  fire: firePreset.label,
  ice: icePreset.label,
  lightning: lightningPreset.label,
  water: waterPreset.label,
  wind: windPreset.label,
  earth: earthPreset.label,
}

export const ELEMENT_COLORS: Record<PowerElement, { primary: string; secondary: string }> = {
  fire: { primary: firePreset.primary, secondary: firePreset.secondary },
  ice: { primary: icePreset.primary, secondary: icePreset.secondary },
  lightning: { primary: lightningPreset.primary, secondary: lightningPreset.secondary },
  water: { primary: waterPreset.primary, secondary: waterPreset.secondary },
  wind: { primary: windPreset.primary, secondary: windPreset.secondary },
  earth: { primary: earthPreset.primary, secondary: earthPreset.secondary },
}
