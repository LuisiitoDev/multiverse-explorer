import { render, screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import FeatureFlagsProvider from './context/FeatureFlagsProvider'
import MultiverseMapView from './components/MultiverseMapView'
import { createStaticFeatureFlagStrategy } from './services/featureFlags'
import type { Location } from './types/location'

const webgl = vi.hoisted(() => ({ available: true }))

vi.mock('./utils/webgl', () => ({ isWebGLAvailable: () => webgl.available }))

// jsdom has no WebGL, so the R3F canvas is replaced by a minimal stand-in.
vi.mock('./components/MultiverseGlobe', () => ({
  default: ({
    locations,
    onSelectLocation,
  }: {
    locations: Location[]
    onSelectLocation: (location: Location) => void
  }) => (
    <div data-testid="globe">
      {locations.map((location) => (
        <button key={location.id} type="button" onClick={() => onSelectLocation(location)}>
          marker {location.name}
        </button>
      ))}
    </div>
  ),
}))

const earth: Location = { id: 1, name: 'Earth (C-137)', type: 'Planet', dimension: 'C-137', residents: [] }
const citadel: Location = { id: 3, name: 'Citadel of Ricks', type: 'Space station', dimension: 'unknown', residents: [] }

function mockLocations(results: Location[] | 'error') {
  return vi.spyOn(globalThis, 'fetch').mockImplementation(async () => {
    if (results === 'error') {
      return new Response(null, { status: 500 })
    }

    return new Response(
      JSON.stringify({ info: { count: results.length, pages: 1, next: null, prev: null }, results }),
      { status: 200 },
    )
  })
}

function renderView(globe3d: boolean) {
  return render(
    <FeatureFlagsProvider strategy={createStaticFeatureFlagStrategy({ globe3d })}>
      <MultiverseMapView />
    </FeatureFlagsProvider>,
  )
}

describe('MultiverseMapView 3D globe', () => {
  beforeEach(() => {
    webgl.available = true
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  it('offers no 3D control and renders the 2D map when the flag is off', async () => {
    mockLocations([earth, citadel])
    renderView(false)

    expect(await screen.findByRole('button', { name: /Citadel of Ricks/i })).toBeInTheDocument()
    expect(screen.queryByRole('group', { name: /map view/i })).not.toBeInTheDocument()
    expect(screen.queryByTestId('globe')).not.toBeInTheDocument()
  })

  it('switches between 2D and 3D when the flag is on', async () => {
    mockLocations([earth, citadel])
    const user = userEvent.setup()
    renderView(true)

    await screen.findByRole('button', { name: /Citadel of Ricks/i })
    expect(screen.getByRole('button', { name: '2D' })).toHaveAttribute('aria-pressed', 'true')

    await user.click(screen.getByRole('button', { name: '3D' }))
    expect(await screen.findByTestId('globe')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: '3D' })).toHaveAttribute('aria-pressed', 'true')

    await user.click(screen.getByRole('button', { name: '2D' }))
    expect(screen.queryByTestId('globe')).not.toBeInTheDocument()
    expect(screen.getByRole('button', { name: /Citadel of Ricks/i })).toBeInTheDocument()
  })

  it('opens the location detail panel when a marker is selected', async () => {
    mockLocations([earth, citadel])
    const user = userEvent.setup()
    renderView(true)

    await user.click(await screen.findByRole('button', { name: '3D' }))
    await user.click(await screen.findByRole('button', { name: /marker Citadel of Ricks/i }))

    const dialog = await screen.findByRole('dialog')
    expect(within(dialog).getByRole('heading', { name: 'Citadel of Ricks' })).toBeInTheDocument()
  })

  it('shows an accessible fallback and can return to 2D without WebGL', async () => {
    webgl.available = false
    mockLocations([earth])
    const user = userEvent.setup()
    renderView(true)

    await user.click(await screen.findByRole('button', { name: '3D' }))

    expect(screen.getByRole('alert')).toHaveTextContent(/webgl/i)
    expect(screen.queryByTestId('globe')).not.toBeInTheDocument()

    await user.click(screen.getByRole('button', { name: /use 2d map/i }))
    expect(screen.getByRole('button', { name: /Earth \(C-137\)/i })).toBeInTheDocument()
  })

  it('shows the error state with retry instead of the globe', async () => {
    mockLocations('error')
    renderView(true)

    expect(await screen.findByText(/portal connection lost/i)).toBeInTheDocument()
    expect(screen.queryByTestId('globe')).not.toBeInTheDocument()
  })

  it('shows the empty state when there are no locations', async () => {
    mockLocations([])
    renderView(true)

    expect(await screen.findByText(/no coordinates mapped/i)).toBeInTheDocument()
  })

  it('shows the loading portal while locations load', async () => {
    mockLocations([earth])
    renderView(true)

    expect(screen.getByText(/scanning dimensions/i)).toBeInTheDocument()
    await waitFor(() => {
      expect(screen.queryByText(/scanning dimensions/i)).not.toBeInTheDocument()
    })
  })
})
