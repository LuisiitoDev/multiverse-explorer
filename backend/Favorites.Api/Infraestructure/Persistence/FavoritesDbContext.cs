using Favorites.Api.Domain.Models;
using Microsoft.EntityFrameworkCore;

namespace Favorites.Api.Infraestructure.Persistence;

public class FavoritesDbContext(DbContextOptions<FavoritesDbContext> options) : DbContext(options)
{
    public DbSet<UserModel> Users => Set<UserModel>();
    public DbSet<FavoriteModel> Favorites => Set<FavoriteModel>();
    public DbSet<ExternalLoginModel> ExternalLogins => Set<ExternalLoginModel>();

    protected override void OnModelCreating(ModelBuilder modelBuilder)
    {
        base.OnModelCreating(modelBuilder);
        modelBuilder.ApplyConfigurationsFromAssembly(typeof(FavoritesDbContext).Assembly);
    }
}
