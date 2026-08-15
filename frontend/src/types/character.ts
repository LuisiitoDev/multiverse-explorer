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
