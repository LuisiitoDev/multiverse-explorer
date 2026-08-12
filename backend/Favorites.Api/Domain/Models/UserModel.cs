namespace Favorites.Api.Domain.Models;

public class UserModel
{
    public Guid Id { get; set; }
    public required string DisplayName { get; set; }
    public required string Email { get; set; }
    public DateTime CreateAt { get; set; }
    public DateTime? UpdateAt { get; set; }
    public ICollection<FavoriteModel> Favorites { get; set; } = [];
    public ICollection<ExternalLoginModel> ExternalLogins { get; set; } = [];
}
