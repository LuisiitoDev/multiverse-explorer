using Favorites.Api.Application.Abstractions;
using Favorites.Api.Application.Common;
using Favorites.Api.Application.Services;
using Favorites.Api.Domain;
using Favorites.Api.Domain.Models;
using NSubstitute;

namespace Favorites.Api.Tests.Application.Services;

public class UserProvisioningServiceTests
{
    private readonly IUserRepository _users = Substitute.For<IUserRepository>();
    private readonly IExternalLoginRepository _logins = Substitute.For<IExternalLoginRepository>();
    private readonly UserProvisioningService _sut;

    public UserProvisioningServiceTests()
    {
        _sut = new UserProvisioningService(_users, _logins);
    }

    private static UserModel NewUser(string email) => new()
    {
        Id = Guid.NewGuid(),
        DisplayName = "Existing User",
        Email = email,
        CreateAt = DateTime.UtcNow
    };

    [Fact]
    public async Task ResolveAsync_WithoutProviderUserId_ReturnsValidationFailure()
    {
        var identity = new ExternalIdentity("google", "", "rick@example.com", "Rick", true);

        var result = await _sut.ResolveAsync(identity);

        Assert.True(result.IsFailure);
        Assert.Equal(ErrorType.Validation, result.Error.Type);
        await _logins.DidNotReceive().FindUserByLoginAsync(Arg.Any<string>(), Arg.Any<string>(), Arg.Any<CancellationToken>());
    }

    [Fact]
    public async Task ResolveAsync_WhenLoginAlreadyExists_ReturnsThatUserWithoutTouchingUsersRepository()
    {
        var identity = new ExternalIdentity("google", "g-1", "rick@example.com", "Rick", true);
        var existingUser = NewUser("rick@example.com");
        _logins.FindUserByLoginAsync("google", "g-1", Arg.Any<CancellationToken>()).Returns(existingUser);

        var result = await _sut.ResolveAsync(identity);

        Assert.True(result.IsSuccess);
        Assert.Same(existingUser, result.Value);
        await _users.DidNotReceive().FindByEmailAsync(Arg.Any<string>(), Arg.Any<CancellationToken>());
        await _users.DidNotReceive().AddAsync(Arg.Any<UserModel>(), Arg.Any<CancellationToken>());
    }

    [Fact]
    public async Task ResolveAsync_WhenEmailMatchesExistingUserAndVerified_LinksToThatUser()
    {
        var identity = new ExternalIdentity("microsoft", "ms-1", "rick@example.com", "Rick", true);
        var existingUser = NewUser("rick@example.com");
        _users.FindByEmailAsync("rick@example.com", Arg.Any<CancellationToken>()).Returns(existingUser);
        _logins.TryAddAsync(Arg.Any<ExternalLoginModel>(), Arg.Any<CancellationToken>()).Returns(true);

        var result = await _sut.ResolveAsync(identity);

        Assert.True(result.IsSuccess);
        Assert.Same(existingUser, result.Value);
        await _users.DidNotReceive().AddAsync(Arg.Any<UserModel>(), Arg.Any<CancellationToken>());
        await _logins.Received(1).TryAddAsync(
            Arg.Is<ExternalLoginModel>(l => l.UserId == existingUser.Id && l.Provider == "microsoft" && l.ProviderUserId == "ms-1"),
            Arg.Any<CancellationToken>());
    }

    [Fact]
    public async Task ResolveAsync_WhenEmailMatchesExistingUserButUnverified_ReturnsConflictWithoutLinking()
    {
        var identity = new ExternalIdentity("microsoft", "ms-1", "rick@example.com", "Rick", false);
        var existingUser = NewUser("rick@example.com");
        _users.FindByEmailAsync("rick@example.com", Arg.Any<CancellationToken>()).Returns(existingUser);

        var result = await _sut.ResolveAsync(identity);

        Assert.True(result.IsFailure);
        Assert.Equal(ErrorType.Conflict, result.Error.Type);
        await _logins.DidNotReceive().TryAddAsync(Arg.Any<ExternalLoginModel>(), Arg.Any<CancellationToken>());
    }

