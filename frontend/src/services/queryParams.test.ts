import { describe, expect, it } from 'vitest'
import { buildQueryParams, omitWhen, optionalText, type QueryParamRules } from './queryParams'

describe('optionalText', () => {
  it.each([
    ['Rick', 'Rick'],
    ['  Rick  ', 'Rick'],
  ])('trims %s to %s', (raw, expected) => {
    expect(optionalText(raw)).toBe(expected)
  })

  it.each([[''], ['   ']])('omits blank input (%s)', (raw) => {
    expect(optionalText(raw)).toBeNull()
  })
})

describe('omitWhen', () => {
  it('omits the sentinel and keeps every other value', () => {
    const strategy = omitWhen<'all' | 'alive' | 'dead'>('all')

    expect(strategy('all')).toBeNull()
    expect(strategy('alive')).toBe('alive')
    expect(strategy('dead')).toBe('dead')
  })
})

describe('buildQueryParams', () => {
  type Filters = { name: string; status: 'all' | 'alive'; species: string }

  const rules: QueryParamRules<Filters> = {
    name: optionalText,
    status: omitWhen<Filters['status']>('all'),
    species: optionalText,
  }

  it('includes only the filters that have a value', () => {
    const filters: Filters = { name: ' Rick ', status: 'alive', species: '' }
    const params = buildQueryParams(filters, rules)

    expect(params.get('name')).toBe('Rick')
    expect(params.get('status')).toBe('alive')
    expect(params.has('species')).toBe(false)
  })

  it('produces an empty query when nothing is filtered', () => {
    const filters: Filters = { name: '', status: 'all', species: '  ' }
    const params = buildQueryParams(filters, rules)

    expect(params.toString()).toBe('')
  })

  it('keys parameters by the filter name', () => {
    const filters: Filters = { name: 'Rick', status: 'all', species: 'Human' }
    const params = buildQueryParams(filters, rules)

    expect(params.toString()).toBe('name=Rick&species=Human')
  })
})
