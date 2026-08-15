namespace Favorites.Api.Application.DTOs;

/// <summary>Client-supplied body. The user is taken from the session, never from the request.</summary>
public record CreateFavoriteRequest(string ResourceType, int ResourceId);

public record CreateFavoriteCommand(Guid UserId, string ResourceType, int ResourceId);

public record GetFavoritesQuery(Guid UserId, string? Type);

public record DeleteFavoriteCommand(long Id, Guid UserId);

public record FavoriteResponse(long Id, Guid UserId, string ResourceType, int ResourceId, DateTime CreateAt);
