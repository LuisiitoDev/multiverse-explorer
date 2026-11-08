import { render, screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import MultiverseMap3D from './components/MultiverseMap3D'
import MultiverseMapView from './components/MultiverseMapView'
import type { Location } from './types/location'
import { createMultiverseScene, isWebGLAvailable } from './utils/multiverseScene'

vi.mock('./utils/multiverseScene', () => ({
  createMultiverseScene: vi.fn(),
  isWebGLAvailable: vi.fn(),
}))

const createScene = vi.mocked(createMultiverseScene)
const dispose = vi.fn()
const setActiveLocation = vi.fn()

const earth: Location = {
  id: 1,
  name: 'Earth (C-137)',
  type: 'Planet',
  dimension: 'Dimension C-137',
  residents: ['https://rickandmortyapi.com/api/character/1'],
}

const voidLocation: Location = {
  id: 9,
  name: 'Void Sector',
  type: '',
  dimension: '',
  residents: [],
}

const locations = [earth, voidLocation]

beforeEach(() => {
  vi.mocked(isWebGLAvailable).mockReturnValue(true)
  createScene.mockReturnValue({ dispose, setActiveLocation })
})

afterEach(() => {
  vi.restoreAllMocks()
  createScene.mockReset()
  dispose.mockReset()
  setActiveLocation.mockReset()
})

describe('MultiverseMap3D', () => {
  it('creates the scene with every location and disposes it on unmount', () => {
    const { unmount } = render(
      <MultiverseMap3D locations={locations} activeLocationId={null} onSelectLocation={vi.fn()} />,
    )

    expect(createScene).toHaveBeenCalledTimes(1)
    const options = createScene.mock.calls[0][0]
    expect(options.nodes.map((node) => node.item.id)).toEqual([1, 9])

    unmount()
    expect(dispose).toHaveBeenCalledTimes(1)
  })

  it('forwards scene selections and the active id', () => {
    const onSelect = vi.fn()
    const { rerender } = render(
      <MultiverseMap3D locations={locations} activeLocationId={1} onSelectLocation={onSelect} />,
    )

    expect(createScene.mock.calls[0][0].activeLocationId).toBe(1)

    createScene.mock.calls[0][0].onSelect(voidLocation)
    expect(onSelect).toHaveBeenCalledWith(voidLocation)

    rerender(
      <MultiverseMap3D locations={locations} activeLocationId={9} onSelectLocation={onSelect} />,
    )
    expect(setActiveLocation).toHaveBeenLastCalledWith(9)
    expect(createScene).toHaveBeenCalledTimes(1)
  })

  it('lists every location and selects with the keyboard', async () => {
    const onSelect = vi.fn()
    const user = userEvent.setup()
    render(
      <MultiverseMap3D locations={locations} activeLocationId={null} onSelectLocation={onSelect} />,
    )

    const list = screen.getByRole('list', { name: /all locations/i })
    expect(within(list).getAllByRole('button')).toHaveLength(2)

    await user.tab()
    await user.keyboard('{Enter}')
    expect(onSelect).toHaveBeenLastCalledWith(earth)

    await user.tab()
    await user.keyboard(' ')
    expect(onSelect).toHaveBeenLastCalledWith(voidLocation)
  })

  it('labels a location without a dimension as Unknown dimension', () => {
    render(
      <MultiverseMap3D locations={locations} activeLocationId={9} onSelectLocation={vi.fn()} />,
    )

    const item = screen.getByRole('button', { name: /Void Sector/ })
    expect(item).toHaveTextContent('Unknown dimension')
    expect(item).toHaveAttribute('aria-pressed', 'true')
  })

  it('shows a message and keeps the list when the scene cannot be created', () => {
    vi.mocked(isWebGLAvailable).mockReturnValue(false)

    render(
      <MultiverseMap3D locations={locations} activeLocationId={null} onSelectLocation={vi.fn()} />,
    )

    expect(screen.getByRole('alert')).toHaveTextContent(/3D view is not available/i)
    expect(createScene).not.toHaveBeenCalled()
    expect(screen.getAllByRole('button')).toHaveLength(2)
  })

  it('passes the reduced-motion preference to the scene', () => {
    vi.stubGlobal(
      'matchMedia',
      vi.fn().mockReturnValue({ matches: true }),
    )

    render(
      <MultiverseMap3D locations={locations} activeLocationId={null} onSelectLocation={vi.fn()} />,
    )

    expect(createScene.mock.calls[0][0].reducedMotion).toBe(true)
    vi.unstubAllGlobals()
  })
})

function jsonResponse(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), { status })
}

const info = { count: 2, pages: 1, next: null, prev: null }

describe('MultiverseMapView with the 3D mode', () => {
  it('toggles between 2D and 3D and keeps selection working', async () => {
    vi.spyOn(globalThis, 'fetch').mockImplementation(async (input) => {
      const url = new URL(String(input))

      if (url.pathname.includes('/location')) {
        return jsonResponse({ info, results: locations })
      }

      return jsonResponse([])
    })
    const user = userEvent.setup()
    render(<MultiverseMapView />)

    const toggle = await screen.findByRole('group', { name: /map view/i })
    expect(within(toggle).getByRole('button', { name: '2D' })).toHaveAttribute('aria-pressed', 'true')
    expect(screen.queryByRole('list', { name: /all locations/i })).not.toBeInTheDocument()

    await user.click(within(toggle).getByRole('button', { name: '3D' }))
    expect(within(toggle).getByRole('button', { name: '3D' })).toHaveAttribute('aria-pressed', 'true')
    const list = screen.getByRole('list', { name: /all locations/i })

    await user.click(within(list).getByRole('button', { name: /Void Sector/ }))
    const dialog = await screen.findByRole('dialog')
    expect(within(dialog).getByRole('heading', { name: 'Void Sector' })).toBeInTheDocument()
    await user.click(screen.getByRole('button', { name: /close location details/i }))

    await user.click(within(toggle).getByRole('button', { name: '2D' }))
    expect(screen.queryByRole('list', { name: /all locations/i })).not.toBeInTheDocument()
    expect(screen.getByRole('button', { name: /Earth \(C-137\)/ })).toBeInTheDocument()
  })

  it('keeps the shared error state and retry while 3D is chosen', async () => {
    let calls = 0
    vi.spyOn(globalThis, 'fetch').mockImplementation(async () => {
      calls += 1
      return calls === 1 ? new Response(null, { status: 500 }) : jsonResponse({ info, results: locations })
    })
    const user = userEvent.setup()
    render(<MultiverseMapView />)

    await waitFor(() => {
      expect(screen.getByText(/portal connection lost/i)).toBeInTheDocument()
    })
    await user.click(screen.getByRole('button', { name: /retry scan/i }))

    expect(await screen.findByRole('group', { name: /map view/i })).toBeInTheDocument()
  })

  it('shows the shared empty state', async () => {
    vi.spyOn(globalThis, 'fetch').mockResolvedValue(
      jsonResponse({ info: { ...info, count: 0 }, results: [] }),
    )
    render(<MultiverseMapView />)

    expect(await screen.findByText(/no coordinates mapped/i)).toBeInTheDocument()
  })
})
