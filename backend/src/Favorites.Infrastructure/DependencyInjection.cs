using Favorites.Application.Abstractions;
using Favorites.Infrastructure.Persistence;
using Favorites.Infrastructure.Repositories;
using Microsoft.AspNetCore.DataProtection;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.DependencyInjection;

namespace Favorites.Infrastructure;

public static class DependencyInjection
{
    public static IServiceCollection AddInfrastructure(this IServiceCollection services, IConfiguration configuration)
    {
        services.AddDbContext<FavoritesDbContext>(options =>
            options.UseSqlServer(configuration.GetConnectionString("FavoritesDb")));

        // The application name scopes the key ring; changing it would invalidate every existing session cookie.
        services.AddDataProtection()
            .SetApplicationName("Favorites.Api")
            .PersistKeysToDbContext<FavoritesDbContext>();

        services.AddScoped<IFavoriteRepository, FavoriteRepository>();
        services.AddScoped<IUserRepository, UserRepository>();
        services.AddScoped<IExternalLoginRepository, ExternalLoginRepository>();

        return services;
    }

    /// <summary>Applies pending EF Core migrations; keeps the host from depending on the DbContext directly.</summary>
    public static async Task MigrateDatabaseAsync(this IServiceProvider services, CancellationToken cancellationToken = default)
    {
        await using var scope = services.CreateAsyncScope();
        var db = scope.ServiceProvider.GetRequiredService<FavoritesDbContext>();
        await db.Database.MigrateAsync(cancellationToken);
    }
}
