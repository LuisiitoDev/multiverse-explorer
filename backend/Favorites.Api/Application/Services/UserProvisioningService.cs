using Favorites.Api.Application.Abstractions;
using Favorites.Api.Application.Common;
using Favorites.Api.Domain;
using Favorites.Api.Domain.Models;

namespace Favorites.Api.Application.Services;

public class UserProvisioningService(IUserRepository users, IExternalLoginRepository logins) : IUserProvisioningService
{
    public async Task<Result<UserModel>> ResolveAsync(ExternalIdentity identity, CancellationToken cancellationToken = default)
    {
        if (string.IsNullOrWhiteSpace(identity.ProviderUserId))
        {
            return Result<UserModel>.Failure(Error.Validation("The provider did not return a stable user identifier."));
        }

        var existing = await logins.FindUserByLoginAsync(identity.Provider, identity.ProviderUserId, cancellationToken);
        if (existing is not null)
        {
            return Result<UserModel>.Success(existing);
        }

        if (!string.IsNullOrWhiteSpace(identity.Email))
        {
            var byEmail = await users.FindByEmailAsync(identity.Email, cancellationToken);

            if (byEmail is not null)
            {
                // Linking on an unverified email would let anyone claiming that address take over the account.
                if (!identity.EmailVerified)
                {
                    return Result<UserModel>.Failure(Error.Conflict(
                        "An account already exists for this email. Sign in with your original provider and link this one from your account settings."));
                }

                return await LinkAsync(byEmail, identity, cancellationToken);
            }
        }

        var user = new UserModel
        {
            Id = Guid.NewGuid(),
            DisplayName = identity.DisplayName ?? identity.Email ?? "User",
            Email = identity.Email ?? string.Empty,
            CreateAt = DateTime.UtcNow
        };

        await users.AddAsync(user, cancellationToken);

        var linked = await LinkAsync(user, identity, cancellationToken);
        if (linked.IsSuccess || string.IsNullOrWhiteSpace(identity.Email))
        {
            return linked;
        }

        // A concurrent first login for the same email via a different provider won the race
        // against the Users.Email unique index. Re-resolve now that it has committed.
        var winnerByEmail = await users.FindByEmailAsync(identity.Email, cancellationToken);
        if (winnerByEmail is null)
        {
            return linked;
        }

        return identity.EmailVerified
            ? await LinkAsync(winnerByEmail, identity, cancellationToken)
            : Result<UserModel>.Failure(Error.Conflict(
                "An account already exists for this email. Sign in with your original provider and link this one from your account settings."));
    }

    private async Task<Result<UserModel>> LinkAsync(UserModel user, ExternalIdentity identity, CancellationToken cancellationToken)
    {
        var added = await logins.TryAddAsync(
            new ExternalLoginModel
            {
                UserId = user.Id,
                Provider = identity.Provider,
                ProviderUserId = identity.ProviderUserId,
                CreateAt = DateTime.UtcNow
            },
            cancellationToken);

        if (added)
        {
            return Result<UserModel>.Success(user);
        }

        // A concurrent request won the race; adopt the identity it created.
        var winner = await logins.FindUserByLoginAsync(identity.Provider, identity.ProviderUserId, cancellationToken);

        return winner is not null
            ? Result<UserModel>.Success(winner)
            : Result<UserModel>.Failure(Error.Conflict("Could not complete sign-in. Please try again."));
    }
}
