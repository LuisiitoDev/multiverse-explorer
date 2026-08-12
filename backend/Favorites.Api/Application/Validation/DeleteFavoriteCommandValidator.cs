using Favorites.Api.Application.DTOs;
using FluentValidation;

namespace Favorites.Api.Application.Validation;

public class DeleteFavoriteCommandValidator : AbstractValidator<DeleteFavoriteCommand>
{
    public DeleteFavoriteCommandValidator()
    {
        RuleFor(x => x.UserId)
            .NotEmpty().WithMessage("userId is required.");

        RuleFor(x => x.Id)
            .GreaterThan(0).WithMessage("id must be greater than zero.");
    }
}
