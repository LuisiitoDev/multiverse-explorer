namespace Favorites.Api.Authentication;

/// <summary>Short-circuits with 401 when the session carries no internal user id, so handlers can rely on <see cref="ClaimsPrincipalExtensions.GetRequiredUserId"/>.</summary>
public class RequireUserIdFilter : IEndpointFilter
{
    public async ValueTask<object?> InvokeAsync(EndpointFilterInvocationContext context, EndpointFilterDelegate next) =>
        context.HttpContext.User.GetUserId() is null
            ? Results.Unauthorized()
            : await next(context);
}

public static class RequireUserIdExtensions
{
    public static TBuilder RequireUserId<TBuilder>(this TBuilder builder) where TBuilder : IEndpointConventionBuilder =>
        builder.AddEndpointFilter<TBuilder, RequireUserIdFilter>();
}
