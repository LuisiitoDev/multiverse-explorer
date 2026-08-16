import type { CharacterFilters } from '../types/character'
import FilterTextField from './FilterTextField'
import GenderFilterSelect from './GenderFilterSelect'
import SearchBar from './SearchBar'
import StatusFilters from './StatusFilters'

type CharacterFilterPanelProps = Readonly<{
  filters: CharacterFilters
  onFilterChange: <TKey extends keyof CharacterFilters>(
    key: TKey,
    value: CharacterFilters[TKey],
  ) => void
  onReset: () => void
  hasActiveFilters: boolean
}>

/**
 * Advanced Search V2 controls. The V1 row (name + status) is kept as-is and the
 * additional filters sit on a secondary row, so the panel reads as an extension
 * of the existing search area rather than a replacement for it.
 */
function CharacterFilterPanel({
  filters,
  onFilterChange,
  onReset,
  hasActiveFilters,
}: CharacterFilterPanelProps) {
  return (
    <div className="controls">
      <div className="controls__primary">
        <SearchBar value={filters.name} onChange={(value) => onFilterChange('name', value)} />
        <StatusFilters value={filters.status} onChange={(value) => onFilterChange('status', value)} />
      </div>

      <div className="controls__advanced" role="group" aria-label="Advanced character filters">
        <FilterTextField
          id="species-filter-input"
          label="Species"
          value={filters.species}
          placeholder="Human, Alien..."
          onChange={(value) => onFilterChange('species', value)}
        />

        <GenderFilterSelect
          value={filters.gender}
          onChange={(value) => onFilterChange('gender', value)}
        />

        <FilterTextField
          id="type-filter-input"
          label="Type"
          value={filters.type}
          placeholder="Genetic experiment..."
          onChange={(value) => onFilterChange('type', value)}
        />

        {/*
          Named distinctly from the empty-state reset so the two controls stay
          unambiguous to assistive tech (and to queries by accessible name).
        */}
        <button
          type="button"
          className="filter-reset"
          onClick={onReset}
          disabled={!hasActiveFilters}
          aria-label="Reset all filters"
        >
          Reset All
        </button>
      </div>
    </div>
  )
}

export default CharacterFilterPanel
