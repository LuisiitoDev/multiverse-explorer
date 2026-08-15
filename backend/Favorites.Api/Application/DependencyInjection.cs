using Favorites.Api.Application.Abstractions;
using Favorites.Api.Application.DTOs;
using Favorites.Api.Application.Services;
using Favorites.Api.Application.Validation;

namespace Favorites.Api.Application;

public static class DependencyInjection
{
    public static IServiceCollection AddApplication(this IServiceCollection services)
    {
        services.AddScoped<IValidator<CreateFavoriteCommand>, CreateFavoriteRequestValidator>();
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
