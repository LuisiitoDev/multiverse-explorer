namespace Favorites.Api.Infraestructure.Authentication;

public class ExternalProviderSettings
{
    public const string SectionName = "Authentication:Providers";

    public string Name { get; set; } = string.Empty;
    public string DisplayName { get; set; } = string.Empty;
    public string Scheme { get; set; } = string.Empty;
    public bool Enabled { get; set; } = true;

    /// <summary>Opt-in: treat this provider's email as verified when it emits no email_verified claim.</summary>
    public bool TrustEmail { get; set; }
}
