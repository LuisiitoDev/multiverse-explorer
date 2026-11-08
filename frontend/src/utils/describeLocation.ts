import type { Location } from '../types/location'

export function describeLocation(location: Location): string {
  const type = location.type || 'Unknown type'
  const dimension = location.dimension || 'Unknown dimension'
  const residents = location.residents.length

  return `${location.name}. ${type}, ${dimension}. ${residents} ${
    residents === 1 ? 'resident' : 'residents'
  }.`
}
