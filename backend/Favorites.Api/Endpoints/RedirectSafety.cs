namespace Favorites.Api.Endpoints;

internal static class RedirectSafety
{
    /// <summary>Only same-site relative paths are allowed, otherwise the endpoint becomes an open redirect.</summary>
    public static string SafeReturnUrl(string? returnUrl, string fallback) =>
        !string.IsNullOrWhiteSpace(returnUrl)
        && returnUrl.StartsWith('/')
        && !returnUrl.StartsWith("//")
        && !returnUrl.StartsWith("/\\")
            ? returnUrl
            : fallback;
}
