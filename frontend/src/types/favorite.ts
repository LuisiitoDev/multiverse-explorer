export type FavoriteResourceType = 'character' | 'episode' | 'location'

export type Favorite = {
  id: number
  resourceType: FavoriteResourceType
  resourceId: number
  createAt: string
}
