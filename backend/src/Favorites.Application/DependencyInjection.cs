using Favorites.Application.Abstractions;
using Favorites.Application.DTOs;
using Favorites.Application.Services;
using Favorites.Application.Validation;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.DependencyInjection.Extensions;

namespace Favorites.Application;

public static class DependencyInjection
{
    public static IServiceCollection AddApplication(this IServiceCollection services)
    {
        services.TryAddSingleton(TimeProvider.System);

        services.AddScoped<IValidator<CreateFavoriteCommand>, CreateFavoriteCommandValidator>();
        services.AddScoped<IValidator<DeleteFavoriteCommand>, DeleteFavoriteCommandValidator>();
        services.AddScoped<IValidator<GetFavoritesQuery>, GetFavoritesQueryValidator>();
        services.AddScoped<IValidationService, ValidationService>();
        services.AddScoped<IFavoriteService, FavoriteService>();
        services.AddScoped<IAuthService, AuthService>();
        services.AddScoped<IUserProvisioningService, UserProvisioningService>();
        services.AddScoped<IAccountLinkService, AccountLinkService>();

        return services;
    }
}
