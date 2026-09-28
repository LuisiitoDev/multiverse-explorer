using Favorites.Application.Abstractions;
using Favorites.Application.Common;
using Favorites.Application.DTOs;
using Favorites.Application.Validation;
using Microsoft.Extensions.DependencyInjection;

namespace Favorites.UnitTests.Application.Validation;

public class ValidationServiceTests
{
    [Fact]
    public async Task ValidateAsync_WhenNoValidatorIsRegisteredForType_ReturnsNull()
    {
        var provider = new ServiceCollection().BuildServiceProvider();
        var sut = new ValidationService(provider);

        var error = await sut.ValidateAsync(new GetFavoritesQuery(Guid.NewGuid(), null));

        Assert.Null(error);
    }

    [Fact]
    public async Task ValidateAsync_WhenInstanceIsValid_ReturnsNull()
    {
        var services = new ServiceCollection();
        services.AddSingleton<IValidator<CreateFavoriteCommand>>(new CreateFavoriteCommandValidator());
        var sut = new ValidationService(services.BuildServiceProvider());

        var error = await sut.ValidateAsync(new CreateFavoriteCommand(Guid.NewGuid(), "character", 1));

        Assert.Null(error);
    }

    [Fact]
    public async Task ValidateAsync_WhenInstanceIsInvalid_ReturnsJoinedValidationError()
    {
        var services = new ServiceCollection();
        services.AddSingleton<IValidator<CreateFavoriteCommand>>(new CreateFavoriteCommandValidator());
        var sut = new ValidationService(services.BuildServiceProvider());

        var error = await sut.ValidateAsync(new CreateFavoriteCommand(Guid.Empty, "", 0));

        Assert.NotNull(error);
        Assert.Equal(ErrorType.Validation, error!.Type);
        Assert.Contains("userId is required.", error.Message);
        Assert.Contains("resourceType is required.", error.Message);
        Assert.Contains("resourceId must be greater than zero.", error.Message);
    }
}
