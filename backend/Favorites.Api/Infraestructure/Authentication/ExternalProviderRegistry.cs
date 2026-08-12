using Favorites.Api.Application.Abstractions;
using Favorites.Api.Domain;
using Microsoft.Extensions.Options;

namespace Favorites.Api.Infraestructure.Authentication;

public class ExternalProviderRegistry : IExternalProviderRegistry
{
    private readonly IReadOnlyDictionary<string, ExternalProvider> _providers;

    public ExternalProviderRegistry(IOptions<List<ExternalProviderSettings>> options)
    {
        _providers = options.Value
            .Where(p => p.Enabled && !string.IsNullOrWhiteSpace(p.Name))
            .ToDictionary(
                p => p.Name.ToLowerInvariant(),
                p => new ExternalProvider(
                    p.Name.ToLowerInvariant(),
                    string.IsNullOrWhiteSpace(p.DisplayName) ? p.Name : p.DisplayName,
                    p.Scheme,
                    p.TrustEmail),
                StringComparer.OrdinalIgnoreCase);
    }

    public IReadOnlyList<ExternalProvider> GetAll() => _providers.Values.ToList();

    public ExternalProvider? Find(string? name) =>
        !string.IsNullOrWhiteSpace(name) && _providers.TryGetValue(name, out var provider) ? provider : null;

    public bool IsSupported(string? name) => Find(name) is not null;
}
