using Favorites.Application.Common;
using Favorites.Domain;
using Favorites.Domain.Models;

namespace Favorites.Application.Abstractions;

public interface IUserProvisioningService
{
    /// <summary>Resolves an external identity to an internal user, creating or linking as policy allows.</summary>
    Task<Result<UserModel>> ResolveAsync(ExternalIdentity identity, CancellationToken cancellationToken = default);
}
