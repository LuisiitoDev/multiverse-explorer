import type {
  ApiInfo,
  Character,
  CharacterFilters,
  GenderFilter,
  StatusFilter,
} from '../types/character'
import { EMPTY_CHARACTER_FILTERS } from '../types/character'
import type { QueryParamRules } from './queryParams'
import { buildQueryParams, omitWhen, optionalText } from './queryParams'
import type { Episode } from '../types/episode'
import type { Location } from '../types/location'

const CHARACTER_URL = 'https://rickandmortyapi.com/api/character'
const LOCATION_URL = 'https://rickandmortyapi.com/api/location'
const EPISODE_URL = 'https://rickandmortyapi.com/api/episode'

type ListResult<TItem> = {
  results: TItem[]
  info: ApiInfo | null
}

type ApiListResponse<TItem> = {
  info: ApiInfo
  results: TItem[]
}

async function fetchList<TItem>(
  baseUrl: string,
  params: URLSearchParams,
  signal?: AbortSignal,
): Promise<ListResult<TItem>> {
  const response = await fetch(`${baseUrl}/?${params.toString()}`, { signal })

  if (response.status === 404) {
    return { results: [], info: null }
  }

  if (!response.ok) {
    throw new Error('The data could not be loaded.')
  }

  const data: ApiListResponse<TItem> = await response.json()
  return { results: data.results, info: data.info }
}

// One entry per filter. The API matches name, species and type as substrings,
// so they are sent as typed rather than filtered client-side.
const CHARACTER_QUERY_RULES: QueryParamRules<CharacterFilters> = {
  name: optionalText,
  // The union is named explicitly so the sentinel does not narrow the strategy
  // to the literal 'all'.
  status: omitWhen<StatusFilter>('all'),
  species: optionalText,
  gender: omitWhen<GenderFilter>('all'),
  type: optionalText,
}

// The V2 filters are optional so existing V1 callers (name + status) keep
// working untouched and produce an identical query.
type FetchCharactersOptions = Partial<CharacterFilters> & {
  name: string
  status: StatusFilter
  page: number
  signal?: AbortSignal
}

export function fetchCharacters({ page, signal, ...filters }: FetchCharactersOptions) {
  const params = buildQueryParams(
    { ...EMPTY_CHARACTER_FILTERS, ...filters },
    CHARACTER_QUERY_RULES,
  )

  params.set('page', String(page))

  return fetchList<Character>(CHARACTER_URL, params, signal)
}

type FetchLocationsOptions = {
  name: string
  page: number
  signal?: AbortSignal
}

export function fetchLocations({ name, page, signal }: FetchLocationsOptions) {
  const params = new URLSearchParams()

  if (name) {
    params.set('name', name)
  }

  params.set('page', String(page))

  return fetchList<Location>(LOCATION_URL, params, signal)
}

type FetchEpisodesOptions = {
  name: string
  season: number | null
  page: number
  signal?: AbortSignal
}

export function fetchEpisodes({ name, season, page, signal }: FetchEpisodesOptions) {
  const params = new URLSearchParams()

  if (name) {
    params.set('name', name)
  }

  if (season) {
    params.set('episode', `S${String(season).padStart(2, '0')}`)
  }

  params.set('page', String(page))

  return fetchList<Episode>(EPISODE_URL, params, signal)
}

// Only numeric ids are interpolated into the request path, so unexpected values
// from the API can never shape the URL we call.
function episodeIdFromUrl(url: string): string | null {
  const lastSegment = url.split('/').filter(Boolean).findLast(Boolean) ?? ''
  return /^\d+$/.test(lastSegment) ? lastSegment : null
}

export async function fetchEpisodesByUrls(
  episodeUrls: string[],
  signal?: AbortSignal,
): Promise<Episode[]> {
  const ids = episodeUrls
    .map(episodeIdFromUrl)
    .filter((id): id is string => id !== null)

  if (ids.length === 0) {
    return []
  }

  const response = await fetch(`${EPISODE_URL}/${ids.join(',')}`, { signal })

  if (!response.ok) {
    throw new Error('The data could not be loaded.')
  }

  const data: Episode | Episode[] = await response.json()
  return Array.isArray(data) ? data : [data]
}
