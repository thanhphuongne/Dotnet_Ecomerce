namespace EcomShop.API.Models;

public class Review
{
    public int Id { get; set; }
    public int UserId { get; set; }
    public int ProductId { get; set; }
    public int? OrderId { get; set; }
    public int Rating { get; set; }  // 1-5
    public string? Title { get; set; }
    public string? Content { get; set; }
    public string? Images { get; set; } // JSON array of image URLs
    public bool IsVerifiedPurchase { get; set; } = false;
    public bool IsApproved { get; set; } = true;
    public int HelpfulCount { get; set; } = 0;
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
    public DateTime UpdatedAt { get; set; } = DateTime.UtcNow;

    // Navigation
    public User User { get; set; } = null!;
    public Product Product { get; set; } = null!;
}
