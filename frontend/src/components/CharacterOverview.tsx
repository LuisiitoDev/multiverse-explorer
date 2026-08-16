import type { Character } from '../types/character'
import StatusIcon from './StatusIcon'

type CharacterOverviewProps = Readonly<{
  character: Character
  locationLabel?: string
  episodeLabel?: string
  stackLocationRows?: boolean
}>

function CharacterOverview({
  character,
  locationLabel = 'Location',
  episodeLabel = 'Episodes',
  stackLocationRows = false,
}: CharacterOverviewProps) {
  const locationRowClassName = stackLocationRows ? 'modal-row modal-row--stacked' : 'modal-row'

  return (
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
      <div className={locationRowClassName}>
        <dt>Origin</dt>
        <dd>{character.origin.name}</dd>
      </div>
      <div className={locationRowClassName}>
        <dt>{locationLabel}</dt>
        <dd>{character.location.name}</dd>
      </div>
      <div className="modal-row">
        <dt>{episodeLabel}</dt>
        <dd>{character.episode.length}</dd>
      </div>
    </dl>
  )
}

export default CharacterOverview
