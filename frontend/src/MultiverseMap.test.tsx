import { render, screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, describe, expect, it, vi } from 'vitest'
import App from './App'

const baseInfo = { count: 3, pages: 1, next: null, prev: null }

const citadel = {
  id: 3,
  name: 'Citadel of Ricks',
  type: 'Space station',
  dimension: 'unknown',
  residents: [
    'https://rickandmortyapi.com/api/character/1',
    'https://rickandmortyapi.com/api/character/2',
  ],
}

const earth = {
  id: 1,
  name: 'Earth (C-137)',
  type: 'Planet',
  dimension: 'Dimension C-137',
  residents: ['https://rickandmortyapi.com/api/character/1'],
}

const voidLocation = {
  id: 9,
  name: 'Void Sector',
  type: '',
  dimension: '',
  residents: [],
}

const rick = {
  id: 1,
  name: 'Rick Sanchez',
  status: 'Alive',
  species: 'Human',
  gender: 'Male',
  image: 'https://example.com/rick.png',
  origin: { name: 'Earth (C-137)' },
  location: { name: 'Citadel of Ricks' },
  episode: ['ep1'],
}

const morty = {
  id: 2,
  name: 'Morty Smith',
  status: 'Alive',
  species: 'Human',
  gender: 'Male',
  image: 'https://example.com/morty.png',
  origin: { name: 'Earth (C-137)' },
  location: { name: 'Citadel of Ricks' },
  episode: ['ep1'],
}

function jsonResponse(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), { status })
}

function isResidentBatch(url: URL): boolean {
  return url.search === '' && /\/character\/\d/.test(url.pathname)
}

function isResidentBatchUrl(raw: unknown): boolean {
  return isResidentBatch(new URL(String(raw)))
}

/** Locations for the map, characters for whichever residents get opened. */
function mockMultiverseApi(residents: unknown = [rick, morty]) {
  return vi.spyOn(globalThis, 'fetch').mockImplementation(async (input) => {
    const url = new URL(String(input))

    // The batched resident lookup is /character/<ids> with no query string;
    // the character list view is /character/?<params>.
    if (isResidentBatch(url)) {
      return jsonResponse(residents)
    }

    if (url.pathname.includes('/location')) {
      return jsonResponse({ info: baseInfo, results: [earth, citadel, voidLocation] })
    }

    return jsonResponse({ info: baseInfo, results: [rick] })
  })
}

async function openMultiverseMap(user: ReturnType<typeof userEvent.setup>) {
  await user.click(screen.getByRole('button', { name: /multiverse map/i }))

  await waitFor(() => {
    expect(screen.getByRole('heading', { name: /multiverse map/i })).toBeInTheDocument()
  })
}

