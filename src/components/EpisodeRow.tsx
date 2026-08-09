import type { Episode } from '../types/episode'

type EpisodeRowProps = {
  episode: Episode
  onSelect: (episode: Episode) => void
}

function EpisodeRow({ episode, onSelect }: EpisodeRowProps) {
  const characterCount = episode.characters.length

  return (
    <div className="archive-row">
      <span className="archive-row__code">{episode.episode}</span>
      <div className="archive-row__main">
        <p className="archive-row__title">{episode.name}</p>
        <p className="archive-row__meta">{episode.air_date}</p>
      </div>
      <p className="archive-row__count">
        {characterCount} {characterCount === 1 ? 'character' : 'characters'} detected
      </p>
      <button
        type="button"
        className="archive-row__action"
        onClick={() => onSelect(episode)}
        aria-label={`Open transmission for ${episode.name}`}
      >
        Open Transmission
        <span aria-hidden="true">&#8594;</span>
      </button>
    </div>
  )
}

export default EpisodeRow
