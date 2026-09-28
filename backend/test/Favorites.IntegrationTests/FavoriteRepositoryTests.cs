using System.Reflection;
using Favorites.Api.Domain.Models;
using Favorites.Api.Infraestructure.Persistence;
using Favorites.Api.Infraestructure.Repositories;
using Microsoft.Data.SqlClient;
using Microsoft.EntityFrameworkCore;

namespace Favorites.Api.Tests.Infraestructure.Repositories;

public class FavoriteRepositoryTests
{
    [Theory]
    [InlineData(2601)]
    [InlineData(2627)]
    public async Task TryAddAsync_WhenDuplicateKey_ReturnsFalseAndDetachesFavorite(int number)
    {
        using var context = new SaveFailureContext(new DbUpdateException("Duplicate", SqlFailure(number)));
        var favorite = NewFavorite();
        var other = NewFavorite();
        context.Favorites.Add(other);

        var added = await new FavoriteRepository(context).TryAddAsync(favorite);

        Assert.False(added);
        Assert.Equal(EntityState.Detached, context.Entry(favorite).State);
        Assert.Equal(EntityState.Added, context.Entry(other).State);
    }

    [Theory]
    [InlineData(547)] // Foreign key violation
    [InlineData(-2)] // Timeout
    public async Task TryAddAsync_WhenOtherSqlFailure_PropagatesException(int number)
    {
        var error = new DbUpdateException("Database failure", SqlFailure(number));
        using var context = new SaveFailureContext(error);

        var actual = await Assert.ThrowsAsync<DbUpdateException>(
            () => new FavoriteRepository(context).TryAddAsync(NewFavorite()));

        Assert.Same(error, actual);
    }

    [Fact]
    public async Task TryAddAsync_WhenNonSqlFailure_PropagatesException()
    {
        var error = new DbUpdateException("Database failure");
        using var context = new SaveFailureContext(error);

        var actual = await Assert.ThrowsAsync<DbUpdateException>(
            () => new FavoriteRepository(context).TryAddAsync(NewFavorite()));

        Assert.Same(error, actual);
    }

    private static FavoriteModel NewFavorite() => new()
    {
        UserId = Guid.NewGuid(), ResourceType = "character", ResourceId = 1
    };

    // SqlClient exposes no public constructors for server errors. Keep reflection in this
    // test helper; no SQL connection is needed to exercise the repository's error handling.
    private static SqlException SqlFailure(int number)
    {
        var errorConstructor = typeof(SqlError).GetConstructors(BindingFlags.Instance | BindingFlags.NonPublic)
            .Single(c => c.GetParameters().Length == 9);
        var error = (SqlError)errorConstructor.Invoke(
            [number, (byte)0, (byte)16, "server", "Test database error", "procedure", 0, (uint)0, null]);
        var errors = (SqlErrorCollection)Activator.CreateInstance(typeof(SqlErrorCollection), nonPublic: true)!;
        typeof(SqlErrorCollection).GetMethod("Add", BindingFlags.Instance | BindingFlags.NonPublic)!
            .Invoke(errors, [error]);
        return (SqlException)typeof(SqlException).GetMethod("CreateException",
            BindingFlags.Static | BindingFlags.NonPublic, null,
            [typeof(SqlErrorCollection), typeof(string)], null)!.Invoke(null, [errors, "16.0"])!;
    }

    private sealed class SaveFailureContext(Exception error) : FavoritesDbContext(
        new DbContextOptionsBuilder<FavoritesDbContext>()
            .UseSqlServer("Server=unused;Database=unused;Integrated Security=true").Options)
    {
        public override Task<int> SaveChangesAsync(CancellationToken cancellationToken = default) =>
            Task.FromException<int>(error);
    }
}
