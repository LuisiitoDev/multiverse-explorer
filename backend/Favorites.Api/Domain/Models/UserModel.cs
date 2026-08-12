namespace Favorites.Api.Domain.Models;

public class UserModel
{
    public Guid Id { get; set; }
    public required string DisplayName { get; set; }
    public required string Email { get; set; }
    public DateTime CreateAt { get; set; }

}
