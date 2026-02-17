import { create } from 'zustand'
import { isCellInside, vec3Equals, vec3iEquals } from '../utils/math'
import {
  fromSceneFile,
  parseSceneJson,
  readLiveScene,
  readSnapshots,
  sceneToJson,
  toSceneFile,
  writeLiveScene,
  writeSnapshots,
} from './serialization'
import { generateTextStampCells } from './textStamp'
import {
  DEFAULT_BLOCK_COLOR,
  DEFAULT_TEXT_COLOR,
  DEFAULT_WORLD_SIZE,
  HISTORY_LIMIT,
  QUALITY_PRESETS,
  copyVec3i,
  voxelKey,
} from './voxelTypes'
import type {
  GestureTelemetry,
  PointerState,
  QualityPreset,
  Vec3i,
  VoxelMode,
  VoxelRecord,
  WorldSize,
} from './voxelTypes'

type Vec3 = {
  x: number
  y: number
  z: number
}

type HistoryEntry = {
  label: 'place' | 'erase' | 'move' | 'stamp'
  added: Array<[string, string]>
  removed: Array<[string, string]>
  createdAt: number
}

type SnapshotSummary = {
  name: string
  savedAt: string
}

type TrackingStatus = 'idle' | 'starting' | 'running' | 'error'

type StoreSettings = {
  showWebcam: boolean
  showLandmarks: boolean
  quality: QualityPreset
  mouseFallback: boolean
  mirrorInput: boolean
  webcamWidth: number
  webcamHeight: number
  inferenceFps: number
}

type RaycastPayload = {
  cursorWorld: Vec3 | null
  hoverCell: Vec3i | null
  targetCell: Vec3i | null
  surfaceNormal: Vec3i
}

type VoxelStore = {
  worldSize: WorldSize
  voxels: VoxelRecord
  voxelVersion: number
  mode: VoxelMode
  textInput: string
  pointer: PointerState
  cursorWorld: Vec3 | null
  hoverCell: Vec3i | null
  targetCell: Vec3i | null
  surfaceNormal: Vec3i
  moveDragFrom: Vec3i | null
  moveDragTarget: Vec3i | null
  radialOpen: boolean
  tutorialOpen: boolean
  trackingStatus: TrackingStatus
  trackingError: string | null
  inferenceFps: number
  handsDetected: number
  gesture: GestureTelemetry
  settings: StoreSettings
  history: HistoryEntry[]
  future: HistoryEntry[]
  snapshots: SnapshotSummary[]
  setMode: (mode: VoxelMode) => void
  setTextInput: (value: string) => void
  setPointer: (pointer: PointerState) => void
  setRaycast: (payload: RaycastPayload) => void
  setRadialOpen: (open: boolean) => void
  setTutorialOpen: (open: boolean) => void
  setTrackingStatus: (status: TrackingStatus, error?: string | null) => void
  setVisionStats: (fps: number, hands: number) => void
  setGesture: (gesture: GestureTelemetry) => void
  setQuality: (quality: QualityPreset) => void
  toggleWebcam: () => void
  toggleLandmarks: () => void
  toggleMouseFallback: () => void
  toggleMirrorInput: () => void
  placeAtCursor: () => boolean
  eraseAtCursor: () => boolean
  stampTextAtCursor: () => boolean
  beginMoveDragFromHover: () => boolean
  updateMoveDragTargetFromCursor: () => void
  commitMoveDrag: () => boolean
  cancelMoveDrag: () => void
  placeCell: (cell: Vec3i, color?: string) => boolean
  eraseCell: (cell: Vec3i) => boolean
  clearWorld: () => void
  undo: () => boolean
  redo: () => boolean
  saveLiveScene: () => void
  loadLiveScene: () => void
  refreshSnapshots: () => void
  saveSnapshot: (name: string) => boolean
  loadSnapshot: (name: string) => boolean
  exportSceneJson: () => string
  importSceneJson: (json: string) => boolean
}

const qualityDefaults = QUALITY_PRESETS.medium
const liveScene = readLiveScene()
const restored = liveScene ? fromSceneFile(liveScene) : null

