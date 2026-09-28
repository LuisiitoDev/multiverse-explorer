using Favorites.Application.Abstractions;
using Favorites.Application.Common;
using Favorites.Application.DTOs;
using Favorites.Application.Services;
using Favorites.Domain.Models;
using Microsoft.Extensions.Time.Testing;
using NSubstitute;

namespace Favorites.UnitTests.Application.Services;

public class FavoriteServiceTests
{
    private readonly IFavoriteRepository _favorites = Substitute.For<IFavoriteRepository>();
    private readonly IUserRepository _users = Substitute.For<IUserRepository>();
    private readonly IValidationService _validation = Substitute.For<IValidationService>();
    private readonly FakeTimeProvider _clock = new(new DateTimeOffset(2026, 3, 14, 12, 0, 0, TimeSpan.Zero));
    private readonly FavoriteService _sut;

    public FavoriteServiceTests()
    {
        _sut = new FavoriteService(_favorites, _users, _validation, _clock);
        _users.ExistsAsync(Arg.Any<Guid>(), Arg.Any<CancellationToken>()).Returns(true);
        _favorites.TryAddAsync(Arg.Any<FavoriteModel>(), Arg.Any<CancellationToken>()).Returns(true);
    }

    [Fact]
    public async Task GetAsync_WhenValidationFails_ReturnsFailureWithoutQueryingRepository()
    {
        var query = new GetFavoritesQuery(Guid.NewGuid(), null);
        var error = Error.Validation("userId is required.");
        _validation.ValidateAsync(query, Arg.Any<CancellationToken>()).Returns(error);

        var result = await _sut.GetAsync(query);

        Assert.True(result.IsFailure);
        Assert.Equal(error, result.Error);
        await _favorites.DidNotReceive().GetByUserAsync(Arg.Any<Guid>(), Arg.Any<string?>(), Arg.Any<CancellationToken>());
    }

    [Fact]
    public async Task GetAsync_WithoutType_PassesNullResourceTypeToRepository()
    {
        var userId = Guid.NewGuid();
        var query = new GetFavoritesQuery(userId, null);
        _favorites.GetByUserAsync(userId, null, Arg.Any<CancellationToken>())
            .Returns((IReadOnlyList<FavoriteModel>)[]);

        await _sut.GetAsync(query);

        await _favorites.Received(1).GetByUserAsync(userId, null, Arg.Any<CancellationToken>());
    }

    [Fact]
    public async Task GetAsync_WithType_NormalizesResourceTypeBeforeQuerying()
    {
        var userId = Guid.NewGuid();
        var query = new GetFavoritesQuery(userId, "Character");
        _favorites.GetByUserAsync(userId, "character", Arg.Any<CancellationToken>())
            .Returns((IReadOnlyList<FavoriteModel>)[]);

        await _sut.GetAsync(query);

        await _favorites.Received(1).GetByUserAsync(userId, "character", Arg.Any<CancellationToken>());
    }

    [Fact]
    public async Task GetAsync_ReturnsSuccessWithMappedResponses()
    {
        var userId = Guid.NewGuid();
        var query = new GetFavoritesQuery(userId, null);
        var createdAt = new DateTime(2026, 1, 1, 0, 0, 0, DateTimeKind.Utc);
        var items = new List<FavoriteModel>
        {
            new() { Id = 1, UserId = userId, ResourceType = "character", ResourceId = 1, CreateAt = createdAt },
            new() { Id = 2, UserId = userId, ResourceType = "episode", ResourceId = 2, CreateAt = createdAt }
        };
        _favorites.GetByUserAsync(userId, null, Arg.Any<CancellationToken>()).Returns((IReadOnlyList<FavoriteModel>)items);

        var result = await _sut.GetAsync(query);

        Assert.True(result.IsSuccess);
        Assert.Equal(2, result.Value!.Count);
        Assert.Equal(new FavoriteResponse(1, userId, "character", 1, createdAt), result.Value[0]);
        Assert.Equal(new FavoriteResponse(2, userId, "episode", 2, createdAt), result.Value[1]);
    }

    [Fact]
    public async Task CreateAsync_WhenValidationFails_ReturnsFailureWithoutTouchingRepositories()
    {
        var command = new CreateFavoriteCommand(Guid.NewGuid(), "character", 1);
        var error = Error.Validation("resourceId must be greater than zero.");
        _validation.ValidateAsync(command, Arg.Any<CancellationToken>()).Returns(error);

        var result = await _sut.CreateAsync(command);

        Assert.True(result.IsFailure);
        Assert.Equal(error, result.Error);
        await _users.DidNotReceive().ExistsAsync(Arg.Any<Guid>(), Arg.Any<CancellationToken>());
        await _favorites.DidNotReceive().TryAddAsync(Arg.Any<FavoriteModel>(), Arg.Any<CancellationToken>());
    }

