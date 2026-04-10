using System.Security.Claims;
using EcomShop.API.Data;
using EcomShop.API.Models;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace EcomShop.API.Controllers;

[ApiController]
[Route("api/[controller]")]
public class ReviewsController : ControllerBase
{
    private readonly AppDbContext _context;

    public ReviewsController(AppDbContext context)
    {
        _context = context;
    }

    [HttpGet("product/{productId:int}")]
    public async Task<IActionResult> GetProductReviews(int productId,
        [FromQuery] int page = 1, [FromQuery] int pageSize = 10,
        [FromQuery] int? rating = null)
    {
        var q = _context.Reviews
            .Include(r => r.User)
            .Where(r => r.ProductId == productId && r.IsApproved)
            .AsQueryable();

        if (rating.HasValue)
            q = q.Where(r => r.Rating == rating.Value);

        var totalCount = await q.CountAsync();
        var reviews = await q
            .OrderByDescending(r => r.CreatedAt)
            .Skip((page - 1) * pageSize)
            .Take(pageSize)
            .Select(r => new
            {
                r.Id,
                r.Rating,
                r.Title,
                r.Content,
                r.Images,
                r.IsVerifiedPurchase,
                r.HelpfulCount,
                r.CreatedAt,
                User = new { r.User.FullName, r.User.AvatarUrl }
            })
            .ToListAsync();

        var summary = await _context.Reviews
            .Where(r => r.ProductId == productId && r.IsApproved)
            .GroupBy(r => r.Rating)
            .Select(g => new { Rating = g.Key, Count = g.Count() })
            .ToListAsync();

        return Ok(new
        {
            success = true,
            data = new
            {
                reviews,
                totalCount,
                page,
                pageSize,
                totalPages = (int)Math.Ceiling((double)totalCount / pageSize),
                ratingBreakdown = summary
            }
        });
    }

    [HttpPost]
    [Authorize]
    public async Task<IActionResult> CreateReview([FromBody] CreateReviewDto dto)
    {
        var userId = GetCurrentUserId();

        // Check if user already reviewed this product
        var existing = await _context.Reviews
            .FirstOrDefaultAsync(r => r.UserId == userId && r.ProductId == dto.ProductId);
        if (existing != null)
            return BadRequest(new { success = false, message = "Bạn đã đánh giá sản phẩm này rồi" });

        // Check if user bought this product
        var hasPurchased = await _context.OrderItems
            .AnyAsync(i => i.ProductId == dto.ProductId
                && i.Order.UserId == userId
                && i.Order.Status == OrderStatus.Delivered);

        var review = new Review
        {
            UserId = userId,
            ProductId = dto.ProductId,
            Rating = dto.Rating,
            Title = dto.Title,
            Content = dto.Content,
            Images = dto.Images,
            IsVerifiedPurchase = hasPurchased,
            IsApproved = true
        };

        _context.Reviews.Add(review);

        // Update product rating
        await UpdateProductRating(dto.ProductId);

        await _context.SaveChangesAsync();
        return Ok(new { success = true, message = "Đánh giá thành công" });
    }

    [HttpDelete("{id:int}")]
    [Authorize]
    public async Task<IActionResult> DeleteReview(int id)
    {
        var userId = GetCurrentUserId();
        var isAdmin = User.IsInRole("Admin");

        var review = await _context.Reviews.FindAsync(id);
        if (review == null)
            return NotFound(new { success = false, message = "Không tìm thấy đánh giá" });

        if (!isAdmin && review.UserId != userId)
            return Forbid();

        _context.Reviews.Remove(review);
        await UpdateProductRating(review.ProductId);
        await _context.SaveChangesAsync();

        return Ok(new { success = true, message = "Xóa đánh giá thành công" });
    }

    private async Task UpdateProductRating(int productId)
    {
        var product = await _context.Products.FindAsync(productId);
        if (product == null) return;

        var stats = await _context.Reviews
            .Where(r => r.ProductId == productId && r.IsApproved)
            .GroupBy(r => r.ProductId)
            .Select(g => new { Avg = g.Average(r => (double)r.Rating), Count = g.Count() })
            .FirstOrDefaultAsync();

        product.AverageRating = stats?.Avg ?? 0;
        product.TotalReviews = stats?.Count ?? 0;
    }

    private int GetCurrentUserId()
    {
        var claim = User.FindFirst(ClaimTypes.NameIdentifier)?.Value
            ?? User.FindFirst(System.IdentityModel.Tokens.Jwt.JwtRegisteredClaimNames.Sub)?.Value;
        return int.Parse(claim ?? throw new UnauthorizedAccessException());
    }
}

public class CreateReviewDto
{
    public int ProductId { get; set; }
    public int Rating { get; set; }
    public string? Title { get; set; }
    public string? Content { get; set; }
    public string? Images { get; set; }
}
