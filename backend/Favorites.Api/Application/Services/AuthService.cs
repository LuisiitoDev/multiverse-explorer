using Favorites.Api.Application.Abstractions;
using Favorites.Api.Application.Common;
using Favorites.Api.Application.DTOs;

namespace Favorites.Api.Application.Services;

public class AuthService(IExternalProviderRegistry providers, IUserRepository users) : IAuthService
{
    public IReadOnlyList<ExternalProviderResponse> GetProviders() =>
        providers.GetAll()
            .Select(p => new ExternalProviderResponse(p.Name, p.DisplayName))
            .ToList();

    public async Task<Result<UserResponse>> GetCurrentUserAsync(Guid userId, CancellationToken cancellationToken = default)
    {
        var user = await users.GetByIdAsync(userId, cancellationToken);

        return user is null
            ? Result<UserResponse>.Failure(Error.NotFound("User was not found."))
            : Result<UserResponse>.Success(new UserResponse(user.Id, user.DisplayName, user.Email, user.CreateAt));
    }
}
