import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { FavoritesProvider } from './context/FavoritesProvider'
import FavoriteButton from './components/FavoriteButton'
import Header from './components/Header'
import MyMultiverseView from './components/MyMultiverseView'
import type { Character } from './types/character'
import type { Episode } from './types/episode'
import type { Location } from './types/location'

const character: Character = {
  id: 1,
  name: 'Rick Sanchez',
  status: 'Alive',
  species: 'Human',
  gender: 'Male',
  image: 'rick.png',
  origin: { name: 'Earth (C-137)' },
  location: { name: 'Citadel of Ricks' },
  episode: [],
}

const episode: Episode = { id: 2, name: 'The Ricklantis Mixup', air_date: 'September 10, 2017', episode: 'S03E07', characters: [] }
const location: Location = { id: 3, name: 'Citadel of Ricks', type: 'Space station', dimension: 'unknown', residents: [] }

function jsonResponse(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), { status })
}

function renderFavorites(child: React.ReactNode) {
  return render(<FavoritesProvider>{child}</FavoritesProvider>)
}

describe('Favorites / My Multiverse', () => {
  afterEach(() => vi.restoreAllMocks())

  it('loads an existing favorite as saved and prevents duplicate POSTs', async () => {
    const fetchMock = vi.spyOn(globalThis, 'fetch').mockImplementation(async (input, init) => {
      const url = String(input)
      if (url.includes('/api/auth/providers')) return jsonResponse([{ name: 'google', displayName: 'Google' }])
      if (url.includes('/api/favorites') && !init?.method) return jsonResponse([{ id: 10, resourceType: 'character', resourceId: 1, createAt: '2026-01-01' }])
      return new Response(null, { status: 204 })
    })
    const user = userEvent.setup()
    renderFavorites(<FavoriteButton resourceType="character" resourceId={1} />)

    await waitFor(() => expect(screen.getByRole('button', { name: /remove from my multiverse/i })).toBeEnabled())
    expect(screen.getByText('Saved to My Multiverse')).toBeInTheDocument()
    await user.click(screen.getByRole('button', { name: /remove from my multiverse/i }))
    expect(fetchMock).not.toHaveBeenCalledWith(expect.anything(), expect.objectContaining({ method: 'POST' }))
  })

  it('adds and removes a character favorite through the backend contract', async () => {
    const fetchMock = vi.spyOn(globalThis, 'fetch').mockImplementation(async (input, init) => {
      const url = String(input)
      if (url.includes('/api/auth/providers')) return jsonResponse([{ name: 'google', displayName: 'Google' }])
      if (url.includes('/api/favorites') && init?.method === 'POST') return jsonResponse({ id: 11, resourceType: 'character', resourceId: 1, createAt: '2026-01-01' }, 201)
      if (url.includes('/api/favorites') && init?.method === 'DELETE') return new Response(null, { status: 204 })
      return jsonResponse([])
    })
    const user = userEvent.setup()
    renderFavorites(<FavoriteButton resourceType="character" resourceId={1} />)

    await waitFor(() => expect(screen.getByRole('button', { name: /add to my multiverse/i })).toBeEnabled())
    await user.click(screen.getByRole('button', { name: /add to my multiverse/i }))
    await waitFor(() => expect(screen.getByText('Saved to My Multiverse')).toBeInTheDocument())
    await user.click(screen.getByRole('button', { name: /remove from my multiverse/i }))
    await waitFor(() => expect(screen.getByText('Add to My Multiverse')).toBeInTheDocument())

    const favoriteCalls = fetchMock.mock.calls.filter(([url]) => String(url).includes('/api/favorites'))
    const postCall = favoriteCalls.find(([, init]) => (init as RequestInit)?.method === 'POST')
    const deleteCall = favoriteCalls.find(([, init]) => (init as RequestInit)?.method === 'DELETE')
    expect(postCall?.[1]).toEqual(expect.objectContaining({ method: 'POST', credentials: 'include' }))
    expect(deleteCall?.[1]).toEqual(expect.objectContaining({ method: 'DELETE', credentials: 'include' }))
  })

  it('shows the authenticated-only sign-in action after a 401, using the first available provider', async () => {
    vi.spyOn(globalThis, 'fetch').mockImplementation(async (input) => {
      const url = String(input)
      if (url.includes('/api/auth/providers')) return jsonResponse([{ name: 'google', displayName: 'Google' }])
      return jsonResponse({}, 401)
    })
    renderFavorites(<FavoriteButton resourceType="episode" resourceId={episode.id} />)
    await waitFor(() => {
      const link = screen.getByRole('link', { name: /sign in/i })
      expect(link).toBeInTheDocument()
      expect(link).toHaveAttribute('href', expect.stringContaining('/api/auth/login/google'))
    })
  })

  it('uses a non-Google provider when Google is not configured', async () => {
    vi.spyOn(globalThis, 'fetch').mockImplementation(async (input) => {
      const url = String(input)
      if (url.includes('/api/auth/providers')) return jsonResponse([{ name: 'microsoft', displayName: 'Microsoft' }])
      return jsonResponse({}, 401)
    })
    renderFavorites(<FavoriteButton resourceType="episode" resourceId={episode.id} />)
    await waitFor(() => {
      const link = screen.getByRole('link', { name: /microsoft/i })
      expect(link).toHaveAttribute('href', expect.stringContaining('/api/auth/login/microsoft'))
    })
  })

  it('groups mixed resource types and keeps empty sections visible', async () => {
    vi.spyOn(globalThis, 'fetch').mockImplementation(async (input) => {
      const url = String(input)
      if (url.includes('/api/favorites')) return jsonResponse([
        { id: 1, resourceType: 'character', resourceId: 1, createAt: '2026-01-01' },
        { id: 2, resourceType: 'episode', resourceId: 2, createAt: '2026-01-01' },
        { id: 3, resourceType: 'location', resourceId: 3, createAt: '2026-01-01' },
      ])
      if (url.includes('/character/1')) return jsonResponse(character)
      if (url.includes('/episode/2')) return jsonResponse(episode)
      return jsonResponse(location)
    })
    renderFavorites(<MyMultiverseView onCharacterSelect={vi.fn()} onEpisodeSelect={vi.fn()} onLocationSelect={vi.fn()} />)

    await waitFor(() => expect(screen.getByText('Rick Sanchez')).toBeInTheDocument())
    expect(screen.getByText('S03E07 — The Ricklantis Mixup')).toBeInTheDocument()
    expect(screen.getByText('Citadel of Ricks')).toBeInTheDocument()
    expect(screen.queryByText(/No saved characters yet/)).not.toBeInTheDocument()
  })

  it('renders useful empty sections and isolates a failed resource lookup', async () => {
    vi.spyOn(globalThis, 'fetch').mockImplementation(async (input) => {
      if (String(input).includes('/api/favorites')) return jsonResponse([
        { id: 1, resourceType: 'character', resourceId: 404, createAt: '2026-01-01' },
      ])
      return new Response(null, { status: 500 })
    })
    renderFavorites(<MyMultiverseView onCharacterSelect={vi.fn()} onEpisodeSelect={vi.fn()} onLocationSelect={vi.fn()} />)

    await waitFor(() => expect(screen.getByRole('status')).toHaveTextContent(/Some saved resources could not be resolved/))
    expect(screen.getByText(/No saved\s+characters\s+yet/)).toBeInTheDocument()
    expect(screen.getByText(/No saved\s+episodes\s+yet/)).toBeInTheDocument()
    expect(screen.getByText(/No saved\s+locations\s+yet/)).toBeInTheDocument()
  })

  it('exposes My Multiverse only when the rollout boundary allows it', async () => {
    const onNavigate = vi.fn()
    const { rerender } = render(<Header activeView="characters" onNavigate={onNavigate} showMyMultiverse={false} />)
    expect(screen.queryByRole('button', { name: /my multiverse/i })).not.toBeInTheDocument()
    rerender(<Header activeView="characters" onNavigate={onNavigate} showMyMultiverse />)
    await userEvent.setup().click(screen.getByRole('button', { name: /my multiverse/i }))
    expect(onNavigate).toHaveBeenCalledWith('my-multiverse')
  })
})
