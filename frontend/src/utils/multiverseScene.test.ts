import { afterEach, describe, expect, it, vi } from 'vitest'
import type { Location } from '../types/location'
import { layoutNodes3d } from './multiverseLayout3d'

const rendererState = vi.hoisted(() => ({ fail: false, dispose: vi.fn(), render: vi.fn() }))

vi.mock('three', async (importOriginal) => {
  const actual = await importOriginal<typeof import('three')>()

  class FakeRenderer {
    domElement = document.createElement('canvas')
    constructor() {
      if (rendererState.fail) {
        throw new Error('no webgl')
      }
    }
    setSize() {}
    render = rendererState.render
    dispose = rendererState.dispose
  }

  return { ...actual, WebGLRenderer: FakeRenderer }
})

const { createMultiverseScene, isWebGLAvailable } = await import('./multiverseScene')

const locations: Location[] = [
  { id: 1, name: 'Earth', type: 'Planet', dimension: 'C-137', residents: [] },
  { id: 2, name: 'Void', type: '', dimension: '', residents: [] },
]

function build(reducedMotion: boolean, onSelect = vi.fn()) {
  const container = document.createElement('div')
  document.body.appendChild(container)
  const scene = createMultiverseScene({
    container,
    nodes: layoutNodes3d(locations),
    activeLocationId: 1,
    reducedMotion,
    onSelect,
  })

  return { container, scene, onSelect }
}

afterEach(() => {
  rendererState.fail = false
  rendererState.dispose.mockClear()
  rendererState.render.mockClear()
  document.body.innerHTML = ''
  vi.restoreAllMocks()
})

describe('createMultiverseScene', () => {
  it('mounts a canvas, highlights the active marker and disposes cleanly', () => {
    const { container, scene } = build(true)

    expect(container.querySelector('canvas')).not.toBeNull()
    expect(rendererState.render).toHaveBeenCalled()

    scene.setActiveLocation(2)
    scene.setActiveLocation(null)
    scene.dispose()

    expect(container.querySelector('canvas')).toBeNull()
    expect(rendererState.dispose).toHaveBeenCalled()
  })

  it('animates with requestAnimationFrame only when motion is allowed', () => {
    const raf = vi.spyOn(globalThis, 'requestAnimationFrame').mockImplementation(() => 7)
    const cancel = vi.spyOn(globalThis, 'cancelAnimationFrame').mockImplementation(() => {})

    build(true).scene.dispose()
    expect(raf).not.toHaveBeenCalled()

    const { scene } = build(false)
    expect(raf).toHaveBeenCalled()
    scene.dispose()
    expect(cancel).toHaveBeenCalledWith(7)
  })

  it('does not select when a pointer gesture was a drag or hit nothing', () => {
    const { container, scene, onSelect } = build(true)
    const canvas = container.querySelector('canvas') as HTMLCanvasElement
    canvas.setPointerCapture = vi.fn()
    canvas.releasePointerCapture = vi.fn()

    const fire = (type: string, x: number, y: number) =>
      canvas.dispatchEvent(new MouseEvent(type, { clientX: x, clientY: y }))

    fire('pointerdown', 0, 0)
    fire('pointerup', 50, 50)
    fire('pointerdown', 0, 0)
    fire('pointerup', 0, 0)

    expect(onSelect).not.toHaveBeenCalled()
    scene.dispose()
  })

  it('re-renders on window resize', () => {
    const { scene } = build(true)
    rendererState.render.mockClear()

    window.dispatchEvent(new Event('resize'))

    expect(rendererState.render).toHaveBeenCalled()
    scene.dispose()
  })

  it('throws when the renderer cannot be created', () => {
    rendererState.fail = true

    expect(() => build(true)).toThrow()
  })
})

describe('isWebGLAvailable', () => {
  it('is false when no context can be created', () => {
    vi.spyOn(HTMLCanvasElement.prototype, 'getContext').mockReturnValue(null)
    expect(isWebGLAvailable()).toBe(false)
  })

  it('is true when a context exists', () => {
    vi.spyOn(HTMLCanvasElement.prototype, 'getContext').mockReturnValue({} as never)
    expect(isWebGLAvailable()).toBe(true)
  })

  it('is false when context creation throws', () => {
    vi.spyOn(HTMLCanvasElement.prototype, 'getContext').mockImplementation(() => {
      throw new Error('boom')
    })
    expect(isWebGLAvailable()).toBe(false)
  })
})
