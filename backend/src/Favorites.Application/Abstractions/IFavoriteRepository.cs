using Favorites.Domain.Models;

namespace Favorites.Application.Abstractions;

public interface IFavoriteRepository
{
    Task<IReadOnlyList<FavoriteModel>> GetByUserAsync(Guid userId, string? resourceType, CancellationToken cancellationToken = default);

    Task<FavoriteModel?> GetAsync(long id, Guid userId, CancellationToken cancellationToken = default);

    Task<bool> ExistsAsync(Guid userId, string resourceType, int resourceId, CancellationToken cancellationToken = default);

    Task AddAsync(FavoriteModel favorite, CancellationToken cancellationToken = default);

    void Remove(FavoriteModel favorite);

    Task SaveChangesAsync(CancellationToken cancellationToken = default);
}
