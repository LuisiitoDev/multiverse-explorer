using Favorites.Api.Application.Common;
using Favorites.Api.Domain;
using Favorites.Api.Domain.Models;

namespace Favorites.Api.Application.Abstractions;

public interface IUserProvisioningService
{
    /// <summary>Resolves an external identity to an internal user, creating or linking as policy allows.</summary>
    Task<Result<UserModel>> ResolveAsync(ExternalIdentity identity, CancellationToken cancellationToken = default);
}
