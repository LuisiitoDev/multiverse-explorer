import { useEffect, useMemo, useState } from 'react'
import { useFavorites } from '../context/FavoritesProvider'
import { fetchCharactersByUrls, fetchEpisodesByUrls, fetchLocationsByUrls } from '../services/rickAndMortyApi'
import type { Character } from '../types/character'
import type { Episode } from '../types/episode'
import type { Location } from '../types/location'
import type { FavoriteResourceType } from '../types/favorite'
import ErrorState from './ErrorState'
import LoadingPortal from './LoadingPortal'

type MyMultiverseViewProps = Readonly<{
  onCharacterSelect: (character: Character) => void
  onEpisodeSelect: (episode: Episode) => void
  onLocationSelect: (location: Location) => void
}>

type ResolvedResources = {
  characters: Character[]
  episodes: Episode[]
  locations: Location[]
}

const EMPTY_RESOURCES: ResolvedResources = { characters: [], episodes: [], locations: [] }

function resourceUrl(type: FavoriteResourceType, id: number) {
  return `https://rickandmortyapi.com/api/${type}/${id}`
}

function MyMultiverseView({ onCharacterSelect, onEpisodeSelect, onLocationSelect }: MyMultiverseViewProps) {
  const { favorites, isLoading: favoritesLoading, error: favoritesError, isAuthenticated, refresh } = useFavorites()
  const [resources, setResources] = useState<ResolvedResources>(EMPTY_RESOURCES)
  const [lookupError, setLookupError] = useState<string | null>(null)
  const [isResolving, setIsResolving] = useState(false)

  const favoritesByType = useMemo(() => ({
    character: favorites.filter((favorite) => favorite.resourceType === 'character'),
    episode: favorites.filter((favorite) => favorite.resourceType === 'episode'),
    location: favorites.filter((favorite) => favorite.resourceType === 'location'),
  }), [favorites])

  useEffect(() => {
    if (isAuthenticated !== true) {
      return
    }

    let cancelled = false

    const resolve = async () => {
      setIsResolving(true)
      setLookupError(null)
      const [characters, episodes, locations] = await Promise.allSettled([
        fetchCharactersByUrls(favoritesByType.character.map((favorite) => resourceUrl('character', favorite.resourceId))),
        fetchEpisodesByUrls(favoritesByType.episode.map((favorite) => resourceUrl('episode', favorite.resourceId))),
        fetchLocationsByUrls(favoritesByType.location.map((favorite) => resourceUrl('location', favorite.resourceId))),
      ])

      if (cancelled) return

      const failed = [characters, episodes, locations].some((result) => result.status === 'rejected')
      setLookupError(failed ? 'Some saved resources could not be resolved.' : null)
      setResources({
        characters: characters.status === 'fulfilled' ? characters.value : [],
        episodes: episodes.status === 'fulfilled' ? episodes.value : [],
        locations: locations.status === 'fulfilled' ? locations.value : [],
      })
      setIsResolving(false)
    }

    void resolve()
    return () => {
      cancelled = true
    }
  }, [favoritesByType, isAuthenticated])

  if (isAuthenticated === false) {
    return <section className="my-multiverse"><h1>My Multiverse</h1><p>Sign in to save and revisit your favorite dimensions.</p></section>
  }

  if (favoritesLoading) return <LoadingPortal />
  if (favoritesError) return <ErrorState message={favoritesError} onRetry={refresh} />

  return (
    <section className="my-multiverse" aria-labelledby="my-multiverse-title">
      <div className="archive-panel__header">
        <div><p className="eyebrow">Personal Archive</p><h1 id="my-multiverse-title">My Multiverse</h1></div>
        <p>Saved dimensions, transmissions, and life forms.</p>
      </div>
      {isResolving && <LoadingPortal />}
      {lookupError && <p className="my-multiverse__notice" role="status">{lookupError} Unavailable entries remain saved and can be retried later.</p>}
      {(['characters', 'episodes', 'locations'] as const).map((type) => {
        const items = resources[type]
        const labels = { characters: 'Characters', episodes: 'Episodes', locations: 'Locations' }
        return (
          <section className="my-multiverse__section" key={type} aria-labelledby={`favorites-${type}`}>
            <h2 id={`favorites-${type}`}>{labels[type]}</h2>
            {items.length === 0 ? <p className="my-multiverse__empty">No saved {labels[type].toLowerCase()} yet.</p> : (
              <div className="my-multiverse__list">
                {items.map((item) => {
                  if (type === 'characters') {
                    const character = item as Character
                    return <button type="button" key={character.id} className="my-multiverse__item" onClick={() => onCharacterSelect(character)}><strong>{character.name}</strong><span>{character.species}</span></button>
                  }

                  if (type === 'episodes') {
                    const episode = item as Episode
                    return <button type="button" key={episode.id} className="my-multiverse__item" onClick={() => onEpisodeSelect(episode)}><strong>{episode.episode} — {episode.name}</strong><span>{episode.air_date}</span></button>
                  }

                  const location = item as Location
                  return <button type="button" key={location.id} className="my-multiverse__item" onClick={() => onLocationSelect(location)}><strong>{location.name}</strong><span>{location.dimension || location.type || 'Unknown detail'}</span></button>
                })}
              </div>
            )}
          </section>
        )
      })}
    </section>
  )
}

export default MyMultiverseView
