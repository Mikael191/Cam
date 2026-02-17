import * as THREE from 'three'
import { isCellInside, normalizeVec3i } from '../utils/math'
import type { Vec3i, VoxelMode, WorldSize } from '../world/voxelTypes'

export type RaycastResult = {
  cursorWorld: THREE.Vector3 | null
  hoverCell: Vec3i | null
  targetCell: Vec3i | null
  surfaceNormal: Vec3i
}

export type RaycastParams = {
  pointerNdc: { x: number; y: number }
  mode: VoxelMode
  draggingMove: boolean
  camera: THREE.Camera
  raycaster: THREE.Raycaster
  voxelMesh: THREE.InstancedMesh
  worldSize: WorldSize
  getCellByInstanceId: (instanceId: number) => Vec3i | null
}

const DEFAULT_NORMAL: Vec3i = { x: 0, y: 1, z: 0 }

export const raycastWorld = (params: RaycastParams): RaycastResult => {
  const {
    camera,
    raycaster,
    pointerNdc,
    voxelMesh,
    worldSize,
    getCellByInstanceId,
    mode,
    draggingMove,
  } = params

  const pointer = new THREE.Vector2(pointerNdc.x, pointerNdc.y)
  raycaster.setFromCamera(pointer, camera)

  let hoverCell: Vec3i | null = null
  let adjacentCell: Vec3i | null = null
  let normal = { ...DEFAULT_NORMAL }

  const intersections = raycaster.intersectObject(voxelMesh, false)
  if (intersections.length > 0) {
    const hit = intersections[0]
    const instanceId = hit.instanceId ?? -1
    const cell = getCellByInstanceId(instanceId)
    if (cell) {
      hoverCell = cell
      const hitNormal = hit.face?.normal.clone().transformDirection(voxelMesh.matrixWorld)
      if (hitNormal) {
        normal = normalizeVec3i({
          x: hitNormal.x,
          y: hitNormal.y,
          z: hitNormal.z,
        })
      }
      adjacentCell = {
        x: hoverCell.x + normal.x,
        y: hoverCell.y + normal.y,
        z: hoverCell.z + normal.z,
      }
      if (adjacentCell && !isCellInside(adjacentCell, worldSize)) {
        adjacentCell = null
      }
    }
  }

  const groundPlane = new THREE.Plane(new THREE.Vector3(0, 1, 0), 0)
  const groundIntersection = new THREE.Vector3()
  let groundCell: Vec3i | null = null
  if (raycaster.ray.intersectPlane(groundPlane, groundIntersection)) {
    groundCell = worldPointToGroundCell(groundIntersection, worldSize)
    if (groundCell && !isCellInside(groundCell, worldSize)) {
      groundCell = null
    }
  }

  let targetCell: Vec3i | null = null
  if (mode === 'build' || mode === 'text') {
    targetCell = adjacentCell ?? groundCell
  } else if (mode === 'erase') {
    targetCell = hoverCell
  } else if (draggingMove) {
    targetCell = adjacentCell ?? groundCell
  } else {
    targetCell = hoverCell ?? groundCell
  }

  let cursorWorld: THREE.Vector3 | null = null
  if (targetCell) {
    cursorWorld = voxelCellToWorldCenter(targetCell, worldSize)
  } else if (groundCell) {
    cursorWorld = voxelCellToWorldCenter(groundCell, worldSize)
  }

  return {
    cursorWorld,
    hoverCell,
    targetCell,
    surfaceNormal: normal,
  }
}

export const voxelCellToWorldCenter = (cell: Vec3i, worldSize: WorldSize): THREE.Vector3 =>
  new THREE.Vector3(cell.x - worldSize.x / 2 + 0.5, cell.y + 0.5, cell.z - worldSize.z / 2 + 0.5)

export const worldPointToGroundCell = (point: THREE.Vector3, worldSize: WorldSize): Vec3i => ({
  x: Math.floor(point.x + worldSize.x / 2),
  y: 0,
  z: Math.floor(point.z + worldSize.z / 2),
})
