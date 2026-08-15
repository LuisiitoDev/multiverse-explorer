using Favorites.Api.Application.Mapping;
using Favorites.Api.Domain.Models;

namespace Favorites.Api.Tests.Application.Mapping;

public class FavoriteMapperTests
{
    [Fact]
    public void ToResponse_MapsAllFields()
    {
        var favorite = new FavoriteModel
        {
            Id = 42,
            UserId = Guid.NewGuid(),
            ResourceType = "character",
            ResourceId = 7,
            CreateAt = new DateTime(2026, 1, 1, 0, 0, 0, DateTimeKind.Utc)
        };

        var response = favorite.ToResponse();

        Assert.Equal(favorite.Id, response.Id);
        Assert.Equal(favorite.UserId, response.UserId);
        Assert.Equal(favorite.ResourceType, response.ResourceType);
        Assert.Equal(favorite.ResourceId, response.ResourceId);
        Assert.Equal(favorite.CreateAt, response.CreateAt);
    }
}
