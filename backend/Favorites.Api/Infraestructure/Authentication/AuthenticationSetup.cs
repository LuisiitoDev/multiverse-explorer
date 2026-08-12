using Favorites.Api.Application.Abstractions;
using Microsoft.AspNetCore.Authentication;
using Microsoft.AspNetCore.Authentication.Cookies;
using Microsoft.Extensions.Options;

namespace Favorites.Api.Infraestructure.Authentication;

public static class AuthenticationSetup
{
    public static IServiceCollection AddExternalAuthentication(
        this IServiceCollection services,
        IConfiguration configuration,
        IHostEnvironment environment)
    {
        services.Configure<AuthAppOptions>(configuration.GetSection(AuthAppOptions.SectionName));

        var appOptions = configuration.GetSection(AuthAppOptions.SectionName).Get<AuthAppOptions>() ?? new AuthAppOptions();

        var builder = services
            .AddAuthentication(options =>
            {
                options.DefaultScheme = AuthSchemes.Application;
                options.DefaultChallengeScheme = AuthSchemes.Application;
            })
            .AddCookie(AuthSchemes.Application, options =>
            {
                options.Cookie.Name = "__Host-favorites.session";
                options.Cookie.HttpOnly = true;
                options.Cookie.SecurePolicy = CookieSecurePolicy.Always;
                options.Cookie.SameSite = SameSiteMode.Lax;
                options.Cookie.Path = "/";
                options.Cookie.IsEssential = true;
                options.ExpireTimeSpan = TimeSpan.FromDays(appOptions.SessionDays);
                options.SlidingExpiration = true;
                // API clients get status codes, never a redirect to a login page.
                options.Events.OnRedirectToLogin = context =>
                {
                    context.Response.StatusCode = StatusCodes.Status401Unauthorized;
                    return Task.CompletedTask;
                };
                options.Events.OnRedirectToAccessDenied = context =>
                {
                    context.Response.StatusCode = StatusCodes.Status403Forbidden;
                    return Task.CompletedTask;
                };
            })
            .AddCookie(AuthSchemes.External, options =>
            {
                options.Cookie.Name = "favorites.external";
                options.Cookie.HttpOnly = true;
                options.Cookie.SecurePolicy = CookieSecurePolicy.Always;
                options.Cookie.SameSite = SameSiteMode.Lax;
                options.Cookie.IsEssential = true;
                options.ExpireTimeSpan = TimeSpan.FromMinutes(10);
                options.SlidingExpiration = false;
            });

        var providers = configuration.GetSection(ExternalProviderSettings.SectionName)
            .Get<List<ExternalProviderSettings>>() ?? [];

        var registered = new List<ExternalProviderSettings>();

        foreach (var provider in providers.Where(p => p.Enabled))
        {
            if (!HasCredentials(configuration, provider))
            {
                // Outside development a misconfigured provider must not fail silently.
                if (!environment.IsDevelopment())
                {
                    throw new InvalidOperationException(
                        $"Provider '{provider.Name}' is enabled but its credentials are not configured.");
                }

                continue;
            }

            AddProvider(builder, provider, configuration);
            registered.Add(provider);
        }

        // The registry only advertises providers that are actually usable.
        services.AddSingleton<IExternalProviderRegistry>(
            new ExternalProviderRegistry(Options.Create(registered)));

        services.AddAuthorization();

        return services;
    }

    private static bool HasCredentials(IConfiguration configuration, ExternalProviderSettings provider)
    {
        var section = configuration.GetSection($"Authentication:{provider.Name}");

        return provider.Name.ToLowerInvariant() switch
        {
            "facebook" => !string.IsNullOrWhiteSpace(section["AppId"]) && !string.IsNullOrWhiteSpace(section["AppSecret"]),
            _ => !string.IsNullOrWhiteSpace(section["ClientId"]) && !string.IsNullOrWhiteSpace(section["ClientSecret"])
        };
    }

    private static void AddProvider(AuthenticationBuilder builder, ExternalProviderSettings provider, IConfiguration configuration)
    {
        var section = configuration.GetSection($"Authentication:{provider.Name}");

        switch (provider.Name.ToLowerInvariant())
        {
            case "google":
                builder.AddGoogle(provider.Scheme, options =>
                {
                    options.ClientId = Require(section, "ClientId", provider.Name);
                    options.ClientSecret = Require(section, "ClientSecret", provider.Name);
                    options.SignInScheme = AuthSchemes.External;
                    options.SaveTokens = false;
                    options.ClaimActions.MapJsonKey("email_verified", "email_verified");
                });
                break;

            case "microsoft":
                builder.AddMicrosoftAccount(provider.Scheme, options =>
                {
                    options.ClientId = Require(section, "ClientId", provider.Name);
                    options.ClientSecret = Require(section, "ClientSecret", provider.Name);
                    options.SignInScheme = AuthSchemes.External;
                    options.SaveTokens = false;
                });
                break;

            case "facebook":
                builder.AddFacebook(provider.Scheme, options =>
                {
                    options.AppId = Require(section, "AppId", provider.Name);
                    options.AppSecret = Require(section, "AppSecret", provider.Name);
                    options.SignInScheme = AuthSchemes.External;
                    options.SaveTokens = false;
                    options.Fields.Add("email");
                });
                break;

            default:
                throw new InvalidOperationException(
                    $"Provider '{provider.Name}' is enabled but has no registered authentication handler.");
        }
    }

    private static string Require(IConfigurationSection section, string key, string providerName)
    {
        var value = section[key];

        return string.IsNullOrWhiteSpace(value)
            ? throw new InvalidOperationException(
                $"Missing configuration 'Authentication:{providerName}:{key}'. Provide it via user-secrets or environment variables.")
            : value;
    }
}
