namespace Favorites.Api.Infraestructure.Authentication;

public class AuthAppOptions
{
    public const string SectionName = "Authentication:App";

    /// <summary>Absolute base URL of the React app; used to validate and build post-login redirects.</summary>
    public string FrontendBaseUrl { get; set; } = "/";

    public int SessionDays { get; set; } = 14;
}
