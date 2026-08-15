const SEASON_OPTIONS = Array.from({ length: 8 }, (_, index) => index + 1)

type SeasonFilterProps = {
  value: number | null
  onChange: (value: number | null) => void
}

function SeasonFilter({ value, onChange }: SeasonFilterProps) {
  return (
    <div className="season-filter">
      <label htmlFor="season-filter-select" className="season-filter__label">
        Season
      </label>
      <select
        id="season-filter-select"
        className="season-filter__select"
        value={value ?? 'all'}
        onChange={(event) => {
          const raw = event.target.value
          onChange(raw === 'all' ? null : Number(raw))
        }}
      >
        <option value="all">All</option>
        {SEASON_OPTIONS.map((season) => (
          <option key={season} value={season}>
            {season}
          </option>
        ))}
      </select>
      <span className="season-filter__chevron" aria-hidden="true">
        &#9662;
      </span>
    </div>
  )
}

export default SeasonFilter
