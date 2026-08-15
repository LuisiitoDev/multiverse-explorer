using Favorites.Api.Domain;

namespace Favorites.Api.Tests.Domain;

public class ResourceTypesTests
{
    [Theory]
    [InlineData("character")]
    [InlineData("Character")]
    [InlineData("EPISODE")]
    [InlineData("location")]
    public void IsValid_WithKnownTypeAnyCasing_ReturnsTrue(string value) =>
        Assert.True(ResourceTypes.IsValid(value));

    [Theory]
    [InlineData("planet")]
    [InlineData("")]
    [InlineData(null)]
    public void IsValid_WithUnknownOrEmptyType_ReturnsFalse(string? value) =>
        Assert.False(ResourceTypes.IsValid(value));

    [Fact]
    public void Normalize_LowercasesValue() =>
        Assert.Equal("character", ResourceTypes.Normalize("CHARACTER"));
}
