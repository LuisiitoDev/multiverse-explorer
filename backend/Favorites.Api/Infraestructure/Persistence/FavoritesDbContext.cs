using Favorites.Api.Domain.Models;
using Microsoft.AspNetCore.DataProtection.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore;

namespace Favorites.Api.Infraestructure.Persistence;

public class FavoritesDbContext(DbContextOptions<FavoritesDbContext> options) : DbContext(options), IDataProtectionKeyContext
{
    public DbSet<UserModel> Users => Set<UserModel>();
    public DbSet<FavoriteModel> Favorites => Set<FavoriteModel>();
    public DbSet<ExternalLoginModel> ExternalLogins => Set<ExternalLoginModel>();

    /// <summary>Session cookies must stay decryptable across restarts and replicas.</summary>
    public DbSet<DataProtectionKey> DataProtectionKeys => Set<DataProtectionKey>();

    protected override void OnModelCreating(ModelBuilder modelBuilder)
    {
        base.OnModelCreating(modelBuilder);
        modelBuilder.ApplyConfigurationsFromAssembly(typeof(FavoritesDbContext).Assembly);
    }
}
