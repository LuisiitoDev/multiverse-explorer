import { render, screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, describe, expect, it, vi } from 'vitest'
import App from './App'

const baseInfo = { count: 2, pages: 1, next: null, prev: null }

const mockRick = {
  id: 1,
  name: 'Rick Sanchez',
  status: 'Alive',
  species: 'Human',
  gender: 'Male',
  image: 'https://example.com/rick.png',
  origin: { name: 'Earth (C-137)' },
  location: { name: 'Citadel of Ricks' },
  episode: ['ep1', 'ep2', 'ep3'],
}

const mockMorty = {
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

const mockLocation = {
  id: 1,
  name: 'Citadel of Ricks',
  type: 'Space station',
  dimension: 'unknown',
  residents: ['url1', 'url2', 'url3'],
}

const mockLocationTwo = {
  id: 2,
  name: 'Earth (C-137)',
  type: 'Planet',
  dimension: 'Dimension C-137',
  residents: ['url1'],
}

const mockEpisode = {
  id: 1,
  name: 'Pilot',
  air_date: 'December 2, 2013',
  episode: 'S01E01',
  characters: ['url1', 'url2'],
}

const mockEpisodeTwo = {
  id: 2,
  name: 'Lawnmower Dog',
  air_date: 'December 9, 2013',
  episode: 'S01E02',
  characters: ['url1'],
}

const mockEpisodeSeasonTwo = {
  id: 3,
  name: 'A Rickle in Time',
  air_date: 'July 26, 2015',
  episode: 'S02E01',
  characters: ['url1'],
}

const mockRickWithEpisodeUrls = {
  ...mockRick,
  episode: [
    'https://rickandmortyapi.com/api/episode/1',
    'https://rickandmortyapi.com/api/episode/2',
    'https://rickandmortyapi.com/api/episode/3',
  ],
}

function jsonResponse(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), { status })
}

