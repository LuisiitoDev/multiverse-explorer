using Favorites.Api.Application.Abstractions;
using Favorites.Api.Application.DTOs;
using Favorites.Api.Domain;

namespace Favorites.Api.Application.Validation;

public class GetFavoritesQueryValidator : IValidator<GetFavoritesQuery>
{
    public IReadOnlyList<string> Validate(GetFavoritesQuery query)
    {
        var errors = new List<string>();

        if (query.UserId == Guid.Empty)
        {
            errors.Add("userId is required.");
        }

        if (!string.IsNullOrWhiteSpace(query.Type) && !ResourceTypes.IsValid(query.Type))
        {
            errors.Add($"type must be one of: {ResourceTypes.Character}, {ResourceTypes.Episode}, {ResourceTypes.Location}.");
        }

        return errors;
    }
}
