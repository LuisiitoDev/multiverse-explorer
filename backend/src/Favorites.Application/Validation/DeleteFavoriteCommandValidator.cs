using Favorites.Application.Abstractions;
using Favorites.Application.DTOs;

namespace Favorites.Application.Validation;

public class DeleteFavoriteCommandValidator : IValidator<DeleteFavoriteCommand>
{
    public IReadOnlyList<string> Validate(DeleteFavoriteCommand command)
    {
        var errors = new List<string>();

        if (command.UserId == Guid.Empty)
        {
            errors.Add("userId is required.");
        }

        if (command.Id <= 0)
        {
            errors.Add("id must be greater than zero.");
        }

        return errors;
    }
}
