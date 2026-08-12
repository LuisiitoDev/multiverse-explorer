namespace Favorites.Api.Infraestructure.Authentication;

public static class AuthSchemes
{
    /// <summary>Long-lived application session cookie holding the internal user id.</summary>
    public const string Application = "Favorites.Application";

    /// <summary>Short-lived cookie holding the provider result between challenge and callback.</summary>
    public const string External = "Favorites.External";
}
