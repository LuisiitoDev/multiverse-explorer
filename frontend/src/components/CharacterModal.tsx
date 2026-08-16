import type { Character } from '../types/character'
import CharacterOverview from './CharacterOverview'
import Modal from './Modal'

type CharacterModalProps = Readonly<{
  character: Character
  onClose: () => void
  /** Absent when the V2 modal is disabled, which also hides its entry point. */
  onExpand?: () => void
}>

function CharacterModal({ character, onClose, onExpand }: CharacterModalProps) {
  return (
    <Modal titleId="character-modal-title" onClose={onClose} closeLabel="Close character details">
      <div className="modal-stage">
        <div className="hologram-projector" />
        <img className="hologram-image" src={character.image} alt={character.name} />
      </div>

      <div className="modal-details">
        <div className="modal-details__header">
          <h2 id="character-modal-title">{character.name}</h2>
          {onExpand && (
            <button type="button" className="modal-details__toggle" onClick={onExpand}>
              Extended profile &rarr;
            </button>
          )}
        </div>
        <CharacterOverview character={character} />
      </div>
    </Modal>
  )
}

export default CharacterModal
