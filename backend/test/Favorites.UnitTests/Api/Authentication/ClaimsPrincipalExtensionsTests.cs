using System.Security.Claims;
using Favorites.Domain.Models;
using Favorites.Api.Authentication;

namespace Favorites.UnitTests.Api.Authentication;

public class ClaimsPrincipalExtensionsTests
{
    [Fact]
    public void GetUserId_WithValidNameIdentifierClaim_ReturnsParsedGuid()
    {
        var userId = Guid.NewGuid();
        var principal = ClaimsPrincipalExtensions.CreateApplicationPrincipal(userId, "Rick Sanchez", "rick@example.com");

        Assert.Equal(userId, principal.GetUserId());
    }

    [Fact]
    public void GetUserId_WithoutNameIdentifierClaim_ReturnsNull()
    {
        var principal = new ClaimsPrincipal(new ClaimsIdentity());

        Assert.Null(principal.GetUserId());
    }

    [Fact]
    public void GetUserId_WithNonGuidNameIdentifierClaim_ReturnsNull()
    {
        var identity = new ClaimsIdentity([new Claim(ClaimTypes.NameIdentifier, "not-a-guid")]);
        var principal = new ClaimsPrincipal(identity);

        Assert.Null(principal.GetUserId());
    }

    [Fact]
    public void GetRequiredUserId_WithValidNameIdentifierClaim_ReturnsParsedGuid()
    {
        var userId = Guid.NewGuid();
        var principal = ClaimsPrincipalExtensions.CreateApplicationPrincipal(userId, "Rick Sanchez", "rick@example.com");

        Assert.Equal(userId, principal.GetRequiredUserId());
    }

    [Fact]
    public void GetRequiredUserId_WithoutNameIdentifierClaim_Throws()
    {
        var principal = new ClaimsPrincipal(new ClaimsIdentity());

        Assert.Throws<InvalidOperationException>(() => principal.GetRequiredUserId());
    }

    [Fact]
    public void CreateApplicationPrincipal_SetsExpectedClaimsAndAuthenticationType()
    {
        var userId = Guid.NewGuid();

        var principal = ClaimsPrincipalExtensions.CreateApplicationPrincipal(userId, "Rick Sanchez", "rick@example.com");

        Assert.Equal(AuthSchemes.Application, principal.Identity!.AuthenticationType);
        Assert.Equal(userId.ToString(), principal.FindFirstValue(ClaimTypes.NameIdentifier));
        Assert.Equal("Rick Sanchez", principal.FindFirstValue(ClaimTypes.Name));
        Assert.Equal("rick@example.com", principal.FindFirstValue(ClaimTypes.Email));
    }

    [Fact]
    public void ToApplicationPrincipal_DelegatesToCreateApplicationPrincipal()
    {
        var user = new UserModel
        {
            Id = Guid.NewGuid(),
            DisplayName = "Morty Smith",
            Email = "morty@example.com"
        };

        var principal = user.ToApplicationPrincipal();

        Assert.Equal(user.Id, principal.GetUserId());
        Assert.Equal(user.DisplayName, principal.FindFirstValue(ClaimTypes.Name));
        Assert.Equal(user.Email, principal.FindFirstValue(ClaimTypes.Email));
    }
}
