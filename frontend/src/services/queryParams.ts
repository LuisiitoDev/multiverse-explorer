/**
 * Turns one filter value into its query-string form, or `null` to mean "leave
 * this parameter out entirely". Each rule is a strategy, so how a value is
 * serialised is decided per field rather than by a chain of guards.
 */
export type QueryValueStrategy<TValue> = (value: TValue) => string | null

/** Free text: trimmed, and omitted when nothing is left. */
export const optionalText: QueryValueStrategy<string> = (value) => value.trim() || null

/** Enumerated choice: omitted when it still holds its "no filter" sentinel. */
export function omitWhen<TValue extends string>(sentinel: TValue): QueryValueStrategy<TValue> {
  return (value) => (value === sentinel ? null : value)
}

/** One strategy per filter field, keyed by the query parameter name. */
export type QueryParamRules<TFilters> = {
  [TKey in keyof TFilters]: QueryValueStrategy<TFilters[TKey]>
}

/**
 * Applies a rule set to a filter object. Adding a filter means adding one entry
 * to the rules; this function never changes.
 */
export function buildQueryParams<TFilters extends object>(
  filters: TFilters,
  rules: QueryParamRules<TFilters>,
): URLSearchParams {
  const params = new URLSearchParams()

  for (const key of Object.keys(rules) as (keyof TFilters)[]) {
    const queryValue = rules[key](filters[key])

    if (queryValue !== null) {
      params.set(String(key), queryValue)
    }
  }

  return params
}
