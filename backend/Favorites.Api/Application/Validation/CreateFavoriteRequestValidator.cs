using Favorites.Api.Application.Abstractions;
using Favorites.Api.Application.DTOs;
using Favorites.Api.Domain;

namespace Favorites.Api.Application.Validation;

public class CreateFavoriteRequestValidator : IValidator<CreateFavoriteCommand>
{
    public IReadOnlyList<string> Validate(CreateFavoriteCommand command)
    {
        var errors = new List<string>();

        if (command.UserId == Guid.Empty)
        {
            errors.Add("userId is required.");
        }

        if (string.IsNullOrWhiteSpace(command.ResourceType))
        {
            errors.Add("resourceType is required.");
        }
        else if (!ResourceTypes.IsValid(command.ResourceType))
        {
            errors.Add($"resourceType must be one of: {ResourceTypes.Character}, {ResourceTypes.Episode}, {ResourceTypes.Location}.");
        }

        if (command.ResourceId <= 0)
        {
            errors.Add("resourceId must be greater than zero.");
        }

        return errors;
    }
}
