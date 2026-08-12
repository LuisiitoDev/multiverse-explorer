namespace Favorites.Api.Domain.Models;

public class ExternalLoginModel
{
    public long Id { get; set; }
    public Guid UserId { get; set; }
    public required string Provider { get; set; }
    public required string ProviderUserId { get; set; }
    public DateTime CreateAt { get; set; }
    public UserModel? User { get; set; }
}