describe('Multiverse Map', () => {
  afterEach(() => {
    vi.restoreAllMocks()
  })

  it('is reachable from the primary navigation without disturbing other views', async () => {
    mockMultiverseApi()
    const user = userEvent.setup()
    render(<App />)

    await waitFor(() => {
      expect(screen.getByText('Rick Sanchez')).toBeInTheDocument()
    })

    await openMultiverseMap(user)

    // The characters view is gone, not merely hidden behind the map.
    expect(screen.queryByRole('searchbox', { name: /search characters/i })).not.toBeInTheDocument()
  })

  it('renders one interactive node per location', async () => {
    mockMultiverseApi()
    const user = userEvent.setup()
    render(<App />)
    await openMultiverseMap(user)

    await waitFor(() => {
      expect(screen.getByRole('button', { name: /Citadel of Ricks/i })).toBeInTheDocument()
    })

    expect(screen.getByRole('button', { name: /Earth \(C-137\)/i })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /Void Sector/i })).toBeInTheDocument()
  })

  it('gives each node an accessible label carrying type, dimension and resident count', async () => {
    mockMultiverseApi()
    const user = userEvent.setup()
    render(<App />)
    await openMultiverseMap(user)

    await waitFor(() => {
      expect(
        screen.getByRole('button', {
          name: 'Citadel of Ricks. Space station, unknown. 2 residents.',
        }),
      ).toBeInTheDocument()
    })

    // Singular/plural and the unknown fallbacks are part of the label contract.
    expect(
      screen.getByRole('button', {
        name: 'Earth (C-137). Planet, Dimension C-137. 1 resident.',
      }),
    ).toBeInTheDocument()
    expect(
      screen.getByRole('button', {
        name: 'Void Sector. Unknown type, Unknown dimension. 0 residents.',
      }),
    ).toBeInTheDocument()
  })

  it('shows location details in the hover card', async () => {
    mockMultiverseApi()
    const user = userEvent.setup()
    render(<App />)
    await openMultiverseMap(user)

    const node = await screen.findByRole('button', { name: /Citadel of Ricks/i })
    await user.hover(node)

    const tooltip = within(node).getByRole('tooltip')
    expect(tooltip).toHaveTextContent('Citadel of Ricks')
    expect(tooltip).toHaveTextContent('Space station')
    expect(tooltip).toHaveTextContent('unknown')
    expect(tooltip).toHaveTextContent('2 residents')
  })

  it('shows a compact information card on the hovered node', async () => {
    mockMultiverseApi()
    const user = userEvent.setup()
    render(<App />)
    await openMultiverseMap(user)

    const node = await screen.findByRole('button', { name: /Citadel of Ricks/i })
    await user.hover(node)

    const tooltip = within(node).getByRole('tooltip')
    expect(tooltip).toHaveTextContent('Citadel of Ricks')
    expect(tooltip).toHaveTextContent('Space station')
    expect(tooltip).toHaveTextContent('unknown')
    expect(tooltip).toHaveTextContent('2 residents')
  })

  it('shows the same details on keyboard focus, without any hover', async () => {
    mockMultiverseApi()
    const user = userEvent.setup()
    render(<App />)
    await openMultiverseMap(user)

    await waitFor(() => {
      expect(screen.getByRole('button', { name: /Earth \(C-137\)/i })).toBeInTheDocument()
    })

    const node = screen.getByRole('button', { name: /Earth \(C-137\)/i })
    node.focus()

    const tooltip = within(node).getByRole('tooltip')
    expect(tooltip).toHaveTextContent('Earth (C-137)')
    expect(tooltip).toHaveTextContent('Planet')
    expect(tooltip).toHaveTextContent('Dimension C-137')
  })

  it('supports zooming the map and resetting to the default scale', async () => {
    mockMultiverseApi()
    const user = userEvent.setup()
    render(<App />)
    await openMultiverseMap(user)

    expect(screen.getByText('100%')).toBeInTheDocument()
    await user.click(screen.getByRole('button', { name: 'Zoom in' }))
    expect(screen.getByText('125%')).toBeInTheDocument()

    await user.click(screen.getByRole('button', { name: 'Reset map zoom' }))
    expect(screen.getByText('100%')).toBeInTheDocument()
  })

  it('opens a location and loads its residents on demand', async () => {
    const fetchMock = mockMultiverseApi()
    const user = userEvent.setup()
    render(<App />)
    await openMultiverseMap(user)

    await waitFor(() => {
      expect(screen.getByRole('button', { name: /Citadel of Ricks/i })).toBeInTheDocument()
    })

    // Nothing resident-related should have been requested just to draw the map.
    expect(
      fetchMock.mock.calls.some(([input]) => isResidentBatchUrl(input)),
    ).toBe(false)

    await user.click(screen.getByRole('button', { name: /Citadel of Ricks/i }))

    const dialog = await screen.findByRole('dialog')

    await waitFor(() => {
      expect(within(dialog).getByText('Rick Sanchez')).toBeInTheDocument()
    })

    expect(within(dialog).getByText('Morty Smith')).toBeInTheDocument()
    expect(within(dialog).getByText('Space station')).toBeInTheDocument()

    // Exactly one batched request for both residents.
    const residentCalls = fetchMock.mock.calls.filter(([input]) => isResidentBatchUrl(input))
    expect(residentCalls).toHaveLength(1)
    expect(String(residentCalls[0][0])).toBe('https://rickandmortyapi.com/api/character/1,2')
  })

  it('activates a node with the keyboard', async () => {
    mockMultiverseApi()
    const user = userEvent.setup()
    render(<App />)
    await openMultiverseMap(user)

    await waitFor(() => {
      expect(screen.getByRole('button', { name: /Earth \(C-137\)/i })).toBeInTheDocument()
    })

    screen.getByRole('button', { name: /Earth \(C-137\)/i }).focus()
    await user.keyboard('{Enter}')

    const dialog = await screen.findByRole('dialog')
    expect(within(dialog).getByRole('heading', { name: 'Earth (C-137)' })).toBeInTheDocument()

    await user.click(screen.getByRole('button', { name: /close location details/i }))
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
  })

  it('marks the open location as pressed', async () => {
    mockMultiverseApi()
    const user = userEvent.setup()
    render(<App />)
    await openMultiverseMap(user)

    await waitFor(() => {
      expect(screen.getByRole('button', { name: /Citadel of Ricks/i })).toBeInTheDocument()
    })

    const node = screen.getByRole('button', { name: /Citadel of Ricks/i })
    expect(node).toHaveAttribute('aria-pressed', 'false')

    await user.click(node)

    await waitFor(() => {
      expect(screen.getByRole('button', { name: /Citadel of Ricks/i })).toHaveAttribute(
        'aria-pressed',
        'true',
      )
    })
  })

  it('handles a location with no residents without requesting any', async () => {
    const fetchMock = mockMultiverseApi()
    const user = userEvent.setup()
    render(<App />)
    await openMultiverseMap(user)

    await waitFor(() => {
      expect(screen.getByRole('button', { name: /Void Sector/i })).toBeInTheDocument()
    })

    await user.click(screen.getByRole('button', { name: /Void Sector/i }))

    const dialog = await screen.findByRole('dialog')
    expect(within(dialog).getByText(/no known residents/i)).toBeInTheDocument()

    expect(
      fetchMock.mock.calls.some(([input]) => isResidentBatchUrl(input)),
    ).toBe(false)
  })

  it('shows an error and retries when residents fail to load', async () => {
    let residentCalls = 0
    vi.spyOn(globalThis, 'fetch').mockImplementation(async (input) => {
      const url = new URL(String(input))

      if (isResidentBatch(url)) {
        residentCalls += 1

        if (residentCalls === 1) {
          return new Response(null, { status: 500 })
        }

        return jsonResponse([rick, morty])
      }

      if (url.pathname.includes('/location')) {
        return jsonResponse({ info: baseInfo, results: [earth, citadel, voidLocation] })
      }

      return jsonResponse({ info: baseInfo, results: [rick] })
    })

    const user = userEvent.setup()
    render(<App />)
    await openMultiverseMap(user)

    await waitFor(() => {
      expect(screen.getByRole('button', { name: /Citadel of Ricks/i })).toBeInTheDocument()
    })

    await user.click(screen.getByRole('button', { name: /Citadel of Ricks/i }))

    await waitFor(() => {
      expect(screen.getByText(/portal connection lost/i)).toBeInTheDocument()
    })

    await user.click(screen.getByRole('button', { name: /retry scan/i }))

    await waitFor(() => {
      expect(screen.getByText('Rick Sanchez')).toBeInTheDocument()
    })
  })

  it('shows an error state and retries when the map itself fails to load', async () => {
    let locationCalls = 0
    vi.spyOn(globalThis, 'fetch').mockImplementation(async (input) => {
      const url = new URL(String(input))

      if (url.pathname.includes('/location')) {
        locationCalls += 1

        if (locationCalls === 1) {
          return new Response(null, { status: 500 })
        }

        return jsonResponse({ info: baseInfo, results: [earth] })
      }

      return jsonResponse({ info: baseInfo, results: [rick] })
    })

    const user = userEvent.setup()
    render(<App />)
    await user.click(screen.getByRole('button', { name: /multiverse map/i }))

    await waitFor(() => {
      expect(screen.getByText(/portal connection lost/i)).toBeInTheDocument()
    })

    await user.click(screen.getByRole('button', { name: /retry scan/i }))

    await waitFor(() => {
      expect(screen.getByRole('button', { name: /Earth \(C-137\)/i })).toBeInTheDocument()
    })
  })

  it('places the same location in the same spot across re-renders', async () => {
    mockMultiverseApi()
    const user = userEvent.setup()
    const { unmount } = render(<App />)
    await openMultiverseMap(user)

    await waitFor(() => {
      expect(screen.getByRole('button', { name: /Citadel of Ricks/i })).toBeInTheDocument()
    })

    const firstStyle = screen
      .getByRole('button', { name: /Citadel of Ricks/i })
      .closest('li')?.getAttribute('style')

    unmount()

    const secondUser = userEvent.setup()
    render(<App />)
    await openMultiverseMap(secondUser)

    await waitFor(() => {
      expect(screen.getByRole('button', { name: /Citadel of Ricks/i })).toBeInTheDocument()
    })

    const secondStyle = screen
      .getByRole('button', { name: /Citadel of Ricks/i })
      .closest('li')?.getAttribute('style')

    expect(firstStyle).toBeTruthy()
    expect(secondStyle).toBe(firstStyle)
  })
})
