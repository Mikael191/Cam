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

export const toNdc = (normalized: Vec2): Vec2 => ({
  x: clamp(normalized.x, 0, 1) * 2 - 1,
  y: -(clamp(normalized.y, 0, 1) * 2 - 1),
})

export const fromNdc = (ndc: Vec2): Vec2 => ({
  x: (ndc.x + 1) * 0.5,
  y: (1 - ndc.y) * 0.5,
})

export const vec2Zero = (): Vec2 => ({ x: 0, y: 0 })
export const vec3Zero = (): Vec3 => ({ x: 0, y: 0, z: 0 })

export const length2D = (value: Vec2): number => Math.hypot(value.x, value.y)

export const normalize2D = (value: Vec2): Vec2 => {
  const len = length2D(value)
  if (len <= 1e-6) {
    return { x: 0, y: 0 }
  }
  return {
    x: value.x / len,
    y: value.y / len,
  }
}

export const add2D = (a: Vec2, b: Vec2): Vec2 => ({
  x: a.x + b.x,
  y: a.y + b.y,
})

export const scale2D = (value: Vec2, factor: number): Vec2 => ({
  x: value.x * factor,
  y: value.y * factor,
})

export const sub2D = (a: Vec2, b: Vec2): Vec2 => ({
  x: a.x - b.x,
  y: a.y - b.y,
})

export const wrapAngle = (angle: number): number => {
  let normalized = angle
  while (normalized <= -Math.PI) {
    normalized += Math.PI * 2
  }
  while (normalized > Math.PI) {
    normalized -= Math.PI * 2
  }
  return normalized
}

export const median = (values: number[]): number => {
  if (values.length === 0) {
    return 0
  }
  const sorted = [...values].sort((a, b) => a - b)
  const middle = Math.floor(sorted.length / 2)
  if (sorted.length % 2 === 0) {
    return (sorted[middle - 1] + sorted[middle]) * 0.5
  }
  return sorted[middle]
}

export const angleFromCenter = (point: Vec2, center: Vec2): number =>
  Math.atan2(point.y - center.y, point.x - center.x)

export const roundTo = (value: number, decimals = 2): number => {
  const factor = 10 ** decimals
  return Math.round(value * factor) / factor
}
