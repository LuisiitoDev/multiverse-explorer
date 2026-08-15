using Favorites.Api.Application.DTOs;
using Favorites.Api.Application.Validation;

namespace Favorites.Api.Tests.Application.Validation;

public class CreateFavoriteRequestValidatorTests
{
    private readonly CreateFavoriteRequestValidator _validator = new();

    [Fact]
    public void Validate_WithValidCommand_ReturnsNoErrors()
    {
        var command = new CreateFavoriteCommand(Guid.NewGuid(), "character", 1);

        var errors = _validator.Validate(command);

        Assert.Empty(errors);
    }

    [Fact]
    public void Validate_WithEmptyUserId_ReturnsUserIdError()
    {
        var command = new CreateFavoriteCommand(Guid.Empty, "character", 1);

        var errors = _validator.Validate(command);

        Assert.Contains("userId is required.", errors);
    }

    [Theory]
    [InlineData(null)]
    [InlineData("")]
    [InlineData("planet")]
    public void Validate_WithInvalidResourceType_ReturnsResourceTypeError(string? resourceType)
    {
        var command = new CreateFavoriteCommand(Guid.NewGuid(), resourceType!, 1);

        var errors = _validator.Validate(command);

        Assert.Contains(errors, e => e.Contains("resourceType", StringComparison.OrdinalIgnoreCase));
    }

    [Theory]
    [InlineData("character")]
    [InlineData("Character")]
    [InlineData("EPISODE")]
    [InlineData("location")]
    public void Validate_WithAnyValidResourceTypeCasing_ReturnsNoErrors(string resourceType)
    {
        var command = new CreateFavoriteCommand(Guid.NewGuid(), resourceType, 1);

        var errors = _validator.Validate(command);

        Assert.Empty(errors);
    }

    [Theory]
    [InlineData(0)]
    [InlineData(-1)]
    public void Validate_WithNonPositiveResourceId_ReturnsResourceIdError(int resourceId)
    {
        var command = new CreateFavoriteCommand(Guid.NewGuid(), "character", resourceId);

        var errors = _validator.Validate(command);

        Assert.Contains("resourceId must be greater than zero.", errors);
    }
}
