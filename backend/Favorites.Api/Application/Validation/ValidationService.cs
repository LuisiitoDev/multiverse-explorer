using Favorites.Api.Application.Abstractions;
using Favorites.Api.Application.Common;

namespace Favorites.Api.Application.Validation;

public class ValidationService(IServiceProvider serviceProvider) : IValidationService
{
    public Task<Error?> ValidateAsync<T>(T instance, CancellationToken cancellationToken = default)
    {
        if (serviceProvider.GetService(typeof(IValidator<T>)) is not IValidator<T> validator)
        {
            return Task.FromResult<Error?>(null);
        }

        var errors = validator.Validate(instance);

        return Task.FromResult(errors.Count == 0 ? null : Error.Validation(string.Join(" ", errors)));
    }
}
