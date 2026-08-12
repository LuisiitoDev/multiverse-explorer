using System.Security.Claims;
using Favorites.Api.Domain;
using Favorites.Api.Domain.Models;

namespace Favorites.Api.Infraestructure.Authentication;

public static class ClaimsPrincipalExtensions
{
    public static ClaimsPrincipal CreateApplicationPrincipal(Guid userId, string displayName, string email)
    {
        var identity = new ClaimsIdentity(
            [
                new Claim(ClaimTypes.NameIdentifier, userId.ToString()),
                new Claim(ClaimTypes.Name, displayName),
                new Claim(ClaimTypes.Email, email)
            ],
            AuthSchemes.Application);

        return new ClaimsPrincipal(identity);
    }

    public static ClaimsPrincipal ToApplicationPrincipal(this UserModel user) =>
        CreateApplicationPrincipal(user.Id, user.DisplayName, user.Email);

    public static Guid? GetUserId(this ClaimsPrincipal principal) =>
        Guid.TryParse(principal.FindFirstValue(ClaimTypes.NameIdentifier), out var id) ? id : null;

    public static ExternalIdentity? ToExternalIdentity(this ClaimsPrincipal principal, ExternalProvider provider)
    {
        var providerUserId = principal.FindFirstValue(ClaimTypes.NameIdentifier);

        if (string.IsNullOrWhiteSpace(providerUserId))
        {
            return null;
        }

        var email = principal.FindFirstValue(ClaimTypes.Email);
        var emailVerified = principal.FindFirstValue("email_verified") is { } claim
            ? bool.TryParse(claim, out var parsed) && parsed
            : provider.TrustEmail;

        return new ExternalIdentity(
            provider.Name,
            providerUserId,
            email,
            principal.FindFirstValue(ClaimTypes.Name) ?? principal.FindFirstValue(ClaimTypes.GivenName),
            emailVerified && !string.IsNullOrWhiteSpace(email));
    }
}
