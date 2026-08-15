import type { Character } from '../types/character'
import StatusIcon from './StatusIcon'

type CharacterCardProps = {
  character: Character
  onSelect: (character: Character) => void
}

function CharacterCard({ character, onSelect }: CharacterCardProps) {
  return (
    <article
      className="resource-card"
      role="button"
      tabIndex={0}
      aria-label={`View details for ${character.name}`}
      onClick={() => onSelect(character)}
      onKeyDown={(event) => {
        if (event.key === 'Enter' || event.key === ' ') {
          event.preventDefault()
          onSelect(character)
        }
      }}
    >
      <div className="resource-card__image-wrap">
        <img src={character.image} alt={character.name} loading="lazy" />
        <div className="resource-card__image-gradient" />
        <span className={`status-dot status-dot--${character.status.toLowerCase()}`} aria-hidden="true" />
      </div>
      <div className="resource-card__content">
        <h2>{character.name}</h2>
        <p className="resource-card__subtitle">{character.species}</p>
        <p className="resource-card__meta">{character.location.name}</p>
        <span className={`status-pill status-pill--${character.status.toLowerCase()}`}>
          <StatusIcon status={character.status} />
          {character.status}
        </span>
      </div>
    </article>
  )
}

export default CharacterCard
