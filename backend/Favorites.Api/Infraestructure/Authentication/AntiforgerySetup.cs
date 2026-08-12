using Microsoft.AspNetCore.Antiforgery;

namespace Favorites.Api.Infraestructure.Authentication;

public static class AntiforgerySetup
{
    public const string CookieName = "XSRF-TOKEN";
    public const string HeaderName = "X-CSRF-TOKEN";

    public static IServiceCollection AddApiAntiforgery(this IServiceCollection services)
    {
        services.AddAntiforgery(options =>
        {
            options.HeaderName = HeaderName;
            options.Cookie.Name = "__Host-favorites.csrf";
            options.Cookie.HttpOnly = true;
            options.Cookie.SecurePolicy = CookieSecurePolicy.Always;
            options.Cookie.SameSite = SameSiteMode.Lax;
            options.Cookie.Path = "/";
        });

        return services;
    }

    /// <summary>Publishes the request token in a JS-readable cookie so the SPA can echo it back in the header.</summary>
    public static IApplicationBuilder UseAntiforgeryTokenCookie(this IApplicationBuilder app) =>
        app.Use(async (context, next) =>
        {
            if (HttpMethods.IsGet(context.Request.Method) && context.Request.Path.StartsWithSegments("/api"))
            {
                var antiforgery = context.RequestServices.GetRequiredService<IAntiforgery>();
                var tokens = antiforgery.GetAndStoreTokens(context);

                if (tokens.RequestToken is not null)
                {
                    context.Response.Cookies.Append(CookieName, tokens.RequestToken, new CookieOptions
                    {
                        HttpOnly = false,
                        Secure = true,
                        SameSite = SameSiteMode.Lax,
                        Path = "/"
                    });
                }
            }

            await next();
        });
}

public class AntiforgeryFilter : IEndpointFilter
{
    public async ValueTask<object?> InvokeAsync(EndpointFilterInvocationContext context, EndpointFilterDelegate next)
    {
        var antiforgery = context.HttpContext.RequestServices.GetRequiredService<IAntiforgery>();

        try
        {
            await antiforgery.ValidateRequestAsync(context.HttpContext);
        }
        catch (AntiforgeryValidationException)
        {
            return Results.Problem("Invalid or missing CSRF token.", statusCode: StatusCodes.Status400BadRequest);
        }

        return await next(context);
    }
}
