using Favorites.Api.Application;
using Favorites.Api.Endpoints;
using Favorites.Api.Infraestructure;
using Favorites.Api.Infraestructure.Authentication;
using Favorites.Api.Infraestructure.Persistence;
using Microsoft.AspNetCore.HttpOverrides;

var builder = WebApplication.CreateBuilder(args);

builder.Services.AddOpenApi();
builder.Services.AddProblemDetails();
builder.Services.AddInfraestructure(builder.Configuration, builder.Environment);
builder.Services.AddApplication();

// Required behind nginx so OAuth redirect URIs are generated as https.
// KnownNetworks/KnownProxies are cleared because the nginx container's IP is not
// static across restarts. This is safe only because docker-compose does not publish
// the api service's port (see "expose", not "ports"), so nginx is the only caller
// that can ever reach it; do not carry this pattern into a topology where api is
// reachable directly, as it would let a caller spoof its own X-Forwarded-* headers.
builder.Services.Configure<ForwardedHeadersOptions>(options =>
{
    options.ForwardedHeaders = ForwardedHeaders.XForwardedFor | ForwardedHeaders.XForwardedProto | ForwardedHeaders.XForwardedHost;
    options.KnownNetworks.Clear();
    options.KnownProxies.Clear();
});

var app = builder.Build();

await app.MigrateDatabaseAsync();

app.UseForwardedHeaders();

if (app.Environment.IsDevelopment())
{
    app.MapOpenApi();
}

app.UseHttpsRedirection();

app.UseAuthentication();
app.UseAuthorization();
app.UseAntiforgeryTokenCookie();

app.MapAuthEndpoints();
app.MapFavoriteEndpoints();

app.Run();
