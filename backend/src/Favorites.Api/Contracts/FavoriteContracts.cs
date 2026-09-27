namespace Favorites.Api.Contracts;

/// <summary>Client-supplied body. The user is taken from the session, never from the request.</summary>
public record CreateFavoriteRequest(string ResourceType, int ResourceId);
