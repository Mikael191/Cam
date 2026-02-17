export type VoxelMode = 'build' | 'erase' | 'move' | 'text'

export type QualityPreset = 'low' | 'medium' | 'high'

export type Vec3i = {
  x: number
  y: number
  z: number
}

export type WorldSize = {
  x: number
  y: number
  z: number
}

export type VoxelColor = string

export type VoxelRecord = Record<string, VoxelColor>

export type PointerSource = 'hand' | 'mouse'

export type PointerState = {
  x: number
  y: number
  active: boolean
  source: PointerSource
}

export type GestureTelemetry = {
  label: string
  confidence: number
}

export type QualityConfig = {
  webcamWidth: number
  webcamHeight: number
  inferenceFps: number
}

export const DEFAULT_WORLD_SIZE: WorldSize = {
  x: 64,
  y: 32,
  z: 64,
}

export const DEFAULT_BLOCK_COLOR = '#66b5ff'
export const DEFAULT_TEXT_COLOR = '#7fffd4'

export const HISTORY_LIMIT = 400

export const QUALITY_PRESETS: Record<QualityPreset, QualityConfig> = {
  low: {
    webcamWidth: 640,
    webcamHeight: 360,
    inferenceFps: 24,
  },
  medium: {
    webcamWidth: 960,
    webcamHeight: 540,
    inferenceFps: 27,
  },
  high: {
    webcamWidth: 1280,
    webcamHeight: 720,
    inferenceFps: 30,
  },
}

export const voxelKey = (cell: Vec3i): string => `${cell.x}|${cell.y}|${cell.z}`

export const voxelFromKey = (key: string): Vec3i => {
  const [x, y, z] = key.split('|').map((part) => Number.parseInt(part, 10))
  return { x, y, z }
}

export const copyVec3i = (value: Vec3i): Vec3i => ({ ...value })
