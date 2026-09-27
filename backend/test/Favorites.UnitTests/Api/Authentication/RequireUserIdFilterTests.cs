using System.Security.Claims;
using Favorites.Api.Authentication;
using Microsoft.AspNetCore.Http;

namespace Favorites.UnitTests.Api.Authentication;

public class RequireUserIdFilterTests
{
    private static EndpointFilterInvocationContext CreateContext(ClaimsPrincipal user) =>
        EndpointFilterInvocationContext.Create(new DefaultHttpContext { User = user });

    [Fact]
    public async Task InvokeAsync_WhenPrincipalHasUserId_CallsNextAndReturnsItsResult()
    {
        var context = CreateContext(ClaimsPrincipalExtensions.CreateApplicationPrincipal(Guid.NewGuid(), "Rick Sanchez", "rick@example.com"));
        var expected = Results.Ok();
        var filter = new RequireUserIdFilter();

        var result = await filter.InvokeAsync(context, _ => ValueTask.FromResult<object?>(expected));

        Assert.Same(expected, result);
    }

    [Fact]
    public async Task InvokeAsync_WhenPrincipalHasNoUserId_ReturnsUnauthorizedWithoutCallingNext()
    {
        var context = CreateContext(new ClaimsPrincipal(new ClaimsIdentity()));
        var filter = new RequireUserIdFilter();
        var nextCalled = false;

        var result = await filter.InvokeAsync(context, _ =>
        {
            nextCalled = true;
            return ValueTask.FromResult<object?>(Results.Ok());
        });

        Assert.False(nextCalled);
        var status = Assert.IsAssignableFrom<IStatusCodeHttpResult>(result);
        Assert.Equal(StatusCodes.Status401Unauthorized, status.StatusCode);
    }
}
