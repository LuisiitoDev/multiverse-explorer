using Favorites.Api.Domain.Models;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;

namespace Favorites.Api.Infraestructure.Persistence.Configurations;

public class FavoriteConfiguration : IEntityTypeConfiguration<FavoriteModel>
{
    public void Configure(EntityTypeBuilder<FavoriteModel> builder)
    {
        builder.ToTable("Favorites");

        builder.HasKey(f => f.Id);

        builder.Property(f => f.Id)
            .UseIdentityColumn();

        builder.Property(f => f.ResourceType)
            .IsRequired()
            .HasMaxLength(50);

        builder.Property(f => f.ResourceId)
            .IsRequired();

        builder.Property(f => f.CreateAt)
            .HasColumnType("datetime2")
            .HasDefaultValueSql("SYSUTCDATETIME()");

        builder.HasIndex(f => new { f.UserId, f.ResourceType, f.ResourceId })
            .IsUnique();

        builder.HasOne(f => f.User)
            .WithMany(u => u.Favorites)
            .HasForeignKey(f => f.UserId)
            .OnDelete(DeleteBehavior.Cascade);
    }
}
