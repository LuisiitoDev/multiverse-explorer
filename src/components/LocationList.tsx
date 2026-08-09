import type { Location } from '../types/location'
import LocationRow from './LocationRow'

type LocationListProps = {
  locations: Location[]
  onSelect: (location: Location) => void
}

function LocationList({ locations, onSelect }: LocationListProps) {
  return (
    <div className="archive-list" aria-label="Locations">
      {locations.map((location) => (
        <LocationRow key={location.id} location={location} onSelect={onSelect} />
      ))}
    </div>
  )
}

export default LocationList
