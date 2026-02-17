import type { Vec3i, WorldSize } from '../world/voxelTypes'

export type Vec2 = {
  x: number
  y: number
}

export type Vec3 = {
  x: number
  y: number
  z: number
}

export const clamp = (value: number, min: number, max: number): number =>
  Math.min(max, Math.max(min, value))

export const lerp = (start: number, end: number, alpha: number): number =>
  start + (end - start) * alpha

export const distance2D = (a: Vec2, b: Vec2): number => {
  const dx = a.x - b.x
  const dy = a.y - b.y
  return Math.hypot(dx, dy)
}

export const distance3D = (a: Vec3, b: Vec3): number => {
  const dx = a.x - b.x
  const dy = a.y - b.y
  const dz = a.z - b.z
  return Math.hypot(dx, dy, dz)
}

export const vec3Equals = (a: Vec3 | null, b: Vec3 | null): boolean => {
  if (a === b) {
    return true
  }
  if (!a || !b) {
    return false
  }
  return a.x === b.x && a.y === b.y && a.z === b.z
}

export const vec3iEquals = (a: Vec3i | null, b: Vec3i | null): boolean => {
  if (a === b) {
    return true
  }
  if (!a || !b) {
    return false
  }
  return a.x === b.x && a.y === b.y && a.z === b.z
}

export const toNdc = (normalized: Vec2): Vec2 => ({
  x: clamp(normalized.x, 0, 1) * 2 - 1,
  y: -(clamp(normalized.y, 0, 1) * 2 - 1),
})

export const fromNdc = (ndc: Vec2): Vec2 => ({
  x: (ndc.x + 1) * 0.5,
  y: (1 - ndc.y) * 0.5,
})

export const isCellInside = (cell: Vec3i, world: WorldSize): boolean =>
  cell.x >= 0 &&
  cell.y >= 0 &&
  cell.z >= 0 &&
  cell.x < world.x &&
  cell.y < world.y &&
  cell.z < world.z

export const normalizeVec3i = (vec: Vec3i): Vec3i => ({
  x: Math.round(vec.x),
  y: Math.round(vec.y),
  z: Math.round(vec.z),
})

export const roundTo = (value: number, decimals = 2): number => {
  const factor = 10 ** decimals
  return Math.round(value * factor) / factor
}
