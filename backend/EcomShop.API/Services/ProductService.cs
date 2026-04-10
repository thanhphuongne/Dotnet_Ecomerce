using EcomShop.API.Data;
using EcomShop.API.DTOs.Products;
using EcomShop.API.Models;
using Microsoft.EntityFrameworkCore;

namespace EcomShop.API.Services;

public interface IProductService
{
    Task<PagedResultDto<ProductListDto>> GetProductsAsync(ProductQueryDto query);
    Task<ProductDetailDto> GetBySlugAsync(string slug);
    Task<ProductDetailDto> GetByIdAsync(int id);
    Task<ProductDetailDto> CreateAsync(CreateProductDto dto);
    Task<ProductDetailDto> UpdateAsync(int id, UpdateProductDto dto);
    Task DeleteAsync(int id);
    Task<List<ProductListDto>> GetFeaturedAsync(int count = 8);
    Task<List<ProductListDto>> GetRelatedAsync(int productId, int count = 4);
    Task UpdateStockAsync(int variantId, int quantity);
}

public class ProductService : IProductService
{
    private readonly AppDbContext _context;

    public ProductService(AppDbContext context)
    {
        _context = context;
    }

    public async Task<PagedResultDto<ProductListDto>> GetProductsAsync(ProductQueryDto query)
    {
        var q = _context.Products
            .Include(p => p.Category)
            .Include(p => p.Images)
            .Include(p => p.Variants)
            .Where(p => p.IsActive)
            .AsQueryable();

        if (!string.IsNullOrWhiteSpace(query.Search))
        {
            var s = query.Search.ToLower();
            q = q.Where(p => p.Name.ToLower().Contains(s)
                || (p.Description != null && p.Description.ToLower().Contains(s))
                || (p.Brand != null && p.Brand.ToLower().Contains(s))
                || (p.Tags != null && p.Tags.ToLower().Contains(s)));
        }

        if (query.CategoryId.HasValue)
        {
            // Include subcategories
            var categoryIds = await GetCategoryAndChildIds(query.CategoryId.Value);
            q = q.Where(p => categoryIds.Contains(p.CategoryId));
        }

        if (!string.IsNullOrWhiteSpace(query.Brand))
            q = q.Where(p => p.Brand == query.Brand);

        if (!string.IsNullOrWhiteSpace(query.Size))
            q = q.Where(p => p.Variants.Any(v => v.Size == query.Size && v.IsActive));

        if (!string.IsNullOrWhiteSpace(query.Color))
            q = q.Where(p => p.Variants.Any(v => v.Color == query.Color && v.IsActive));

        if (query.MinPrice.HasValue)
            q = q.Where(p => (p.SalePrice ?? p.BasePrice) >= query.MinPrice.Value);

        if (query.MaxPrice.HasValue)
            q = q.Where(p => (p.SalePrice ?? p.BasePrice) <= query.MaxPrice.Value);

        if (query.IsFeatured.HasValue)
            q = q.Where(p => p.IsFeatured == query.IsFeatured.Value);

        if (query.HasSale == true)
            q = q.Where(p => p.SalePrice.HasValue && p.SalePrice < p.BasePrice);

        q = (query.SortBy?.ToLower(), query.SortOrder?.ToLower()) switch
        {
            ("price", "asc") => q.OrderBy(p => p.SalePrice ?? p.BasePrice),
            ("price", _) => q.OrderByDescending(p => p.SalePrice ?? p.BasePrice),
            ("rating", _) => q.OrderByDescending(p => p.AverageRating),
            ("sold", _) => q.OrderByDescending(p => p.SoldCount),
            ("name", "desc") => q.OrderByDescending(p => p.Name),
            ("name", _) => q.OrderBy(p => p.Name),
            (_, "asc") => q.OrderBy(p => p.CreatedAt),
            _ => q.OrderByDescending(p => p.CreatedAt)
        };

        var totalCount = await q.CountAsync();

        var items = await q
            .Skip((query.Page - 1) * query.PageSize)
            .Take(query.PageSize)
            .Select(p => MapToListDto(p))
            .ToListAsync();

        return new PagedResultDto<ProductListDto>
        {
            Items = items,
            TotalCount = totalCount,
            Page = query.Page,
            PageSize = query.PageSize
        };
    }

