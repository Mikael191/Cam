import { DEFAULT_WORLD_SIZE, voxelFromKey, voxelKey } from './voxelTypes'
import type { Vec3i, VoxelRecord, WorldSize } from './voxelTypes'

export const LIVE_SCENE_STORAGE_KEY = 'hbb:scene:live'
export const SNAPSHOT_STORAGE_KEY = 'hbb:scene:snapshots'

export type SerializedVoxel = [number, number, number, string]

export type SceneFile = {
  schema: 'hand-builder-scene@1'
  worldSize: WorldSize
  savedAt: string
  voxels: SerializedVoxel[]
}

export type StoredSnapshot = {
  name: string
  savedAt: string
  scene: SceneFile
}

export const toSceneFile = (voxels: VoxelRecord, worldSize: WorldSize): SceneFile => {
  const serialized: SerializedVoxel[] = []
  for (const [key, color] of Object.entries(voxels)) {
    const cell = voxelFromKey(key)
    serialized.push([cell.x, cell.y, cell.z, color])
  }
  return {
    schema: 'hand-builder-scene@1',
    worldSize,
    savedAt: new Date().toISOString(),
    voxels: serialized,
  }
}

export const fromSceneFile = (scene: SceneFile): { voxels: VoxelRecord; worldSize: WorldSize } => {
  const worldSize = sanitizeWorldSize(scene.worldSize)
  const voxels: VoxelRecord = {}
  for (const [x, y, z, color] of scene.voxels) {
    const cell = { x, y, z }
    if (!isCellInside(cell, worldSize)) {
      continue
    }
    voxels[voxelKey(cell)] = typeof color === 'string' ? color : '#66b5ff'
  }
  return { voxels, worldSize }
}

export const sceneToJson = (scene: SceneFile): string => JSON.stringify(scene, null, 2)

export const parseSceneJson = (json: string): SceneFile => {
  const raw = JSON.parse(json) as Partial<SceneFile> | null
  if (!raw || raw.schema !== 'hand-builder-scene@1') {
    throw new Error('JSON invalido: schema nao suportado.')
  }
  const worldSize = sanitizeWorldSize(raw.worldSize)
  const voxels = Array.isArray(raw.voxels)
    ? raw.voxels
        .filter((item): item is SerializedVoxel => {
          if (!Array.isArray(item) || item.length !== 4) {
            return false
          }
          return (
            Number.isFinite(item[0]) &&
            Number.isFinite(item[1]) &&
            Number.isFinite(item[2]) &&
            typeof item[3] === 'string'
          )
        })
        .map(
          ([x, y, z, color]): SerializedVoxel => [
            Math.floor(x),
            Math.floor(y),
            Math.floor(z),
            color,
          ],
        )
    : []
  return {
    schema: 'hand-builder-scene@1',
    worldSize,
    savedAt: typeof raw.savedAt === 'string' ? raw.savedAt : new Date().toISOString(),
    voxels,
  }
}

export const readLiveScene = (): SceneFile | null => {
  const value = safeReadLocalStorage(LIVE_SCENE_STORAGE_KEY)
  if (!value) {
    return null
  }
  try {
    return parseSceneJson(value)
  } catch {
    return null
  }
}

export const writeLiveScene = (scene: SceneFile): void => {
  safeWriteLocalStorage(LIVE_SCENE_STORAGE_KEY, sceneToJson(scene))
}

export const readSnapshots = (): StoredSnapshot[] => {
  const raw = safeReadLocalStorage(SNAPSHOT_STORAGE_KEY)
  if (!raw) {
    return []
  }
  try {
    const parsed = JSON.parse(raw) as StoredSnapshot[]
    if (!Array.isArray(parsed)) {
      return []
    }
    return parsed
      .filter((snapshot) => snapshot && typeof snapshot.name === 'string' && snapshot.scene)
      .map((snapshot) => ({
        name: snapshot.name,
        savedAt: snapshot.savedAt ?? snapshot.scene.savedAt ?? new Date().toISOString(),
        scene: parseSceneJson(sceneToJson(snapshot.scene)),
      }))
      .sort((a, b) => (a.savedAt < b.savedAt ? 1 : -1))
  } catch {
    return []
  }
}

export const writeSnapshots = (snapshots: StoredSnapshot[]): void => {
  safeWriteLocalStorage(SNAPSHOT_STORAGE_KEY, JSON.stringify(snapshots))
}

const safeReadLocalStorage = (key: string): string | null => {
  if (typeof window === 'undefined') {
    return null
  }
  try {
    return window.localStorage.getItem(key)
  } catch {
    return null
  }
}

const safeWriteLocalStorage = (key: string, value: string): void => {
  if (typeof window === 'undefined') {
    return
  }
  try {
    window.localStorage.setItem(key, value)
  } catch {
    // Ignore write errors (private mode/quota); app keeps running.
  }
}

const isCellInside = (cell: Vec3i, worldSize: WorldSize): boolean =>
  cell.x >= 0 &&
  cell.y >= 0 &&
  cell.z >= 0 &&
  cell.x < worldSize.x &&
  cell.y < worldSize.y &&
  cell.z < worldSize.z

const sanitizeWorldSize = (worldSize: Partial<WorldSize> | undefined): WorldSize => ({
  x: clampDimension(worldSize?.x, DEFAULT_WORLD_SIZE.x),
  y: clampDimension(worldSize?.y, DEFAULT_WORLD_SIZE.y),
  z: clampDimension(worldSize?.z, DEFAULT_WORLD_SIZE.z),
})

const clampDimension = (value: number | undefined, fallback: number): number => {
  if (typeof value !== 'number' || !Number.isFinite(value)) {
    return fallback
  }
  return Math.max(8, Math.min(256, Math.floor(value)))
}
