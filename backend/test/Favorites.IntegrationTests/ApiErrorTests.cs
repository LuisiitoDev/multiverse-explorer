using System.Net;
using System.Net.Http.Json;
using System.Security.Claims;
using System.Text.Encodings.Web;
using System.Text.Json;
using Favorites.Application.Abstractions;
using Favorites.Domain.Models;
using Microsoft.AspNetCore.Antiforgery;
using Microsoft.AspNetCore.Authentication;
using Microsoft.AspNetCore.Hosting;
using Microsoft.AspNetCore.Mvc.Testing;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.DependencyInjection.Extensions;
using Microsoft.Extensions.Logging;
using Microsoft.Extensions.Options;
using NSubstitute;

namespace Favorites.IntegrationTests;

public class ApiErrorTests
{
    [Fact]
    public async Task UnexpectedException_ReturnsGenericProblemWithoutLeakingDetails()
    {
        await using var factory = new ApiFactory();
        using var client = factory.CreateClient(new() { BaseAddress = new Uri("https://localhost") });

        var response = await client.GetAsync("/api/auth/providers");

        Assert.Equal(HttpStatusCode.InternalServerError, response.StatusCode);
        Assert.Equal("application/problem+json", response.Content.Headers.ContentType?.MediaType);
        var body = await response.Content.ReadAsStringAsync();
        using var problem = JsonDocument.Parse(body);
        Assert.Equal(500, problem.RootElement.GetProperty("status").GetInt32());
        Assert.DoesNotContain("secret-database-details", body);
        Assert.DoesNotContain("InvalidOperationException", body);
    }

    [Fact]
    public async Task ConcurrentDuplicateFavorite_ReturnsConflictProblem()
    {
        await using var factory = new ApiFactory();
        using var client = factory.CreateClient(new() { BaseAddress = new Uri("https://localhost") });

        var response = await client.PostAsJsonAsync("/api/favorites/", new { resourceType = "character", resourceId = 1 });

        Assert.Equal(HttpStatusCode.Conflict, response.StatusCode);
        Assert.Equal("application/problem+json", response.Content.Headers.ContentType?.MediaType);
        using var problem = JsonDocument.Parse(await response.Content.ReadAsStringAsync());
        Assert.Equal(409, problem.RootElement.GetProperty("status").GetInt32());
    }

    private sealed class ApiFactory : WebApplicationFactory<Program>
    {
        protected override void ConfigureWebHost(IWebHostBuilder builder)
        {
            builder.UseEnvironment("Production");
            builder.UseSetting("Database:MigrateOnStartup", "false");
            for (var i = 0; i < 3; i++)
                builder.UseSetting($"Authentication:Providers:{i}:Enabled", "false");

            builder.ConfigureServices(services =>
            {
                var auth = Substitute.For<IAuthService>();
                auth.GetProviders().Returns(_ => throw new InvalidOperationException("secret-database-details"));
                services.RemoveAll<IAuthService>();
                services.AddSingleton(auth);

                var favorites = Substitute.For<IFavoriteRepository>();
                favorites.TryAddAsync(Arg.Any<FavoriteModel>(), Arg.Any<CancellationToken>()).Returns(false);
                services.RemoveAll<IFavoriteRepository>();
                services.AddSingleton(favorites);
                var users = Substitute.For<IUserRepository>();
                users.ExistsAsync(Arg.Any<Guid>(), Arg.Any<CancellationToken>()).Returns(true);
                services.RemoveAll<IUserRepository>();
                services.AddSingleton(users);

                // These tests exercise HTTP error mapping without a database or OAuth provider.
                var antiforgery = Substitute.For<IAntiforgery>();
                antiforgery.GetAndStoreTokens(Arg.Any<Microsoft.AspNetCore.Http.HttpContext>())
                    .Returns(new AntiforgeryTokenSet(null, "cookie", "form", "header"));
                antiforgery.ValidateRequestAsync(Arg.Any<Microsoft.AspNetCore.Http.HttpContext>())
                    .Returns(Task.CompletedTask);
                services.RemoveAll<IAntiforgery>();
                services.AddSingleton(antiforgery);
                services.AddAuthentication(options =>
                {
                    options.DefaultAuthenticateScheme = "Test";
                    options.DefaultChallengeScheme = "Test";
                }).AddScheme<AuthenticationSchemeOptions, TestAuthenticationHandler>("Test", _ => { });
            });
        }
    }

    private sealed class TestAuthenticationHandler(
        IOptionsMonitor<AuthenticationSchemeOptions> options,
        ILoggerFactory logger,
        UrlEncoder encoder) : AuthenticationHandler<AuthenticationSchemeOptions>(options, logger, encoder)
    {
        protected override Task<AuthenticateResult> HandleAuthenticateAsync()
        {
            var principal = new ClaimsPrincipal(new ClaimsIdentity(
                [new Claim(ClaimTypes.NameIdentifier, "a1c3bcca-0925-403f-a6b7-4a47acfa5209")], "Test"));
            return Task.FromResult(AuthenticateResult.Success(new AuthenticationTicket(principal, "Test")));
        }
    }
}
