import * as THREE from 'three'
import { voxelCellToWorldCenter } from './raycast'
import type { Vec3i, WorldSize } from '../world/voxelTypes'

export class GhostPreview {
  readonly ghostBlock: THREE.Mesh
  readonly hoverOutline: THREE.LineSegments
  readonly textGhost: THREE.InstancedMesh
  private readonly worldSize: WorldSize
  private readonly matrix = new THREE.Matrix4()
  private readonly color = new THREE.Color('#7fffd4')

  constructor(worldSize: WorldSize, maxTextGhost = 20000) {
    this.worldSize = worldSize

    this.ghostBlock = new THREE.Mesh(
      new THREE.BoxGeometry(1, 1, 1),
      new THREE.MeshStandardMaterial({
        color: '#5ec2ff',
        transparent: true,
        opacity: 0.32,
        roughness: 0.4,
        metalness: 0.1,
        depthWrite: false,
      }),
    )
    this.ghostBlock.visible = false

    this.hoverOutline = new THREE.LineSegments(
      new THREE.EdgesGeometry(new THREE.BoxGeometry(1.02, 1.02, 1.02)),
      new THREE.LineBasicMaterial({ color: '#ffd866', transparent: true, opacity: 0.95 }),
    )
    this.hoverOutline.visible = false

    this.textGhost = new THREE.InstancedMesh(
      new THREE.BoxGeometry(1, 1, 1),
      new THREE.MeshStandardMaterial({
        color: '#7fffd4',
        transparent: true,
        opacity: 0.25,
        roughness: 0.5,
        metalness: 0.1,
        depthWrite: false,
        vertexColors: true,
      }),
      maxTextGhost,
    )
    this.textGhost.instanceMatrix.setUsage(THREE.DynamicDrawUsage)
    this.textGhost.visible = false
    this.textGhost.frustumCulled = false
    this.textGhost.count = 0
  }

  setGhostCell(cell: Vec3i | null): void {
    if (!cell) {
      this.ghostBlock.visible = false
      return
    }
    const pos = voxelCellToWorldCenter(cell, this.worldSize)
    this.ghostBlock.position.copy(pos)
    this.ghostBlock.visible = true
  }

  setHoverCell(cell: Vec3i | null): void {
    if (!cell) {
      this.hoverOutline.visible = false
      return
    }
    const pos = voxelCellToWorldCenter(cell, this.worldSize)
    this.hoverOutline.position.copy(pos)
    this.hoverOutline.visible = true
  }

  setTextCells(cells: Vec3i[]): void {
    if (cells.length === 0) {
      this.textGhost.count = 0
      this.textGhost.visible = false
      return
    }
    const max = this.textGhost.instanceMatrix.count
    let index = 0
    for (const cell of cells) {
      if (index >= max) {
        break
      }
      const pos = voxelCellToWorldCenter(cell, this.worldSize)
      this.matrix.makeTranslation(pos.x, pos.y, pos.z)
      this.textGhost.setMatrixAt(index, this.matrix)
      this.textGhost.setColorAt(index, this.color)
      index += 1
    }
    this.textGhost.count = index
    this.textGhost.visible = index > 0
    this.textGhost.instanceMatrix.needsUpdate = true
    if (this.textGhost.instanceColor) {
      this.textGhost.instanceColor.needsUpdate = true
    }
  }

  dispose(): void {
    this.ghostBlock.geometry.dispose()
    ;(this.ghostBlock.material as THREE.Material).dispose()

    this.hoverOutline.geometry.dispose()
    ;(this.hoverOutline.material as THREE.Material).dispose()

    this.textGhost.geometry.dispose()
    ;(this.textGhost.material as THREE.Material).dispose()
  }
}
