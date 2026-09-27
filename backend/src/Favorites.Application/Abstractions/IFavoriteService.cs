using Favorites.Application.Common;
using Favorites.Application.DTOs;

namespace Favorites.Application.Abstractions;

public interface IFavoriteService
{
    Task<Result<IReadOnlyList<FavoriteResponse>>> GetAsync(GetFavoritesQuery query, CancellationToken cancellationToken = default);

    Task<Result<FavoriteResponse>> CreateAsync(CreateFavoriteCommand command, CancellationToken cancellationToken = default);

    Task<Result<bool>> DeleteAsync(DeleteFavoriteCommand command, CancellationToken cancellationToken = default);
}
