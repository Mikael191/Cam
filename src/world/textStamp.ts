import { isCellInside } from '../utils/math'
import type { Vec3i, WorldSize } from './voxelTypes'

const GLYPH_WIDTH = 5
const GLYPH_HEIGHT = 7
const GLYPH_SPACING = 1

type Glyph = [string, string, string, string, string, string, string]

const FONT_5X7: Record<string, Glyph> = {
  A: ['01110', '10001', '10001', '11111', '10001', '10001', '10001'],
  B: ['11110', '10001', '10001', '11110', '10001', '10001', '11110'],
  C: ['01110', '10001', '10000', '10000', '10000', '10001', '01110'],
  D: ['11110', '10001', '10001', '10001', '10001', '10001', '11110'],
  E: ['11111', '10000', '10000', '11110', '10000', '10000', '11111'],
  F: ['11111', '10000', '10000', '11110', '10000', '10000', '10000'],
  G: ['01110', '10001', '10000', '10111', '10001', '10001', '01110'],
  H: ['10001', '10001', '10001', '11111', '10001', '10001', '10001'],
  I: ['11111', '00100', '00100', '00100', '00100', '00100', '11111'],
  J: ['00001', '00001', '00001', '00001', '10001', '10001', '01110'],
  K: ['10001', '10010', '10100', '11000', '10100', '10010', '10001'],
  L: ['10000', '10000', '10000', '10000', '10000', '10000', '11111'],
  M: ['10001', '11011', '10101', '10101', '10001', '10001', '10001'],
  N: ['10001', '11001', '10101', '10011', '10001', '10001', '10001'],
  O: ['01110', '10001', '10001', '10001', '10001', '10001', '01110'],
  P: ['11110', '10001', '10001', '11110', '10000', '10000', '10000'],
  Q: ['01110', '10001', '10001', '10001', '10101', '10010', '01101'],
  R: ['11110', '10001', '10001', '11110', '10100', '10010', '10001'],
  S: ['01111', '10000', '10000', '01110', '00001', '00001', '11110'],
  T: ['11111', '00100', '00100', '00100', '00100', '00100', '00100'],
  U: ['10001', '10001', '10001', '10001', '10001', '10001', '01110'],
  V: ['10001', '10001', '10001', '10001', '10001', '01010', '00100'],
  W: ['10001', '10001', '10001', '10101', '10101', '10101', '01010'],
  X: ['10001', '10001', '01010', '00100', '01010', '10001', '10001'],
  Y: ['10001', '10001', '01010', '00100', '00100', '00100', '00100'],
  Z: ['11111', '00001', '00010', '00100', '01000', '10000', '11111'],
  '0': ['01110', '10001', '10011', '10101', '11001', '10001', '01110'],
  '1': ['00100', '01100', '00100', '00100', '00100', '00100', '01110'],
  '2': ['01110', '10001', '00001', '00010', '00100', '01000', '11111'],
  '3': ['11110', '00001', '00001', '01110', '00001', '00001', '11110'],
  '4': ['00010', '00110', '01010', '10010', '11111', '00010', '00010'],
  '5': ['11111', '10000', '10000', '11110', '00001', '00001', '11110'],
  '6': ['01110', '10000', '10000', '11110', '10001', '10001', '01110'],
  '7': ['11111', '00001', '00010', '00100', '01000', '01000', '01000'],
  '8': ['01110', '10001', '10001', '01110', '10001', '10001', '01110'],
  '9': ['01110', '10001', '10001', '01111', '00001', '00001', '01110'],
  ' ': ['00000', '00000', '00000', '00000', '00000', '00000', '00000'],
}

export const supportsGlyph = (value: string): boolean =>
  value
    .toUpperCase()
    .split('')
    .every((char) => char in FONT_5X7)

export const sanitizeText = (value: string): string =>
  value
    .toUpperCase()
    .split('')
    .map((char) => (char in FONT_5X7 ? char : ' '))
    .join('')

const axisForNormal = (normal: Vec3i): { right: Vec3i; up: Vec3i } => {
  const ax = Math.abs(normal.x)
  const ay = Math.abs(normal.y)
  const az = Math.abs(normal.z)

  if (ay >= ax && ay >= az) {
    return {
      right: { x: 1, y: 0, z: 0 },
      up: { x: 0, y: 0, z: 1 },
    }
  }

  if (ax > az) {
    return {
      right: { x: 0, y: 0, z: normal.x > 0 ? -1 : 1 },
      up: { x: 0, y: 1, z: 0 },
    }
  }

  return {
    right: { x: normal.z > 0 ? 1 : -1, y: 0, z: 0 },
    up: { x: 0, y: 1, z: 0 },
  }
}

export type StampOptions = {
  normal?: Vec3i
  worldSize?: WorldSize
  spacing?: number
}

export const generateTextStampCells = (
  text: string,
  anchor: Vec3i,
  options?: StampOptions,
): Vec3i[] => {
  const safeText = sanitizeText(text)
  if (!safeText.trim()) {
    return []
  }

  const normal = options?.normal ?? { x: 0, y: 1, z: 0 }
  const spacing = options?.spacing ?? GLYPH_SPACING
  const { right, up } = axisForNormal(normal)
  const cells: Vec3i[] = []
  const dedupe = new Set<string>()

  let penOffset = 0

  for (const character of safeText) {
    const glyph = FONT_5X7[character] ?? FONT_5X7[' ']
    for (let row = 0; row < GLYPH_HEIGHT; row += 1) {
      for (let col = 0; col < GLYPH_WIDTH; col += 1) {
        if (glyph[row][col] !== '1') {
          continue
        }
        const upOffset = GLYPH_HEIGHT - 1 - row
        const x = anchor.x + right.x * (penOffset + col) + up.x * upOffset
        const y = anchor.y + right.y * (penOffset + col) + up.y * upOffset
        const z = anchor.z + right.z * (penOffset + col) + up.z * upOffset
        const cell = { x, y, z }
        if (options?.worldSize && !isCellInside(cell, options.worldSize)) {
          continue
        }
        const key = `${x}|${y}|${z}`
        if (dedupe.has(key)) {
          continue
        }
        dedupe.add(key)
        cells.push(cell)
      }
    }
    penOffset += GLYPH_WIDTH + spacing
  }

  return cells
}
