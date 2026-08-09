import type { Character } from '../types/character'
import CharacterCard from './CharacterCard'

type CharacterGridProps = {
  characters: Character[]
  onSelect: (character: Character) => void
}

function CharacterGrid({ characters, onSelect }: CharacterGridProps) {
  return (
    <section className="resource-grid" aria-label="Characters">
      {characters.map((character) => (
        <CharacterCard key={character.id} character={character} onSelect={onSelect} />
      ))}
    </section>
  )
}

export default CharacterGrid
