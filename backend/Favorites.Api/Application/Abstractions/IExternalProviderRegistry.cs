using Favorites.Api.Domain;

namespace Favorites.Api.Application.Abstractions;

public interface IExternalProviderRegistry
{
    IReadOnlyList<ExternalProvider> GetAll();

    ExternalProvider? Find(string? name);

    bool IsSupported(string? name);
}
