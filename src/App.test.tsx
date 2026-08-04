import { render, screen, waitFor } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import App from './App'

describe('App', () => {
  afterEach(() => {
    vi.restoreAllMocks()
  })

  it('renders characters returned by the API', async () => {
    vi.spyOn(globalThis, 'fetch').mockResolvedValue(
      new Response(
        JSON.stringify({
          results: [
            {
              id: 1,
              name: 'Rick Sanchez',
              status: 'Alive',
              species: 'Human',
              image: 'https://example.com/rick.png',
            },
          ],
        }),
        { status: 200 },
      ),
    )

    render(<App />)

    expect(screen.getByText('Loading characters...')).toBeInTheDocument()

    await waitFor(() => {
      expect(screen.getByText('Rick Sanchez')).toBeInTheDocument()
    })

    expect(screen.getByText('Human')).toBeInTheDocument()
    expect(screen.getByText('Alive')).toBeInTheDocument()
  })
})
