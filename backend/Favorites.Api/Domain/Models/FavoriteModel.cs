namespace Favorites.Api.Domain.Models;

public class FavoriteModel
{
    public long Id { get; set; }
    public Guid UserId { get; set; }
    public required string ResourceType { get; set; }
    public int ResourceId { get; set; }
    public DateTime CreateAt { get; set; }
    public UserModel? User { get; set; }
}
