import * as THREE from 'three'
import { voxelCellToWorldCenter } from './raycast'
import { voxelFromKey } from '../world/voxelTypes'
import type { Vec3i, VoxelRecord, WorldSize } from '../world/voxelTypes'

export class InstancedVoxels {
  readonly mesh: THREE.InstancedMesh
  private readonly worldSize: WorldSize
  private readonly maxInstances: number
  private readonly matrix = new THREE.Matrix4()
  private readonly color = new THREE.Color()
  private instanceKeys: string[] = []

  constructor(worldSize: WorldSize, maxInstances: number) {
    this.worldSize = worldSize
    this.maxInstances = maxInstances
    const geometry = new THREE.BoxGeometry(1, 1, 1)
    const material = new THREE.MeshStandardMaterial({
      color: '#66b5ff',
      roughness: 0.6,
      metalness: 0.15,
      vertexColors: true,
    })
    this.mesh = new THREE.InstancedMesh(geometry, material, maxInstances)
    this.mesh.instanceMatrix.setUsage(THREE.DynamicDrawUsage)
    this.mesh.castShadow = true
    this.mesh.receiveShadow = true
    this.mesh.count = 0
    this.mesh.frustumCulled = false
  }

  update(voxels: VoxelRecord): void {
    let index = 0
    for (const [key, voxelColor] of Object.entries(voxels)) {
      if (index >= this.maxInstances) {
        break
      }
      const cell = voxelFromKey(key)
      const worldPosition = voxelCellToWorldCenter(cell, this.worldSize)
      this.matrix.makeTranslation(worldPosition.x, worldPosition.y, worldPosition.z)
      this.mesh.setMatrixAt(index, this.matrix)
      this.color.set(voxelColor)
      this.mesh.setColorAt(index, this.color)
      this.instanceKeys[index] = key
      index += 1
    }

    this.mesh.count = index
    this.instanceKeys.length = index
    this.mesh.instanceMatrix.needsUpdate = true
    if (this.mesh.instanceColor) {
      this.mesh.instanceColor.needsUpdate = true
    }
  }

  getCellByInstanceId(instanceId: number): Vec3i | null {
    if (instanceId < 0 || instanceId >= this.instanceKeys.length) {
      return null
    }
    return voxelFromKey(this.instanceKeys[instanceId])
  }

  dispose(): void {
    this.mesh.geometry.dispose()
    const material = this.mesh.material
    if (Array.isArray(material)) {
      material.forEach((entry) => entry.dispose())
      return
    }
    material.dispose()
  }
}
