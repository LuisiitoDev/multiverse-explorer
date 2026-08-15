namespace Favorites.Api.Application.Abstractions;

/// <summary>A hand-rolled validator for <typeparamref name="T"/>, resolved by <see cref="IValidationService"/>.</summary>
public interface IValidator<in T>
{
    /// <summary>Returns the validation error messages, or an empty list when <paramref name="instance"/> is valid.</summary>
    IReadOnlyList<string> Validate(T instance);
}
