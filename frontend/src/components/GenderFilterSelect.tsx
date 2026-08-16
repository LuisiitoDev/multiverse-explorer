import type { GenderFilter } from '../types/character'

const GENDER_OPTIONS: { value: GenderFilter; label: string }[] = [
  { value: 'all', label: 'All' },
  { value: 'female', label: 'Female' },
  { value: 'male', label: 'Male' },
  { value: 'genderless', label: 'Genderless' },
  { value: 'unknown', label: 'Unknown' },
]

type GenderFilterSelectProps = Readonly<{
  value: GenderFilter
  onChange: (value: GenderFilter) => void
}>

function GenderFilterSelect({ value, onChange }: GenderFilterSelectProps) {
  return (
    <div className="filter-select">
      <label htmlFor="gender-filter-select" className="filter-select__label">
        Gender
      </label>
      <select
        id="gender-filter-select"
        className="filter-select__control"
        value={value}
        onChange={(event) => onChange(event.target.value as GenderFilter)}
      >
        {GENDER_OPTIONS.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>
      <span className="filter-select__chevron" aria-hidden="true">
        &#9662;
      </span>
    </div>
  )
}

export default GenderFilterSelect
