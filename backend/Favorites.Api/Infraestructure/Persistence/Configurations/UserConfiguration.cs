using Favorites.Api.Domain.Models;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;

namespace Favorites.Api.Infraestructure.Persistence.Configurations;

public class UserConfiguration : IEntityTypeConfiguration<UserModel>
{
    public void Configure(EntityTypeBuilder<UserModel> builder)
    {
        builder.ToTable("Users");

        builder.HasKey(u => u.Id);

        builder.Property(u => u.Id)
            .HasDefaultValueSql("NEWID()");

        builder.Property(u => u.DisplayName)
            .IsRequired()
            .HasMaxLength(200);

        builder.Property(u => u.Email)
            .IsRequired()
            .HasMaxLength(320);

        builder.Property(u => u.CreateAt)
            .HasColumnType("datetime2")
            .HasDefaultValueSql("SYSUTCDATETIME()");

        builder.Property(u => u.UpdateAt)
            .HasColumnType("datetime2");

        // Not unique: two providers may legitimately report the same email for distinct identities.
        builder.HasIndex(u => u.Email);
    }
}