const initialWorldSize = restored?.worldSize ?? DEFAULT_WORLD_SIZE
const initialVoxels = restored?.voxels ?? {}

const initialSettings: StoreSettings = {
  showWebcam: true,
  showLandmarks: false,
  quality: 'medium',
  mouseFallback: false,
  mirrorInput: true,
  webcamWidth: qualityDefaults.webcamWidth,
  webcamHeight: qualityDefaults.webcamHeight,
  inferenceFps: qualityDefaults.inferenceFps,
}

const snapshotsToSummary = (): SnapshotSummary[] =>
  readSnapshots().map((entry) => ({
    name: entry.name,
    savedAt: entry.savedAt,
  }))

type StoreSetter = (
  update: Partial<VoxelStore> | ((state: VoxelStore) => Partial<VoxelStore>),
) => void

export const useVoxelStore = create<VoxelStore>((set, get) => ({
  worldSize: initialWorldSize,
  voxels: initialVoxels,
  voxelVersion: 1,
  mode: 'build',
  textInput: 'HELLO',
  pointer: {
    x: 0,
    y: 0,
    active: false,
    source: 'hand',
  },
  cursorWorld: null,
  hoverCell: null,
  targetCell: null,
  surfaceNormal: { x: 0, y: 1, z: 0 },
  moveDragFrom: null,
  moveDragTarget: null,
  radialOpen: false,
  tutorialOpen: true,
  trackingStatus: 'idle',
  trackingError: null,
  inferenceFps: 0,
  handsDetected: 0,
  gesture: {
    label: 'NO_HAND',
    confidence: 0,
  },
  settings: initialSettings,
  history: [],
  future: [],
  snapshots: snapshotsToSummary(),

  setMode: (mode) =>
    set((state) => ({
      mode,
      radialOpen: false,
      moveDragFrom: mode === 'move' ? state.moveDragFrom : null,
      moveDragTarget: mode === 'move' ? state.moveDragTarget : null,
    })),

  setTextInput: (value) => set(() => ({ textInput: value.toUpperCase() })),

  setPointer: (pointer) =>
    set((state) => {
      if (
        state.pointer.x === pointer.x &&
        state.pointer.y === pointer.y &&
        state.pointer.active === pointer.active &&
        state.pointer.source === pointer.source
      ) {
        return {}
      }
      return { pointer }
    }),

  setRaycast: ({ cursorWorld, hoverCell, targetCell, surfaceNormal }) =>
    set((state) => {
      if (
        vec3Equals(state.cursorWorld, cursorWorld) &&
        vec3iEquals(state.hoverCell, hoverCell) &&
        vec3iEquals(state.targetCell, targetCell) &&
        vec3iEquals(state.surfaceNormal, surfaceNormal)
      ) {
        return {}
      }
      return {
        cursorWorld,
        hoverCell,
        targetCell,
        surfaceNormal,
      }
    }),

  setRadialOpen: (open) => set(() => ({ radialOpen: open })),

  setTutorialOpen: (open) => set(() => ({ tutorialOpen: open })),

  setTrackingStatus: (status, error) =>
    set(() => ({
      trackingStatus: status,
      trackingError: error ?? null,
    })),

  setVisionStats: (fps, hands) =>
    set(() => ({
      inferenceFps: fps,
      handsDetected: hands,
    })),

  setGesture: (gesture) => set(() => ({ gesture })),

  setQuality: (quality) =>
    set((state) => ({
      settings: {
        ...state.settings,
        quality,
        webcamWidth: QUALITY_PRESETS[quality].webcamWidth,
        webcamHeight: QUALITY_PRESETS[quality].webcamHeight,
        inferenceFps: QUALITY_PRESETS[quality].inferenceFps,
      },
    })),

  toggleWebcam: () =>
    set((state) => ({
      settings: {
        ...state.settings,
        showWebcam: !state.settings.showWebcam,
      },
    })),

  toggleLandmarks: () =>
    set((state) => ({
      settings: {
        ...state.settings,
        showLandmarks: !state.settings.showLandmarks,
      },
    })),

  toggleMouseFallback: () =>
    set((state) => ({
      settings: {
        ...state.settings,
        mouseFallback: !state.settings.mouseFallback,
      },
    })),

  toggleMirrorInput: () =>
    set((state) => ({
      settings: {
        ...state.settings,
        mirrorInput: !state.settings.mirrorInput,
      },
    })),

  placeCell: (cell, color) => {
    const state = get()
    if (!isCellInside(cell, state.worldSize)) {
      return false
    }
    const key = voxelKey(cell)
    if (state.voxels[key]) {
      return false
    }
    return commitHistory(set, state, 'place', [[key, color ?? DEFAULT_BLOCK_COLOR]], [])
  },

  eraseCell: (cell) => {
    const state = get()
    if (!isCellInside(cell, state.worldSize)) {
      return false
    }
    const key = voxelKey(cell)
    const existing = state.voxels[key]
    if (!existing) {
      return false
    }
    return commitHistory(set, state, 'erase', [], [[key, existing]])
  },

  placeAtCursor: () => {
    const state = get()
    if (!state.targetCell) {
      return false
    }
    return state.placeCell(state.targetCell)
  },

  eraseAtCursor: () => {
    const state = get()
    if (!state.hoverCell) {
      return false
    }
    return state.eraseCell(state.hoverCell)
  },

  stampTextAtCursor: () => {
    const state = get()
    if (!state.targetCell) {
      return false
    }
    const cells = generateTextStampCells(state.textInput, state.targetCell, {
      normal: state.surfaceNormal,
      worldSize: state.worldSize,
    })
    if (cells.length === 0) {
      return false
    }
    const added: Array<[string, string]> = []
    for (const cell of cells) {
      const key = voxelKey(cell)
      if (state.voxels[key]) {
        continue
      }
      added.push([key, DEFAULT_TEXT_COLOR])
    }
    if (added.length === 0) {
      return false
    }
    return commitHistory(set, state, 'stamp', added, [])
  },

  beginMoveDragFromHover: () => {
    const state = get()
    const hover = state.hoverCell
    if (!hover) {
      return false
    }
    const sourceKey = voxelKey(hover)
    if (!state.voxels[sourceKey]) {
      return false
    }
    set(() => ({
      moveDragFrom: copyVec3i(hover),
      moveDragTarget: state.targetCell ? copyVec3i(state.targetCell) : copyVec3i(hover),
    }))
    return true
  },

  updateMoveDragTargetFromCursor: () =>
    set((state) => ({
      moveDragTarget: state.targetCell ? copyVec3i(state.targetCell) : state.moveDragTarget,
    })),

  commitMoveDrag: () => {
    const state = get()
    const from = state.moveDragFrom
    const to = state.moveDragTarget ?? state.targetCell
    if (!from || !to) {
      set(() => ({ moveDragFrom: null, moveDragTarget: null }))
      return false
    }
    if (!isCellInside(to, state.worldSize)) {
      set(() => ({ moveDragFrom: null, moveDragTarget: null }))
      return false
    }

    const fromKey = voxelKey(from)
    const toKey = voxelKey(to)
    const color = state.voxels[fromKey]
    if (!color || (toKey !== fromKey && state.voxels[toKey])) {
      set(() => ({ moveDragFrom: null, moveDragTarget: null }))
      return false
    }

    if (fromKey === toKey) {
      set(() => ({ moveDragFrom: null, moveDragTarget: null }))
      return false
    }

    const didCommit = commitHistory(set, state, 'move', [[toKey, color]], [[fromKey, color]])
    set(() => ({ moveDragFrom: null, moveDragTarget: null }))
    return didCommit
  },

  cancelMoveDrag: () => set(() => ({ moveDragFrom: null, moveDragTarget: null })),

  clearWorld: () => {
    const state = get()
    const removed: Array<[string, string]> = Object.entries(state.voxels)
    if (removed.length === 0) {
      return
    }
    commitHistory(set, state, 'erase', [], removed)
  },

  undo: () => {
    const state = get()
    const entry = state.history[state.history.length - 1]
    if (!entry) {
      return false
    }
    const nextVoxels = { ...state.voxels }
    for (const [key] of entry.added) {
      delete nextVoxels[key]
    }
    for (const [key, color] of entry.removed) {
      nextVoxels[key] = color
    }
    const nextHistory = state.history.slice(0, -1)
    const nextFuture = [...state.future, entry]
    set(() => ({
      voxels: nextVoxels,
      history: nextHistory,
      future: nextFuture,
      voxelVersion: state.voxelVersion + 1,
    }))
    return true
  },

  redo: () => {
    const state = get()
    const entry = state.future[state.future.length - 1]
    if (!entry) {
      return false
    }
    const nextVoxels = { ...state.voxels }
    for (const [key] of entry.removed) {
      delete nextVoxels[key]
    }
    for (const [key, color] of entry.added) {
      nextVoxels[key] = color
    }
    const nextFuture = state.future.slice(0, -1)
    const nextHistory = [...state.history, entry]
    set(() => ({
      voxels: nextVoxels,
      history: nextHistory,
      future: nextFuture,
      voxelVersion: state.voxelVersion + 1,
    }))
    return true
  },

  saveLiveScene: () => {
    const state = get()
    writeLiveScene(toSceneFile(state.voxels, state.worldSize))
  },

  loadLiveScene: () => {
    const live = readLiveScene()
    if (!live) {
      return
    }
    const parsed = fromSceneFile(live)
    set((state) => ({
      voxels: parsed.voxels,
      voxelVersion: state.voxelVersion + 1,
      history: [],
      future: [],
    }))
  },

  refreshSnapshots: () =>
    set(() => ({
      snapshots: snapshotsToSummary(),
    })),

  saveSnapshot: (name) => {
    const trimmed = name.trim()
    if (!trimmed) {
      return false
    }
    const state = get()
    const scene = toSceneFile(state.voxels, state.worldSize)
    const snapshots = readSnapshots().filter((snapshot) => snapshot.name !== trimmed)
    snapshots.unshift({
      name: trimmed,
      savedAt: scene.savedAt,
      scene,
    })
    writeSnapshots(snapshots.slice(0, 20))
    set(() => ({ snapshots: snapshotsToSummary() }))
    return true
  },

  loadSnapshot: (name) => {
    const match = readSnapshots().find((snapshot) => snapshot.name === name)
    if (!match) {
      return false
    }
    const parsed = fromSceneFile(match.scene)
    set((state) => ({
      voxels: parsed.voxels,
      voxelVersion: state.voxelVersion + 1,
      history: [],
      future: [],
    }))
    return true
  },

  exportSceneJson: () => {
    const state = get()
    return sceneToJson(toSceneFile(state.voxels, state.worldSize))
  },

  importSceneJson: (json) => {
    try {
      const parsedScene = parseSceneJson(json)
      const scene = fromSceneFile(parsedScene)
      set((state) => ({
        voxels: scene.voxels,
        voxelVersion: state.voxelVersion + 1,
        history: [],
        future: [],
      }))
      return true
    } catch {
      return false
    }
  },
}))

const commitHistory = (
  set: StoreSetter,
  state: VoxelStore,
  label: HistoryEntry['label'],
  added: Array<[string, string]>,
  removed: Array<[string, string]>,
): boolean => {
  if (added.length === 0 && removed.length === 0) {
    return false
  }
  const nextVoxels: VoxelRecord = { ...state.voxels }
  for (const [key] of removed) {
    delete nextVoxels[key]
  }
  for (const [key, color] of added) {
    nextVoxels[key] = color
  }
  const nextEntry: HistoryEntry = {
    label,
    added,
    removed,
    createdAt: Date.now(),
  }
  const cappedHistory = [...state.history, nextEntry].slice(-HISTORY_LIMIT)
  set(() => ({
    voxels: nextVoxels,
    history: cappedHistory,
    future: [],
    voxelVersion: state.voxelVersion + 1,
  }))
  return true
}
