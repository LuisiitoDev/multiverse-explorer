using Favorites.Api.Application.Common;
using Favorites.Api.Application.DTOs;
using Favorites.Api.Domain;

namespace Favorites.Api.Application.Abstractions;

public interface IAccountLinkService
{
    Task<Result<IReadOnlyList<ExternalLoginResponse>>> GetLoginsAsync(Guid userId, CancellationToken cancellationToken = default);

    Task<Result<bool>> LinkAsync(Guid userId, ExternalIdentity identity, CancellationToken cancellationToken = default);

    Task<Result<bool>> UnlinkAsync(Guid userId, string provider, CancellationToken cancellationToken = default);
}
