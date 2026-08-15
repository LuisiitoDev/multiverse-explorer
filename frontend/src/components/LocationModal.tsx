import type { Location } from '../types/location'
import { getAccentClass } from '../utils/accentColor'
import Modal from './Modal'

type LocationModalProps = {
  location: Location
  onClose: () => void
}

function LocationModal({ location, onClose }: LocationModalProps) {
  const accentClass = getAccentClass(location.dimension || location.type || location.name)
  const residentCount = location.residents.length

  return (
    <Modal titleId="location-modal-title" onClose={onClose} closeLabel="Close location details">
      <div className="modal-stage">
        <div className={`resource-card__glyph resource-card__glyph--location resource-card__glyph--large ${accentClass}`}>
          <span className="resource-card__glyph-ring" aria-hidden="true" />
          <span className="resource-card__glyph-letter" aria-hidden="true">
            {location.type ? location.type.charAt(0).toUpperCase() : '?'}
          </span>
        </div>
      </div>

      <div className="modal-details">
        <h2 id="location-modal-title">{location.name}</h2>
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
      </div>
    </Modal>
  )
}

export default LocationModal
