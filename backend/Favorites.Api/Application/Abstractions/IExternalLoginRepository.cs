using Favorites.Api.Domain.Models;

namespace Favorites.Api.Application.Abstractions;

public interface IExternalLoginRepository
{
    Task<UserModel?> FindUserByLoginAsync(string provider, string providerUserId, CancellationToken cancellationToken = default);

    Task<IReadOnlyList<ExternalLoginModel>> GetByUserAsync(Guid userId, CancellationToken cancellationToken = default);

    Task<ExternalLoginModel?> FindAsync(Guid userId, string provider, CancellationToken cancellationToken = default);

    Task<bool> IsLinkedToAnotherUserAsync(Guid userId, string provider, string providerUserId, CancellationToken cancellationToken = default);

    Task<int> CountByUserAsync(Guid userId, CancellationToken cancellationToken = default);

    /// <summary>Persists the login and any other pending changes. Returns false when the unique (Provider, ProviderUserId) index rejects it.</summary>
    Task<bool> TryAddAsync(ExternalLoginModel login, CancellationToken cancellationToken = default);

    Task RemoveAsync(ExternalLoginModel login, CancellationToken cancellationToken = default);
}