    [Fact]
    public async Task ResolveAsync_WhenNoMatchExists_CreatesAndLinksNewUser()
    {
        var identity = new ExternalIdentity("google", "g-1", "morty@example.com", "Morty", true);
        _users.FindByEmailAsync("morty@example.com", Arg.Any<CancellationToken>()).Returns((UserModel?)null);
        _logins.TryAddAsync(Arg.Any<ExternalLoginModel>(), Arg.Any<CancellationToken>()).Returns(true);

        var result = await _sut.ResolveAsync(identity);

        Assert.True(result.IsSuccess);
        Assert.Equal("morty@example.com", result.Value!.Email);
        Assert.Equal("Morty", result.Value.DisplayName);
        await _users.Received(1).AddAsync(Arg.Any<UserModel>(), Arg.Any<CancellationToken>());
    }

    [Fact]
    public async Task ResolveAsync_WhenConcurrentLoginFromAnotherProviderWinsOnEmail_ReLinksToWinnerWhenVerified()
    {
        // Two different providers report the same, verified email at nearly the same time.
        // The other request's user row commits first, so this one's own insert loses the
        // Users.Email unique index race; ResolveAsync should recover by adopting the winner.
        var identity = new ExternalIdentity("microsoft", "ms-1", "rick@example.com", "Rick", true);
        var winner = NewUser("rick@example.com");

        _logins.FindUserByLoginAsync("microsoft", "ms-1", Arg.Any<CancellationToken>()).Returns((UserModel?)null);
        _users.FindByEmailAsync("rick@example.com", Arg.Any<CancellationToken>()).Returns((UserModel?)null, winner);
        _logins.TryAddAsync(Arg.Any<ExternalLoginModel>(), Arg.Any<CancellationToken>()).Returns(false, true);

        var result = await _sut.ResolveAsync(identity);

        Assert.True(result.IsSuccess);
        Assert.Same(winner, result.Value);
        await _users.Received(1).AddAsync(Arg.Any<UserModel>(), Arg.Any<CancellationToken>());
        await _logins.Received(2).TryAddAsync(Arg.Any<ExternalLoginModel>(), Arg.Any<CancellationToken>());
    }

    [Fact]
    public async Task ResolveAsync_WhenConcurrentLoginFromAnotherProviderWinsOnEmail_ReturnsConflictWhenUnverified()
    {
        var identity = new ExternalIdentity("microsoft", "ms-1", "rick@example.com", "Rick", false);
        var winner = NewUser("rick@example.com");

        _logins.FindUserByLoginAsync("microsoft", "ms-1", Arg.Any<CancellationToken>()).Returns((UserModel?)null);
        _users.FindByEmailAsync("rick@example.com", Arg.Any<CancellationToken>()).Returns((UserModel?)null, winner);
        _logins.TryAddAsync(Arg.Any<ExternalLoginModel>(), Arg.Any<CancellationToken>()).Returns(false);

        var result = await _sut.ResolveAsync(identity);

        Assert.True(result.IsFailure);
        Assert.Equal(ErrorType.Conflict, result.Error.Type);
        await _logins.Received(1).TryAddAsync(Arg.Any<ExternalLoginModel>(), Arg.Any<CancellationToken>());
    }

    [Fact]
    public async Task ResolveAsync_WhenNewUserRaceLosesAndNoEmailIsAvailable_ReturnsOriginalFailureWithoutRecovery()
    {
        var identity = new ExternalIdentity("google", "g-1", null, "Rick", true);

        _logins.FindUserByLoginAsync("google", "g-1", Arg.Any<CancellationToken>()).Returns((UserModel?)null);
        _logins.TryAddAsync(Arg.Any<ExternalLoginModel>(), Arg.Any<CancellationToken>()).Returns(false);

        var result = await _sut.ResolveAsync(identity);

        Assert.True(result.IsFailure);
        Assert.Equal(ErrorType.Conflict, result.Error.Type);
        await _users.DidNotReceive().FindByEmailAsync(Arg.Any<string>(), Arg.Any<CancellationToken>());
    }
}
