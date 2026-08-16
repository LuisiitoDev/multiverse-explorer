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
import MyMultiverseView from './components/MyMultiverseView'
import MultiverseMapView from './components/MultiverseMapView'
import Pagination from './components/Pagination'
import SearchBar from './components/SearchBar'
import SeasonFilter from './components/SeasonFilter'
import { FavoritesProvider } from './context/FavoritesProvider'
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

// ── Per-view panel components ─────────────────────────────────────────────────

type CharactersViewProps = Readonly<{
  filters: ReturnType<typeof useCharacterFilters>['filters']
  onFilterChange: ReturnType<typeof useCharacterFilters>['setFilter']
  onReset: () => void
  hasActiveFilters: boolean
  resource: ReturnType<typeof usePaginatedResource<Character>>
  onSelect: (character: Character) => void
}>

function CharactersView({ filters, onFilterChange, onReset, hasActiveFilters, resource, onSelect }: CharactersViewProps) {
  return (
    <>
      <CharacterFilterPanel
        filters={filters}
        onFilterChange={onFilterChange}
        onReset={onReset}
        hasActiveFilters={hasActiveFilters}
      />

      {resource.isLoading && <LoadingPortal />}

      {!resource.isLoading && resource.error && (
        <ErrorState message={resource.error} onRetry={resource.retry} />
      )}

      {!resource.isLoading && !resource.error && resource.items.length === 0 && (
        <EmptyState onResetFilters={onReset} />
      )}

      {!resource.isLoading && !resource.error && resource.items.length > 0 && (
        <>
          <CharacterGrid characters={resource.items} onSelect={onSelect} />

          {resource.hasNextPage && (
            <div className="load-more">
              <button
                type="button"
                className="load-more__button"
                onClick={() => void resource.loadMore()}
                disabled={resource.isLoadingMore}
              >
                {resource.isLoadingMore ? 'Loading...' : 'Load More Characters'}
              </button>
              {resource.loadMoreError && (
                <p className="load-more__error">{resource.loadMoreError}</p>
              )}
            </div>
          )}
        </>
      )}
    </>
  )
}

type LocationsViewProps = Readonly<{
  searchInput: string
  onSearchChange: (value: string) => void
  resource: ReturnType<typeof usePaginatedResource<Location>>
  onSelect: (location: Location) => void
}>

function LocationsView({ searchInput, onSearchChange, resource, onSelect }: LocationsViewProps) {
  return (
    <ArchivePanel
      icon={<LocationsIcon />}
      title="Coordinate Archive"
      subtitle="Mapped locations across known dimensions."
    >
      <div className="controls">
        <SearchBar
          value={searchInput}
          onChange={onSearchChange}
          placeholder="Search locations..."
          ariaLabel="Search locations by name"
        />
      </div>

      {resource.isLoading && <LoadingPortal />}

      {!resource.isLoading && resource.error && (
        <ErrorState message={resource.error} onRetry={resource.retry} />
      )}

      {!resource.isLoading && !resource.error && resource.items.length === 0 && (
        <EmptyState
          title="No Coordinates Found"
          message="Try another location name."
          onResetFilters={() => onSearchChange('')}
        />
      )}

      {!resource.isLoading && !resource.error && resource.items.length > 0 && (
        <>
          <LocationList locations={resource.items} onSelect={onSelect} />

          {resource.totalPages && resource.totalPages > 1 && (
            <Pagination
              page={resource.page}
              totalPages={resource.totalPages}
              onPageChange={(page) => void resource.goToPage(page)}
            />
          )}
        </>
      )}
    </ArchivePanel>
  )
}

type EpisodesViewProps = Readonly<{
  searchInput: string
  onSearchChange: (value: string) => void
  season: number | null
  onSeasonChange: (season: number | null) => void
  resource: ReturnType<typeof usePaginatedResource<Episode>>
  onSelect: (episode: Episode) => void
}>

function EpisodesView({ searchInput, onSearchChange, season, onSeasonChange, resource, onSelect }: EpisodesViewProps) {
  return (
    <ArchivePanel
      icon={<EpisodesIcon />}
      title="Transmission Archive"
      subtitle="Recorded incidents across known dimensions."
    >
      <div className="controls">
        <SearchBar
          value={searchInput}
          onChange={onSearchChange}
          placeholder="Search episodes..."
          ariaLabel="Search episodes by name"
        />
        <SeasonFilter value={season} onChange={onSeasonChange} />
      </div>

      {resource.isLoading && <LoadingPortal />}

      {!resource.isLoading && resource.error && (
        <ErrorState message={resource.error} onRetry={resource.retry} />
      )}

      {!resource.isLoading && !resource.error && resource.items.length === 0 && (
        <EmptyState
          title="No Broadcasts Found"
          message="Try another episode name or season."
          onResetFilters={() => {
            onSearchChange('')
            onSeasonChange(null)
          }}
        />
      )}

      {!resource.isLoading && !resource.error && resource.items.length > 0 && (
        <>
          <EpisodeList episodes={resource.items} onSelect={onSelect} />

          {resource.totalPages && resource.totalPages > 1 && (
            <Pagination
              page={resource.page}
              totalPages={resource.totalPages}
              onPageChange={(page) => void resource.goToPage(page)}
            />
          )}
        </>
      )}
    </ArchivePanel>
  )
}

// ── Main app content ──────────────────────────────────────────────────────────

function AppContent() {
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
  const isMyMultiverseEnabled = useFeatureFlag('myMultiverse')

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

  // The Multiverse Map and My Multiverse views own their own data, so they
  // contribute no hero stats.
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

  // View registry — add new views here without touching the render tree below.
  const viewRegistry: Partial<Record<View, React.ReactNode>> = {
    characters: (
      <CharactersView
        filters={characterFilters}
        onFilterChange={setCharacterFilter}
        onReset={resetCharacterFilters}
        hasActiveFilters={hasActiveCharacterFilters}
        resource={charactersResource}
        onSelect={handleSelectCharacter}
      />
    ),
    locations: (
      <LocationsView
        searchInput={locationSearchInput}
        onSearchChange={setLocationSearchInput}
        resource={locationsResource}
        onSelect={setSelectedLocation}
      />
    ),
    episodes: (
      <EpisodesView
        searchInput={episodeSearchInput}
        onSearchChange={setEpisodeSearchInput}
        season={episodeSeason}
        onSeasonChange={setEpisodeSeason}
        resource={episodesResource}
        onSelect={setSelectedEpisode}
      />
    ),
    'multiverse-map': <MultiverseMapView />,
    ...(isMyMultiverseEnabled && {
      'my-multiverse': (
        <MyMultiverseView
          onCharacterSelect={handleSelectCharacter}
          onEpisodeSelect={setSelectedEpisode}
          onLocationSelect={setSelectedLocation}
        />
      ),
    }),
  }

  return (
    <>
      <Header activeView={view} onNavigate={setView} showMyMultiverse={isMyMultiverseEnabled} />

      <main className="page-shell">
        <Hero
          totalCount={activeResource?.totalCount ?? null}
          lastSyncedAt={activeResource?.lastSyncedAt ?? null}
          error={activeResource?.error ?? null}
        />

        <div className="content" id="content">
          {viewRegistry[view]}
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

function App() {
  return (
    <FavoritesProvider>
      <AppContent />
    </FavoritesProvider>
  )
}

export default App
