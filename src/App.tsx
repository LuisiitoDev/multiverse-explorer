import { useEffect, useState } from 'react'

type Character = {
  id: number
  name: string
  status: string
  species: string
  image: string
}

type ApiResponse = {
  results: Character[]
}

const API_URL = 'https://rickandmortyapi.com/api/character'

function App() {
  const [characters, setCharacters] = useState<Character[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const loadCharacters = async () => {
      try {
        const response = await fetch(API_URL)

        if (!response.ok) {
          throw new Error('The characters could not be loaded.')
        }

        const data: ApiResponse = await response.json()
        setCharacters(data.results.slice(0, 12))
      } catch (requestError) {
        setError(
          requestError instanceof Error
            ? requestError.message
            : 'An unexpected error occurred.',
        )
      } finally {
        setIsLoading(false)
      }
    }

    void loadCharacters()
  }, [])

  return (
    <main className="page-shell">
      <header className="hero">
        <p className="eyebrow">React + GitHub Actions demo</p>
        <h1>Rick and Morty Explorer</h1>
        <p className="hero-copy">
          A small React application for practicing continuous integration and
          deployment with GitHub Actions CI/CD.
        </p>
      </header>

      {isLoading && <p className="state-message">Loading characters...</p>}

      {error && (
        <p className="state-message state-message--error" role="alert">
          {error}
        </p>
      )}

      {!isLoading && !error && (
        <section className="character-grid" aria-label="Characters">
          {characters.map((character) => (
            <article className="character-card" key={character.id}>
              <img src={character.image} alt={character.name} />
              <div className="character-card__content">
                <h2>{character.name}</h2>
                <p>{character.species}</p>
                <span className={`status status--${character.status.toLowerCase()}`}>
                  {character.status}
                </span>
              </div>
            </article>
          ))}
        </section>
      )}
    </main>
  )
}

export default App
