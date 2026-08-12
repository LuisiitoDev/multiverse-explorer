using Favorites.Api.Application.Abstractions;
using Favorites.Api.Infraestructure.Authentication;
using Favorites.Api.Infraestructure.Persistence;
using Favorites.Api.Infraestructure.Repositories;
using Microsoft.AspNetCore.DataProtection;
using Microsoft.EntityFrameworkCore;

namespace Favorites.Api.Infraestructure;

public static class DependencyInjection
{
    public static IServiceCollection AddInfraestructure(this IServiceCollection services, IConfiguration configuration, IHostEnvironment environment)
    {
        services.AddDbContext<FavoritesDbContext>(options =>
            options.UseSqlServer(configuration.GetConnectionString("FavoritesDb")));

        services.AddDataProtection()
            .SetApplicationName("Favorites.Api")
            .PersistKeysToDbContext<FavoritesDbContext>();

        services.AddExternalAuthentication(configuration, environment);
        services.AddApiAntiforgery();

        services.AddScoped<IFavoriteRepository, FavoriteRepository>();
        services.AddScoped<IUserRepository, UserRepository>();
        services.AddScoped<IExternalLoginRepository, ExternalLoginRepository>();

        return services;
    }
}
