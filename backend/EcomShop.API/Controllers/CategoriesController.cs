using EcomShop.API.Data;
using EcomShop.API.Models;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace EcomShop.API.Controllers;

[ApiController]
[Route("api/[controller]")]
public class CategoriesController : ControllerBase
{
    private readonly AppDbContext _context;

    public CategoriesController(AppDbContext context)
    {
        _context = context;
    }

    [HttpGet]
    public async Task<IActionResult> GetAll([FromQuery] bool? includeChildren = true)
    {
        var query = _context.Categories
            .Where(c => c.IsActive && c.ParentId == null)
            .OrderBy(c => c.SortOrder);

        if (includeChildren == true)
        {
            var categories = await query
                .Include(c => c.Children.Where(ch => ch.IsActive).OrderBy(ch => ch.SortOrder))
                .ToListAsync();
            return Ok(new { success = true, data = categories.Select(MapCategoryDto) });
        }

        var flat = await query.ToListAsync();
        return Ok(new { success = true, data = flat.Select(MapCategoryDto) });
    }

    [HttpGet("{id:int}")]
    public async Task<IActionResult> GetById(int id)
    {
        var category = await _context.Categories
            .Include(c => c.Children.Where(ch => ch.IsActive))
            .Include(c => c.Parent)
            .FirstOrDefaultAsync(c => c.Id == id);

        if (category == null)
            return NotFound(new { success = false, message = "Không tìm thấy danh mục" });

        return Ok(new { success = true, data = MapCategoryDto(category) });
    }

    [HttpPost]
    [Authorize(Roles = "Admin")]
    public async Task<IActionResult> Create([FromBody] CreateCategoryDto dto)
    {
        var slug = await GenerateUniqueSlugAsync(dto.Name);

        var category = new Category
        {
            Name = dto.Name.Trim(),
            Slug = slug,
            Description = dto.Description,
            ImageUrl = dto.ImageUrl,
            ParentId = dto.ParentId,
            SortOrder = dto.SortOrder,
            IsActive = true
        };

        _context.Categories.Add(category);
        await _context.SaveChangesAsync();
        return Ok(new { success = true, data = MapCategoryDto(category), message = "Tạo danh mục thành công" });
    }

    [HttpPut("{id:int}")]
    [Authorize(Roles = "Admin")]
    public async Task<IActionResult> Update(int id, [FromBody] CreateCategoryDto dto)
    {
        var category = await _context.Categories.FindAsync(id);
        if (category == null)
            return NotFound(new { success = false, message = "Không tìm thấy danh mục" });

        if (category.Name != dto.Name)
            category.Slug = await GenerateUniqueSlugAsync(dto.Name, id);

        category.Name = dto.Name.Trim();
        category.Description = dto.Description;
        category.ImageUrl = dto.ImageUrl;
        category.ParentId = dto.ParentId;
        category.SortOrder = dto.SortOrder;

        await _context.SaveChangesAsync();
        return Ok(new { success = true, data = MapCategoryDto(category), message = "Cập nhật danh mục thành công" });
    }

    [HttpDelete("{id:int}")]
    [Authorize(Roles = "Admin")]
    public async Task<IActionResult> Delete(int id)
    {
        var category = await _context.Categories.FindAsync(id);
        if (category == null)
            return NotFound(new { success = false, message = "Không tìm thấy danh mục" });

        var hasProducts = await _context.Products.AnyAsync(p => p.CategoryId == id);
        if (hasProducts)
            return BadRequest(new { success = false, message = "Không thể xóa danh mục đang có sản phẩm" });

        category.IsActive = false;
        await _context.SaveChangesAsync();
        return Ok(new { success = true, message = "Xóa danh mục thành công" });
    }

    private async Task<string> GenerateUniqueSlugAsync(string name, int? excludeId = null)
    {
        var slug = name.ToLower()
            .Replace("à", "a").Replace("á", "a").Replace("ả", "a").Replace("ã", "a").Replace("ạ", "a")
            .Replace("ă", "a").Replace("ắ", "a").Replace("ằ", "a").Replace("ặ", "a")
            .Replace("â", "a").Replace("ấ", "a").Replace("ầ", "a").Replace("ậ", "a")
            .Replace("è", "e").Replace("é", "e").Replace("ẻ", "e").Replace("ẹ", "e")
            .Replace("ê", "e").Replace("ế", "e").Replace("ề", "e").Replace("ệ", "e")
            .Replace("ì", "i").Replace("í", "i").Replace("ị", "i")
            .Replace("ò", "o").Replace("ó", "o").Replace("ọ", "o")
            .Replace("ô", "o").Replace("ố", "o").Replace("ồ", "o").Replace("ộ", "o")
            .Replace("ơ", "o").Replace("ớ", "o").Replace("ờ", "o").Replace("ợ", "o")
            .Replace("ù", "u").Replace("ú", "u").Replace("ụ", "u")
            .Replace("ư", "u").Replace("ứ", "u").Replace("ừ", "u").Replace("ự", "u")
            .Replace("ý", "y").Replace("ỵ", "y")
            .Replace("đ", "d")
            .Replace(" ", "-");

        slug = System.Text.RegularExpressions.Regex.Replace(slug, @"[^a-z0-9\-]", "");
        slug = System.Text.RegularExpressions.Regex.Replace(slug, @"-+", "-").Trim('-');

        var baseSlug = slug;
        int counter = 1;
        while (await _context.Categories.AnyAsync(c => c.Slug == slug && c.Id != (excludeId ?? 0)))
            slug = $"{baseSlug}-{counter++}";

        return slug;
    }

    private static object MapCategoryDto(Category c) => new
    {
        c.Id,
        c.Name,
        c.Slug,
        c.Description,
        c.ImageUrl,
        c.ParentId,
        c.SortOrder,
        c.IsActive,
        Children = c.Children?.Select(MapCategoryDto).ToList()
    };
}

public class CreateCategoryDto
{
    public string Name { get; set; } = string.Empty;
    public string? Description { get; set; }
    public string? ImageUrl { get; set; }
    public int? ParentId { get; set; }
    public int SortOrder { get; set; } = 0;
}
