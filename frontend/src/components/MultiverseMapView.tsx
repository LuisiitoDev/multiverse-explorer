import { lazy, Suspense, useEffect, useState } from 'react'
import { useFeatureFlag } from '../hooks/useFeatureFlag'
import { fetchLocations } from '../services/rickAndMortyApi'
import type { Location } from '../types/location'
import { isWebGLAvailable } from '../utils/webgl'
import EmptyState from './EmptyState'
import ErrorState from './ErrorState'
import GlobeErrorBoundary from './GlobeErrorBoundary'
import LoadingPortal from './LoadingPortal'
import LocationDetailPanel from './LocationDetailPanel'
import MultiverseGlobeFallback from './MultiverseGlobeFallback'
import MultiverseMap from './MultiverseMap'

const MultiverseGlobe = lazy(() => import('./MultiverseGlobe'))

type MapMode = '2d' | '3d'

function isAbortError(error: unknown): boolean {
  return error instanceof DOMException && error.name === 'AbortError'
}

/**
 * Self-contained Multiverse Map view.
 *
 * It owns its own data and selection state rather than borrowing App's,
 * so the feature can be added or removed as a single unit -- which is what
 * makes the Green revision independently verifiable.
 *
 * Every location page is loaded into one navigable surface so the map behaves
 * like a continuous atlas rather than a stack of separate pages.
 */
function MultiverseMapView() {
  const [selectedLocation, setSelectedLocation] = useState<Location | null>(null)
  const [locations, setLocations] = useState<Location[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [retryToken, setRetryToken] = useState(0)
  const globeEnabled = useFeatureFlag('globe3d')
  const [mode, setMode] = useState<MapMode>('2d')
  const showGlobe = globeEnabled && mode === '3d'
  useEffect(() => {
    const controller = new AbortController()

    const loadAllLocations = async () => {
      setIsLoading(true)
      setError(null)

      try {
        const allLocations: Location[] = []
        let page = 1
        let totalPages = 1

        do {
          const data = await fetchLocations({ name: '', page, signal: controller.signal })
          allLocations.push(...data.results)
          totalPages = data.info?.pages ?? page
          page += 1
        } while (page <= totalPages)

        setLocations(allLocations)
      } catch (requestError) {
        if (isAbortError(requestError)) {
          return
        }

        setError(
          requestError instanceof Error
            ? requestError.message
            : 'An unexpected error occurred.',
        )
      } finally {
        if (!controller.signal.aborted) {
          setIsLoading(false)
        }
      }
    }

    void loadAllLocations()

    return () => controller.abort()
  }, [retryToken])

  const handleSelect = (location: Location) => {
    setSelectedLocation(location)
  }

  return (
    <section className="multiverse-view">
      <header className="multiverse-view__header">
        <h2 className="multiverse-view__title">Multiverse Map</h2>
        <p className="multiverse-view__subtitle">
          Holographic navigation across charted dimensions.
        </p>
      </header>

      {globeEnabled && (
        <div className="multiverse-view__modes" role="group" aria-label="Map view">
          {(['2d', '3d'] as const).map((value) => (
            <button
              key={value}
              type="button"
              className="multiverse-view__mode"
              aria-pressed={mode === value}
              onClick={() => setMode(value)}
            >
              {value === '2d' ? '2D' : '3D'}
            </button>
          ))}
        </div>
      )}

      {isLoading && <LoadingPortal />}

      {!isLoading && error && (
        <ErrorState message={error} onRetry={() => setRetryToken((token) => token + 1)} />
      )}

      {!isLoading && !error && locations.length === 0 && (
          <EmptyState
            title="No Coordinates Mapped"
            message="The multiverse scan returned no locations."
            onResetFilters={() => setRetryToken((token) => token + 1)}
          />
        )}

      {!isLoading && !error && locations.length > 0 && (
          <>
            {showGlobe ? (
              isWebGLAvailable() ? (
                <GlobeErrorBoundary fallback={<MultiverseGlobeFallback onUse2D={() => setMode('2d')} />}>
                  <Suspense fallback={<LoadingPortal />}>
                    <MultiverseGlobe
                      locations={locations}
                      activeLocationId={selectedLocation?.id ?? null}
                      onSelectLocation={handleSelect}
                    />
                  </Suspense>
                </GlobeErrorBoundary>
              ) : (
                <MultiverseGlobeFallback onUse2D={() => setMode('2d')} />
              )
            ) : (
              <MultiverseMap
                locations={locations}
                activeLocationId={selectedLocation?.id ?? null}
                onSelectLocation={handleSelect}
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