    [Fact]
    public async Task CreateAsync_WhenUserDoesNotExist_ReturnsNotFound()
    {
        var userId = Guid.NewGuid();
        var command = new CreateFavoriteCommand(userId, "character", 1);
        _users.ExistsAsync(userId, Arg.Any<CancellationToken>()).Returns(false);

        var result = await _sut.CreateAsync(command);

        Assert.True(result.IsFailure);
        Assert.Equal(ErrorType.NotFound, result.Error.Type);
        await _favorites.DidNotReceive().TryAddAsync(Arg.Any<FavoriteModel>(), Arg.Any<CancellationToken>());
    }

    [Fact]
    public async Task CreateAsync_WhenAlreadyFavorited_ReturnsConflict()
    {
        var userId = Guid.NewGuid();
        var command = new CreateFavoriteCommand(userId, "character", 1);
        _favorites.ExistsAsync(userId, "character", 1, Arg.Any<CancellationToken>()).Returns(true);

        var result = await _sut.CreateAsync(command);

        Assert.True(result.IsFailure);
        Assert.Equal(ErrorType.Conflict, result.Error.Type);
        await _favorites.DidNotReceive().TryAddAsync(Arg.Any<FavoriteModel>(), Arg.Any<CancellationToken>());
    }

    [Fact]
    public async Task CreateAsync_WhenValid_PersistsNormalizedFavoriteAndReturnsMappedResponse()
    {
        var userId = Guid.NewGuid();
        var command = new CreateFavoriteCommand(userId, "Character", 5);
        _favorites.ExistsAsync(userId, "character", 5, Arg.Any<CancellationToken>()).Returns(false);

        var result = await _sut.CreateAsync(command);

        Assert.True(result.IsSuccess);
        await _favorites.Received(1).TryAddAsync(
            Arg.Is<FavoriteModel>(f => f.UserId == userId && f.ResourceType == "character" && f.ResourceId == 5),
            Arg.Any<CancellationToken>());
        await _favorites.DidNotReceive().SaveChangesAsync(Arg.Any<CancellationToken>());
        Assert.Equal(userId, result.Value!.UserId);
        Assert.Equal("character", result.Value.ResourceType);
        Assert.Equal(5, result.Value.ResourceId);
        Assert.Equal(_clock.GetUtcNow().UtcDateTime, result.Value.CreateAt);
    }

    [Fact]
    public async Task CreateAsync_WhenConcurrentInsertWins_ReturnsConflict()
    {
        var command = new CreateFavoriteCommand(Guid.NewGuid(), "character", 1);
        _favorites.TryAddAsync(Arg.Any<FavoriteModel>(), Arg.Any<CancellationToken>()).Returns(false);

        var result = await _sut.CreateAsync(command);

        Assert.True(result.IsFailure);
        Assert.Equal(ErrorType.Conflict, result.Error.Type);
        await _favorites.DidNotReceive().SaveChangesAsync(Arg.Any<CancellationToken>());
    }

    [Fact]
    public async Task DeleteAsync_WhenValidationFails_ReturnsFailure()
    {
        var command = new DeleteFavoriteCommand(1, Guid.NewGuid());
        var error = Error.Validation("id must be greater than zero.");
        _validation.ValidateAsync(command, Arg.Any<CancellationToken>()).Returns(error);

        var result = await _sut.DeleteAsync(command);

        Assert.True(result.IsFailure);
        Assert.Equal(error, result.Error);
        await _favorites.DidNotReceive().GetAsync(Arg.Any<long>(), Arg.Any<Guid>(), Arg.Any<CancellationToken>());
    }

    [Fact]
    public async Task DeleteAsync_WhenFavoriteNotFound_ReturnsNotFound()
    {
        var userId = Guid.NewGuid();
        var command = new DeleteFavoriteCommand(1, userId);
        _favorites.GetAsync(1, userId, Arg.Any<CancellationToken>()).Returns((FavoriteModel?)null);

        var result = await _sut.DeleteAsync(command);

        Assert.True(result.IsFailure);
        Assert.Equal(ErrorType.NotFound, result.Error.Type);
        _favorites.DidNotReceive().Remove(Arg.Any<FavoriteModel>());
    }

    [Fact]
    public async Task DeleteAsync_WhenFavoriteExists_RemovesItAndReturnsSuccess()
    {
        var userId = Guid.NewGuid();
        var command = new DeleteFavoriteCommand(1, userId);
        var favorite = new FavoriteModel { Id = 1, UserId = userId, ResourceType = "character", ResourceId = 1 };
        _favorites.GetAsync(1, userId, Arg.Any<CancellationToken>()).Returns(favorite);

        var result = await _sut.DeleteAsync(command);

        Assert.True(result.IsSuccess);
        Assert.True(result.Value);
        _favorites.Received(1).Remove(favorite);
        await _favorites.Received(1).SaveChangesAsync(Arg.Any<CancellationToken>());
    }
}
