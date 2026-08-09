import type { Character } from '../types/character'
import Modal from './Modal'
import StatusIcon from './StatusIcon'

type CharacterModalProps = {
  character: Character
  onClose: () => void
}

function CharacterModal({ character, onClose }: CharacterModalProps) {
  return (
    <Modal titleId="character-modal-title" onClose={onClose} closeLabel="Close character details">
      <div className="modal-stage">
        <div className="hologram-projector" />
        <img className="hologram-image" src={character.image} alt={character.name} />
      </div>

      <div className="modal-details">
        <h2 id="character-modal-title">{character.name}</h2>
        <dl>
          <div className="modal-row">
            <dt>Status</dt>
            <dd>
              <span className={`status-pill status-pill--${character.status.toLowerCase()}`}>
                <StatusIcon status={character.status} />
                {character.status}
              </span>
            </dd>
          </div>
          <div className="modal-row">
            <dt>Species</dt>
            <dd>{character.species}</dd>
          </div>
          <div className="modal-row">
            <dt>Gender</dt>
            <dd>{character.gender}</dd>
          </div>
          <div className="modal-row">
            <dt>Origin</dt>
            <dd>{character.origin.name}</dd>
          </div>
          <div className="modal-row">
            <dt>Location</dt>
            <dd>{character.location.name}</dd>
          </div>
          <div className="modal-row">
            <dt>Episodes</dt>
            <dd>{character.episode.length}</dd>
          </div>
        </dl>
      </div>
    </Modal>
  )
}

export default CharacterModal
