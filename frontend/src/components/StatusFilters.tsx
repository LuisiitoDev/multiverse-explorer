import type { StatusFilter } from '../types/character'

type StatusFiltersProps = {
  value: StatusFilter
  onChange: (value: StatusFilter) => void
}

const FILTERS: { value: StatusFilter; label: string }[] = [
  { value: 'all', label: 'All' },
  { value: 'alive', label: 'Alive' },
  { value: 'dead', label: 'Dead' },
  { value: 'unknown', label: 'Unknown' },
]

function StatusFilters({ value, onChange }: StatusFiltersProps) {
  return (
    <div className="status-filters" role="group" aria-label="Filter by status">
      {FILTERS.map((filter) => (
        <button
          key={filter.value}
          type="button"
          className={`status-filter status-filter--${filter.value}`}
          aria-pressed={value === filter.value}
          onClick={() => onChange(filter.value)}
        >
          {filter.label}
        </button>
      ))}
    </div>
  )
}

export default StatusFilters
