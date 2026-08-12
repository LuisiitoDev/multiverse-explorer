using Favorites.Api.Application.DTOs;
using Favorites.Api.Domain;
using FluentValidation;

namespace Favorites.Api.Application.Validation;

public class GetFavoritesQueryValidator : AbstractValidator<GetFavoritesQuery>
{
    public GetFavoritesQueryValidator()
    {
        RuleFor(x => x.UserId)
            .NotEmpty().WithMessage("userId is required.");

        RuleFor(x => x.Type)
            .Must(ResourceTypes.IsValid)
            .When(x => !string.IsNullOrWhiteSpace(x.Type))
            .WithMessage($"type must be one of: {ResourceTypes.Character}, {ResourceTypes.Episode}, {ResourceTypes.Location}.");
    }
}
