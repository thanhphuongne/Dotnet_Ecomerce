using EcomShop.API.Data;
using EcomShop.API.Models;
using Microsoft.EntityFrameworkCore;

namespace EcomShop.API.Services;

public class CartItemDto
{
    public int Id { get; set; }
    public int ProductId { get; set; }
    public string ProductName { get; set; } = string.Empty;
    public string? ProductImage { get; set; }
    public string? ProductSlug { get; set; }
    public int? VariantId { get; set; }
    public string? Size { get; set; }
    public string? Color { get; set; }
    public string? ColorHex { get; set; }
    public string? Sku { get; set; }
    public int Quantity { get; set; }
    public decimal UnitPrice { get; set; }
    public decimal TotalPrice => UnitPrice * Quantity;
    public int StockAvailable { get; set; }
    public bool IsAvailable { get; set; }
}

public class CartSummaryDto
{
    public List<CartItemDto> Items { get; set; } = new();
    public int TotalItems { get; set; }
    public decimal SubTotal { get; set; }
    public decimal ShippingFee { get; set; } = 30000;
    public decimal Total => SubTotal + ShippingFee;
}

public interface ICartService
{
    Task<CartSummaryDto> GetCartAsync(int userId);
    Task<CartSummaryDto> AddToCartAsync(int userId, int productId, int? variantId, int quantity);
    Task<CartSummaryDto> UpdateQuantityAsync(int userId, int cartItemId, int quantity);
    Task<CartSummaryDto> RemoveItemAsync(int userId, int cartItemId);
    Task ClearCartAsync(int userId);
    Task<int> GetCartCountAsync(int userId);
}

public class CartService : ICartService
{
    private readonly AppDbContext _context;

    public CartService(AppDbContext context)
    {
        _context = context;
    }

    public async Task<CartSummaryDto> GetCartAsync(int userId)
    {
        var items = await _context.CartItems
            .Include(c => c.Product).ThenInclude(p => p.Images)
            .Include(c => c.Variant)
            .Where(c => c.UserId == userId)
            .OrderByDescending(c => c.UpdatedAt)
            .ToListAsync();

        return BuildCartSummary(items);
    }

    public async Task<CartSummaryDto> AddToCartAsync(int userId, int productId, int? variantId, int quantity)
    {
        var product = await _context.Products
            .FirstOrDefaultAsync(p => p.Id == productId && p.IsActive)
            ?? throw new KeyNotFoundException("Không tìm thấy sản phẩm");

        ProductVariant? variant = null;
        if (variantId.HasValue)
        {
            variant = await _context.ProductVariants
                .FirstOrDefaultAsync(v => v.Id == variantId.Value && v.ProductId == productId)
                ?? throw new KeyNotFoundException("Không tìm thấy biến thể sản phẩm");

            if (variant.Stock < quantity)
                throw new InvalidOperationException($"Kho chỉ còn {variant.Stock} sản phẩm");
        }

        var existingItem = await _context.CartItems
            .FirstOrDefaultAsync(c => c.UserId == userId
                && c.ProductId == productId
                && c.VariantId == variantId);

        if (existingItem != null)
        {
            var newQty = existingItem.Quantity + quantity;
            var maxStock = variant?.Stock ?? int.MaxValue;
            existingItem.Quantity = Math.Min(newQty, maxStock);
            existingItem.UpdatedAt = DateTime.UtcNow;
        }
        else
        {
            _context.CartItems.Add(new CartItem
            {
                UserId = userId,
                ProductId = productId,
                VariantId = variantId,
                Quantity = quantity
            });
        }

        await _context.SaveChangesAsync();
        return await GetCartAsync(userId);
    }

    public async Task<CartSummaryDto> UpdateQuantityAsync(int userId, int cartItemId, int quantity)
    {
        var item = await _context.CartItems
            .Include(c => c.Variant)
            .FirstOrDefaultAsync(c => c.Id == cartItemId && c.UserId == userId)
            ?? throw new KeyNotFoundException("Không tìm thấy mục trong giỏ hàng");

        if (quantity <= 0)
        {
            _context.CartItems.Remove(item);
        }
        else
        {
            if (item.Variant != null && item.Variant.Stock < quantity)
                throw new InvalidOperationException($"Kho chỉ còn {item.Variant.Stock} sản phẩm");

            item.Quantity = quantity;
            item.UpdatedAt = DateTime.UtcNow;
        }

        await _context.SaveChangesAsync();
        return await GetCartAsync(userId);
    }

    public async Task<CartSummaryDto> RemoveItemAsync(int userId, int cartItemId)
    {
        var item = await _context.CartItems
            .FirstOrDefaultAsync(c => c.Id == cartItemId && c.UserId == userId)
            ?? throw new KeyNotFoundException("Không tìm thấy mục trong giỏ hàng");

        _context.CartItems.Remove(item);
        await _context.SaveChangesAsync();
        return await GetCartAsync(userId);
    }

    public async Task ClearCartAsync(int userId)
    {
        var items = await _context.CartItems
            .Where(c => c.UserId == userId)
            .ToListAsync();

        _context.CartItems.RemoveRange(items);
        await _context.SaveChangesAsync();
    }

    public async Task<int> GetCartCountAsync(int userId)
    {
        return await _context.CartItems
            .Where(c => c.UserId == userId)
            .SumAsync(c => c.Quantity);
    }

    private static CartSummaryDto BuildCartSummary(List<CartItem> items)
    {
        var dtos = items.Select(c =>
        {
            var unitPrice = (c.Product.SalePrice ?? c.Product.BasePrice) + (c.Variant?.PriceAdjustment ?? 0);
            var stock = c.Variant?.Stock ?? c.Product.TotalStock;

            return new CartItemDto
            {
                Id = c.Id,
                ProductId = c.ProductId,
                ProductName = c.Product.Name,
                ProductImage = c.Product.Images.FirstOrDefault(i => i.IsPrimary)?.Url ?? c.Product.Images.FirstOrDefault()?.Url,
                ProductSlug = c.Product.Slug,
                VariantId = c.VariantId,
                Size = c.Variant?.Size,
                Color = c.Variant?.Color,
                ColorHex = c.Variant?.ColorHex,
                Sku = c.Variant?.Sku,
                Quantity = c.Quantity,
                UnitPrice = unitPrice,
                StockAvailable = stock,
                IsAvailable = c.Product.IsActive && stock > 0
            };
        }).ToList();

        return new CartSummaryDto
        {
            Items = dtos,
            TotalItems = dtos.Sum(i => i.Quantity),
            SubTotal = dtos.Sum(i => i.TotalPrice)
        };
    }
}
