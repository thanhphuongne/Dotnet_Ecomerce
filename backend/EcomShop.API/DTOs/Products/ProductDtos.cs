using System.ComponentModel.DataAnnotations;

namespace EcomShop.API.DTOs.Products;

public class ProductListDto
{
    public int Id { get; set; }
    public string Name { get; set; } = string.Empty;
    public string Slug { get; set; } = string.Empty;
    public string? ShortDescription { get; set; }
    public decimal BasePrice { get; set; }
    public decimal? SalePrice { get; set; }
    public decimal DisplayPrice => SalePrice ?? BasePrice;
    public decimal? DiscountPercent => SalePrice.HasValue
        ? Math.Round((1 - SalePrice.Value / BasePrice) * 100)
        : null;
    public string? PrimaryImage { get; set; }
    public string CategoryName { get; set; } = string.Empty;
    public string? Brand { get; set; }
    public double AverageRating { get; set; }
    public int TotalReviews { get; set; }
    public int TotalStock { get; set; }
    public bool IsFeatured { get; set; }
    public int SoldCount { get; set; }
    public DateTime CreatedAt { get; set; }
}

public class ProductDetailDto : ProductListDto
{
    public string? Description { get; set; }
    public string? Material { get; set; }
    public string? CareInstructions { get; set; }
    public string? Tags { get; set; }
    public int CategoryId { get; set; }
    public List<ProductImageDto> Images { get; set; } = new();
    public List<ProductVariantDto> Variants { get; set; } = new();
    public List<string> AvailableSizes { get; set; } = new();
    public List<ColorDto> AvailableColors { get; set; } = new();
}

public class ProductImageDto
{
    public int Id { get; set; }
    public string Url { get; set; } = string.Empty;
    public string? AltText { get; set; }
    public bool IsPrimary { get; set; }
    public int SortOrder { get; set; }
}

public class ProductVariantDto
{
    public int Id { get; set; }
    public string Size { get; set; } = string.Empty;
    public string Color { get; set; } = string.Empty;
    public string? ColorHex { get; set; }
    public string? Sku { get; set; }
    public int Stock { get; set; }
    public decimal? PriceAdjustment { get; set; }
    public string? ImageUrl { get; set; }
    public bool IsActive { get; set; }
}

public class ColorDto
{
    public string Name { get; set; } = string.Empty;
    public string? Hex { get; set; }
}

public class CreateProductDto
{
    [Required]
    [MaxLength(200)]
    public string Name { get; set; } = string.Empty;

    public string? Description { get; set; }
    public string? ShortDescription { get; set; }

    [Required]
    [Range(0, double.MaxValue)]
    public decimal BasePrice { get; set; }

    [Range(0, double.MaxValue)]
    public decimal? SalePrice { get; set; }

    [Required]
    public int CategoryId { get; set; }

    public string? Brand { get; set; }
    public string? Material { get; set; }
    public string? CareInstructions { get; set; }
    public string? Tags { get; set; }
    public bool IsFeatured { get; set; } = false;

    public List<CreateVariantDto> Variants { get; set; } = new();
    public List<string> ImageUrls { get; set; } = new();
}

public class UpdateProductDto : CreateProductDto
{
    public bool IsActive { get; set; } = true;
}

public class CreateVariantDto
{
    [Required]
    public string Size { get; set; } = string.Empty;

    [Required]
    public string Color { get; set; } = string.Empty;

    public string? ColorHex { get; set; }
    public string? Sku { get; set; }

    [Range(0, int.MaxValue)]
    public int Stock { get; set; } = 0;

    public decimal? PriceAdjustment { get; set; } = 0;
    public string? ImageUrl { get; set; }
}

public class ProductQueryDto
{
    public string? Search { get; set; }
    public int? CategoryId { get; set; }
    public string? Brand { get; set; }
    public string? Size { get; set; }
    public string? Color { get; set; }
    public decimal? MinPrice { get; set; }
    public decimal? MaxPrice { get; set; }
    public bool? IsFeatured { get; set; }
    public bool? HasSale { get; set; }
    public string? SortBy { get; set; } = "createdAt";  // price, rating, sold, name
    public string? SortOrder { get; set; } = "desc";    // asc, desc
    public int Page { get; set; } = 1;
    public int PageSize { get; set; } = 12;
}

public class PagedResultDto<T>
{
    public List<T> Items { get; set; } = new();
    public int TotalCount { get; set; }
    public int Page { get; set; }
    public int PageSize { get; set; }
    public int TotalPages => (int)Math.Ceiling((double)TotalCount / PageSize);
    public bool HasPreviousPage => Page > 1;
    public bool HasNextPage => Page < TotalPages;
}
