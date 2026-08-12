using Favorites.Api.Application.Common;

namespace Favorites.Api.Application.Abstractions;

/// <summary>Decouples the application services from the concrete validation library.</summary>
public interface IValidationService
{
    Task<Error?> ValidateAsync<T>(T instance, CancellationToken cancellationToken = default);
}
