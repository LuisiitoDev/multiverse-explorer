import { useState } from 'react'
import ArchivePanel from './components/ArchivePanel'
import CharacterFilterPanel from './components/CharacterFilterPanel'
import CharacterGrid from './components/CharacterGrid'
import CharacterModal from './components/CharacterModal'
import CharacterModalV2 from './components/CharacterModalV2'
import DeploymentStatus from './components/DeploymentStatus'
import EmptyState from './components/EmptyState'
import EpisodeList from './components/EpisodeList'
import EpisodeModal from './components/EpisodeModal'
import ErrorState from './components/ErrorState'
import Footer from './components/Footer'
import Header from './components/Header'
import Hero from './components/Hero'
import LoadingPortal from './components/LoadingPortal'
import LocationList from './components/LocationList'
import LocationModal from './components/LocationModal'
import MultiverseMapView from './components/MultiverseMapView'
import Pagination from './components/Pagination'
import SearchBar from './components/SearchBar'
import SeasonFilter from './components/SeasonFilter'
import { useCharacterFilters } from './hooks/useCharacterFilters'
import { useDebouncedValue } from './hooks/useDebouncedValue'
import { useFeatureFlag } from './hooks/useFeatureFlag'
import { usePaginatedResource } from './hooks/usePaginatedResource'
import { fetchCharacters, fetchEpisodes, fetchLocations } from './services/rickAndMortyApi'
import type { Character } from './types/character'
import type { Episode } from './types/episode'
import type { Location } from './types/location'
import type { View } from './types/view'

function EpisodesIcon() {
  return (
    <svg viewBox="0 0 24 24" width="20" height="20" aria-hidden="true" fill="none" stroke="currentColor" strokeWidth="1.6">
      <path d="M4 15c0-4.4 3.6-8 8-8s8 3.6 8 8" strokeLinecap="round" />
      <path d="M7.5 15a4.5 4.5 0 0 1 9 0" strokeLinecap="round" />
      <circle cx="12" cy="15" r="1.6" />
    </svg>
  )
}

function LocationsIcon() {
  return (
    <svg viewBox="0 0 24 24" width="20" height="20" aria-hidden="true" fill="none" stroke="currentColor" strokeWidth="1.6">
      <path d="M12 21s7-6.3 7-11.5A7 7 0 0 0 5 9.5C5 14.7 12 21 12 21z" strokeLinecap="round" strokeLinejoin="round" />
      <circle cx="12" cy="9.5" r="2.4" />
    </svg>
  )
}

