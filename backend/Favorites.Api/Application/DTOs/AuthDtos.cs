namespace Favorites.Api.Application.DTOs;

public record ExternalProviderResponse(string Name, string DisplayName);

public record UserResponse(Guid Id, string DisplayName, string Email, DateTime CreateAt);

public record ExternalLoginResponse(string Provider, string DisplayName, DateTime CreateAt);

public record LinkStartResponse(string Url);