describe('App', () => {
  afterEach(() => {
    vi.restoreAllMocks()
  })

  it('renders the multiverse explorer heading', async () => {
    vi.spyOn(globalThis, 'fetch').mockResolvedValue(
      jsonResponse({ info: baseInfo, results: [mockRick] }),
    )

    render(<App />)

    const heading = screen.getByRole('heading', { level: 1 })
    expect(heading).toHaveTextContent('Rick and Morty')
    expect(heading).toHaveTextContent('Multiverse Explorer')
  })

  it('renders characters returned by the API', async () => {
    vi.spyOn(globalThis, 'fetch').mockResolvedValue(
      jsonResponse({ info: baseInfo, results: [mockRick] }),
    )

    render(<App />)

    await waitFor(() => {
      expect(screen.getByText('Rick Sanchez')).toBeInTheDocument()
    })

    expect(screen.getByText('Human')).toBeInTheDocument()
    expect(screen.getByText('Alive', { selector: '.status-pill' })).toBeInTheDocument()
  })

  it('shows a themed loading state while fetching', async () => {
    vi.spyOn(globalThis, 'fetch').mockResolvedValue(
      jsonResponse({ info: baseInfo, results: [mockRick] }),
    )

    render(<App />)

    expect(screen.getByText('Scanning dimensions...')).toBeInTheDocument()

    await waitFor(() => {
      expect(screen.getByText('Rick Sanchez')).toBeInTheDocument()
    })
  })

  it('shows a themed error state and retries the request', async () => {
    let callCount = 0
    vi.spyOn(globalThis, 'fetch').mockImplementation(async () => {
      callCount += 1

      if (callCount === 1) {
        return new Response(null, { status: 500 })
      }

      return jsonResponse({ info: baseInfo, results: [mockRick] })
    })

    const user = userEvent.setup()
    render(<App />)

    await waitFor(() => {
      expect(screen.getByText(/portal connection lost/i)).toBeInTheDocument()
    })

    await user.click(screen.getByRole('button', { name: /retry scan/i }))

    await waitFor(() => {
      expect(screen.getByText('Rick Sanchez')).toBeInTheDocument()
    })
  })

  it('searches the API by name as the user types', async () => {
    const fetchMock = vi.spyOn(globalThis, 'fetch').mockImplementation(async (input) => {
      const url = new URL(String(input))

      if (url.searchParams.get('name') === 'Morty') {
        return jsonResponse({ info: baseInfo, results: [mockMorty] })
      }

      return jsonResponse({ info: baseInfo, results: [mockRick, mockMorty] })
    })

    const user = userEvent.setup()
    render(<App />)

    await waitFor(() => {
      expect(screen.getByText('Rick Sanchez')).toBeInTheDocument()
      expect(screen.getByText('Morty Smith')).toBeInTheDocument()
    })

    await user.type(screen.getByRole('searchbox', { name: /search characters by name/i }), 'Morty')

    await waitFor(
      () => {
        expect(fetchMock).toHaveBeenLastCalledWith(
          expect.stringContaining('name=Morty'),
          expect.anything(),
        )
      },
      { timeout: 2000 },
    )

    await waitFor(() => {
      expect(screen.queryByText('Rick Sanchez')).not.toBeInTheDocument()
      expect(screen.getByText('Morty Smith')).toBeInTheDocument()
    })
  })

  it('filters the API request by status', async () => {
    const fetchMock = vi.spyOn(globalThis, 'fetch').mockImplementation(async (input) => {
      const url = new URL(String(input))

      if (url.searchParams.get('status') === 'dead') {
        return jsonResponse({ info: baseInfo, results: [] })
      }

      return jsonResponse({ info: baseInfo, results: [mockRick, mockMorty] })
    })

    const user = userEvent.setup()
    render(<App />)

    await waitFor(() => {
      expect(screen.getByText('Rick Sanchez')).toBeInTheDocument()
    })

    await user.click(screen.getByRole('button', { name: 'Dead' }))

    await waitFor(() => {
      expect(fetchMock).toHaveBeenLastCalledWith(
        expect.stringContaining('status=dead'),
        expect.anything(),
      )
    })
  })

  it('shows an empty state and resets filters back to the full list', async () => {
    vi.spyOn(globalThis, 'fetch').mockImplementation(async (input) => {
      const url = new URL(String(input))

      if (url.searchParams.get('name')) {
        return jsonResponse({ error: 'There is nothing here' }, 404)
      }

      return jsonResponse({ info: baseInfo, results: [mockRick] })
    })

    const user = userEvent.setup()
    render(<App />)

    await waitFor(() => {
      expect(screen.getByText('Rick Sanchez')).toBeInTheDocument()
    })

    await user.type(
      screen.getByRole('searchbox', { name: /search characters by name/i }),
      'Zzzznorf',
    )

    await waitFor(
      () => {
        expect(screen.getByText(/no life forms detected/i)).toBeInTheDocument()
      },
      { timeout: 2000 },
    )

    await user.click(screen.getByRole('button', { name: /reset filters/i }))

    await waitFor(() => {
      expect(screen.getByText('Rick Sanchez')).toBeInTheDocument()
    })
  })

  it('opens the character modal with the full detail set', async () => {
    vi.spyOn(globalThis, 'fetch').mockResolvedValue(
      jsonResponse({ info: baseInfo, results: [mockRick] }),
    )

    const user = userEvent.setup()
    render(<App />)

    await waitFor(() => {
      expect(screen.getByText('Rick Sanchez')).toBeInTheDocument()
    })

    await user.click(screen.getByRole('button', { name: /view details for rick sanchez/i }))

    const dialog = screen.getByRole('dialog')
    expect(within(dialog).getByText('Male')).toBeInTheDocument()
    expect(within(dialog).getByText('Earth (C-137)')).toBeInTheDocument()
    expect(within(dialog).getByText('Citadel of Ricks')).toBeInTheDocument()
    expect(within(dialog).getByText('3')).toBeInTheDocument()

    await user.click(screen.getByRole('button', { name: /close character details/i }))
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
  })

  it('opens Character Modal V2 with appearances, grouped episodes, and can return to the summary modal', async () => {
    vi.spyOn(globalThis, 'fetch').mockImplementation(async (input) => {
      const url = new URL(String(input))

      if (url.pathname.includes('/episode/') && url.search === '') {
        return jsonResponse([mockEpisode, mockEpisodeTwo, mockEpisodeSeasonTwo])
      }

      return jsonResponse({ info: baseInfo, results: [mockRickWithEpisodeUrls] })
    })

    const user = userEvent.setup()
    render(<App />)

    await waitFor(() => {
      expect(screen.getByText('Rick Sanchez')).toBeInTheDocument()
    })

    await user.click(screen.getByRole('button', { name: /view details for rick sanchez/i }))
    await user.click(screen.getByRole('button', { name: /extended profile/i }))

    const dialog = screen.getByRole('dialog')

    await waitFor(() => {
      expect(within(dialog).getByText('Season 1')).toBeInTheDocument()
    })

    expect(within(dialog).getByText('Origin')).toBeInTheDocument()
    expect(within(dialog).getByText('Earth (C-137)')).toBeInTheDocument()
    expect(within(dialog).getByText('Citadel of Ricks')).toBeInTheDocument()
    expect(within(dialog).getByText('3')).toBeInTheDocument()

    expect(within(dialog).getAllByText('S01E01 — Pilot').length).toBeGreaterThan(0)
    expect(within(dialog).getByText('Season 2')).toBeInTheDocument()
    expect(within(dialog).getByText('S01E02 — Lawnmower Dog')).toBeInTheDocument()
    expect(within(dialog).getAllByText('S02E01 — A Rickle in Time').length).toBeGreaterThan(0)

    expect(
      within(dialog).getByText('First appearance').closest('.modal-row'),
    ).toHaveTextContent('S01E01 — Pilot')
    expect(
      within(dialog).getByText('Latest appearance').closest('.modal-row'),
    ).toHaveTextContent('S02E01 — A Rickle in Time')

    await user.click(screen.getByRole('button', { name: /summary view/i }))

    expect(
      within(screen.getByRole('dialog')).getByRole('button', { name: /extended profile/i }),
    ).toBeInTheDocument()

    await user.click(screen.getByRole('button', { name: /close character details/i }))
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
  })

  it('shows an error state in Character Modal V2 when episode details fail to load, and retries', async () => {
    let episodeCallCount = 0
    vi.spyOn(globalThis, 'fetch').mockImplementation(async (input) => {
      const url = new URL(String(input))

      if (url.pathname.includes('/episode/') && url.search === '') {
        episodeCallCount += 1

        if (episodeCallCount === 1) {
          return new Response(null, { status: 500 })
        }

        return jsonResponse([mockEpisode])
      }

      return jsonResponse({ info: baseInfo, results: [mockRickWithEpisodeUrls] })
    })

    const user = userEvent.setup()
    render(<App />)

    await waitFor(() => {
      expect(screen.getByText('Rick Sanchez')).toBeInTheDocument()
    })

    await user.click(screen.getByRole('button', { name: /view details for rick sanchez/i }))
    await user.click(screen.getByRole('button', { name: /extended profile/i }))

    await waitFor(() => {
      expect(screen.getByText(/portal connection lost/i)).toBeInTheDocument()
    })

    await user.click(screen.getByRole('button', { name: /retry scan/i }))

    await waitFor(() => {
      expect(screen.getAllByText('S01E01 — Pilot').length).toBeGreaterThan(0)
    })
  })

  it('loads more characters and hides the button once there is no next page', async () => {
    vi.spyOn(globalThis, 'fetch').mockImplementation(async (input) => {
      const url = new URL(String(input))
      const page = url.searchParams.get('page')

      if (page === '2') {
        return jsonResponse({
          info: { count: 2, pages: 2, next: null, prev: 'page1' },
          results: [mockMorty],
        })
      }

      return jsonResponse({
        info: { count: 2, pages: 2, next: 'https://rickandmortyapi.com/api/character/?page=2', prev: null },
        results: [mockRick],
      })
    })

    const user = userEvent.setup()
    render(<App />)

    await waitFor(() => {
      expect(screen.getByText('Rick Sanchez')).toBeInTheDocument()
    })

    await user.click(screen.getByRole('button', { name: /load more characters/i }))

    await waitFor(() => {
      expect(screen.getByText('Morty Smith')).toBeInTheDocument()
    })

    expect(screen.queryByRole('button', { name: /load more characters/i })).not.toBeInTheDocument()
  })

  it('switches to the locations view and renders location rows', async () => {
    vi.spyOn(globalThis, 'fetch').mockImplementation(async (input) => {
      const url = new URL(String(input))

      if (url.pathname.includes('/location')) {
        return jsonResponse({ info: baseInfo, results: [mockLocation, mockLocationTwo] })
      }

      return jsonResponse({ info: baseInfo, results: [mockRick] })
    })

    const user = userEvent.setup()
    render(<App />)

    await waitFor(() => {
      expect(screen.getByText('Rick Sanchez')).toBeInTheDocument()
    })

    await user.click(screen.getByRole('button', { name: 'Locations' }))

    await waitFor(() => {
      expect(screen.getByText('Citadel of Ricks')).toBeInTheDocument()
    })

    expect(screen.getByText(/Space station/, { selector: '.archive-row__meta' })).toBeInTheDocument()
    expect(screen.getByText(/Dimension C-137/, { selector: '.archive-row__meta' })).toBeInTheDocument()
  })

  it('searches locations by name', async () => {
    const fetchMock = vi.spyOn(globalThis, 'fetch').mockImplementation(async (input) => {
      const url = new URL(String(input))

      if (url.pathname.includes('/location')) {
        if (url.searchParams.get('name') === 'Citadel') {
          return jsonResponse({ info: baseInfo, results: [mockLocation] })
        }

        return jsonResponse({ info: baseInfo, results: [mockLocation, mockLocationTwo] })
      }

      return jsonResponse({ info: baseInfo, results: [mockRick] })
    })

    const user = userEvent.setup()
    render(<App />)

    await user.click(screen.getByRole('button', { name: 'Locations' }))

    await waitFor(() => {
      expect(screen.getByText('Citadel of Ricks')).toBeInTheDocument()
      expect(screen.getByText('Earth (C-137)')).toBeInTheDocument()
    })

    await user.type(
      screen.getByRole('searchbox', { name: /search locations by name/i }),
      'Citadel',
    )

    await waitFor(
      () => {
        expect(fetchMock).toHaveBeenLastCalledWith(
          expect.stringContaining('name=Citadel'),
          expect.anything(),
        )
      },
      { timeout: 2000 },
    )

    await waitFor(() => {
      expect(screen.queryByText('Earth (C-137)')).not.toBeInTheDocument()
    })
  })

  it('opens a location modal with type, dimension, and resident count', async () => {
    vi.spyOn(globalThis, 'fetch').mockImplementation(async (input) => {
      const url = new URL(String(input))

      if (url.pathname.includes('/location')) {
        return jsonResponse({ info: baseInfo, results: [mockLocation] })
      }

      return jsonResponse({ info: baseInfo, results: [mockRick] })
    })

    const user = userEvent.setup()
    render(<App />)

    await user.click(screen.getByRole('button', { name: 'Locations' }))

    await waitFor(() => {
      expect(screen.getByText('Citadel of Ricks')).toBeInTheDocument()
    })

    await user.click(screen.getByRole('button', { name: /view location details for citadel of ricks/i }))

    const dialog = screen.getByRole('dialog')
    expect(within(dialog).getByText('Space station')).toBeInTheDocument()
    expect(within(dialog).getByText('unknown')).toBeInTheDocument()
    expect(within(dialog).getByText('3')).toBeInTheDocument()

    await user.click(screen.getByRole('button', { name: /close location details/i }))
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
  })

  it('switches to the episodes view and renders episode rows', async () => {
    vi.spyOn(globalThis, 'fetch').mockImplementation(async (input) => {
      const url = new URL(String(input))

      if (url.pathname.includes('/episode')) {
        return jsonResponse({ info: baseInfo, results: [mockEpisode, mockEpisodeTwo] })
      }

      return jsonResponse({ info: baseInfo, results: [mockRick] })
    })

    const user = userEvent.setup()
    render(<App />)

    await waitFor(() => {
      expect(screen.getByText('Rick Sanchez')).toBeInTheDocument()
    })

    await user.click(screen.getByRole('button', { name: 'Episodes' }))

    await waitFor(() => {
      expect(screen.getByText('Pilot')).toBeInTheDocument()
    })

    expect(screen.getByText('S01E01')).toBeInTheDocument()
    expect(screen.getByText('Lawnmower Dog')).toBeInTheDocument()
  })

  it('filters episodes by season using the season dropdown', async () => {
    const fetchMock = vi.spyOn(globalThis, 'fetch').mockImplementation(async (input) => {
      const url = new URL(String(input))

      if (url.pathname.includes('/episode')) {
        if (url.searchParams.get('episode') === 'S01') {
          return jsonResponse({ info: baseInfo, results: [mockEpisode, mockEpisodeTwo] })
        }

        return jsonResponse({ info: baseInfo, results: [mockEpisode, mockEpisodeTwo] })
      }

      return jsonResponse({ info: baseInfo, results: [mockRick] })
    })

    const user = userEvent.setup()
    render(<App />)

    await user.click(screen.getByRole('button', { name: 'Episodes' }))

    await waitFor(() => {
      expect(screen.getByText('Pilot')).toBeInTheDocument()
    })

    await user.selectOptions(screen.getByLabelText('Season'), '1')

    await waitFor(() => {
      expect(fetchMock).toHaveBeenLastCalledWith(
        expect.stringContaining('episode=S01'),
        expect.anything(),
      )
    })
  })

  it('paginates episodes using numbered pages', async () => {
    vi.spyOn(globalThis, 'fetch').mockImplementation(async (input) => {
      const url = new URL(String(input))
      const page = url.searchParams.get('page')

      if (url.pathname.includes('/episode')) {
        if (page === '2') {
          return jsonResponse({
            info: { count: 4, pages: 2, next: null, prev: 'page1' },
            results: [mockEpisodeTwo],
          })
        }

        return jsonResponse({
          info: { count: 4, pages: 2, next: 'page2', prev: null },
          results: [mockEpisode],
        })
      }

      return jsonResponse({ info: baseInfo, results: [mockRick] })
    })

    const user = userEvent.setup()
    render(<App />)

    await user.click(screen.getByRole('button', { name: 'Episodes' }))

    await waitFor(() => {
      expect(screen.getByText('Pilot')).toBeInTheDocument()
    })

    expect(screen.queryByText('Lawnmower Dog')).not.toBeInTheDocument()

    await user.click(screen.getByRole('button', { name: '2' }))

    await waitFor(() => {
      expect(screen.getByText('Lawnmower Dog')).toBeInTheDocument()
    })

    expect(screen.queryByText('Pilot')).not.toBeInTheDocument()
  })

  it('opens an episode modal with air date and character count', async () => {
    vi.spyOn(globalThis, 'fetch').mockImplementation(async (input) => {
      const url = new URL(String(input))

      if (url.pathname.includes('/episode')) {
        return jsonResponse({ info: baseInfo, results: [mockEpisode] })
      }

      return jsonResponse({ info: baseInfo, results: [mockRick] })
    })

    const user = userEvent.setup()
    render(<App />)

    await user.click(screen.getByRole('button', { name: 'Episodes' }))

    await waitFor(() => {
      expect(screen.getByText('Pilot')).toBeInTheDocument()
    })

    await user.click(screen.getByRole('button', { name: /open transmission for pilot/i }))

    const dialog = screen.getByRole('dialog')
    expect(within(dialog).getByText('December 2, 2013')).toBeInTheDocument()
    expect(within(dialog).getByText('2')).toBeInTheDocument()

    await user.click(screen.getByRole('button', { name: /close episode details/i }))
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
  })
})