function App() {
  const [view, setView] = useState<View>('characters')

  const {
    filters: characterFilters,
    appliedFilters: appliedCharacterFilters,
    filterKey: characterFilterKey,
    setFilter: setCharacterFilter,
    resetFilters: resetCharacterFilters,
    hasActiveFilters: hasActiveCharacterFilters,
  } = useCharacterFilters()
  const [selectedCharacter, setSelectedCharacter] = useState<Character | null>(null)
  const [isCharacterModalExpanded, setIsCharacterModalExpanded] = useState(false)
  const isCharacterModalV2Enabled = useFeatureFlag('characterModalV2')

  const charactersResource = usePaginatedResource<Character>(
    (page, signal) => fetchCharacters({ ...appliedCharacterFilters, page, signal }),
    characterFilterKey,
    view === 'characters',
  )

  const [locationSearchInput, setLocationSearchInput] = useState('')
  const debouncedLocationSearch = useDebouncedValue(locationSearchInput, 400).trim()
  const [selectedLocation, setSelectedLocation] = useState<Location | null>(null)

  const locationsResource = usePaginatedResource<Location>(
    (page, signal) => fetchLocations({ name: debouncedLocationSearch, page, signal }),
    debouncedLocationSearch,
    view === 'locations',
  )

  const [episodeSearchInput, setEpisodeSearchInput] = useState('')
  const debouncedEpisodeSearch = useDebouncedValue(episodeSearchInput, 400).trim()
  const [episodeSeason, setEpisodeSeason] = useState<number | null>(null)
  const [selectedEpisode, setSelectedEpisode] = useState<Episode | null>(null)

  const episodesResource = usePaginatedResource<Episode>(
    (page, signal) =>
      fetchEpisodes({ name: debouncedEpisodeSearch, season: episodeSeason, page, signal }),
    `${debouncedEpisodeSearch}::${episodeSeason ?? 'all'}`,
    view === 'episodes',
  )

  const handleSelectCharacter = (character: Character) => {
    setSelectedCharacter(character)
    setIsCharacterModalExpanded(false)
  }

  const handleCloseCharacterModal = () => {
    setSelectedCharacter(null)
    setIsCharacterModalExpanded(false)
  }

  // Expanding is only reachable while the flag is on, but deriving this keeps
  // the two modals mutually exclusive even if the flag flips mid-session.
  const showCharacterModalV2 = isCharacterModalV2Enabled && isCharacterModalExpanded

  // The Multiverse Map owns its own data, so it contributes no hero stats.
  let activeResource = null
  switch (view) {
    case 'characters':
      activeResource = charactersResource
      break
    case 'locations':
      activeResource = locationsResource
      break
    case 'episodes':
      activeResource = episodesResource
      break
  }

  return (
    <>
      <Header activeView={view} onNavigate={setView} />

      <main className="page-shell">
        <Hero
          totalCount={activeResource?.totalCount ?? null}
          lastSyncedAt={activeResource?.lastSyncedAt ?? null}
          error={activeResource?.error ?? null}
        />

        <div className="content" id="content">
          {view === 'characters' && (
            <>
              <CharacterFilterPanel
                filters={characterFilters}
                onFilterChange={setCharacterFilter}
                onReset={resetCharacterFilters}
                hasActiveFilters={hasActiveCharacterFilters}
              />

              {charactersResource.isLoading && <LoadingPortal />}

              {!charactersResource.isLoading && charactersResource.error && (
                <ErrorState message={charactersResource.error} onRetry={charactersResource.retry} />
              )}

              {!charactersResource.isLoading &&
                !charactersResource.error &&
                charactersResource.items.length === 0 && (
                  <EmptyState onResetFilters={resetCharacterFilters} />
                )}

              {!charactersResource.isLoading &&
                !charactersResource.error &&
                charactersResource.items.length > 0 && (
                  <>
                    <CharacterGrid characters={charactersResource.items} onSelect={handleSelectCharacter} />

                    {charactersResource.hasNextPage && (
                      <div className="load-more">
                        <button
                          type="button"
                          className="load-more__button"
                          onClick={() => void charactersResource.loadMore()}
                          disabled={charactersResource.isLoadingMore}
                        >
                          {charactersResource.isLoadingMore ? 'Loading...' : 'Load More Characters'}
                        </button>
                        {charactersResource.loadMoreError && (
                          <p className="load-more__error">{charactersResource.loadMoreError}</p>
                        )}
                      </div>
                    )}
                  </>
                )}
            </>
          )}

          {view === 'locations' && (
            <ArchivePanel
              icon={<LocationsIcon />}
              title="Coordinate Archive"
              subtitle="Mapped locations across known dimensions."
            >
              <div className="controls">
                <SearchBar
                  value={locationSearchInput}
                  onChange={setLocationSearchInput}
                  placeholder="Search locations..."
                  ariaLabel="Search locations by name"
                />
              </div>

              {locationsResource.isLoading && <LoadingPortal />}

              {!locationsResource.isLoading && locationsResource.error && (
                <ErrorState message={locationsResource.error} onRetry={locationsResource.retry} />
              )}

              {!locationsResource.isLoading &&
                !locationsResource.error &&
                locationsResource.items.length === 0 && (
                  <EmptyState
                    title="No Coordinates Found"
                    message="Try another location name."
                    onResetFilters={() => setLocationSearchInput('')}
                  />
                )}

              {!locationsResource.isLoading &&
                !locationsResource.error &&
                locationsResource.items.length > 0 && (
                  <>
                    <LocationList locations={locationsResource.items} onSelect={setSelectedLocation} />

                    {locationsResource.totalPages && locationsResource.totalPages > 1 && (
                      <Pagination
                        page={locationsResource.page}
                        totalPages={locationsResource.totalPages}
                        onPageChange={(page) => void locationsResource.goToPage(page)}
                      />
                    )}
                  </>
                )}
            </ArchivePanel>
          )}

          {view === 'episodes' && (
            <ArchivePanel
              icon={<EpisodesIcon />}
              title="Transmission Archive"
              subtitle="Recorded incidents across known dimensions."
            >
              <div className="controls">
                <SearchBar
                  value={episodeSearchInput}
                  onChange={setEpisodeSearchInput}
                  placeholder="Search episodes..."
                  ariaLabel="Search episodes by name"
                />
                <SeasonFilter value={episodeSeason} onChange={setEpisodeSeason} />
              </div>

              {episodesResource.isLoading && <LoadingPortal />}

              {!episodesResource.isLoading && episodesResource.error && (
                <ErrorState message={episodesResource.error} onRetry={episodesResource.retry} />
              )}

              {!episodesResource.isLoading &&
                !episodesResource.error &&
                episodesResource.items.length === 0 && (
                  <EmptyState
                    title="No Broadcasts Found"
                    message="Try another episode name or season."
                    onResetFilters={() => {
                      setEpisodeSearchInput('')
                      setEpisodeSeason(null)
                    }}
                  />
                )}

              {!episodesResource.isLoading &&
                !episodesResource.error &&
                episodesResource.items.length > 0 && (
                  <>
                    <EpisodeList episodes={episodesResource.items} onSelect={setSelectedEpisode} />

                    {episodesResource.totalPages && episodesResource.totalPages > 1 && (
                      <Pagination
                        page={episodesResource.page}
                        totalPages={episodesResource.totalPages}
                        onPageChange={(page) => void episodesResource.goToPage(page)}
                      />
                    )}
                  </>
                )}
            </ArchivePanel>
          )}

          {view === 'multiverse-map' && <MultiverseMapView />}
        </div>

        <DeploymentStatus />
      </main>

      <Footer />

      {selectedCharacter && !showCharacterModalV2 && (
        <CharacterModal
          character={selectedCharacter}
          onClose={handleCloseCharacterModal}
          onExpand={
            isCharacterModalV2Enabled ? () => setIsCharacterModalExpanded(true) : undefined
          }
        />
      )}
      {selectedCharacter && showCharacterModalV2 && (
        <CharacterModalV2
          character={selectedCharacter}
          onClose={handleCloseCharacterModal}
          onCollapse={() => setIsCharacterModalExpanded(false)}
        />
      )}
      {selectedLocation && (
        <LocationModal location={selectedLocation} onClose={() => setSelectedLocation(null)} />
      )}
      {selectedEpisode && (
        <EpisodeModal episode={selectedEpisode} onClose={() => setSelectedEpisode(null)} />
      )}
    </>
  )
}

export default App
