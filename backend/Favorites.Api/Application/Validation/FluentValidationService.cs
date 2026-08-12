using Favorites.Api.Application.Abstractions;
using Favorites.Api.Application.Common;
using FluentValidation;

namespace Favorites.Api.Application.Validation;

public class FluentValidationService(IServiceProvider serviceProvider) : IValidationService
{
    public async Task<Error?> ValidateAsync<T>(T instance, CancellationToken cancellationToken = default)
    {
        if (serviceProvider.GetService(typeof(IValidator<T>)) is not IValidator<T> validator)
        {
            return null;
        }

        var result = await validator.ValidateAsync(instance, cancellationToken);

        return result.IsValid
            ? null
            : Error.Validation(string.Join(" ", result.Errors.Select(e => e.ErrorMessage)));
    }
}
