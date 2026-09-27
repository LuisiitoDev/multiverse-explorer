using Favorites.Application.Common;

namespace Favorites.Api.Endpoints;

internal static class ErrorResults
{
    /// <summary>Translates an application error into the matching HTTP problem response.</summary>
    public static IResult ToProblem(this Error error) => error.Type switch
    {
        ErrorType.NotFound => Results.Problem(error.Message, statusCode: StatusCodes.Status404NotFound),
        ErrorType.Conflict => Results.Problem(error.Message, statusCode: StatusCodes.Status409Conflict),
        _ => Results.Problem(error.Message, statusCode: StatusCodes.Status400BadRequest)
    };
}
