using Favorites.Api.Application.Abstractions;
using Favorites.Api.Domain.Models;
using Favorites.Api.Infraestructure.Persistence;
using Microsoft.EntityFrameworkCore;

namespace Favorites.Api.Infraestructure.Repositories;

public class ExternalLoginRepository(FavoritesDbContext context) : IExternalLoginRepository
{
    public Task<UserModel?> FindUserByLoginAsync(string provider, string providerUserId, CancellationToken cancellationToken = default) =>
        context.ExternalLogins
            .Where(e => e.Provider == provider && e.ProviderUserId == providerUserId)
            .Select(e => e.User)
            .FirstOrDefaultAsync(cancellationToken);

    public async Task<IReadOnlyList<ExternalLoginModel>> GetByUserAsync(Guid userId, CancellationToken cancellationToken = default) =>
        await context.ExternalLogins
            .AsNoTracking()
            .Where(e => e.UserId == userId)
            .OrderBy(e => e.CreateAt)
            .ToListAsync(cancellationToken);

    public Task<ExternalLoginModel?> FindAsync(Guid userId, string provider, CancellationToken cancellationToken = default) =>
        context.ExternalLogins.FirstOrDefaultAsync(e => e.UserId == userId && e.Provider == provider, cancellationToken);

    public Task<bool> IsLinkedToAnotherUserAsync(Guid userId, string provider, string providerUserId, CancellationToken cancellationToken = default) =>
        context.ExternalLogins.AnyAsync(
            e => e.Provider == provider && e.ProviderUserId == providerUserId && e.UserId != userId,
            cancellationToken);

    public Task<int> CountByUserAsync(Guid userId, CancellationToken cancellationToken = default) =>
        context.ExternalLogins.CountAsync(e => e.UserId == userId, cancellationToken);

    public async Task<bool> TryAddAsync(ExternalLoginModel login, CancellationToken cancellationToken = default)
    {
        await context.ExternalLogins.AddAsync(login, cancellationToken);

        try
        {
            await context.SaveChangesAsync(cancellationToken);
            return true;
        }
        catch (DbUpdateException)
        {
            // Concurrent first login for the same provider identity lost the race against the unique index.
            context.ChangeTracker.Clear();
            return false;
        }
    }

    public async Task RemoveAsync(ExternalLoginModel login, CancellationToken cancellationToken = default)
    {
        context.ExternalLogins.Remove(login);
        await context.SaveChangesAsync(cancellationToken);
    }
}
