using Favorites.Api.Authentication;
using Favorites.Api.Contracts;
using Favorites.Application.Abstractions;
using Favorites.Application.DTOs;

namespace Favorites.Api.Endpoints;

public static class FavoriteEndpoints
{
    public static IEndpointRouteBuilder MapFavoriteEndpoints(this IEndpointRouteBuilder app)
    {
        var group = app.MapGroup("/api/favorites")
            .WithTags("Favorites")
            .RequireAuthorization()
            .RequireUserId();

        group.MapGet("/", async (
            string? type,
            HttpContext context,
            IFavoriteService service,
            CancellationToken cancellationToken) =>
        {
            var userId = context.User.GetRequiredUserId();

            var result = await service.GetAsync(new GetFavoritesQuery(userId, type), cancellationToken);
            return result.IsSuccess ? Results.Ok(result.Value) : result.Error.ToProblem();
        })
        .WithName("GetFavorites")
        .Produces<IReadOnlyList<FavoriteResponse>>()
        .ProducesProblem(StatusCodes.Status400BadRequest);

        group.MapPost("/", async (
            CreateFavoriteRequest request,
            HttpContext context,
            IFavoriteService service,
            CancellationToken cancellationToken) =>
        {
            var userId = context.User.GetRequiredUserId();

            var command = new CreateFavoriteCommand(userId, request.ResourceType, request.ResourceId);
            var result = await service.CreateAsync(command, cancellationToken);

            return result.IsSuccess
                ? Results.Created($"/api/favorites/{result.Value!.Id}", result.Value)
                : result.Error.ToProblem();
        })
        .WithName("CreateFavorite")
        .AddEndpointFilter<AntiforgeryFilter>()
        .Produces<FavoriteResponse>(StatusCodes.Status201Created)
        .ProducesProblem(StatusCodes.Status400BadRequest)
        .ProducesProblem(StatusCodes.Status404NotFound)
        .ProducesProblem(StatusCodes.Status409Conflict);

        group.MapDelete("/{id:long}", async (
            long id,
            HttpContext context,
            IFavoriteService service,
            CancellationToken cancellationToken) =>
        {
            var userId = context.User.GetRequiredUserId();

            var result = await service.DeleteAsync(new DeleteFavoriteCommand(id, userId), cancellationToken);
            return result.IsSuccess ? Results.NoContent() : result.Error.ToProblem();
        })
        .WithName("DeleteFavorite")
        .AddEndpointFilter<AntiforgeryFilter>()
        .Produces(StatusCodes.Status204NoContent)
        .ProducesProblem(StatusCodes.Status400BadRequest)
        .ProducesProblem(StatusCodes.Status404NotFound);

        return app;
    }
}
