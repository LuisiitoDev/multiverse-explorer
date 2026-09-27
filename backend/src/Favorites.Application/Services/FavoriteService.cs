using Favorites.Application.Abstractions;
using Favorites.Application.Common;
using Favorites.Application.DTOs;
using Favorites.Application.Mapping;
using Favorites.Domain;
using Favorites.Domain.Models;

namespace Favorites.Application.Services;

public class FavoriteService(IFavoriteRepository favorites, IUserRepository users, IValidationService validation, TimeProvider clock) : IFavoriteService
{
    public async Task<Result<IReadOnlyList<FavoriteResponse>>> GetAsync(GetFavoritesQuery query, CancellationToken cancellationToken = default)
    {
        var error = await validation.ValidateAsync(query, cancellationToken);
        if (error is not null)
        {
            return Result<IReadOnlyList<FavoriteResponse>>.Failure(error);
        }

        var resourceType = string.IsNullOrWhiteSpace(query.Type) ? null : ResourceTypes.Normalize(query.Type);
        var items = await favorites.GetByUserAsync(query.UserId, resourceType, cancellationToken);

        return Result<IReadOnlyList<FavoriteResponse>>.Success(
            [.. items.Select(f => f.ToResponse())]);
    }

    public async Task<Result<FavoriteResponse>> CreateAsync(CreateFavoriteCommand command, CancellationToken cancellationToken = default)
    {
        var error = await validation.ValidateAsync(command, cancellationToken);
        if (error is not null)
        {
            return Result<FavoriteResponse>.Failure(error);
        }

        if (!await users.ExistsAsync(command.UserId, cancellationToken))
        {
            return Result<FavoriteResponse>.Failure(Error.NotFound($"User '{command.UserId}' was not found."));
        }

        var resourceType = ResourceTypes.Normalize(command.ResourceType);

        if (await favorites.ExistsAsync(command.UserId, resourceType, command.ResourceId, cancellationToken))
        {
            return Result<FavoriteResponse>.Failure(Error.Conflict("The resource is already in the user's favorites."));
        }

        var favorite = new FavoriteModel
        {
            UserId = command.UserId,
            ResourceType = resourceType,
            ResourceId = command.ResourceId,
            CreateAt = clock.GetUtcNow().UtcDateTime
        };

        await favorites.AddAsync(favorite, cancellationToken);
        await favorites.SaveChangesAsync(cancellationToken);

        return Result<FavoriteResponse>.Success(favorite.ToResponse());
    }

    public async Task<Result<bool>> DeleteAsync(DeleteFavoriteCommand command, CancellationToken cancellationToken = default)
    {
        var error = await validation.ValidateAsync(command, cancellationToken);
        if (error is not null)
        {
            return Result<bool>.Failure(error);
        }

        var favorite = await favorites.GetAsync(command.Id, command.UserId, cancellationToken);

        if (favorite is null)
        {
            return Result<bool>.Failure(Error.NotFound($"Favorite '{command.Id}' was not found."));
        }

        favorites.Remove(favorite);
        await favorites.SaveChangesAsync(cancellationToken);

        return Result<bool>.Success(true);
    }
}
