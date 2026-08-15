using Favorites.Api.Infraestructure.Authentication;
using Microsoft.AspNetCore.Antiforgery;
using Microsoft.AspNetCore.Http;
using Microsoft.Extensions.DependencyInjection;
using NSubstitute;

namespace Favorites.Api.Tests.Infraestructure.Authentication;

public class AntiforgeryFilterTests
{
    private static EndpointFilterInvocationContext CreateContext(IAntiforgery antiforgery)
    {
        var services = new ServiceCollection();
        services.AddSingleton(antiforgery);

        var httpContext = new DefaultHttpContext
        {
            RequestServices = services.BuildServiceProvider()
        };

        return EndpointFilterInvocationContext.Create(httpContext);
    }

    [Fact]
    public async Task InvokeAsync_WhenTokenIsValid_CallsNextAndReturnsItsResult()
    {
        var antiforgery = Substitute.For<IAntiforgery>();
        antiforgery.ValidateRequestAsync(Arg.Any<HttpContext>()).Returns(Task.CompletedTask);
        var context = CreateContext(antiforgery);
        var expected = Results.Ok();
        var filter = new AntiforgeryFilter();

        var result = await filter.InvokeAsync(context, _ => ValueTask.FromResult<object?>(expected));

        Assert.Same(expected, result);
    }

    [Fact]
    public async Task InvokeAsync_WhenTokenIsInvalid_ReturnsBadRequestProblemWithoutCallingNext()
    {
        var antiforgery = Substitute.For<IAntiforgery>();
        antiforgery.ValidateRequestAsync(Arg.Any<HttpContext>())
            .Returns(Task.FromException(new AntiforgeryValidationException("invalid token")));
        var context = CreateContext(antiforgery);
        var filter = new AntiforgeryFilter();
        var nextCalled = false;

        var result = await filter.InvokeAsync(context, _ =>
        {
            nextCalled = true;
            return ValueTask.FromResult<object?>(Results.Ok());
        });

        Assert.False(nextCalled);
        var problem = Assert.IsAssignableFrom<IStatusCodeHttpResult>(result);
        Assert.Equal(StatusCodes.Status400BadRequest, problem.StatusCode);
    }
}
