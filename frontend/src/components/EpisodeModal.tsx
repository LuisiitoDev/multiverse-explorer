import type { Episode } from '../types/episode'
import { getAccentClass } from '../utils/accentColor'
import FavoriteButton from './FavoriteButton'
import Modal from './Modal'

type EpisodeModalProps = {
  episode: Episode
  onClose: () => void
}

function EpisodeModal({ episode, onClose }: EpisodeModalProps) {
  const accentClass = getAccentClass(episode.episode)
  const characterCount = episode.characters.length

  return (
    <Modal titleId="episode-modal-title" onClose={onClose} closeLabel="Close episode details">
      <div className="modal-stage">
        <div className={`resource-card__glyph resource-card__glyph--episode resource-card__glyph--large ${accentClass}`}>
          <span className="resource-card__glyph-bars" aria-hidden="true">
            <span />
            <span />
            <span />
            <span />
            <span />
          </span>
          <span className="resource-card__glyph-code">{episode.episode}</span>
        </div>
      </div>

      <div className="modal-details">
        <h2 id="episode-modal-title">{episode.name}</h2>
        <FavoriteButton resourceType="episode" resourceId={episode.id} />
        <dl>
          <div className="modal-row">
            <dt>Code</dt>
            <dd>{episode.episode}</dd>
          </div>
          <div className="modal-row">
            <dt>Air Date</dt>
            <dd>{episode.air_date}</dd>
          </div>
          <div className="modal-row">
            <dt>Characters</dt>
            <dd>{characterCount}</dd>
          </div>
        </dl>
      </div>
    </Modal>
  )
}

export default EpisodeModal
