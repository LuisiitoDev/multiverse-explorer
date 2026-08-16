export type Character = {
  id: number
  name: string
  status: string
  species: string
  gender: string
  image: string
  origin: {
    name: string
  }
  location: {
    name: string
  }
  episode: string[]
}

export type ApiInfo = {
  count: number
  pages: number
  next: string | null
  prev: string | null
}

export type StatusFilter = 'all' | 'alive' | 'dead' | 'unknown'

export type GenderFilter = 'all' | 'female' | 'male' | 'genderless' | 'unknown'

/**
 * The Advanced Search V2 filter set. V1 is the `name` + `status` subset, so the
 * two differ only by which fields the UI collects and sends.
 */
export type CharacterFilters = {
  name: string
  status: StatusFilter
  species: string
  gender: GenderFilter
  type: string
}
