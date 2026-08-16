import { useMemo, useState } from 'react'
import type { CharacterFilters } from '../types/character'
import { useDebouncedValue } from './useDebouncedValue'

export const EMPTY_CHARACTER_FILTERS: CharacterFilters = {
  name: '',
  status: 'all',
  species: '',
  gender: 'all',
  type: '',
}

const TEXT_DEBOUNCE_MS = 400

/**
 * Owns the Advanced Search filter state.
 *
 * `filters` holds what the user is typing (drives the inputs); `appliedFilters`
 * holds the debounced, trimmed values that reach the API. Keeping them separate
 * is what stops every keystroke from firing a request while the inputs stay
 * fully controlled.
 */
export function useCharacterFilters() {
  const [filters, setFilters] = useState<CharacterFilters>(EMPTY_CHARACTER_FILTERS)

  // Only the free-text fields need debouncing; status and gender change on a
  // single click and should apply immediately.
  const debouncedName = useDebouncedValue(filters.name, TEXT_DEBOUNCE_MS).trim()
  const debouncedSpecies = useDebouncedValue(filters.species, TEXT_DEBOUNCE_MS).trim()
  const debouncedType = useDebouncedValue(filters.type, TEXT_DEBOUNCE_MS).trim()

  const appliedFilters = useMemo<CharacterFilters>(
    () => ({
      name: debouncedName,
      status: filters.status,
      species: debouncedSpecies,
      gender: filters.gender,
      type: debouncedType,
    }),
    [debouncedName, filters.status, debouncedSpecies, filters.gender, debouncedType],
  )

  // Serialising every applied filter means the paginated resource resets to
  // page one whenever any of them changes -- adding a filter to the type is
  // enough for it to participate in the cache key.
  const filterKey = useMemo(() => JSON.stringify(appliedFilters), [appliedFilters])

  const setFilter = <TKey extends keyof CharacterFilters>(
    key: TKey,
    value: CharacterFilters[TKey],
  ) => {
    setFilters((current) => ({ ...current, [key]: value }))
  }

  const resetFilters = () => setFilters(EMPTY_CHARACTER_FILTERS)

  const hasActiveFilters = useMemo(
    () =>
      (Object.keys(EMPTY_CHARACTER_FILTERS) as (keyof CharacterFilters)[]).some(
        (key) => filters[key] !== EMPTY_CHARACTER_FILTERS[key],
      ),
    [filters],
  )

  return { filters, appliedFilters, filterKey, setFilter, resetFilters, hasActiveFilters }
}
