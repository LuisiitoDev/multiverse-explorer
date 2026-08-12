using Favorites.Api.Application.Abstractions;
using Favorites.Api.Domain.Models;
using Favorites.Api.Infraestructure.Persistence;
using Microsoft.EntityFrameworkCore;

namespace Favorites.Api.Infraestructure.Repositories;

public class FavoriteRepository(FavoritesDbContext context) : IFavoriteRepository
{
    public async Task<IReadOnlyList<FavoriteModel>> GetByUserAsync(Guid userId, string? resourceType, CancellationToken cancellationToken = default)
    {
        var query = context.Favorites
            .AsNoTracking()
            .Where(f => f.UserId == userId);

        if (!string.IsNullOrWhiteSpace(resourceType))
        {
            query = query.Where(f => f.ResourceType == resourceType);
        }

        return await query
            .OrderByDescending(f => f.CreateAt)
            .ToListAsync(cancellationToken);
    }

    public Task<FavoriteModel?> GetAsync(long id, Guid userId, CancellationToken cancellationToken = default) =>
        context.Favorites.FirstOrDefaultAsync(f => f.Id == id && f.UserId == userId, cancellationToken);

    public Task<bool> ExistsAsync(Guid userId, string resourceType, int resourceId, CancellationToken cancellationToken = default) =>
        context.Favorites.AnyAsync(
            f => f.UserId == userId && f.ResourceType == resourceType && f.ResourceId == resourceId,
            cancellationToken);

    public async Task AddAsync(FavoriteModel favorite, CancellationToken cancellationToken = default) =>
        await context.Favorites.AddAsync(favorite, cancellationToken);

    public void Remove(FavoriteModel favorite) => context.Favorites.Remove(favorite);

    public Task SaveChangesAsync(CancellationToken cancellationToken = default) =>
        context.SaveChangesAsync(cancellationToken);
}
