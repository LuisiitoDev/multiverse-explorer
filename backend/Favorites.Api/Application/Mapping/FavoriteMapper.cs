using Favorites.Api.Application.DTOs;
using Favorites.Api.Domain.Models;

namespace Favorites.Api.Application.Mapping;

public static class FavoriteMapper
{
    public static FavoriteResponse ToResponse(this FavoriteModel favorite) =>
        new(favorite.Id, favorite.UserId, favorite.ResourceType, favorite.ResourceId, favorite.CreateAt);
}
