using Favorites.Api.Application.Abstractions;
using Favorites.Api.Application.Common;
using Favorites.Api.Application.DTOs;
using Favorites.Api.Application.Mapping;
using Favorites.Api.Domain;
using Favorites.Api.Domain.Models;

namespace Favorites.Api.Application.Services;

public class FavoriteService(IFavoriteRepository favorites, IUserRepository users, IValidationService validation) : IFavoriteService
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

    public async Task<Result<FavoriteResponse>> CreateAsync(CreateFavoriteRequest request, CancellationToken cancellationToken = default)
    {
        var error = await validation.ValidateAsync(request, cancellationToken);
        if (error is not null)
        {
            return Result<FavoriteResponse>.Failure(error);
        }

        if (!await users.ExistsAsync(request.UserId, cancellationToken))
        {
            return Result<FavoriteResponse>.Failure(Error.NotFound($"User '{request.UserId}' was not found."));
        }

        var resourceType = ResourceTypes.Normalize(request.ResourceType);

        if (await favorites.ExistsAsync(request.UserId, resourceType, request.ResourceId, cancellationToken))
        {
            return Result<FavoriteResponse>.Failure(Error.Conflict("The resource is already in the user's favorites."));
        }

        var favorite = new FavoriteModel
        {
            UserId = request.UserId,
            ResourceType = resourceType,
            ResourceId = request.ResourceId,
            CreateAt = DateTime.UtcNow
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
