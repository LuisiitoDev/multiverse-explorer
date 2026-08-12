using Favorites.Api.Application.Common;
using Favorites.Api.Application.DTOs;

namespace Favorites.Api.Application.Abstractions;

public interface IFavoriteService
{
    Task<Result<IReadOnlyList<FavoriteResponse>>> GetAsync(GetFavoritesQuery query, CancellationToken cancellationToken = default);

    Task<Result<FavoriteResponse>> CreateAsync(CreateFavoriteRequest request, CancellationToken cancellationToken = default);

    Task<Result<bool>> DeleteAsync(DeleteFavoriteCommand command, CancellationToken cancellationToken = default);
}