    public async Task<ProductDetailDto> GetBySlugAsync(string slug)
    {
        var product = await GetProductWithDetailsQuery()
            .FirstOrDefaultAsync(p => p.Slug == slug && p.IsActive)
            ?? throw new KeyNotFoundException("Không tìm thấy sản phẩm");

        return MapToDetailDto(product);
    }

    public async Task<ProductDetailDto> GetByIdAsync(int id)
    {
        var product = await GetProductWithDetailsQuery()
            .FirstOrDefaultAsync(p => p.Id == id)
            ?? throw new KeyNotFoundException("Không tìm thấy sản phẩm");

        return MapToDetailDto(product);
    }

    public async Task<ProductDetailDto> CreateAsync(CreateProductDto dto)
    {
        var slug = await GenerateUniqueSlugAsync(dto.Name);

        var product = new Product
        {
            Name = dto.Name.Trim(),
            Slug = slug,
            Description = dto.Description,
            ShortDescription = dto.ShortDescription,
            BasePrice = dto.BasePrice,
            SalePrice = dto.SalePrice,
            CategoryId = dto.CategoryId,
            Brand = dto.Brand,
            Material = dto.Material,
            CareInstructions = dto.CareInstructions,
            Tags = dto.Tags,
            IsFeatured = dto.IsFeatured,
            IsActive = true
        };

        _context.Products.Add(product);
        await _context.SaveChangesAsync();

        if (dto.Variants.Any())
        {
            var variants = dto.Variants.Select(v => new ProductVariant
            {
                ProductId = product.Id,
                Size = v.Size,
                Color = v.Color,
                ColorHex = v.ColorHex,
                Sku = v.Sku ?? GenerateSku(product.Slug, v.Size, v.Color),
                Stock = v.Stock,
                PriceAdjustment = v.PriceAdjustment,
                ImageUrl = v.ImageUrl,
                IsActive = true
            }).ToList();

            _context.ProductVariants.AddRange(variants);
            product.TotalStock = variants.Sum(v => v.Stock);
        }

        for (int i = 0; i < dto.ImageUrls.Count; i++)
        {
            _context.ProductImages.Add(new ProductImage
            {
                ProductId = product.Id,
                Url = dto.ImageUrls[i],
                IsPrimary = i == 0,
                SortOrder = i
            });
        }

        await _context.SaveChangesAsync();
        return await GetByIdAsync(product.Id);
    }

    public async Task<ProductDetailDto> UpdateAsync(int id, UpdateProductDto dto)
    {
        var product = await _context.Products
            .Include(p => p.Variants)
            .Include(p => p.Images)
            .FirstOrDefaultAsync(p => p.Id == id)
            ?? throw new KeyNotFoundException("Không tìm thấy sản phẩm");

        if (product.Name != dto.Name)
            product.Slug = await GenerateUniqueSlugAsync(dto.Name, id);

        product.Name = dto.Name.Trim();
        product.Description = dto.Description;
        product.ShortDescription = dto.ShortDescription;
        product.BasePrice = dto.BasePrice;
        product.SalePrice = dto.SalePrice;
        product.CategoryId = dto.CategoryId;
        product.Brand = dto.Brand;
        product.Material = dto.Material;
        product.CareInstructions = dto.CareInstructions;
        product.Tags = dto.Tags;
        product.IsFeatured = dto.IsFeatured;
        product.IsActive = dto.IsActive;
        product.UpdatedAt = DateTime.UtcNow;

        // Update variants: remove old, add new
        _context.ProductVariants.RemoveRange(product.Variants);
        _context.ProductImages.RemoveRange(product.Images);

        var newVariants = dto.Variants.Select(v => new ProductVariant
        {
            ProductId = product.Id,
            Size = v.Size,
            Color = v.Color,
            ColorHex = v.ColorHex,
            Sku = v.Sku ?? GenerateSku(product.Slug, v.Size, v.Color),
            Stock = v.Stock,
            PriceAdjustment = v.PriceAdjustment,
            ImageUrl = v.ImageUrl,
            IsActive = true
        }).ToList();

        _context.ProductVariants.AddRange(newVariants);
        product.TotalStock = newVariants.Sum(v => v.Stock);

        for (int i = 0; i < dto.ImageUrls.Count; i++)
        {
            _context.ProductImages.Add(new ProductImage
            {
                ProductId = product.Id,
                Url = dto.ImageUrls[i],
                IsPrimary = i == 0,
                SortOrder = i
            });
        }

        await _context.SaveChangesAsync();
        return await GetByIdAsync(product.Id);
    }

