using EcomShop.API.Models;
using BCrypt.Net;

namespace EcomShop.API.Data;

public static class DbSeeder
{
    public static async Task SeedAsync(AppDbContext context)
    {
        await SeedCategoriesAsync(context);
        await SeedUsersAsync(context);
        await SeedProductsAsync(context);
        await SeedBannersAsync(context);
        await SeedCouponsAsync(context);
    }

    private static async Task SeedCategoriesAsync(AppDbContext context)
    {
        if (context.Categories.Any()) return;

        var categories = new List<Category>
        {
            new() { Name = "Áo", Slug = "ao", SortOrder = 1 },
            new() { Name = "Quần", Slug = "quan", SortOrder = 2 },
            new() { Name = "Váy & Đầm", Slug = "vay-dam", SortOrder = 3 },
            new() { Name = "Đồ bộ", Slug = "do-bo", SortOrder = 4 },
            new() { Name = "Áo khoác", Slug = "ao-khoac", SortOrder = 5 },
            new() { Name = "Phụ kiện", Slug = "phu-kien", SortOrder = 6 },
        };

        context.Categories.AddRange(categories);
        await context.SaveChangesAsync();

        // Sub-categories
        var aoId = context.Categories.First(c => c.Slug == "ao").Id;
        var quanId = context.Categories.First(c => c.Slug == "quan").Id;

        var subCategories = new List<Category>
        {
            new() { Name = "Áo thun", Slug = "ao-thun", ParentId = aoId, SortOrder = 1 },
            new() { Name = "Áo sơ mi", Slug = "ao-so-mi", ParentId = aoId, SortOrder = 2 },
            new() { Name = "Áo polo", Slug = "ao-polo", ParentId = aoId, SortOrder = 3 },
            new() { Name = "Quần jeans", Slug = "quan-jeans", ParentId = quanId, SortOrder = 1 },
            new() { Name = "Quần short", Slug = "quan-short", ParentId = quanId, SortOrder = 2 },
            new() { Name = "Quần âu", Slug = "quan-au", ParentId = quanId, SortOrder = 3 },
        };

        context.Categories.AddRange(subCategories);
        await context.SaveChangesAsync();
    }

    private static async Task SeedUsersAsync(AppDbContext context)
    {
        if (context.Users.Any()) return;

        var users = new List<User>
        {
            new()
            {
                FullName = "Admin System",
                Email = "admin@ecomshop.com",
                PasswordHash = BCrypt.Net.BCrypt.HashPassword("Admin@123"),
                Role = UserRole.Admin,
                IsActive = true,
                IsEmailVerified = true
            },
            new()
            {
                FullName = "Nhân viên 1",
                Email = "staff@ecomshop.com",
                PasswordHash = BCrypt.Net.BCrypt.HashPassword("Staff@123"),
                Role = UserRole.Staff,
                IsActive = true,
                IsEmailVerified = true
            },
            new()
            {
                FullName = "Nguyễn Văn A",
                Email = "user@ecomshop.com",
                PasswordHash = BCrypt.Net.BCrypt.HashPassword("User@123"),
                Role = UserRole.Customer,
                IsActive = true,
                IsEmailVerified = true,
                PhoneNumber = "0901234567"
            }
        };

        context.Users.AddRange(users);
        await context.SaveChangesAsync();
    }

