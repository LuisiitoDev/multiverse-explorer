using Favorites.Api.Application.Abstractions;
using Favorites.Api.Domain.Models;
using Favorites.Api.Infraestructure.Persistence;
using Microsoft.EntityFrameworkCore;

namespace Favorites.Api.Infraestructure.Repositories;

public class UserRepository(FavoritesDbContext context) : IUserRepository
{
    public Task<bool> ExistsAsync(Guid userId, CancellationToken cancellationToken = default) =>
        context.Users.AnyAsync(u => u.Id == userId, cancellationToken);

    public Task<UserModel?> GetByIdAsync(Guid userId, CancellationToken cancellationToken = default) =>
        context.Users.FirstOrDefaultAsync(u => u.Id == userId, cancellationToken);

    public Task<UserModel?> FindByEmailAsync(string email, CancellationToken cancellationToken = default) =>
        context.Users.FirstOrDefaultAsync(u => u.Email == email, cancellationToken);

    public async Task AddAsync(UserModel user, CancellationToken cancellationToken = default) =>
        await context.Users.AddAsync(user, cancellationToken);

    public Task SaveChangesAsync(CancellationToken cancellationToken = default) =>
        context.SaveChangesAsync(cancellationToken);
}
