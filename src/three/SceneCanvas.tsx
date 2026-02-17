import { useEffect, useRef } from 'react'
import * as THREE from 'three'
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js'
import { EmaSmoother3D } from '../vision/smoothing'
import { generateTextStampCells } from '../world/textStamp'
import { useVoxelStore } from '../world/voxelStore'
import { voxelKey } from '../world/voxelTypes'
import { GhostPreview } from './ghostPreview'
import { InstancedVoxels } from './instancedVoxels'
import { raycastWorld } from './raycast'

const MAX_INSTANCES = 95000

export const SceneCanvas = () => {
  const hostRef = useRef<HTMLDivElement | null>(null)

  useEffect(() => {
    const host = hostRef.current
    if (!host) {
      return
    }

    const state = useVoxelStore.getState()
    const scene = new THREE.Scene()
    scene.background = new THREE.Color('#060b12')
    scene.fog = new THREE.Fog('#060b12', 40, 150)

    const renderer = new THREE.WebGLRenderer({
      antialias: true,
      powerPreference: 'high-performance',
    })
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 1.6))
    renderer.setSize(host.clientWidth, host.clientHeight)
    renderer.shadowMap.enabled = true
    renderer.shadowMap.type = THREE.PCFSoftShadowMap
    host.appendChild(renderer.domElement)

    const camera = new THREE.PerspectiveCamera(55, host.clientWidth / host.clientHeight, 0.1, 300)
    camera.position.set(28, 28, 34)

    const controls = new OrbitControls(camera, renderer.domElement)
    controls.enablePan = true
    controls.enableZoom = true
    controls.enableDamping = true
    controls.dampingFactor = 0.08
    controls.maxPolarAngle = 1.4
    controls.minPolarAngle = 0.25
    controls.minDistance = 14
    controls.maxDistance = 96
    controls.target.set(0, 0, 0)

    scene.add(new THREE.AmbientLight('#b3ceff', 0.58))
    const keyLight = new THREE.DirectionalLight('#e8f3ff', 0.95)
    keyLight.position.set(16, 30, 14)
    keyLight.castShadow = true
    keyLight.shadow.mapSize.set(1024, 1024)
    keyLight.shadow.camera.near = 0.5
    keyLight.shadow.camera.far = 110
    scene.add(keyLight)

    const fillLight = new THREE.PointLight('#4c7cff', 0.36)
    fillLight.position.set(-22, 14, -18)
    scene.add(fillLight)

    const worldSize = state.worldSize

    const ground = new THREE.Mesh(
      new THREE.PlaneGeometry(worldSize.x, worldSize.z),
      new THREE.MeshStandardMaterial({
        color: '#0b1420',
        roughness: 0.95,
        metalness: 0.04,
      }),
    )
    ground.rotation.x = -Math.PI / 2
    ground.receiveShadow = true
    scene.add(ground)

    const grid = new THREE.GridHelper(worldSize.x, worldSize.x, '#2c3f58', '#1a2330')
    ;(grid.material as THREE.Material).opacity = 0.65
    ;(grid.material as THREE.Material).transparent = true
    scene.add(grid)

    const instanced = new InstancedVoxels(worldSize, MAX_INSTANCES)
    scene.add(instanced.mesh)

    const ghostPreview = new GhostPreview(worldSize, 26000)
    scene.add(ghostPreview.ghostBlock)
    scene.add(ghostPreview.hoverOutline)
    scene.add(ghostPreview.textGhost)

    const cursor = new THREE.Mesh(
      new THREE.SphereGeometry(0.18, 18, 18),
      new THREE.MeshStandardMaterial({
        color: '#7fffd4',
        emissive: '#57d6af',
        emissiveIntensity: 0.8,
        transparent: true,
        opacity: 0.92,
      }),
    )
    cursor.visible = false
    scene.add(cursor)

    const raycaster = new THREE.Raycaster()
    const cursorSmoother = new EmaSmoother3D(0.45)
    let lastVoxelVersion = -1
    let lastPointerActive = false
    let rafId = 0

    const draw = () => {
      rafId = requestAnimationFrame(draw)
      const store = useVoxelStore.getState()

      if (lastVoxelVersion !== store.voxelVersion) {
        instanced.update(store.voxels)
        lastVoxelVersion = store.voxelVersion
      }

      if (store.pointer.active) {
        const rayResult = raycastWorld({
          pointerNdc: { x: store.pointer.x, y: store.pointer.y },
          mode: store.mode,
          draggingMove: Boolean(store.moveDragFrom),
          camera,
          raycaster,
          voxelMesh: instanced.mesh,
          worldSize: store.worldSize,
          getCellByInstanceId: (instanceId) => instanced.getCellByInstanceId(instanceId),
        })

        const smoothCursor = rayResult.cursorWorld
          ? cursorSmoother.update({
              x: rayResult.cursorWorld.x,
              y: rayResult.cursorWorld.y,
              z: rayResult.cursorWorld.z,
            })
          : null

        cursor.visible = Boolean(smoothCursor)
        if (smoothCursor) {
          cursor.position.set(smoothCursor.x, smoothCursor.y, smoothCursor.z)
        }

        store.setRaycast({
          cursorWorld: smoothCursor,
          hoverCell: rayResult.hoverCell,
          targetCell: rayResult.targetCell,
          surfaceNormal: rayResult.surfaceNormal,
        })

        const targetKey = rayResult.targetCell ? voxelKey(rayResult.targetCell) : null
        const targetIsOccupied = targetKey ? Boolean(store.voxels[targetKey]) : false

        if (store.mode === 'build') {
          ghostPreview.setHoverCell(rayResult.hoverCell)
          ghostPreview.setGhostCell(
            rayResult.targetCell && !targetIsOccupied ? rayResult.targetCell : null,
          )
          ghostPreview.setTextCells([])
        } else if (store.mode === 'erase') {
          ghostPreview.setHoverCell(rayResult.hoverCell)
          ghostPreview.setGhostCell(null)
          ghostPreview.setTextCells([])
        } else if (store.mode === 'move') {
          if (store.moveDragFrom) {
            ghostPreview.setHoverCell(store.moveDragFrom)
            const movePreview = store.moveDragTarget ?? rayResult.targetCell
            const previewKey = movePreview ? voxelKey(movePreview) : null
            const canDrop =
              movePreview &&
              previewKey &&
              (!store.voxels[previewKey] || previewKey === voxelKey(store.moveDragFrom))
            ghostPreview.setGhostCell(canDrop ? movePreview : null)
          } else {
            ghostPreview.setHoverCell(rayResult.hoverCell)
            ghostPreview.setGhostCell(null)
          }
          ghostPreview.setTextCells([])
        } else {
          ghostPreview.setHoverCell(rayResult.hoverCell)
          ghostPreview.setGhostCell(rayResult.targetCell)
          if (rayResult.targetCell) {
            const preview = generateTextStampCells(store.textInput, rayResult.targetCell, {
              normal: rayResult.surfaceNormal,
              worldSize: store.worldSize,
            })
            ghostPreview.setTextCells(preview)
          } else {
            ghostPreview.setTextCells([])
          }
        }
      } else if (lastPointerActive) {
        cursor.visible = false
        ghostPreview.setGhostCell(null)
        ghostPreview.setHoverCell(null)
        ghostPreview.setTextCells([])
        store.setRaycast({
          cursorWorld: null,
          hoverCell: null,
          targetCell: null,
          surfaceNormal: { x: 0, y: 1, z: 0 },
        })
      }

      lastPointerActive = store.pointer.active
      controls.update()
      renderer.render(scene, camera)
    }

    draw()

    const resize = () => {
      if (!host) {
        return
      }
      const width = host.clientWidth
      const height = host.clientHeight
      camera.aspect = width / height
      camera.updateProjectionMatrix()
      renderer.setSize(width, height)
    }

    const toPointer = (event: MouseEvent): { x: number; y: number } => {
      const rect = renderer.domElement.getBoundingClientRect()
      return {
        x: ((event.clientX - rect.left) / rect.width) * 2 - 1,
        y: -((event.clientY - rect.top) / rect.height) * 2 + 1,
      }
    }

    let mouseMoveDrag = false

    const onMouseMove = (event: MouseEvent) => {
      const store = useVoxelStore.getState()
      if (!store.settings.mouseFallback) {
        return
      }
      const pointer = toPointer(event)
      store.setPointer({
        x: pointer.x,
        y: pointer.y,
        active: true,
        source: 'mouse',
      })
      if (mouseMoveDrag && store.mode === 'move' && store.moveDragFrom) {
        store.updateMoveDragTargetFromCursor()
      }
    }

    const onMouseDown = (event: MouseEvent) => {
      const store = useVoxelStore.getState()
      if (!store.settings.mouseFallback) {
        return
      }
      if (event.button === 2) {
        event.preventDefault()
        store.eraseAtCursor()
        return
      }
      if (event.button !== 0) {
        return
      }
      if (store.mode === 'build') {
        store.placeAtCursor()
        return
      }
      if (store.mode === 'erase') {
        store.eraseAtCursor()
        return
      }
      if (store.mode === 'text') {
        store.stampTextAtCursor()
        return
      }
      const started = store.beginMoveDragFromHover()
      mouseMoveDrag = started
    }

    const onMouseUp = (event: MouseEvent) => {
      if (event.button !== 0) {
        return
      }
      if (!mouseMoveDrag) {
        return
      }
      const store = useVoxelStore.getState()
      store.commitMoveDrag()
      mouseMoveDrag = false
    }

    const onMouseLeave = () => {
      const store = useVoxelStore.getState()
      if (store.pointer.source === 'mouse') {
        store.setPointer({
          x: store.pointer.x,
          y: store.pointer.y,
          active: false,
          source: 'mouse',
        })
      }
      if (mouseMoveDrag) {
        store.cancelMoveDrag()
        mouseMoveDrag = false
      }
    }

    const onContextMenu = (event: MouseEvent) => {
      event.preventDefault()
    }

    renderer.domElement.addEventListener('mousemove', onMouseMove)
    renderer.domElement.addEventListener('mousedown', onMouseDown)
    renderer.domElement.addEventListener('mouseup', onMouseUp)
    renderer.domElement.addEventListener('mouseleave', onMouseLeave)
    renderer.domElement.addEventListener('contextmenu', onContextMenu)
    window.addEventListener('resize', resize)

    return () => {
      cancelAnimationFrame(rafId)
      window.removeEventListener('resize', resize)
      renderer.domElement.removeEventListener('mousemove', onMouseMove)
      renderer.domElement.removeEventListener('mousedown', onMouseDown)
      renderer.domElement.removeEventListener('mouseup', onMouseUp)
      renderer.domElement.removeEventListener('mouseleave', onMouseLeave)
      renderer.domElement.removeEventListener('contextmenu', onContextMenu)
      controls.dispose()
      ghostPreview.dispose()
      instanced.dispose()
      renderer.dispose()
      host.removeChild(renderer.domElement)
    }
  }, [])

  return <div ref={hostRef} className="absolute inset-0" />
}