    private static async Task SeedProductsAsync(AppDbContext context)
    {
        if (context.Products.Any()) return;

        var aoThunId = context.Categories.First(c => c.Slug == "ao-thun").Id;
        var aoSoMiId = context.Categories.First(c => c.Slug == "ao-so-mi").Id;
        var quanJeansId = context.Categories.First(c => c.Slug == "quan-jeans").Id;

        var sizes = new[] { "XS", "S", "M", "L", "XL", "XXL" };
        var colors = new[] { ("Trắng", "#FFFFFF"), ("Đen", "#000000"), ("Xanh navy", "#1B2A4A"), ("Đỏ", "#E53E3E") };

        var products = new List<Product>
        {
            new()
            {
                Name = "Áo thun basic unisex",
                Slug = "ao-thun-basic-unisex",
                ShortDescription = "Áo thun basic phong cách tối giản, chất liệu cotton 100%",
                Description = "Áo thun basic unisex chất liệu cotton 100% cao cấp, thoáng mát, thấm hút mồ hôi tốt. Phù hợp cho mọi dịp từ đi học, đi chơi đến đi làm.",
                BasePrice = 199000,
                SalePrice = 149000,
                CategoryId = aoThunId,
                Brand = "EcomShop",
                Material = "Cotton 100%",
                IsActive = true,
                IsFeatured = true,
                TotalStock = 200
            },
            new()
            {
                Name = "Áo sơ mi trắng công sở",
                Slug = "ao-so-mi-trang-cong-so",
                ShortDescription = "Áo sơ mi trắng form đứng, phù hợp môi trường công sở",
                Description = "Áo sơ mi trắng form đứng, chất liệu cotton pha polyester, chống nhăn, phù hợp môi trường công sở. Thiết kế cổ điển, dễ phối đồ.",
                BasePrice = 350000,
                SalePrice = 299000,
                CategoryId = aoSoMiId,
                Brand = "EcomShop",
                Material = "Cotton 60% Polyester 40%",
                IsActive = true,
                IsFeatured = true,
                TotalStock = 150
            },
            new()
            {
                Name = "Quần jeans slim fit nam",
                Slug = "quan-jeans-slim-fit-nam",
                ShortDescription = "Quần jeans dáng slim fit, vải denim cao cấp co giãn 4 chiều",
                Description = "Quần jeans dáng slim fit, vải denim cao cấp có độ co giãn 4 chiều, thoải mái khi vận động. Phù hợp nhiều vóc dáng.",
                BasePrice = 499000,
                SalePrice = 399000,
                CategoryId = quanJeansId,
                Brand = "EcomShop",
                Material = "Denim 98% Cotton 2% Spandex",
                IsActive = true,
                IsFeatured = false,
                TotalStock = 100
            }
        };

        context.Products.AddRange(products);
        await context.SaveChangesAsync();

        // Add variants for each product
        foreach (var product in products)
        {
            var variants = new List<ProductVariant>();
            foreach (var size in sizes)
            {
                foreach (var (colorName, colorHex) in colors)
                {
                    variants.Add(new ProductVariant
                    {
                        ProductId = product.Id,
                        Size = size,
                        Color = colorName,
                        ColorHex = colorHex,
                        Sku = $"{product.Slug.ToUpper()}-{size}-{colorName.Replace(" ", "").ToUpper()}",
                        Stock = 10,
                        IsActive = true
                    });
                }
            }
            context.ProductVariants.AddRange(variants);
        }

        // Add images
        var imageUrls = new[]
        {
            "https://images.unsplash.com/photo-1521572163474-6864f9cf17ab?w=500",
            "https://images.unsplash.com/photo-1596755094514-f87e34085b2c?w=500",
            "https://images.unsplash.com/photo-1542272604-787c3835535d?w=500"
        };

        for (int i = 0; i < products.Count; i++)
        {
            context.ProductImages.AddRange(new[]
            {
                new ProductImage { ProductId = products[i].Id, Url = imageUrls[i], IsPrimary = true, SortOrder = 0 },
                new ProductImage { ProductId = products[i].Id, Url = imageUrls[(i + 1) % imageUrls.Length], SortOrder = 1 }
            });
        }

        await context.SaveChangesAsync();
    }

    private static async Task SeedBannersAsync(AppDbContext context)
    {
        if (context.Banners.Any()) return;

        context.Banners.AddRange(new[]
        {
            new Banner
            {
                Title = "BST Hè 2025",
                Subtitle = "Khám phá bộ sưu tập hè mới nhất",
                ImageUrl = "https://images.unsplash.com/photo-1558618666-fcd25c85cd64?w=1200",
                LinkUrl = "/products",
                ButtonText = "Mua ngay",
                IsActive = true,
                SortOrder = 1
            },
            new Banner
            {
                Title = "Sale 50% tất cả áo thun",
                Subtitle = "Ưu đãi có giới hạn – Nhanh tay kẻo hết!",
                ImageUrl = "https://images.unsplash.com/photo-1489987707025-afc232f7ea0f?w=1200",
                LinkUrl = "/products?category=ao-thun",
                ButtonText = "Xem ngay",
                IsActive = true,
                SortOrder = 2
            }
        });

        await context.SaveChangesAsync();
    }

    private static async Task SeedCouponsAsync(AppDbContext context)
    {
        if (context.Coupons.Any()) return;

        context.Coupons.AddRange(new[]
        {
            new Coupon
            {
                Code = "WELCOME10",
                Description = "Giảm 10% cho đơn hàng đầu tiên",
                Type = CouponType.Percentage,
                Value = 10,
                MinOrderAmount = 200000,
                MaxDiscountAmount = 100000,
                UsageLimit = 1000,
                UsageLimitPerUser = 1,
                IsActive = true,
                EndDate = DateTime.UtcNow.AddYears(1)
            },
            new Coupon
            {
                Code = "FREESHIP",
                Description = "Miễn phí vận chuyển cho đơn từ 300k",
                Type = CouponType.FreeShipping,
                Value = 0,
                MinOrderAmount = 300000,
                UsageLimit = 500,
                IsActive = true,
                EndDate = DateTime.UtcNow.AddMonths(6)
            },
            new Coupon
            {
                Code = "SALE50K",
                Description = "Giảm 50.000đ cho đơn từ 500k",
                Type = CouponType.FixedAmount,
                Value = 50000,
                MinOrderAmount = 500000,
                UsageLimit = 200,
                IsActive = true,
                EndDate = DateTime.UtcNow.AddMonths(3)
            }
        });

        await context.SaveChangesAsync();
    }
}
