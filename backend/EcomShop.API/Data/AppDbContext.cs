using EcomShop.API.Models;
using Microsoft.EntityFrameworkCore;

namespace EcomShop.API.Data;

public class AppDbContext : DbContext
{
    public AppDbContext(DbContextOptions<AppDbContext> options) : base(options) { }

    public DbSet<User> Users => Set<User>();
    public DbSet<Category> Categories => Set<Category>();
    public DbSet<Product> Products => Set<Product>();
    public DbSet<ProductImage> ProductImages => Set<ProductImage>();
    public DbSet<ProductVariant> ProductVariants => Set<ProductVariant>();
    public DbSet<Order> Orders => Set<Order>();
    public DbSet<OrderItem> OrderItems => Set<OrderItem>();
    public DbSet<OrderStatusHistory> OrderStatusHistories => Set<OrderStatusHistory>();
    public DbSet<CartItem> CartItems => Set<CartItem>();
    public DbSet<Review> Reviews => Set<Review>();
    public DbSet<Address> Addresses => Set<Address>();
    public DbSet<Wishlist> Wishlists => Set<Wishlist>();
    public DbSet<Coupon> Coupons => Set<Coupon>();
    public DbSet<Banner> Banners => Set<Banner>();

    protected override void OnModelCreating(ModelBuilder modelBuilder)
    {
        base.OnModelCreating(modelBuilder);

        // User
        modelBuilder.Entity<User>(e =>
        {
            e.HasIndex(u => u.Email).IsUnique();
            e.Property(u => u.Role).HasConversion<string>();
        });

        // Category self-referencing
        modelBuilder.Entity<Category>(e =>
        {
            e.HasOne(c => c.Parent)
             .WithMany(c => c.Children)
             .HasForeignKey(c => c.ParentId)
             .OnDelete(DeleteBehavior.Restrict);

            e.HasIndex(c => c.Slug).IsUnique();
        });

        // Product
        modelBuilder.Entity<Product>(e =>
        {
            e.HasIndex(p => p.Slug).IsUnique();
            e.Property(p => p.BasePrice).HasPrecision(18, 2);
            e.Property(p => p.SalePrice).HasPrecision(18, 2);

            e.HasOne(p => p.Category)
             .WithMany(c => c.Products)
             .HasForeignKey(p => p.CategoryId)
             .OnDelete(DeleteBehavior.Restrict);
        });

        // ProductVariant
        modelBuilder.Entity<ProductVariant>(e =>
        {
            e.Property(v => v.PriceAdjustment).HasPrecision(18, 2);
            e.HasOne(v => v.Product)
             .WithMany(p => p.Variants)
             .HasForeignKey(v => v.ProductId)
             .OnDelete(DeleteBehavior.Cascade);
        });

        // ProductImage
        modelBuilder.Entity<ProductImage>(e =>
        {
            e.HasOne(i => i.Product)
             .WithMany(p => p.Images)
             .HasForeignKey(i => i.ProductId)
             .OnDelete(DeleteBehavior.Cascade);
        });

        // Order
        modelBuilder.Entity<Order>(e =>
        {
            e.HasIndex(o => o.OrderCode).IsUnique();
            e.Property(o => o.SubTotal).HasPrecision(18, 2);
            e.Property(o => o.ShippingFee).HasPrecision(18, 2);
            e.Property(o => o.DiscountAmount).HasPrecision(18, 2);
            e.Property(o => o.TotalAmount).HasPrecision(18, 2);
            e.Property(o => o.Status).HasConversion<string>();
            e.Property(o => o.PaymentStatus).HasConversion<string>();
            e.Property(o => o.PaymentMethod).HasConversion<string>();

            e.HasOne(o => o.User)
             .WithMany(u => u.Orders)
             .HasForeignKey(o => o.UserId)
             .OnDelete(DeleteBehavior.Restrict);
        });

        // OrderItem
        modelBuilder.Entity<OrderItem>(e =>
        {
            e.Property(i => i.UnitPrice).HasPrecision(18, 2);
            e.Property(i => i.TotalPrice).HasPrecision(18, 2);

            e.HasOne(i => i.Order)
             .WithMany(o => o.Items)
             .HasForeignKey(i => i.OrderId)
             .OnDelete(DeleteBehavior.Cascade);

            e.HasOne(i => i.Product)
             .WithMany(p => p.OrderItems)
             .HasForeignKey(i => i.ProductId)
             .OnDelete(DeleteBehavior.Restrict);

            e.HasOne(i => i.Variant)
             .WithMany(v => v.OrderItems)
             .HasForeignKey(i => i.VariantId)
             .OnDelete(DeleteBehavior.SetNull);
        });

        // CartItem - unique per user+product+variant
        modelBuilder.Entity<CartItem>(e =>
        {
            e.HasOne(c => c.User)
             .WithMany(u => u.CartItems)
             .HasForeignKey(c => c.UserId)
             .OnDelete(DeleteBehavior.Cascade);

            e.HasOne(c => c.Product)
             .WithMany(p => p.CartItems)
             .HasForeignKey(c => c.ProductId)
             .OnDelete(DeleteBehavior.Cascade);

            e.HasOne(c => c.Variant)
             .WithMany(v => v.CartItems)
             .HasForeignKey(c => c.VariantId)
             .OnDelete(DeleteBehavior.SetNull);
        });

        // Review
        modelBuilder.Entity<Review>(e =>
        {
            e.HasOne(r => r.User)
             .WithMany(u => u.Reviews)
             .HasForeignKey(r => r.UserId)
             .OnDelete(DeleteBehavior.Cascade);

            e.HasOne(r => r.Product)
             .WithMany(p => p.Reviews)
             .HasForeignKey(r => r.ProductId)
             .OnDelete(DeleteBehavior.Cascade);
        });

        // Address
        modelBuilder.Entity<Address>(e =>
        {
            e.HasOne(a => a.User)
             .WithMany(u => u.Addresses)
             .HasForeignKey(a => a.UserId)
             .OnDelete(DeleteBehavior.Cascade);
        });

        // Wishlist - unique per user+product
        modelBuilder.Entity<Wishlist>(e =>
        {
            e.HasIndex(w => new { w.UserId, w.ProductId }).IsUnique();

            e.HasOne(w => w.User)
             .WithMany(u => u.Wishlists)
             .HasForeignKey(w => w.UserId)
             .OnDelete(DeleteBehavior.Cascade);

            e.HasOne(w => w.Product)
             .WithMany(p => p.Wishlists)
             .HasForeignKey(w => w.ProductId)
             .OnDelete(DeleteBehavior.Cascade);
        });

        // Coupon
        modelBuilder.Entity<Coupon>(e =>
        {
            e.HasIndex(c => c.Code).IsUnique();
            e.Property(c => c.Value).HasPrecision(18, 2);
            e.Property(c => c.MinOrderAmount).HasPrecision(18, 2);
            e.Property(c => c.MaxDiscountAmount).HasPrecision(18, 2);
            e.Property(c => c.Type).HasConversion<string>();
        });
    }
}
