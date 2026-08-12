using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Design;

namespace Favorites.Api.Infraestructure.Persistence;

/// <summary>Used only by the EF Core CLI so migrations do not require a live connection string.</summary>
public class FavoritesDbContextFactory : IDesignTimeDbContextFactory<FavoritesDbContext>
{
    public FavoritesDbContext CreateDbContext(string[] args)
    {
        var connectionString = Environment.GetEnvironmentVariable("ConnectionStrings__FavoritesDb")
            ?? "Server=localhost;Database=FavoritesDb;Integrated Security=True;TrustServerCertificate=True";

        var options = new DbContextOptionsBuilder<FavoritesDbContext>()
            .UseSqlServer(connectionString)
            .Options;

        return new FavoritesDbContext(options);
    }
}
