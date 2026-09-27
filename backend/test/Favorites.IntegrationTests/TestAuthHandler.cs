using System.Security.Claims;
using System.Text.Encodings.Web;
using Favorites.Api.Authentication;
using Microsoft.AspNetCore.Authentication;
using Microsoft.Extensions.Logging;
using Microsoft.Extensions.Options;

namespace Favorites.IntegrationTests;

/// <summary>Stands in for the OAuth + session-cookie flow: the caller picks the principal through a request header.</summary>
public class TestAuthHandler(IOptionsMonitor<AuthenticationSchemeOptions> options, ILoggerFactory logger, UrlEncoder encoder)
    : AuthenticationHandler<AuthenticationSchemeOptions>(options, logger, encoder)
{
    public const string SchemeName = "Test";
    public const string UserHeader = "X-Test-User";

    /// <summary>Header value for a signed-in principal that carries no internal user id.</summary>
    public const string WithoutUserId = "no-user-id";

    protected override Task<AuthenticateResult> HandleAuthenticateAsync()
    {
        if (!Request.Headers.TryGetValue(UserHeader, out var value))
        {
            return Task.FromResult(AuthenticateResult.NoResult());
        }

        var principal = Guid.TryParse(value, out var userId)
            ? ClaimsPrincipalExtensions.CreateApplicationPrincipal(userId, "Rick Sanchez", "rick@example.com")
            : new ClaimsPrincipal(new ClaimsIdentity([new Claim(ClaimTypes.Name, "Nobody")], SchemeName));

        return Task.FromResult(AuthenticateResult.Success(new AuthenticationTicket(principal, SchemeName)));
    }
}
