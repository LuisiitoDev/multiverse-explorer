import { useEffect, useMemo, useRef, useState } from 'react'
import type { Location } from '../types/location'
import { layoutNodes3d } from '../utils/multiverseLayout3d'
import {
  createMultiverseScene,
  isWebGLAvailable,
  type MultiverseScene,
} from '../utils/multiverseScene'
import MultiverseLocationList from './MultiverseLocationList'

type MultiverseMap3DProps = Readonly<{
  locations: Location[]
  activeLocationId: number | null
  onSelectLocation: (location: Location) => void
}>

function prefersReducedMotion(): boolean {
  return (
    typeof window.matchMedia === 'function' &&
    window.matchMedia('(prefers-reduced-motion: reduce)').matches
  )
}

/**
 * 3D view of the locations. The canvas is decorative (aria-hidden); the list
 * below is the accessible way to reach and select every location.
 */
function MultiverseMap3D({
  locations,
  activeLocationId,
  onSelectLocation,
}: MultiverseMap3DProps) {
  const containerRef = useRef<HTMLDivElement>(null)
  const sceneRef = useRef<MultiverseScene | null>(null)
  const activeIdRef = useRef(activeLocationId)
  const onSelectRef = useRef(onSelectLocation)
  const [sceneError] = useState(() => !isWebGLAvailable())
  const nodes = useMemo(() => layoutNodes3d(locations), [locations])

  useEffect(() => {
    activeIdRef.current = activeLocationId
    onSelectRef.current = onSelectLocation
    sceneRef.current?.setActiveLocation(activeLocationId)
  }, [activeLocationId, onSelectLocation])

  useEffect(() => {
    const container = containerRef.current

    if (!container || sceneError) {
      return
    }

    sceneRef.current = createMultiverseScene({
      container,
      nodes,
      activeLocationId: activeIdRef.current,
      reducedMotion: prefersReducedMotion(),
      onSelect: (location) => onSelectRef.current(location),
    })

    return () => {
      sceneRef.current?.dispose()
      sceneRef.current = null
    }
  }, [nodes, sceneError])

  return (
    <div className="multiverse-3d">
      {sceneError && (
        <p className="multiverse-3d__fallback" role="alert">
          The 3D view is not available in this browser. Use the list below to explore
          locations.
        </p>
      )}
      <div
        className="multiverse-3d__canvas"
        ref={containerRef}
        aria-hidden="true"
        hidden={sceneError}
      />


      <MultiverseLocationList
        locations={locations}
        activeLocationId={activeLocationId}
        onSelectLocation={onSelectLocation}
      />
    </div>
  )
}

export default MultiverseMap3D
