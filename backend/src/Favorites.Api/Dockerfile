FROM mcr.microsoft.com/dotnet/aspnet:10.0 AS base
USER $APP_UID
WORKDIR /app
EXPOSE 8080

FROM mcr.microsoft.com/dotnet/sdk:10.0 AS build
ARG BUILD_CONFIGURATION=Release
WORKDIR /src
COPY backend/src ./backend/src
WORKDIR /src/backend/src/Favorites.Api
RUN dotnet restore Favorites.Api.csproj

FROM build AS publish
ARG BUILD_CONFIGURATION=Release
RUN dotnet publish Favorites.Api.csproj -c $BUILD_CONFIGURATION -o /app/publish /p:UseAppHost=false --no-restore

FROM base AS final
WORKDIR /app
COPY --from=publish /app/publish .
ENTRYPOINT ["dotnet", "Favorites.Api.dll"]