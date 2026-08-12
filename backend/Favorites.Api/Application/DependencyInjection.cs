using Favorites.Api.Application.Abstractions;
using Favorites.Api.Application.Services;
using Favorites.Api.Application.Validation;
using FluentValidation;

namespace Favorites.Api.Application;

public static class DependencyInjection
{
    public static IServiceCollection AddApplication(this IServiceCollection services)
    {
        services.AddValidatorsFromAssemblyContaining<CreateFavoriteRequestValidator>();
        services.AddScoped<IValidationService, FluentValidationService>();
        services.AddScoped<IFavoriteService, FavoriteService>();
        services.AddScoped<IAuthService, AuthService>();
        services.AddScoped<IUserProvisioningService, UserProvisioningService>();
        services.AddScoped<IAccountLinkService, AccountLinkService>();

        return services;
    }
}
