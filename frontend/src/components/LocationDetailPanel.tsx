import { useLocationResidents } from '../hooks/useLocationResidents'
import type { Location } from '../types/location'
import { getAccentClass } from '../utils/accentColor'
import ErrorState from './ErrorState'
import LoadingPortal from './LoadingPortal'
import Modal from './Modal'

type LocationDetailPanelProps = Readonly<{
  location: Location
  onClose: () => void
}>

function LocationDetailPanel({ location, onClose }: LocationDetailPanelProps) {
  // Mounting this hook here is what keeps resident fetching on demand: it only
  // runs once a node has actually been opened.
  const { residents, isLoading, error, retry } = useLocationResidents(location.residents)
  const accentClass = getAccentClass(location.dimension || location.type || location.name)
  const residentCount = location.residents.length

  return (
    <Modal
      titleId="multiverse-location-title"
      onClose={onClose}
      closeLabel="Close location details"
      dialogClassName="modal-dialog--v2 modal-dialog--map"
    >
      <div className="modal-stage">
        <div
          className={`resource-card__glyph resource-card__glyph--location resource-card__glyph--large ${accentClass}`}
        >
          <span className="resource-card__glyph-ring" aria-hidden="true" />
          <span className="resource-card__glyph-letter" aria-hidden="true">
            {location.type ? location.type.charAt(0).toUpperCase() : '?'}
          </span>
        </div>
      </div>

      <div className="modal-details">
        <h2 id="multiverse-location-title">{location.name}</h2>

        <dl>
          <div className="modal-row">
            <dt>Type</dt>
            <dd>{location.type || 'Unknown'}</dd>
          </div>
          <div className="modal-row">
            <dt>Dimension</dt>
            <dd>{location.dimension || 'Unknown'}</dd>
          </div>
          <div className="modal-row">
            <dt>Residents</dt>
            <dd>{residentCount}</dd>
          </div>
        </dl>

        <div className="resident-roster">
          <h3>Residents</h3>

          {residentCount === 0 && (
            <p className="resident-roster__empty">No known residents in this location.</p>
          )}

          {residentCount > 0 && isLoading && <LoadingPortal />}

          {residentCount > 0 && !isLoading && error && (
            <ErrorState message={error} onRetry={retry} />
          )}

          {residentCount > 0 && !isLoading && !error && (
            <ul className="resident-roster__list">
              {residents.map((resident) => (
                <li key={resident.id} className="resident-chip">
                  <img
                    className="resident-chip__avatar"
                    src={resident.image}
                    alt=""
                    loading="lazy"
                  />
                  <span className="resident-chip__name">{resident.name}</span>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </Modal>
  )
}

export default LocationDetailPanel
