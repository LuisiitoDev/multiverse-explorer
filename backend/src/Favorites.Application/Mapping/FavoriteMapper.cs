using Favorites.Application.DTOs;
using Favorites.Domain.Models;

namespace Favorites.Application.Mapping;

public static class FavoriteMapper
{
    public static FavoriteResponse ToResponse(this FavoriteModel favorite) =>
        new(favorite.Id, favorite.UserId, favorite.ResourceType, favorite.ResourceId, favorite.CreateAt);
}
