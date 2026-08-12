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
