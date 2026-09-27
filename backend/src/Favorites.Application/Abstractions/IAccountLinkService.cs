using Favorites.Application.Common;
using Favorites.Application.DTOs;
using Favorites.Domain;

namespace Favorites.Application.Abstractions;

public interface IAccountLinkService
{
    Task<Result<IReadOnlyList<ExternalLoginResponse>>> GetLoginsAsync(Guid userId, CancellationToken cancellationToken = default);

    Task<Result<bool>> LinkAsync(Guid userId, ExternalIdentity identity, CancellationToken cancellationToken = default);

    Task<Result<bool>> UnlinkAsync(Guid userId, string provider, CancellationToken cancellationToken = default);
}
