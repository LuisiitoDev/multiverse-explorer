using Favorites.Application.Common;

namespace Favorites.Application.Abstractions;

/// <summary>Decouples the application services from the concrete validation library.</summary>
public interface IValidationService
{
    Task<Error?> ValidateAsync<T>(T instance, CancellationToken cancellationToken = default);
}