    public async Task DeleteAsync(int id)
    {
        var product = await _context.Products.FindAsync(id)
            ?? throw new KeyNotFoundException("Không tìm thấy sản phẩm");

        product.IsActive = false;
        product.UpdatedAt = DateTime.UtcNow;
        await _context.SaveChangesAsync();
    }

    public async Task<List<ProductListDto>> GetFeaturedAsync(int count = 8)
    {
        return await _context.Products
            .Include(p => p.Category)
            .Include(p => p.Images)
            .Where(p => p.IsActive && p.IsFeatured)
            .OrderByDescending(p => p.SoldCount)
            .Take(count)
            .Select(p => MapToListDto(p))
            .ToListAsync();
    }

    public async Task<List<ProductListDto>> GetRelatedAsync(int productId, int count = 4)
    {
        var product = await _context.Products.FindAsync(productId);
        if (product == null) return new List<ProductListDto>();

        return await _context.Products
            .Include(p => p.Category)
            .Include(p => p.Images)
            .Where(p => p.IsActive && p.Id != productId && p.CategoryId == product.CategoryId)
            .OrderByDescending(p => p.SoldCount)
            .Take(count)
            .Select(p => MapToListDto(p))
            .ToListAsync();
    }

    public async Task UpdateStockAsync(int variantId, int quantityChange)
    {
        var variant = await _context.ProductVariants
            .Include(v => v.Product)
            .FirstOrDefaultAsync(v => v.Id == variantId)
            ?? throw new KeyNotFoundException("Không tìm thấy biến thể sản phẩm");

        variant.Stock += quantityChange;
        if (variant.Stock < 0) variant.Stock = 0;

        // Recalculate total stock
        var allVariants = await _context.ProductVariants
            .Where(v => v.ProductId == variant.ProductId)
            .ToListAsync();

        variant.Product.TotalStock = allVariants.Sum(v => v.Stock);
        await _context.SaveChangesAsync();
    }

    private IQueryable<Product> GetProductWithDetailsQuery()
    {
        return _context.Products
            .Include(p => p.Category)
            .Include(p => p.Images.OrderBy(i => i.SortOrder))
            .Include(p => p.Variants.Where(v => v.IsActive).OrderBy(v => v.Size).ThenBy(v => v.Color));
    }

    private async Task<List<int>> GetCategoryAndChildIds(int categoryId)
    {
        var ids = new List<int> { categoryId };
        var children = await _context.Categories
            .Where(c => c.ParentId == categoryId)
            .Select(c => c.Id)
            .ToListAsync();
        ids.AddRange(children);
        return ids;
    }

    private async Task<string> GenerateUniqueSlugAsync(string name, int? excludeId = null)
    {
        var slug = name.ToLower()
            .Replace("à", "a").Replace("á", "a").Replace("ả", "a").Replace("ã", "a").Replace("ạ", "a")
            .Replace("ă", "a").Replace("ắ", "a").Replace("ằ", "a").Replace("ẳ", "a").Replace("ẵ", "a").Replace("ặ", "a")
            .Replace("â", "a").Replace("ấ", "a").Replace("ầ", "a").Replace("ẩ", "a").Replace("ẫ", "a").Replace("ậ", "a")
            .Replace("è", "e").Replace("é", "e").Replace("ẻ", "e").Replace("ẽ", "e").Replace("ẹ", "e")
            .Replace("ê", "e").Replace("ế", "e").Replace("ề", "e").Replace("ể", "e").Replace("ễ", "e").Replace("ệ", "e")
            .Replace("ì", "i").Replace("í", "i").Replace("ỉ", "i").Replace("ĩ", "i").Replace("ị", "i")
            .Replace("ò", "o").Replace("ó", "o").Replace("ỏ", "o").Replace("õ", "o").Replace("ọ", "o")
            .Replace("ô", "o").Replace("ố", "o").Replace("ồ", "o").Replace("ổ", "o").Replace("ỗ", "o").Replace("ộ", "o")
            .Replace("ơ", "o").Replace("ớ", "o").Replace("ờ", "o").Replace("ở", "o").Replace("ỡ", "o").Replace("ợ", "o")
            .Replace("ù", "u").Replace("ú", "u").Replace("ủ", "u").Replace("ũ", "u").Replace("ụ", "u")
            .Replace("ư", "u").Replace("ứ", "u").Replace("ừ", "u").Replace("ử", "u").Replace("ữ", "u").Replace("ự", "u")
            .Replace("ỳ", "y").Replace("ý", "y").Replace("ỷ", "y").Replace("ỹ", "y").Replace("ỵ", "y")
            .Replace("đ", "d")
            .Replace(" ", "-");

        slug = System.Text.RegularExpressions.Regex.Replace(slug, @"[^a-z0-9\-]", "");
        slug = System.Text.RegularExpressions.Regex.Replace(slug, @"-+", "-").Trim('-');

        var baseSlug = slug;
        var counter = 1;

        while (await _context.Products.AnyAsync(p => p.Slug == slug && p.Id != (excludeId ?? 0)))
        {
            slug = $"{baseSlug}-{counter++}";
        }

        return slug;
    }

