using Favorites.Api.Domain.Models;

namespace Favorites.Api.Application.Abstractions;

public interface IUserRepository
{
    Task<bool> ExistsAsync(Guid userId, CancellationToken cancellationToken = default);

    Task<UserModel?> GetByIdAsync(Guid userId, CancellationToken cancellationToken = default);

    Task<UserModel?> FindByEmailAsync(string email, CancellationToken cancellationToken = default);

    Task AddAsync(UserModel user, CancellationToken cancellationToken = default);

    Task SaveChangesAsync(CancellationToken cancellationToken = default);
}
