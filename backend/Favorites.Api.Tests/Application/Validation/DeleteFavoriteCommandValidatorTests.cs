using Favorites.Api.Application.DTOs;
using Favorites.Api.Application.Validation;

namespace Favorites.Api.Tests.Application.Validation;

public class DeleteFavoriteCommandValidatorTests
{
    private readonly DeleteFavoriteCommandValidator _validator = new();

    [Fact]
    public void Validate_WithValidCommand_ReturnsNoErrors()
    {
        var command = new DeleteFavoriteCommand(1, Guid.NewGuid());

        var errors = _validator.Validate(command);

        Assert.Empty(errors);
    }

    [Fact]
    public void Validate_WithEmptyUserId_ReturnsUserIdError()
    {
        var command = new DeleteFavoriteCommand(1, Guid.Empty);

        var errors = _validator.Validate(command);

        Assert.Contains("userId is required.", errors);
    }

    [Theory]
    [InlineData(0)]
    [InlineData(-1)]
    public void Validate_WithNonPositiveId_ReturnsIdError(long id)
    {
        var command = new DeleteFavoriteCommand(id, Guid.NewGuid());

        var errors = _validator.Validate(command);

        Assert.Contains("id must be greater than zero.", errors);
    }
}
