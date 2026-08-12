using Microsoft.EntityFrameworkCore;

namespace Favorites.Api.Infraestructure.Persistence;

public static class DatabaseMigrator
{
    /// <summary>Opt-in via Database:MigrateOnStartup; unsuitable for multi-replica production rollouts.</summary>
    public static async Task MigrateDatabaseAsync(this WebApplication app)
    {
        if (!app.Configuration.GetValue<bool>("Database:MigrateOnStartup"))
        {
            return;
        }

        using var scope = app.Services.CreateScope();
        var context = scope.ServiceProvider.GetRequiredService<FavoritesDbContext>();

        await context.Database.MigrateAsync();
    }
}
