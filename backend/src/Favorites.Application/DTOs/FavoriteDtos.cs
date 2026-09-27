namespace Favorites.Application.DTOs;

public record CreateFavoriteCommand(Guid UserId, string ResourceType, int ResourceId);

public record GetFavoritesQuery(Guid UserId, string? Type);

public record DeleteFavoriteCommand(long Id, Guid UserId);

public record FavoriteResponse(long Id, Guid UserId, string ResourceType, int ResourceId, DateTime CreateAt);
