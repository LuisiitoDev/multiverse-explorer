import type { Episode } from '../types/episode'
import EpisodeRow from './EpisodeRow'

type EpisodeListProps = {
  episodes: Episode[]
  onSelect: (episode: Episode) => void
}

type EpisodeGroup = {
  label: string
  episodes: Episode[]
}

function getSeasonLabel(code: string): string {
  const match = /^S(\d{2})/i.exec(code)
  return match ? `Season ${Number(match[1])}` : 'Episodes'
}

function groupBySeason(episodes: Episode[]): EpisodeGroup[] {
  const groups: EpisodeGroup[] = []

  for (const episode of episodes) {
    const label = getSeasonLabel(episode.episode)
    const currentGroup = groups[groups.length - 1]

    if (currentGroup && currentGroup.label === label) {
      currentGroup.episodes.push(episode)
    } else {
      groups.push({ label, episodes: [episode] })
    }
  }

  return groups
}

function EpisodeList({ episodes, onSelect }: EpisodeListProps) {
  const groups = groupBySeason(episodes)

  return (
    <div className="archive-list" aria-label="Episodes">
      {groups.map((group) => (
        <div className="season-group" key={group.label}>
          <p className="season-group__label">{group.label}</p>
          {group.episodes.map((episode) => (
            <EpisodeRow key={episode.id} episode={episode} onSelect={onSelect} />
          ))}
        </div>
      ))}
    </div>
  )
}

export default EpisodeList
