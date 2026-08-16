import { useState } from 'react'
import { usePaginatedResource } from '../hooks/usePaginatedResource'
import { fetchLocations } from '../services/rickAndMortyApi'
import type { Location } from '../types/location'
import EmptyState from './EmptyState'
import ErrorState from './ErrorState'
import LoadingPortal from './LoadingPortal'
import LocationDetailPanel from './LocationDetailPanel'
import MultiverseMap from './MultiverseMap'
import MultiverseReadout from './MultiverseReadout'
import Pagination from './Pagination'

/**
 * Self-contained Multiverse Map view.
 *
 * It owns its own data, hover and selection state rather than borrowing App's,
 * so the feature can be added or removed as a single unit -- which is what
 * makes the Green revision independently verifiable.
 *
 * Only one page of locations is mapped at a time; the API's remaining pages are
 * reachable through the existing pagination control instead of rendering every
 * node at once.
 */
function MultiverseMapView() {
  const [hoveredLocation, setHoveredLocation] = useState<Location | null>(null)
  const [selectedLocation, setSelectedLocation] = useState<Location | null>(null)

  const locationsResource = usePaginatedResource<Location>(
    (page, signal) => fetchLocations({ name: '', page, signal }),
    'multiverse-map',
    true,
  )

  const handleSelect = (location: Location) => {
    setSelectedLocation(location)
    setHoveredLocation(location)
  }

  return (
    <section className="multiverse-view">
      <header className="multiverse-view__header">
        <h2 className="multiverse-view__title">Multiverse Map</h2>
        <p className="multiverse-view__subtitle">
          Holographic navigation across charted dimensions.
        </p>
      </header>

      {locationsResource.isLoading && <LoadingPortal />}

      {!locationsResource.isLoading && locationsResource.error && (
        <ErrorState message={locationsResource.error} onRetry={locationsResource.retry} />
      )}

      {!locationsResource.isLoading &&
        !locationsResource.error &&
        locationsResource.items.length === 0 && (
          <EmptyState
            title="No Coordinates Mapped"
            message="The multiverse scan returned no locations."
            onResetFilters={locationsResource.retry}
          />
        )}

      {!locationsResource.isLoading &&
        !locationsResource.error &&
        locationsResource.items.length > 0 && (
          <>
            <MultiverseMap
              locations={locationsResource.items}
              activeLocationId={selectedLocation?.id ?? null}
              onHoverLocation={setHoveredLocation}
              onSelectLocation={handleSelect}
            />

            <MultiverseReadout location={hoveredLocation} />

            {locationsResource.totalPages && locationsResource.totalPages > 1 && (
              <Pagination
                page={locationsResource.page}
                totalPages={locationsResource.totalPages}
                onPageChange={(page) => {
                  setHoveredLocation(null)
                  void locationsResource.goToPage(page)
                }}
              />
            )}
          </>
        )}

      {selectedLocation && (
        <LocationDetailPanel
          location={selectedLocation}
          onClose={() => setSelectedLocation(null)}
        />
      )}
    </section>
  )
}

export default MultiverseMapView
