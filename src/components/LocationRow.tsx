import type { Location } from '../types/location'
import { getAccentClass } from '../utils/accentColor'

type LocationRowProps = {
  location: Location
  onSelect: (location: Location) => void
}

function LocationRow({ location, onSelect }: LocationRowProps) {
  const accentClass = getAccentClass(location.dimension || location.type || location.name)
  const residentCount = location.residents.length

  return (
    <div className="archive-row">
      <span className={`archive-row__glyph ${accentClass}`} aria-hidden="true">
        {location.type ? location.type.charAt(0).toUpperCase() : '?'}
      </span>
      <div className="archive-row__main">
        <p className="archive-row__title">{location.name}</p>
        <p className="archive-row__meta">
          {location.type || 'Unknown type'} · {location.dimension || 'Unknown dimension'}
        </p>
      </div>
      <p className="archive-row__count">
        {residentCount} {residentCount === 1 ? 'resident' : 'residents'}
      </p>
      <button
        type="button"
        className="archive-row__action"
        onClick={() => onSelect(location)}
        aria-label={`View location details for ${location.name}`}
      >
        View Location
        <span aria-hidden="true">&#8594;</span>
      </button>
    </div>
  )
}

export default LocationRow
