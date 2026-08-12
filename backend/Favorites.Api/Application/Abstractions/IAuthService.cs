using Favorites.Api.Application.Common;
using Favorites.Api.Application.DTOs;

namespace Favorites.Api.Application.Abstractions;

public interface IAuthService
{
    IReadOnlyList<ExternalProviderResponse> GetProviders();

    Task<Result<UserResponse>> GetCurrentUserAsync(Guid userId, CancellationToken cancellationToken = default);
}
