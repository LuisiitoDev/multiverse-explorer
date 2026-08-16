import { FaStar, FaRegStar } from 'react-icons/fa'
import { useFavorites } from '../context/FavoritesProvider'
import { googleLoginUrl } from '../services/authApi'
import type { FavoriteResourceType } from '../types/favorite'

type FavoriteButtonProps = Readonly<{
  resourceType: FavoriteResourceType
  resourceId: number
}>

function FavoriteButton({ resourceType, resourceId }: FavoriteButtonProps) {
  const { isAuthenticated, pendingKey, find, add, remove } = useFavorites()
  const favorite = find(resourceType, resourceId)
  const isPending = pendingKey === `${resourceType}:${resourceId}` || pendingKey === `id:${favorite?.id}`

  const handleClick = async () => {
    if (favorite) {
      await remove(favorite.id)
      return
    }

    await add(resourceType, resourceId).catch(() => undefined)
  }

  if (isAuthenticated === false) {
    return (
      <a className="favorite-action" href={googleLoginUrl(window.location.pathname)}>
        Sign in to save to My Multiverse
      </a>
    )
  }

  return (
    <button
      type="button"
      className="favorite-action"
      onClick={() => void handleClick()}
      disabled={isPending || isAuthenticated === null}
      aria-pressed={Boolean(favorite)}
      aria-label={favorite ? 'Remove from My Multiverse' : 'Add to My Multiverse'}
    >
      <>{favorite ? <FaStar aria-hidden="true" /> : <FaRegStar aria-hidden="true" />}</>{' '}
      {isPending ? 'Updating My Multiverse...' : favorite ? 'Saved to My Multiverse' : 'Add to My Multiverse'}
    </button>
  )
}

export default FavoriteButton
