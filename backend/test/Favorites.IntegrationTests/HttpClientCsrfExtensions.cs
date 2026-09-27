using Favorites.Api.Authentication;

namespace Favorites.IntegrationTests;

public static class HttpClientCsrfExtensions
{
    /// <summary>Does what the SPA does: a GET under /api issues the token cookie, which is echoed back in the header.</summary>
    public static async Task AttachCsrfTokenAsync(this HttpClient client)
    {
        using var response = await client.GetAsync("/api/auth/providers");

        var token = response.Headers.GetValues("Set-Cookie")
            .Select(c => c.Split(';')[0])
            .Single(c => c.StartsWith($"{AntiforgerySetup.CookieName}="))
            [(AntiforgerySetup.CookieName.Length + 1)..];

        client.DefaultRequestHeaders.Remove(AntiforgerySetup.HeaderName);
        client.DefaultRequestHeaders.Add(AntiforgerySetup.HeaderName, token);
    }
}
