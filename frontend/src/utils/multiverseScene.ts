import {
  Color,
  Mesh,
  MeshBasicMaterial,
  PerspectiveCamera,
  Raycaster,
  Scene,
  SphereGeometry,
  Vector2,
  WebGLRenderer,
} from 'three'
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js'
import type { Location } from '../types/location'
import type { MapNode3d } from './multiverseLayout3d'

export type MultiverseSceneOptions = {
  container: HTMLElement
  nodes: MapNode3d<Location>[]
  activeLocationId: number | null
  reducedMotion: boolean
  onSelect: (location: Location) => void
}

export type MultiverseScene = {
  setActiveLocation: (id: number | null) => void
  dispose: () => void
}

export function isWebGLAvailable(): boolean {
  try {
    const canvas = document.createElement('canvas')
    return Boolean(canvas.getContext('webgl2') ?? canvas.getContext('webgl'))
  } catch {
    return false
  }
}

const MARKER_COLOR = 0x36d9ff
const ACTIVE_COLOR = 0x9cff38
const CLICK_DRAG_TOLERANCE_PX = 5

export function createMultiverseScene({
  container,
  nodes,
  activeLocationId,
  reducedMotion,
  onSelect,
}: MultiverseSceneOptions): MultiverseScene {
  const renderer = new WebGLRenderer({ antialias: true, alpha: true })
  const canvas = renderer.domElement
  const scene = new Scene()
  const camera = new PerspectiveCamera(55, 1, 0.1, 200)
  camera.position.set(0, 6, 26)

  const controls = new OrbitControls(camera, canvas)
  controls.enableDamping = !reducedMotion
  controls.minDistance = 8
  controls.maxDistance = 60
  controls.autoRotate = !reducedMotion
  controls.autoRotateSpeed = 0.6

  const geometry = new SphereGeometry(0.35, 16, 16)
  const meshes = nodes.map(({ item, x, y, z }) => {
    const mesh = new Mesh(geometry, new MeshBasicMaterial({ color: MARKER_COLOR }))
    mesh.position.set(x, y, z)
    mesh.userData = { location: item }
    scene.add(mesh)
    return mesh
  })

  const applyActive = (id: number | null) => {
    for (const mesh of meshes) {
      const isActive = (mesh.userData.location as Location).id === id
      ;(mesh.material as MeshBasicMaterial).color = new Color(
        isActive ? ACTIVE_COLOR : MARKER_COLOR,
      )
      mesh.scale.setScalar(isActive ? 1.8 : 1)
    }
    renderOnce()
  }

  const renderOnce = () => renderer.render(scene, camera)

  const resize = () => {
    const width = container.clientWidth || 1
    const height = container.clientHeight || 1
    renderer.setSize(width, height)
    camera.aspect = width / height
    camera.updateProjectionMatrix()
    renderOnce()
  }

  container.appendChild(canvas)
  resize()
  applyActive(activeLocationId)

  let frame = 0
  const animate = () => {
    controls.update()
    renderOnce()
    frame = requestAnimationFrame(animate)
  }

  // Without auto-rotation or damping, only render when the user interacts.
  const onControlsChange = () => renderOnce()
  if (reducedMotion) {
    controls.addEventListener('change', onControlsChange)
  } else {
    frame = requestAnimationFrame(animate)
  }

  const raycaster = new Raycaster()
  const pointer = new Vector2()
  let downX = 0
  let downY = 0

  const onPointerDown = (event: PointerEvent) => {
    downX = event.clientX
    downY = event.clientY
  }

  const onPointerUp = (event: PointerEvent) => {
    if (Math.hypot(event.clientX - downX, event.clientY - downY) > CLICK_DRAG_TOLERANCE_PX) {
      return
    }

    const rect = canvas.getBoundingClientRect()
    pointer.set(
      ((event.clientX - rect.left) / (rect.width || 1)) * 2 - 1,
      -((event.clientY - rect.top) / (rect.height || 1)) * 2 + 1,
    )
    raycaster.setFromCamera(pointer, camera)

    const [hit] = raycaster.intersectObjects(meshes)

    if (hit) {
      onSelect(hit.object.userData.location as Location)
    }
  }

  canvas.addEventListener('pointerdown', onPointerDown)
  canvas.addEventListener('pointerup', onPointerUp)
  window.addEventListener('resize', resize)

  return {
    setActiveLocation: applyActive,
    dispose: () => {
      cancelAnimationFrame(frame)
      window.removeEventListener('resize', resize)
      canvas.removeEventListener('pointerdown', onPointerDown)
      canvas.removeEventListener('pointerup', onPointerUp)
      controls.removeEventListener('change', onControlsChange)
      controls.dispose()
      for (const mesh of meshes) {
        ;(mesh.material as MeshBasicMaterial).dispose()
      }
      geometry.dispose()
      renderer.dispose()
      canvas.remove()
    },
  }
}
