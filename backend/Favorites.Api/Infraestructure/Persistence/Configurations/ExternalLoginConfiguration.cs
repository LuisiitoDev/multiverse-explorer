using Favorites.Api.Domain.Models;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;

namespace Favorites.Api.Infraestructure.Persistence.Configurations;

public class ExternalLoginConfiguration : IEntityTypeConfiguration<ExternalLoginModel>
{
    public void Configure(EntityTypeBuilder<ExternalLoginModel> builder)
    {
        builder.ToTable("ExternalLogins");

        builder.HasKey(e => e.Id);

        builder.Property(e => e.Id)
            .UseIdentityColumn();

        builder.Property(e => e.Provider)
            .IsRequired()
            .HasMaxLength(50);

        builder.Property(e => e.ProviderUserId)
            .IsRequired()
            .HasMaxLength(200);

        builder.HasIndex(e => new { e.Provider, e.ProviderUserId })
            .IsUnique();

        builder.HasOne(e => e.User)
            .WithMany()
            .HasForeignKey(e => e.UserId)
            .OnDelete(DeleteBehavior.Cascade);
    }
}
