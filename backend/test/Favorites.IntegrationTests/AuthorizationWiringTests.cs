using System.Net;
using System.Net.Http.Json;
using Favorites.Api.Contracts;

namespace Favorites.IntegrationTests;

/// <summary>Guards the endpoint conventions: every per-user route must be behind authorization and the user-id filter.</summary>
public class AuthorizationWiringTests(FavoritesApiFactory factory) : IClassFixture<FavoritesApiFactory>
{
    public static TheoryData<string, string> PerUserRoutes => new()
    {
        { "GET", "/api/favorites/" },
        { "POST", "/api/favorites/" },
        { "DELETE", "/api/favorites/1" },
        { "GET", "/api/auth/me" },
        { "POST", "/api/auth/refresh" },
        { "GET", "/api/auth/logins" },
        { "GET", "/api/auth/link/google/callback" },
        { "DELETE", "/api/auth/link/google" }
    };

    // A well-formed body, so a 401 can only come from auth: body binding runs before endpoint filters.
    private static HttpRequestMessage Request(string method, string url) => new(new HttpMethod(method), url)
    {
        Content = method == "POST" ? JsonContent.Create(new CreateFavoriteRequest("character", 1)) : null
    };

    [Fact]
    public async Task Providers_IsAnonymous()
    {
        var client = factory.CreateClient(new() { BaseAddress = new Uri("https://localhost") });

        var response = await client.GetAsync("/api/auth/providers");

        Assert.Equal(HttpStatusCode.OK, response.StatusCode);
    }

    [Theory]
    [MemberData(nameof(PerUserRoutes))]
    public async Task PerUserRoute_WhenAnonymous_ReturnsUnauthorized(string method, string url)
    {
        var client = factory.CreateClient(new() { BaseAddress = new Uri("https://localhost") });

        var response = await client.SendAsync(Request(method, url));

        Assert.Equal(HttpStatusCode.Unauthorized, response.StatusCode);
    }

    [Theory]
    [MemberData(nameof(PerUserRoutes))]
    public async Task PerUserRoute_WhenSignedInWithoutUserId_ReturnsUnauthorized(string method, string url)
    {
        var client = factory.CreateClientFor(TestAuthHandler.WithoutUserId);

        var response = await client.SendAsync(Request(method, url));

        Assert.Equal(HttpStatusCode.Unauthorized, response.StatusCode);
    }
}
