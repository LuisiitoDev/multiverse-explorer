using Favorites.Application.Common;
using Favorites.Application.DTOs;

namespace Favorites.Application.Abstractions;

public interface IAuthService
{
    IReadOnlyList<ExternalProviderResponse> GetProviders();

    Task<Result<UserResponse>> GetCurrentUserAsync(Guid userId, CancellationToken cancellationToken = default);
}
