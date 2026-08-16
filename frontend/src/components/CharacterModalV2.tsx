import { useMemo } from 'react'
import { useCharacterEpisodes } from '../hooks/useCharacterEpisodes'
import type { Character } from '../types/character'
import type { Episode } from '../types/episode'
import ErrorState from './ErrorState'
import CharacterOverview from './CharacterOverview'
import FavoriteButton from './FavoriteButton'
import LoadingPortal from './LoadingPortal'
import Modal from './Modal'

type CharacterModalV2Props = Readonly<{
  character: Character
  onClose: () => void
  onCollapse: () => void
}>

type SeasonGroup = {
  season: number
  episodes: Episode[]
}

function seasonNumberOf(episode: Episode): number {
  const match = /^S(\d+)/i.exec(episode.episode)
  return match ? Number(match[1]) : 0
}

function formatEpisodeLabel(episode: Episode): string {
  return `${episode.episode} — ${episode.name}`
}

function groupEpisodesBySeason(episodes: Episode[]): SeasonGroup[] {
  const bySeason = new Map<number, Episode[]>()

  for (const episode of episodes) {
    const group = bySeason.get(seasonNumberOf(episode)) ?? []
    group.push(episode)
    bySeason.set(seasonNumberOf(episode), group)
  }

  return Array.from(bySeason.entries())
    .sort(([seasonA], [seasonB]) => seasonA - seasonB)
    .map(([season, seasonEpisodes]) => ({ season, episodes: seasonEpisodes }))
}

function CharacterModalV2({ character, onClose, onCollapse }: CharacterModalV2Props) {
  const { episodes, isLoading, error, retry } = useCharacterEpisodes(character.episode)

  const sortedEpisodes = useMemo(
    () => [...episodes].sort((a, b) => a.episode.localeCompare(b.episode)),
    [episodes],
  )
  const seasonGroups = useMemo(() => groupEpisodesBySeason(sortedEpisodes), [sortedEpisodes])
  const firstAppearance = sortedEpisodes[0] ?? null
  const latestAppearance = sortedEpisodes.at(-1) ?? null

  return (
    <Modal
      titleId="character-modal-v2-title"
      onClose={onClose}
      closeLabel="Close character details"
      dialogClassName="modal-dialog--v2"
    >
      <div className="modal-stage">
        <div className="hologram-projector" />
        <img className="hologram-image" src={character.image} alt={character.name} />
      </div>

      <div className="modal-details">
        <div className="modal-details__header">
          <h2 id="character-modal-v2-title">{character.name}</h2>
          <button type="button" className="modal-details__toggle" onClick={onCollapse}>
            &larr; Summary view
          </button>
        </div>
        <FavoriteButton resourceType="character" resourceId={character.id} />

        <CharacterOverview
          character={character}
          locationLabel="Last known location"
          episodeLabel="Appearances"
          stackLocationRows
        />

        {isLoading && <LoadingPortal />}

        {!isLoading && error && <ErrorState message={error} onRetry={retry} />}

        {!isLoading && !error && (
          <>
            <dl>
              <div className="modal-row modal-row--stacked">
                <dt>First appearance</dt>
                <dd>{firstAppearance ? formatEpisodeLabel(firstAppearance) : 'Unknown'}</dd>
              </div>
              <div className="modal-row modal-row--stacked">
                <dt>Latest appearance</dt>
                <dd>{latestAppearance ? formatEpisodeLabel(latestAppearance) : 'Unknown'}</dd>
              </div>
            </dl>

            <div className="modal-episodes">
              <h3>Episodes</h3>
              {seasonGroups.map((group) => (
                <div key={group.season} className="modal-episodes__season">
                  <h4>Season {group.season}</h4>
                  <ul>
                    {group.episodes.map((episode) => (
                      <li key={episode.id}>{formatEpisodeLabel(episode)}</li>
                    ))}
                  </ul>
                </div>
              ))}
            </div>
          </>
        )}
      </div>
    </Modal>
  )
}

export default CharacterModalV2
