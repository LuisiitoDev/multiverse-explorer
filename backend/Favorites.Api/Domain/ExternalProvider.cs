namespace Favorites.Api.Domain;

/// <summary>A supported external identity provider. <paramref name="Scheme"/> is the ASP.NET Core authentication scheme.</summary>
/// <param name="TrustEmail">Whether emails from this provider count as verified when it emits no email_verified claim.</param>
public record ExternalProvider(string Name, string DisplayName, string Scheme, bool TrustEmail);
