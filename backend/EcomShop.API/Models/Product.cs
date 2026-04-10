namespace EcomShop.API.Models;

public class Product
{
    public int Id { get; set; }
    public string Name { get; set; } = string.Empty;
    public string Slug { get; set; } = string.Empty;
    public string? Description { get; set; }
    public string? ShortDescription { get; set; }
    public decimal BasePrice { get; set; }
    public decimal? SalePrice { get; set; }
    public int CategoryId { get; set; }
    public string? Brand { get; set; }
    public string? Material { get; set; }
    public string? CareInstructions { get; set; }
    public bool IsActive { get; set; } = true;
    public bool IsFeatured { get; set; } = false;
    public int TotalStock { get; set; } = 0;
    public double AverageRating { get; set; } = 0;
    public int TotalReviews { get; set; } = 0;
    public int SoldCount { get; set; } = 0;
    public string? Tags { get; set; }
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
    public DateTime UpdatedAt { get; set; } = DateTime.UtcNow;

    // Navigation
    public Category Category { get; set; } = null!;
    public ICollection<ProductImage> Images { get; set; } = new List<ProductImage>();
    public ICollection<ProductVariant> Variants { get; set; } = new List<ProductVariant>();
    public ICollection<Review> Reviews { get; set; } = new List<Review>();
    public ICollection<OrderItem> OrderItems { get; set; } = new List<OrderItem>();
    public ICollection<CartItem> CartItems { get; set; } = new List<CartItem>();
    public ICollection<Wishlist> Wishlists { get; set; } = new List<Wishlist>();
}
