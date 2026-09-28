using System.Net;
using System.Net.Http.Json;
using Favorites.Api.Contracts;
using Favorites.Application.DTOs;

namespace Favorites.IntegrationTests;

public class FavoriteEndpointsTests(FavoritesApiFactory factory) : IClassFixture<FavoritesApiFactory>
{
    private async Task<(HttpClient Client, Guid UserId)> SignedInClientAsync()
    {
        var userId = await factory.SeedUserAsync();
        var client = factory.CreateClientFor(userId.ToString());
        await client.AttachCsrfTokenAsync();
        return (client, userId);
    }

    [Fact]
    public async Task CreateListDelete_RoundTrips()
    {
        var (client, userId) = await SignedInClientAsync();

        var created = await client.PostAsJsonAsync("/api/favorites/", new CreateFavoriteRequest("Character", 1));
        Assert.Equal(HttpStatusCode.Created, created.StatusCode);
        var favorite = await created.Content.ReadFromJsonAsync<FavoriteResponse>();
        Assert.Equal(userId, favorite!.UserId);
        Assert.Equal("character", favorite.ResourceType);
        Assert.Equal($"/api/favorites/{favorite.Id}", created.Headers.Location!.OriginalString);

        var listed = await client.GetFromJsonAsync<List<FavoriteResponse>>("/api/favorites/?type=character");
        Assert.Equal([favorite.Id], listed!.Select(f => f.Id));

        var deleted = await client.DeleteAsync($"/api/favorites/{favorite.Id}");
        Assert.Equal(HttpStatusCode.NoContent, deleted.StatusCode);

        Assert.Empty((await client.GetFromJsonAsync<List<FavoriteResponse>>("/api/favorites/"))!);
    }

    [Fact]
    public async Task Create_WithoutCsrfHeader_ReturnsBadRequest()
    {
        var (client, _) = await SignedInClientAsync();
        client.DefaultRequestHeaders.Remove("X-CSRF-TOKEN");

        var response = await client.PostAsJsonAsync("/api/favorites/", new CreateFavoriteRequest("character", 1));

        Assert.Equal(HttpStatusCode.BadRequest, response.StatusCode);
    }

    [Fact]
    public async Task Create_WithUnknownResourceType_ReturnsBadRequest()
    {
        var (client, _) = await SignedInClientAsync();

        var response = await client.PostAsJsonAsync("/api/favorites/", new CreateFavoriteRequest("planet", 1));

        Assert.Equal(HttpStatusCode.BadRequest, response.StatusCode);
    }

    [Fact]
    public async Task Create_Duplicate_ReturnsConflict()
    {
        var (client, _) = await SignedInClientAsync();
        await client.PostAsJsonAsync("/api/favorites/", new CreateFavoriteRequest("episode", 7));

        var response = await client.PostAsJsonAsync("/api/favorites/", new CreateFavoriteRequest("episode", 7));

        Assert.Equal(HttpStatusCode.Conflict, response.StatusCode);
    }

    [Fact]
    public async Task Delete_AnotherUsersFavorite_ReturnsNotFound()
    {
        var (owner, _) = await SignedInClientAsync();
        var created = await owner.PostAsJsonAsync("/api/favorites/", new CreateFavoriteRequest("location", 3));
        var favorite = await created.Content.ReadFromJsonAsync<FavoriteResponse>();
        var (intruder, _) = await SignedInClientAsync();

        var response = await intruder.DeleteAsync($"/api/favorites/{favorite!.Id}");

        Assert.Equal(HttpStatusCode.NotFound, response.StatusCode);
    }

    [Fact]
    public async Task Me_ReturnsSignedInUser()
    {
        var (client, userId) = await SignedInClientAsync();

        var me = await client.GetFromJsonAsync<UserResponse>("/api/auth/me");

        Assert.Equal(userId, me!.Id);
    }
}
