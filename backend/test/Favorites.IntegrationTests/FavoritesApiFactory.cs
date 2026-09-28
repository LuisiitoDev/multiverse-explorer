using Favorites.Domain.Models;
using Favorites.Infrastructure.Persistence;
using Microsoft.AspNetCore.Authentication;
using Microsoft.AspNetCore.Hosting;
using Microsoft.AspNetCore.Mvc.Testing;
using Microsoft.AspNetCore.TestHost;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Infrastructure;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.DependencyInjection.Extensions;

namespace Favorites.IntegrationTests;

/// <summary>Hosts the real pipeline with SQL Server swapped for EF InMemory and OAuth swapped for <see cref="TestAuthHandler"/>.</summary>
public class FavoritesApiFactory : WebApplicationFactory<Program>
{
    private readonly string _databaseName = $"favorites-{Guid.NewGuid()}";

    protected override void ConfigureWebHost(IWebHostBuilder builder)
    {
        builder.UseEnvironment("Development");
        builder.UseSetting("Database:MigrateOnStartup", "false");

        builder.ConfigureTestServices(services =>
        {
            services.RemoveAll<DbContextOptions<FavoritesDbContext>>();
            services.RemoveAll<IDbContextOptionsConfiguration<FavoritesDbContext>>();
            services.AddDbContext<FavoritesDbContext>(options => options.UseInMemoryDatabase(_databaseName));

            services.AddAuthentication()
                .AddScheme<AuthenticationSchemeOptions, TestAuthHandler>(TestAuthHandler.SchemeName, _ => { });
            services.PostConfigure<AuthenticationOptions>(options =>
            {
                options.DefaultScheme = TestAuthHandler.SchemeName;
                options.DefaultAuthenticateScheme = TestAuthHandler.SchemeName;
                options.DefaultChallengeScheme = TestAuthHandler.SchemeName;
            });
        });
    }

    /// <summary>A client over https so the Secure <c>__Host-</c> antiforgery cookies round-trip.</summary>
    public HttpClient CreateClientFor(string user)
    {
        var client = CreateClient(new WebApplicationFactoryClientOptions { BaseAddress = new Uri("https://localhost") });
        client.DefaultRequestHeaders.Add(TestAuthHandler.UserHeader, user);
        return client;
    }

    public async Task<Guid> SeedUserAsync()
    {
        await using var scope = Services.CreateAsyncScope();
        var db = scope.ServiceProvider.GetRequiredService<FavoritesDbContext>();
        var user = new UserModel { Id = Guid.NewGuid(), DisplayName = "Rick Sanchez", Email = $"{Guid.NewGuid()}@example.com" };
        db.Users.Add(user);
        await db.SaveChangesAsync();
        return user.Id;
    }
}
