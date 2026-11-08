import type { Location } from '../types/location'
import { describeLocation } from '../utils/describeLocation'

type MultiverseLocationListProps = Readonly<{
  locations: Location[]
  activeLocationId: number | null
  onSelectLocation: (location: Location) => void
}>

/** Keyboard-reachable path to every location shown in the 3D scene. */
function MultiverseLocationList({
  locations,
  activeLocationId,
  onSelectLocation,
}: MultiverseLocationListProps) {
  return (
    <ul className="multiverse-list" aria-label="All locations">
      {locations.map((location) => (
        <li key={location.id}>
          <button
            type="button"
            className="multiverse-list__item"
            aria-pressed={location.id === activeLocationId}
            onClick={() => onSelectLocation(location)}
          >
            {describeLocation(location)}
          </button>
        </li>
      ))}
    </ul>
  )
}

export default MultiverseLocationList
