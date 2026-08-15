using Favorites.Api.Application.DTOs;
using Favorites.Api.Application.Validation;

namespace Favorites.Api.Tests.Application.Validation;

public class GetFavoritesQueryValidatorTests
{
    private readonly GetFavoritesQueryValidator _validator = new();

    [Fact]
    public void Validate_WithValidUserIdAndNullType_ReturnsNoErrors()
    {
        var query = new GetFavoritesQuery(Guid.NewGuid(), null);

        var errors = _validator.Validate(query);

        Assert.Empty(errors);
    }

    [Fact]
    public void Validate_WithEmptyStringType_ReturnsNoErrorsBecauseFilterIsSkipped()
    {
        // The "type" rule only runs when the value is non-blank, so an empty
        // string is treated the same as "no filter" rather than failing.
        var query = new GetFavoritesQuery(Guid.NewGuid(), "");

        var errors = _validator.Validate(query);

        Assert.Empty(errors);
    }

    [Fact]
    public void Validate_WithEmptyUserId_ReturnsUserIdError()
    {
        var query = new GetFavoritesQuery(Guid.Empty, null);

        var errors = _validator.Validate(query);

        Assert.Contains("userId is required.", errors);
    }

    [Fact]
    public void Validate_WithUnknownType_ReturnsTypeError()
    {
        var query = new GetFavoritesQuery(Guid.NewGuid(), "planet");

        var errors = _validator.Validate(query);

        Assert.Contains(errors, e => e.Contains("type", StringComparison.OrdinalIgnoreCase));
    }

    [Theory]
    [InlineData("character")]
    [InlineData("Episode")]
    [InlineData("LOCATION")]
    public void Validate_WithKnownTypeAnyCasing_ReturnsNoErrors(string type)
    {
        var query = new GetFavoritesQuery(Guid.NewGuid(), type);

        var errors = _validator.Validate(query);

        Assert.Empty(errors);
    }
}
