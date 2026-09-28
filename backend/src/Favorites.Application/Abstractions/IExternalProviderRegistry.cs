using Favorites.Domain;

namespace Favorites.Application.Abstractions;

public interface IExternalProviderRegistry
{
    IReadOnlyList<ExternalProvider> GetAll();

    ExternalProvider? Find(string? name);

    bool IsSupported(string? name);
}
