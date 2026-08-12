namespace Favorites.Api.Domain;

public static class ResourceTypes
{
    public const string Character = "character";
    public const string Episode = "episode";
    public const string Location = "location";

    private static readonly HashSet<string> Allowed =
        new(StringComparer.OrdinalIgnoreCase) { Character, Episode, Location };

    public static bool IsValid(string? value) => value is not null && Allowed.Contains(value);

    public static string Normalize(string value) => value.ToLowerInvariant();
}
