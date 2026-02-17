import type { PointerState, VoxelMode } from '../world/voxelTypes'

export const pickModeFromPointer = (pointer: PointerState): VoxelMode | null => {
  if (!pointer.active) {
    return null
  }
  const radius = Math.hypot(pointer.x, pointer.y)
  if (radius < 0.18) {
    return null
  }
  const angle = Math.atan2(pointer.y, pointer.x)
  if (angle >= -Math.PI / 4 && angle < Math.PI / 4) {
    return 'build'
  }
  if (angle >= Math.PI / 4 && angle < (3 * Math.PI) / 4) {
    return 'erase'
  }
  if (angle <= -Math.PI / 4 && angle > (-3 * Math.PI) / 4) {
    return 'text'
  }
  return 'move'
}