    private static string GenerateSku(string slug, string size, string color)
    {
        var slugPart = slug.Replace("-", "").ToUpper();
        if (slugPart.Length > 8) slugPart = slugPart[..8];
        return $"{slugPart}-{size}-{color.Replace(" ", "").ToUpper()}";
    }

    private static ProductListDto MapToListDto(Product p) => new()
    {
        Id = p.Id,
        Name = p.Name,
        Slug = p.Slug,
        ShortDescription = p.ShortDescription,
        BasePrice = p.BasePrice,
        SalePrice = p.SalePrice,
        PrimaryImage = p.Images.FirstOrDefault(i => i.IsPrimary)?.Url ?? p.Images.FirstOrDefault()?.Url,
        CategoryName = p.Category.Name,
        Brand = p.Brand,
        AverageRating = p.AverageRating,
        TotalReviews = p.TotalReviews,
        TotalStock = p.TotalStock,
        IsFeatured = p.IsFeatured,
        SoldCount = p.SoldCount,
        CreatedAt = p.CreatedAt
    };

    private static ProductDetailDto MapToDetailDto(Product p)
    {
        var dto = new ProductDetailDto
        {
            Id = p.Id,
            Name = p.Name,
            Slug = p.Slug,
            Description = p.Description,
            ShortDescription = p.ShortDescription,
            BasePrice = p.BasePrice,
            SalePrice = p.SalePrice,
            PrimaryImage = p.Images.FirstOrDefault(i => i.IsPrimary)?.Url ?? p.Images.FirstOrDefault()?.Url,
            CategoryId = p.CategoryId,
            CategoryName = p.Category.Name,
            Brand = p.Brand,
            Material = p.Material,
            CareInstructions = p.CareInstructions,
            Tags = p.Tags,
            AverageRating = p.AverageRating,
            TotalReviews = p.TotalReviews,
            TotalStock = p.TotalStock,
            IsFeatured = p.IsFeatured,
            SoldCount = p.SoldCount,
            CreatedAt = p.CreatedAt,
            Images = p.Images.OrderBy(i => i.SortOrder).Select(i => new ProductImageDto
            {
                Id = i.Id,
                Url = i.Url,
                AltText = i.AltText,
                IsPrimary = i.IsPrimary,
                SortOrder = i.SortOrder
            }).ToList(),
            Variants = p.Variants.Select(v => new ProductVariantDto
            {
                Id = v.Id,
                Size = v.Size,
                Color = v.Color,
                ColorHex = v.ColorHex,
                Sku = v.Sku,
                Stock = v.Stock,
                PriceAdjustment = v.PriceAdjustment,
                ImageUrl = v.ImageUrl,
                IsActive = v.IsActive
            }).ToList()
        };

        dto.AvailableSizes = p.Variants
            .Where(v => v.IsActive && v.Stock > 0)
            .Select(v => v.Size)
            .Distinct()
            .OrderBy(s => s)
            .ToList();

        dto.AvailableColors = p.Variants
            .Where(v => v.IsActive && v.Stock > 0)
            .GroupBy(v => v.Color)
            .Select(g => new ColorDto { Name = g.Key, Hex = g.First().ColorHex })
            .ToList();

        return dto;
    }
}
