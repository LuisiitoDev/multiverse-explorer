using Favorites.Api.Application.Abstractions;
using Favorites.Api.Application.Common;
using Favorites.Api.Application.DTOs;

namespace Favorites.Api.Endpoints;

public static class FavoriteEndpoints
{
    public static IEndpointRouteBuilder MapFavoriteEndpoints(this IEndpointRouteBuilder app)
    {
        var group = app.MapGroup("/favorites").WithTags("Favorites");

        group.MapGet("/", async (
            Guid userId,
            string? type,
            IFavoriteService service,
            CancellationToken cancellationToken) =>
        {
            var result = await service.GetAsync(new GetFavoritesQuery(userId, type), cancellationToken);
            return result.IsSuccess ? Results.Ok(result.Value) : ToProblem(result.Error);
        })
        .WithName("GetFavorites")
        .Produces<IReadOnlyList<FavoriteResponse>>()
        .ProducesProblem(StatusCodes.Status400BadRequest);

        group.MapPost("/", async (
            CreateFavoriteRequest request,
            IFavoriteService service,
            CancellationToken cancellationToken) =>
        {
            var result = await service.CreateAsync(request, cancellationToken);
            return result.IsSuccess
                ? Results.Created($"/favorites/{result.Value!.Id}", result.Value)
                : ToProblem(result.Error);
        })
        .WithName("CreateFavorite")
        .Produces<FavoriteResponse>(StatusCodes.Status201Created)
        .ProducesProblem(StatusCodes.Status400BadRequest)
        .ProducesProblem(StatusCodes.Status404NotFound)
        .ProducesProblem(StatusCodes.Status409Conflict);

        group.MapDelete("/{id:long}", async (
            long id,
            Guid userId,
            IFavoriteService service,
            CancellationToken cancellationToken) =>
        {
            var result = await service.DeleteAsync(new DeleteFavoriteCommand(id, userId), cancellationToken);
            return result.IsSuccess ? Results.NoContent() : ToProblem(result.Error);
        })
        .WithName("DeleteFavorite")
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
