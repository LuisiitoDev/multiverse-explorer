using Favorites.Api.Application.Abstractions;
using Favorites.Api.Application.Common;
using Favorites.Api.Application.DTOs;
using Favorites.Api.Infraestructure.Authentication;

namespace Favorites.Api.Endpoints;

public static class FavoriteEndpoints
{
    public static IEndpointRouteBuilder MapFavoriteEndpoints(this IEndpointRouteBuilder app)
    {
        var group = app.MapGroup("/api/favorites")
            .WithTags("Favorites")
            .RequireAuthorization();

        group.MapGet("/", async (
            string? type,
            HttpContext context,
            IFavoriteService service,
            CancellationToken cancellationToken) =>
        {
            var userId = context.User.GetUserId();
            if (userId is null)
            {
                return Results.Unauthorized();
            }

            var result = await service.GetAsync(new GetFavoritesQuery(userId.Value, type), cancellationToken);
            return result.IsSuccess ? Results.Ok(result.Value) : ToProblem(result.Error);
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
            var userId = context.User.GetUserId();
            if (userId is null)
            {
                return Results.Unauthorized();
            }

            var command = new CreateFavoriteCommand(userId.Value, request.ResourceType, request.ResourceId);
            var result = await service.CreateAsync(command, cancellationToken);

            return result.IsSuccess
                ? Results.Created($"/api/favorites/{result.Value!.Id}", result.Value)
                : ToProblem(result.Error);
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
            var userId = context.User.GetUserId();
            if (userId is null)
            {
                return Results.Unauthorized();
            }

            var result = await service.DeleteAsync(new DeleteFavoriteCommand(id, userId.Value), cancellationToken);
            return result.IsSuccess ? Results.NoContent() : ToProblem(result.Error);
        })
        .WithName("DeleteFavorite")
        .AddEndpointFilter<AntiforgeryFilter>()
        .Produces(StatusCodes.Status204NoContent)
        .ProducesProblem(StatusCodes.Status400BadRequest)
        .ProducesProblem(StatusCodes.Status404NotFound);

        return app;
    }

    private static IResult ToProblem(Error error) => error.Type switch
    {
        ErrorType.NotFound => Results.Problem(error.Message, statusCode: StatusCodes.Status404NotFound),
        ErrorType.Conflict => Results.Problem(error.Message, statusCode: StatusCodes.Status409Conflict),
        _ => Results.Problem(error.Message, statusCode: StatusCodes.Status400BadRequest)
    };
}
