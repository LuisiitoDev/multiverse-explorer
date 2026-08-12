namespace Favorites.Api.Domain;

/// <summary>An identity asserted by an external provider. <paramref name="ProviderUserId"/> is the provider's stable subject, never the email.</summary>
public record ExternalIdentity(
    string Provider,
    string ProviderUserId,
    string? Email,
    string? DisplayName,
    bool EmailVerified);
