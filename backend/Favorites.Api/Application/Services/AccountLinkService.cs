using Favorites.Api.Application.Abstractions;
using Favorites.Api.Application.Common;
using Favorites.Api.Application.DTOs;
using Favorites.Api.Domain;
using Favorites.Api.Domain.Models;

namespace Favorites.Api.Application.Services;

public class AccountLinkService(
    IExternalLoginRepository logins,
    IExternalProviderRegistry providers) : IAccountLinkService
{
    public async Task<Result<IReadOnlyList<ExternalLoginResponse>>> GetLoginsAsync(Guid userId, CancellationToken cancellationToken = default)
    {
        var items = await logins.GetByUserAsync(userId, cancellationToken);

        return Result<IReadOnlyList<ExternalLoginResponse>>.Success(
            items.Select(l => new ExternalLoginResponse(
                l.Provider,
                providers.Find(l.Provider)?.DisplayName ?? l.Provider,
                l.CreateAt)).ToList());
    }

    public async Task<Result<bool>> LinkAsync(Guid userId, ExternalIdentity identity, CancellationToken cancellationToken = default)
    {
        if (!providers.IsSupported(identity.Provider))
        {
            return Result<bool>.Failure(Error.Validation($"Unsupported provider '{identity.Provider}'."));
        }

        if (await logins.IsLinkedToAnotherUserAsync(userId, identity.Provider, identity.ProviderUserId, cancellationToken))
        {
            return Result<bool>.Failure(Error.Conflict("This provider account is already linked to a different user."));
        }

        if (await logins.FindAsync(userId, identity.Provider, cancellationToken) is not null)
        {
            return Result<bool>.Failure(Error.Conflict($"'{identity.Provider}' is already linked to this account."));
        }

        var added = await logins.TryAddAsync(
            new ExternalLoginModel
            {
                UserId = userId,
                Provider = identity.Provider,
                ProviderUserId = identity.ProviderUserId,
                CreateAt = DateTime.UtcNow
            },
            cancellationToken);

        return added
            ? Result<bool>.Success(true)
            : Result<bool>.Failure(Error.Conflict("This provider account is already linked to a different user."));
    }

    public async Task<Result<bool>> UnlinkAsync(Guid userId, string provider, CancellationToken cancellationToken = default)
    {
        if (!providers.IsSupported(provider))
        {
            return Result<bool>.Failure(Error.Validation($"Unsupported provider '{provider}'."));
        }

        var login = await logins.FindAsync(userId, provider, cancellationToken);
        if (login is null)
        {
            return Result<bool>.Failure(Error.NotFound($"'{provider}' is not linked to this account."));
        }

        if (await logins.CountByUserAsync(userId, cancellationToken) <= 1)
        {
            return Result<bool>.Failure(Error.Conflict(
                "This is your only sign-in method. Link another provider before removing it."));
        }

        await logins.RemoveAsync(login, cancellationToken);

        return Result<bool>.Success(true);
    }
}
