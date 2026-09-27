using Favorites.Application.Abstractions;
using Favorites.Application.Common;
using Favorites.Application.Services;
using Favorites.Domain;
using Favorites.Domain.Models;
using Microsoft.Extensions.Time.Testing;
using NSubstitute;

namespace Favorites.UnitTests.Application.Services;

public class AccountLinkServiceTests
{
    private readonly IExternalLoginRepository _logins = Substitute.For<IExternalLoginRepository>();
    private readonly IExternalProviderRegistry _providers = Substitute.For<IExternalProviderRegistry>();
    private readonly FakeTimeProvider _clock = new(new DateTimeOffset(2026, 3, 14, 12, 0, 0, TimeSpan.Zero));
    private readonly Guid _userId = Guid.NewGuid();
    private readonly AccountLinkService _sut;

    public AccountLinkServiceTests()
    {
        _sut = new AccountLinkService(_logins, _providers, _clock);
        _providers.IsSupported("google").Returns(true);
        _providers.Find("google").Returns(new ExternalProvider("google", "Google", "Google", true));
    }

    private static ExternalIdentity GoogleIdentity() => new("google", "g-1", "rick@example.com", "Rick", true);

    private ExternalLoginModel GoogleLogin() => new()
    {
        UserId = _userId,
        Provider = "google",
        ProviderUserId = "g-1",
        CreateAt = new DateTime(2026, 1, 1, 0, 0, 0, DateTimeKind.Utc)
    };

    [Fact]
    public async Task GetLoginsAsync_UsesProviderDisplayNameAndFallsBackToProviderKey()
    {
        var unknown = new ExternalLoginModel { UserId = _userId, Provider = "legacy", ProviderUserId = "l-1" };
        _logins.GetByUserAsync(_userId, Arg.Any<CancellationToken>()).Returns((IReadOnlyList<ExternalLoginModel>)[GoogleLogin(), unknown]);

        var result = await _sut.GetLoginsAsync(_userId);

        Assert.True(result.IsSuccess);
        Assert.Equal(["Google", "legacy"], result.Value!.Select(l => l.DisplayName));
    }

    [Fact]
    public async Task LinkAsync_WithUnsupportedProvider_ReturnsValidationFailure()
    {
        var result = await _sut.LinkAsync(_userId, GoogleIdentity() with { Provider = "myspace" });

        Assert.Equal(ErrorType.Validation, result.Error.Type);
        await _logins.DidNotReceive().TryAddAsync(Arg.Any<ExternalLoginModel>(), Arg.Any<CancellationToken>());
    }

    [Fact]
    public async Task LinkAsync_WhenIdentityBelongsToAnotherUser_ReturnsConflict()
    {
        _logins.IsLinkedToAnotherUserAsync(_userId, "google", "g-1", Arg.Any<CancellationToken>()).Returns(true);

        var result = await _sut.LinkAsync(_userId, GoogleIdentity());

        Assert.Equal(ErrorType.Conflict, result.Error.Type);
        await _logins.DidNotReceive().TryAddAsync(Arg.Any<ExternalLoginModel>(), Arg.Any<CancellationToken>());
    }

    [Fact]
    public async Task LinkAsync_WhenProviderAlreadyLinkedToThisUser_ReturnsConflict()
    {
        _logins.FindAsync(_userId, "google", Arg.Any<CancellationToken>()).Returns(GoogleLogin());

        var result = await _sut.LinkAsync(_userId, GoogleIdentity());

        Assert.Equal(ErrorType.Conflict, result.Error.Type);
        await _logins.DidNotReceive().TryAddAsync(Arg.Any<ExternalLoginModel>(), Arg.Any<CancellationToken>());
    }

    [Fact]
    public async Task LinkAsync_WhenValid_AddsLoginStampedWithClock()
    {
        _logins.TryAddAsync(Arg.Any<ExternalLoginModel>(), Arg.Any<CancellationToken>()).Returns(true);

        var result = await _sut.LinkAsync(_userId, GoogleIdentity());

        Assert.True(result.IsSuccess);
        await _logins.Received(1).TryAddAsync(
            Arg.Is<ExternalLoginModel>(l =>
                l.UserId == _userId && l.Provider == "google" && l.ProviderUserId == "g-1"
                && l.CreateAt == _clock.GetUtcNow().UtcDateTime),
            Arg.Any<CancellationToken>());
    }

    [Fact]
    public async Task LinkAsync_WhenUniqueIndexRejectsInsert_ReturnsConflict()
    {
        _logins.TryAddAsync(Arg.Any<ExternalLoginModel>(), Arg.Any<CancellationToken>()).Returns(false);

        var result = await _sut.LinkAsync(_userId, GoogleIdentity());

        Assert.Equal(ErrorType.Conflict, result.Error.Type);
    }

    [Fact]
    public async Task UnlinkAsync_WhenProviderNotLinked_ReturnsNotFound()
    {
        _logins.FindAsync(_userId, "google", Arg.Any<CancellationToken>()).Returns((ExternalLoginModel?)null);

        var result = await _sut.UnlinkAsync(_userId, "google");

        Assert.Equal(ErrorType.NotFound, result.Error.Type);
    }

    [Fact]
    public async Task UnlinkAsync_WhenItIsTheOnlyLogin_ReturnsConflictWithoutRemoving()
    {
        _logins.FindAsync(_userId, "google", Arg.Any<CancellationToken>()).Returns(GoogleLogin());
        _logins.CountByUserAsync(_userId, Arg.Any<CancellationToken>()).Returns(1);

        var result = await _sut.UnlinkAsync(_userId, "google");

        Assert.Equal(ErrorType.Conflict, result.Error.Type);
        await _logins.DidNotReceive().RemoveAsync(Arg.Any<ExternalLoginModel>(), Arg.Any<CancellationToken>());
    }

    [Fact]
    public async Task UnlinkAsync_WhenAnotherLoginRemains_RemovesIt()
    {
        var login = GoogleLogin();
        _logins.FindAsync(_userId, "google", Arg.Any<CancellationToken>()).Returns(login);
        _logins.CountByUserAsync(_userId, Arg.Any<CancellationToken>()).Returns(2);

        var result = await _sut.UnlinkAsync(_userId, "google");

        Assert.True(result.IsSuccess);
        await _logins.Received(1).RemoveAsync(login, Arg.Any<CancellationToken>());
    }
}
