using Favorites.Api.Application.DTOs;
using Favorites.Api.Domain;
using FluentValidation;

namespace Favorites.Api.Application.Validation;

public class CreateFavoriteRequestValidator : AbstractValidator<CreateFavoriteRequest>
{
    public CreateFavoriteRequestValidator()
    {
        RuleFor(x => x.UserId)
            .NotEmpty().WithMessage("userId is required.");

        RuleFor(x => x.ResourceType)
            .NotEmpty().WithMessage("resourceType is required.")
            .Must(ResourceTypes.IsValid)
            .WithMessage($"resourceType must be one of: {ResourceTypes.Character}, {ResourceTypes.Episode}, {ResourceTypes.Location}.");

        RuleFor(x => x.ResourceId)
            .GreaterThan(0).WithMessage("resourceId must be greater than zero.");
    }
}
