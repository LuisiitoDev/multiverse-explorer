namespace Favorites.Api.Application.Common;

public enum ErrorType
{
    None,
    Validation,
    NotFound,
    Conflict
}

public record Error(ErrorType Type, string Message)
{
    public static readonly Error None = new(ErrorType.None, string.Empty);

    public static Error Validation(string message) => new(ErrorType.Validation, message);
    public static Error NotFound(string message) => new(ErrorType.NotFound, message);
    public static Error Conflict(string message) => new(ErrorType.Conflict, message);
}

public class Result<T>
{
    private Result(T? value, Error error, bool isSuccess)
    {
        Value = value;
        Error = error;
        IsSuccess = isSuccess;
    }

    public T? Value { get; }
    public Error Error { get; }
    public bool IsSuccess { get; }
    public bool IsFailure => !IsSuccess;

    public static Result<T> Success(T value) => new(value, Error.None, true);
    public static Result<T> Failure(Error error) => new(default, error, false);
}
