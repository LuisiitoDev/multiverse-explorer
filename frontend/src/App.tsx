import { useState } from 'react'
import ArchivePanel from './components/ArchivePanel'
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
import Pagination from './components/Pagination'
import SearchBar from './components/SearchBar'
import SeasonFilter from './components/SeasonFilter'
import StatusFilters from './components/StatusFilters'
import { useDebouncedValue } from './hooks/useDebouncedValue'
import { usePaginatedResource } from './hooks/usePaginatedResource'
import { fetchCharacters, fetchEpisodes, fetchLocations } from './services/rickAndMortyApi'
import type { Character, StatusFilter } from './types/character'
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

  const [characterSearchInput, setCharacterSearchInput] = useState('')
  const debouncedCharacterSearch = useDebouncedValue(characterSearchInput, 400).trim()
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('all')
  const [selectedCharacter, setSelectedCharacter] = useState<Character | null>(null)
  const [isCharacterModalExpanded, setIsCharacterModalExpanded] = useState(false)

  const charactersResource = usePaginatedResource<Character>(
    (page, signal) =>
      fetchCharacters({ name: debouncedCharacterSearch, status: statusFilter, page, signal }),
    `${debouncedCharacterSearch}::${statusFilter}`,
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

  const activeResource =
    view === 'characters'
      ? charactersResource
      : view === 'locations'
        ? locationsResource
        : episodesResource

  return (
    <>
      <Header activeView={view} onNavigate={setView} />

      <main className="page-shell">
        <Hero
          totalCount={activeResource.totalCount}
          lastSyncedAt={activeResource.lastSyncedAt}
          error={activeResource.error}
        />

        <div className="content" id="content">
          {view === 'characters' && (
            <>
              <div className="controls">
                <SearchBar value={characterSearchInput} onChange={setCharacterSearchInput} />
                <StatusFilters value={statusFilter} onChange={setStatusFilter} />
              </div>

              {charactersResource.isLoading && <LoadingPortal />}

              {!charactersResource.isLoading && charactersResource.error && (
                <ErrorState message={charactersResource.error} onRetry={charactersResource.retry} />
              )}

              {!charactersResource.isLoading &&
                !charactersResource.error &&
                charactersResource.items.length === 0 && (
                  <EmptyState
                    onResetFilters={() => {
                      setCharacterSearchInput('')
                      setStatusFilter('all')
                    }}
                  />
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
        </div>

        <DeploymentStatus />
      </main>

      <Footer />

      {selectedCharacter && !isCharacterModalExpanded && (
        <CharacterModal
          character={selectedCharacter}
          onClose={handleCloseCharacterModal}
          onExpand={() => setIsCharacterModalExpanded(true)}
        />
      )}
      {selectedCharacter && isCharacterModalExpanded && (
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
