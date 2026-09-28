using Favorites.Api.Authentication;
using Favorites.Api.Contracts;
using Favorites.Application.Abstractions;
using Favorites.Application.Common;
using Favorites.Application.DTOs;
using Microsoft.AspNetCore.Authentication;

namespace Favorites.Api.Endpoints;

public static class AuthEndpoints
{
    public static IEndpointRouteBuilder MapAuthEndpoints(this IEndpointRouteBuilder app)
    {
        var group = app.MapGroup("/api/auth").WithTags("Auth");

        group.MapGet("/providers", (IAuthService service) => Results.Ok(service.GetProviders()))
            .WithName("GetAuthProviders")
            .AllowAnonymous()
            .Produces<IReadOnlyList<ExternalProviderResponse>>();

        group.MapGet("/login/{provider}", (
            string provider,
            string? returnUrl,
            HttpContext context,
            IExternalProviderRegistry registry) =>
        {
            var descriptor = registry.Find(provider);
            if (descriptor is null)
            {
                return Results.Problem($"Unsupported provider '{provider}'.", statusCode: StatusCodes.Status400BadRequest);
            }

            var properties = new AuthenticationProperties
            {
                RedirectUri = $"/api/auth/callback/{descriptor.Name}"
            };
            properties.Items["returnUrl"] = RedirectSafety.SafeReturnUrl(returnUrl, "/");

            return Results.Challenge(properties, [descriptor.Scheme]);
        })
        .WithName("ExternalLogin")
        .AllowAnonymous();

        group.MapGet("/callback/{provider}", async (
            string provider,
            HttpContext context,
            IExternalProviderRegistry registry,
            IUserProvisioningService provisioning,
            CancellationToken cancellationToken) =>
        {
            var descriptor = registry.Find(provider);
            if (descriptor is null)
            {
                return Results.Problem($"Unsupported provider '{provider}'.", statusCode: StatusCodes.Status400BadRequest);
            }

            // Validates OAuth state/correlation; failure here means a tampered or expired callback.
            var result = await context.AuthenticateAsync(AuthSchemes.External);
            if (!result.Succeeded || result.Principal is null)
            {
                return Results.Redirect("/?error=external_login_failed");
            }

            var storedReturnUrl = result.Properties?.Items.TryGetValue("returnUrl", out var value) == true ? value : null;
            var returnUrl = RedirectSafety.SafeReturnUrl(storedReturnUrl, "/");

            var identity = result.Principal.ToExternalIdentity(descriptor);
            if (identity is null)
            {
                return Results.Redirect("/?error=missing_provider_identifier");
            }

            var resolved = await provisioning.ResolveAsync(identity, cancellationToken);

            await context.SignOutAsync(AuthSchemes.External);

            if (resolved.IsFailure)
            {
                var reason = resolved.Error.Type == ErrorType.Conflict ? "email_conflict" : "external_login_failed";
                return Results.Redirect($"{returnUrl}?error={reason}");
            }

            await context.SignInAsync(AuthSchemes.Application, resolved.Value!.ToApplicationPrincipal());

            return Results.Redirect(returnUrl);
        })
        .WithName("ExternalLoginCallback")
        .AllowAnonymous();

        group.MapGet("/me", async (
            HttpContext context,
            IAuthService service,
            CancellationToken cancellationToken) =>
        {
            var userId = context.User.GetRequiredUserId();

            var result = await service.GetCurrentUserAsync(userId, cancellationToken);

            return result.IsSuccess
                ? Results.Ok(result.Value)
                : Results.Problem(result.Error.Message, statusCode: StatusCodes.Status404NotFound);
        })
        .WithName("GetCurrentUser")
        .RequireAuthorization()
        .RequireUserId()
        .Produces<UserResponse>();

        group.MapPost("/logout", async (HttpContext context) =>
        {
            await context.SignOutAsync(AuthSchemes.Application);
            return Results.NoContent();
        })
        .WithName("Logout")
        .RequireAuthorization()
        .AddEndpointFilter<AntiforgeryFilter>();

        group.MapPost("/refresh", async (
            HttpContext context,
            IAuthService service,
            CancellationToken cancellationToken) =>
        {
            var userId = context.User.GetRequiredUserId();

            // Re-issue the cookie from current database state so profile changes take effect.
            var result = await service.GetCurrentUserAsync(userId, cancellationToken);
            if (result.IsFailure)
            {
                await context.SignOutAsync(AuthSchemes.Application);
                return Results.Unauthorized();
            }

            var user = result.Value!;
            await context.SignInAsync(
                AuthSchemes.Application,
                ClaimsPrincipalExtensions.CreateApplicationPrincipal(user.Id, user.DisplayName, user.Email));

            return Results.Ok(user);
        })
        .WithName("RefreshSession")
        .RequireAuthorization()
        .RequireUserId()
        .AddEndpointFilter<AntiforgeryFilter>()
        .Produces<UserResponse>();

        group.MapGet("/logins", async (
            HttpContext context,
            IAccountLinkService service,
            CancellationToken cancellationToken) =>
        {
            var userId = context.User.GetRequiredUserId();

            var result = await service.GetLoginsAsync(userId, cancellationToken);

            return result.IsSuccess ? Results.Ok(result.Value) : result.Error.ToProblem();
        })
        .WithName("GetExternalLogins")
        .RequireAuthorization()
        .RequireUserId()
        .Produces<IReadOnlyList<ExternalLoginResponse>>();

        // Returns a URL instead of redirecting: fetch() cannot follow a 302 into a provider.
        group.MapPost("/link/{provider}", (
            string provider,
            string? returnUrl,
            IExternalProviderRegistry registry) =>
        {
            var descriptor = registry.Find(provider);
            if (descriptor is null)
            {
                return Results.Problem($"Unsupported provider '{provider}'.", statusCode: StatusCodes.Status400BadRequest);
            }

            var safeReturnUrl = Uri.EscapeDataString(RedirectSafety.SafeReturnUrl(returnUrl, "/"));

            return Results.Ok(new LinkStartResponse($"/api/auth/link/{descriptor.Name}/start?returnUrl={safeReturnUrl}"));
        })
        .WithName("StartLink")
        .RequireAuthorization()
        .AddEndpointFilter<AntiforgeryFilter>()
        .Produces<LinkStartResponse>();

        group.MapGet("/link/{provider}/start", (
            string provider,
            string? returnUrl,
            IExternalProviderRegistry registry) =>
        {
            var descriptor = registry.Find(provider);
            if (descriptor is null)
            {
                return Results.Problem($"Unsupported provider '{provider}'.", statusCode: StatusCodes.Status400BadRequest);
            }

            var properties = new AuthenticationProperties
            {
                RedirectUri = $"/api/auth/link/{descriptor.Name}/callback"
            };
            properties.Items["returnUrl"] = RedirectSafety.SafeReturnUrl(returnUrl, "/");

            return Results.Challenge(properties, [descriptor.Scheme]);
        })
        .WithName("LinkChallenge")
        .RequireAuthorization();

        group.MapGet("/link/{provider}/callback", async (
            string provider,
            HttpContext context,
            IExternalProviderRegistry registry,
            IAccountLinkService service,
            CancellationToken cancellationToken) =>
        {
            var userId = context.User.GetRequiredUserId();

            var descriptor = registry.Find(provider);
            if (descriptor is null)
            {
                return Results.Problem($"Unsupported provider '{provider}'.", statusCode: StatusCodes.Status400BadRequest);
            }

            var result = await context.AuthenticateAsync(AuthSchemes.External);
            if (!result.Succeeded || result.Principal is null)
            {
                return Results.Redirect("/?error=link_failed");
            }

            var storedReturnUrl = result.Properties?.Items.TryGetValue("returnUrl", out var value) == true ? value : null;
            var returnUrl = RedirectSafety.SafeReturnUrl(storedReturnUrl, "/");

            var identity = result.Principal.ToExternalIdentity(descriptor);

            await context.SignOutAsync(AuthSchemes.External);

            if (identity is null)
            {
                return Results.Redirect($"{returnUrl}?error=missing_provider_identifier");
            }

            var linked = await service.LinkAsync(userId, identity, cancellationToken);

            return linked.IsSuccess
                ? Results.Redirect($"{returnUrl}?linked={descriptor.Name}")
                : Results.Redirect($"{returnUrl}?error=link_conflict");
        })
        .WithName("LinkCallback")
        .RequireAuthorization()
        .RequireUserId();

        group.MapDelete("/link/{provider}", async (
            string provider,
            HttpContext context,
            IAccountLinkService service,
            CancellationToken cancellationToken) =>
        {
            var userId = context.User.GetRequiredUserId();

            var result = await service.UnlinkAsync(userId, provider, cancellationToken);

            return result.IsSuccess ? Results.NoContent() : result.Error.ToProblem();
        })
        .WithName("Unlink")
        .RequireAuthorization()
        .RequireUserId()
        .AddEndpointFilter<AntiforgeryFilter>();

        return app;
    }
}
