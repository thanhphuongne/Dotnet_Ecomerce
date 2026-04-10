using EcomShop.API.Data;
using EcomShop.API.DTOs.Orders;
using EcomShop.API.DTOs.Products;
using EcomShop.API.Models;
using Microsoft.EntityFrameworkCore;

namespace EcomShop.API.Services;

public interface IOrderService
{
    Task<OrderDetailDto> CreateOrderAsync(int userId, CreateOrderDto dto);
    Task<PagedResultDto<OrderListDto>> GetOrdersAsync(int? userId, OrderQueryDto query);
    Task<OrderDetailDto> GetOrderDetailAsync(int orderId, int? userId = null);
    Task<OrderDetailDto> UpdateOrderStatusAsync(int orderId, int staffId, UpdateOrderStatusDto dto);
    Task<OrderDetailDto> CancelOrderAsync(int orderId, int userId, string? reason);
    Task<CouponValidateResultDto> ValidateCouponAsync(CouponValidateDto dto, int userId);
    Task<DashboardStatsDto> GetDashboardStatsAsync();
}

public class DashboardStatsDto
{
    public decimal TodayRevenue { get; set; }
    public decimal MonthRevenue { get; set; }
    public decimal TotalRevenue { get; set; }
    public int TodayOrders { get; set; }
    public int MonthOrders { get; set; }
    public int TotalOrders { get; set; }
    public int TotalUsers { get; set; }
    public int TotalProducts { get; set; }
    public int PendingOrders { get; set; }
    public int LowStockProducts { get; set; }
    public List<RevenueChartDto> RevenueChart { get; set; } = new();
    public List<TopProductDto> TopProducts { get; set; } = new();
    public List<OrderListDto> RecentOrders { get; set; } = new();
}

public class RevenueChartDto
{
    public string Label { get; set; } = string.Empty;
    public decimal Revenue { get; set; }
    public int Orders { get; set; }
}

public class TopProductDto
{
    public int ProductId { get; set; }
    public string ProductName { get; set; } = string.Empty;
    public string? Image { get; set; }
    public int SoldCount { get; set; }
    public decimal Revenue { get; set; }
}

public class OrderService : IOrderService
{
    private readonly AppDbContext _context;

    public OrderService(AppDbContext context)
    {
        _context = context;
    }

    public async Task<OrderDetailDto> CreateOrderAsync(int userId, CreateOrderDto dto)
    {
        var address = await _context.Addresses
            .FirstOrDefaultAsync(a => a.Id == dto.AddressId && a.UserId == userId)
            ?? throw new KeyNotFoundException("Không tìm thấy địa chỉ");

        // Get items from cart or from dto
        List<(int ProductId, int? VariantId, int Quantity)> cartItems;

        if (dto.Items != null && dto.Items.Any())
        {
            cartItems = dto.Items.Select(i => (i.ProductId, i.VariantId, i.Quantity)).ToList();
        }
        else
        {
            var userCart = await _context.CartItems
                .Where(c => c.UserId == userId)
                .ToListAsync();

            if (!userCart.Any())
                throw new InvalidOperationException("Giỏ hàng trống");

            cartItems = userCart.Select(c => (c.ProductId, c.VariantId, c.Quantity)).ToList();
        }

        // Build order items
        var orderItems = new List<OrderItem>();
        decimal subTotal = 0;

        foreach (var (productId, variantId, qty) in cartItems)
        {
            var product = await _context.Products
                .Include(p => p.Images)
                .FirstOrDefaultAsync(p => p.Id == productId && p.IsActive)
                ?? throw new KeyNotFoundException($"Sản phẩm {productId} không tồn tại");

            ProductVariant? variant = null;
            if (variantId.HasValue)
            {
                variant = await _context.ProductVariants
                    .FirstOrDefaultAsync(v => v.Id == variantId.Value && v.ProductId == productId)
                    ?? throw new KeyNotFoundException($"Biến thể sản phẩm không tồn tại");

                if (variant.Stock < qty)
                    throw new InvalidOperationException($"Sản phẩm '{product.Name}' ({variant.Size}, {variant.Color}) chỉ còn {variant.Stock} cái");
            }

            var unitPrice = (product.SalePrice ?? product.BasePrice) + (variant?.PriceAdjustment ?? 0);
            var totalPrice = unitPrice * qty;

            orderItems.Add(new OrderItem
            {
                ProductId = productId,
                VariantId = variantId,
                ProductName = product.Name,
                ProductImage = product.Images.FirstOrDefault(i => i.IsPrimary)?.Url ?? product.Images.FirstOrDefault()?.Url,
                Size = variant?.Size,
                Color = variant?.Color,
                Sku = variant?.Sku,
                Quantity = qty,
                UnitPrice = unitPrice,
                TotalPrice = totalPrice
            });

            subTotal += totalPrice;
        }

        // Calculate coupon discount
        decimal discountAmount = 0;
        if (!string.IsNullOrEmpty(dto.CouponCode))
        {
            var couponResult = await ValidateCouponAsync(new CouponValidateDto
            {
                Code = dto.CouponCode,
                OrderAmount = subTotal
            }, userId);

            if (!couponResult.IsValid)
                throw new InvalidOperationException(couponResult.Message ?? "Mã giảm giá không hợp lệ");

            discountAmount = couponResult.DiscountAmount;

            // Increment usage count
            var coupon = await _context.Coupons.FirstOrDefaultAsync(c => c.Code == dto.CouponCode.ToUpper());
            if (coupon != null) coupon.UsedCount++;
        }

        const decimal shippingFee = 30000; // Fixed shipping fee, can be dynamic
        var totalAmount = subTotal + shippingFee - discountAmount;

        var order = new Order
        {
            OrderCode = await GenerateOrderCodeAsync(),
            UserId = userId,
            Status = OrderStatus.Pending,
            PaymentMethod = dto.PaymentMethod,
            PaymentStatus = dto.PaymentMethod == PaymentMethod.COD ? PaymentStatus.Pending : PaymentStatus.Pending,
            ShippingFullName = address.FullName,
            ShippingPhone = address.PhoneNumber,
            ShippingAddress = address.AddressLine,
            ShippingCity = address.City,
            ShippingDistrict = address.District,
            ShippingWard = address.Ward,
            SubTotal = subTotal,
            ShippingFee = shippingFee,
            DiscountAmount = discountAmount,
            TotalAmount = totalAmount,
            CouponCode = dto.CouponCode?.ToUpper(),
            Note = dto.Note,
            Items = orderItems
        };

        _context.Orders.Add(order);

        // Deduct stock
        foreach (var item in orderItems.Where(i => i.VariantId.HasValue))
        {
            var variant = await _context.ProductVariants.FindAsync(item.VariantId!.Value);
            if (variant != null)
            {
                variant.Stock -= item.Quantity;
                if (variant.Stock < 0) variant.Stock = 0;
            }
        }

        // Update product sold count
        foreach (var item in orderItems)
        {
            var product = await _context.Products.FindAsync(item.ProductId);
            if (product != null)
            {
                product.SoldCount += item.Quantity;
                product.TotalStock = Math.Max(0, product.TotalStock - item.Quantity);
            }
        }

        // Clear cart if created from cart
        if (dto.Items == null || !dto.Items.Any())
        {
            var cartToDelete = await _context.CartItems
                .Where(c => c.UserId == userId)
                .ToListAsync();
            _context.CartItems.RemoveRange(cartToDelete);
        }

        // Add status history
        _context.OrderStatusHistories.Add(new OrderStatusHistory
        {
            Order = order,
            Status = OrderStatus.Pending,
            Note = "Đơn hàng vừa được tạo"
        });

        await _context.SaveChangesAsync();
        return await GetOrderDetailAsync(order.Id);
    }

    public async Task<PagedResultDto<OrderListDto>> GetOrdersAsync(int? userId, OrderQueryDto query)
    {
        var q = _context.Orders
            .Include(o => o.User)
            .Include(o => o.Items)
            .AsQueryable();

        if (userId.HasValue)
            q = q.Where(o => o.UserId == userId.Value);

        if (!string.IsNullOrWhiteSpace(query.Status) && Enum.TryParse<OrderStatus>(query.Status, true, out var status))
            q = q.Where(o => o.Status == status);

        if (!string.IsNullOrWhiteSpace(query.PaymentStatus) && Enum.TryParse<PaymentStatus>(query.PaymentStatus, true, out var payStatus))
            q = q.Where(o => o.PaymentStatus == payStatus);

        if (!string.IsNullOrWhiteSpace(query.Search))
        {
            var s = query.Search.ToLower();
            q = q.Where(o => o.OrderCode.ToLower().Contains(s)
                || o.User.FullName.ToLower().Contains(s)
                || o.User.Email.ToLower().Contains(s)
                || o.ShippingPhone.Contains(s));
        }

        if (query.FromDate.HasValue)
            q = q.Where(o => o.CreatedAt >= query.FromDate.Value);

        if (query.ToDate.HasValue)
            q = q.Where(o => o.CreatedAt <= query.ToDate.Value.AddDays(1));

        q = query.SortOrder?.ToLower() == "asc"
            ? q.OrderBy(o => o.CreatedAt)
            : q.OrderByDescending(o => o.CreatedAt);

        var totalCount = await q.CountAsync();
        var items = await q
            .Skip((query.Page - 1) * query.PageSize)
            .Take(query.PageSize)
            .Select(o => new OrderListDto
            {
                Id = o.Id,
                OrderCode = o.OrderCode,
                Status = o.Status.ToString(),
                PaymentStatus = o.PaymentStatus.ToString(),
                PaymentMethod = o.PaymentMethod.ToString(),
                TotalAmount = o.TotalAmount,
                ItemCount = o.Items.Count,
                FirstItemImage = o.Items.FirstOrDefault() != null ? o.Items.First().ProductImage : null,
                FirstItemName = o.Items.FirstOrDefault() != null ? o.Items.First().ProductName : null,
                CreatedAt = o.CreatedAt,
                CustomerName = o.User.FullName,
                CustomerEmail = o.User.Email
            })
            .ToListAsync();

        return new PagedResultDto<OrderListDto>
        {
            Items = items,
            TotalCount = totalCount,
            Page = query.Page,
            PageSize = query.PageSize
        };
    }

    public async Task<OrderDetailDto> GetOrderDetailAsync(int orderId, int? userId = null)
    {
        var q = _context.Orders
            .Include(o => o.User)
            .Include(o => o.Items).ThenInclude(i => i.Product)
            .Include(o => o.StatusHistories)
            .AsQueryable();

        if (userId.HasValue)
            q = q.Where(o => o.UserId == userId.Value);

        var order = await q.FirstOrDefaultAsync(o => o.Id == orderId)
            ?? throw new KeyNotFoundException("Không tìm thấy đơn hàng");

        return new OrderDetailDto
        {
            Id = order.Id,
            OrderCode = order.OrderCode,
            Status = order.Status.ToString(),
            PaymentStatus = order.PaymentStatus.ToString(),
            PaymentMethod = order.PaymentMethod.ToString(),
            TotalAmount = order.TotalAmount,
            ItemCount = order.Items.Count,
            FirstItemImage = order.Items.FirstOrDefault()?.ProductImage,
            FirstItemName = order.Items.FirstOrDefault()?.ProductName,
            CreatedAt = order.CreatedAt,
            CustomerName = order.User.FullName,
            CustomerEmail = order.User.Email,
            ShippingFullName = order.ShippingFullName,
            ShippingPhone = order.ShippingPhone,
            ShippingAddress = order.ShippingAddress,
            ShippingCity = order.ShippingCity,
            ShippingDistrict = order.ShippingDistrict,
            ShippingWard = order.ShippingWard,
            SubTotal = order.SubTotal,
            ShippingFee = order.ShippingFee,
            DiscountAmount = order.DiscountAmount,
            CouponCode = order.CouponCode,
            Note = order.Note,
            TrackingNumber = order.TrackingNumber,
            CancelReason = order.CancelReason,
            UpdatedAt = order.UpdatedAt,
            ShippedAt = order.ShippedAt,
            DeliveredAt = order.DeliveredAt,
            Items = order.Items.Select(i => new OrderItemDto
            {
                Id = i.Id,
                ProductId = i.ProductId,
                ProductName = i.ProductName,
                ProductImage = i.ProductImage,
                Size = i.Size,
                Color = i.Color,
                Sku = i.Sku,
                Quantity = i.Quantity,
                UnitPrice = i.UnitPrice,
                TotalPrice = i.TotalPrice
            }).ToList(),
            StatusHistories = order.StatusHistories
                .OrderByDescending(h => h.CreatedAt)
                .Select(h => new OrderStatusHistoryDto
                {
                    Id = h.Id,
                    Status = h.Status.ToString(),
                    Note = h.Note,
                    CreatedAt = h.CreatedAt
                }).ToList()
        };
    }

    public async Task<OrderDetailDto> UpdateOrderStatusAsync(int orderId, int staffId, UpdateOrderStatusDto dto)
    {
        var order = await _context.Orders.FindAsync(orderId)
            ?? throw new KeyNotFoundException("Không tìm thấy đơn hàng");

        order.Status = dto.Status;
        order.UpdatedAt = DateTime.UtcNow;
        order.ProcessedBy = staffId;

        if (dto.TrackingNumber != null)
            order.TrackingNumber = dto.TrackingNumber;

        if (dto.Status == OrderStatus.Shipped)
            order.ShippedAt = DateTime.UtcNow;

        if (dto.Status == OrderStatus.Delivered)
        {
            order.DeliveredAt = DateTime.UtcNow;
            order.PaymentStatus = PaymentStatus.Paid;
        }

        if (dto.Status == OrderStatus.Cancelled)
        {
            order.CancelledAt = DateTime.UtcNow;
            order.CancelReason = dto.CancelReason;
            // Restore stock
            await RestoreStockAsync(orderId);
        }

        _context.OrderStatusHistories.Add(new OrderStatusHistory
        {
            OrderId = orderId,
            Status = dto.Status,
            Note = dto.Note,
            ChangedBy = staffId
        });

        await _context.SaveChangesAsync();
        return await GetOrderDetailAsync(orderId);
    }

    public async Task<OrderDetailDto> CancelOrderAsync(int orderId, int userId, string? reason)
    {
        var order = await _context.Orders
            .FirstOrDefaultAsync(o => o.Id == orderId && o.UserId == userId)
            ?? throw new KeyNotFoundException("Không tìm thấy đơn hàng");

        if (order.Status != OrderStatus.Pending && order.Status != OrderStatus.Confirmed)
            throw new InvalidOperationException("Chỉ có thể hủy đơn hàng đang chờ xác nhận");

        order.Status = OrderStatus.Cancelled;
        order.CancelReason = reason ?? "Khách hàng hủy đơn";
        order.CancelledAt = DateTime.UtcNow;
        order.UpdatedAt = DateTime.UtcNow;

        await RestoreStockAsync(orderId);

        _context.OrderStatusHistories.Add(new OrderStatusHistory
        {
            OrderId = orderId,
            Status = OrderStatus.Cancelled,
            Note = reason ?? "Khách hàng hủy đơn",
            ChangedBy = userId
        });

        await _context.SaveChangesAsync();
        return await GetOrderDetailAsync(orderId, userId);
    }

    public async Task<CouponValidateResultDto> ValidateCouponAsync(CouponValidateDto dto, int userId)
    {
        var coupon = await _context.Coupons
            .FirstOrDefaultAsync(c => c.Code == dto.Code.ToUpper() && c.IsActive);

        if (coupon == null)
            return new CouponValidateResultDto { IsValid = false, Message = "Mã giảm giá không tồn tại" };

        if (coupon.StartDate.HasValue && coupon.StartDate > DateTime.UtcNow)
            return new CouponValidateResultDto { IsValid = false, Message = "Mã giảm giá chưa có hiệu lực" };

        if (coupon.EndDate.HasValue && coupon.EndDate < DateTime.UtcNow)
            return new CouponValidateResultDto { IsValid = false, Message = "Mã giảm giá đã hết hạn" };

        if (coupon.UsageLimit.HasValue && coupon.UsedCount >= coupon.UsageLimit)
            return new CouponValidateResultDto { IsValid = false, Message = "Mã giảm giá đã hết lượt sử dụng" };

        if (coupon.MinOrderAmount.HasValue && dto.OrderAmount < coupon.MinOrderAmount)
            return new CouponValidateResultDto
            {
                IsValid = false,
                Message = $"Đơn hàng tối thiểu {coupon.MinOrderAmount:N0}đ để dùng mã này"
            };

        decimal discountAmount = coupon.Type switch
        {
            CouponType.Percentage => Math.Min(
                dto.OrderAmount * coupon.Value / 100,
                coupon.MaxDiscountAmount ?? decimal.MaxValue),
            CouponType.FixedAmount => Math.Min(coupon.Value, dto.OrderAmount),
            CouponType.FreeShipping => 30000, // Fixed shipping fee
            _ => 0
        };

        return new CouponValidateResultDto
        {
            IsValid = true,
            Message = "Áp dụng mã giảm giá thành công",
            DiscountAmount = discountAmount,
            CouponType = coupon.Type.ToString(),
            CouponValue = coupon.Value
        };
    }

    public async Task<DashboardStatsDto> GetDashboardStatsAsync()
    {
        var now = DateTime.UtcNow;
        var today = now.Date;
        var monthStart = new DateTime(now.Year, now.Month, 1);

        var completedOrders = _context.Orders
            .Where(o => o.Status == OrderStatus.Delivered);

        var todayRevenue = await completedOrders
            .Where(o => o.DeliveredAt >= today)
            .SumAsync(o => (decimal?)o.TotalAmount) ?? 0;

        var monthRevenue = await completedOrders
            .Where(o => o.DeliveredAt >= monthStart)
            .SumAsync(o => (decimal?)o.TotalAmount) ?? 0;

        var totalRevenue = await completedOrders
            .SumAsync(o => (decimal?)o.TotalAmount) ?? 0;

        var todayOrders = await _context.Orders.CountAsync(o => o.CreatedAt >= today);
        var monthOrders = await _context.Orders.CountAsync(o => o.CreatedAt >= monthStart);
        var totalOrders = await _context.Orders.CountAsync();
        var totalUsers = await _context.Users.CountAsync(u => u.Role == UserRole.Customer);
        var totalProducts = await _context.Products.CountAsync(p => p.IsActive);
        var pendingOrders = await _context.Orders.CountAsync(o => o.Status == OrderStatus.Pending);
        var lowStockProducts = await _context.ProductVariants.CountAsync(v => v.Stock < 5 && v.IsActive);

        // Revenue chart: last 7 days
        var chartData = new List<RevenueChartDto>();
        for (int i = 6; i >= 0; i--)
        {
            var day = today.AddDays(-i);
            var revenue = await completedOrders
                .Where(o => o.DeliveredAt.HasValue && o.DeliveredAt.Value.Date == day)
                .SumAsync(o => (decimal?)o.TotalAmount) ?? 0;
            var ordersCount = await _context.Orders
                .CountAsync(o => o.CreatedAt.Date == day);

            chartData.Add(new RevenueChartDto
            {
                Label = day.ToString("dd/MM"),
                Revenue = revenue,
                Orders = ordersCount
            });
        }

        // Top products
        var topProducts = await _context.OrderItems
            .Include(i => i.Product).ThenInclude(p => p.Images)
            .Where(i => i.Order.Status == OrderStatus.Delivered)
            .GroupBy(i => new { i.ProductId, i.ProductName })
            .Select(g => new TopProductDto
            {
                ProductId = g.Key.ProductId,
                ProductName = g.Key.ProductName,
                SoldCount = g.Sum(i => i.Quantity),
                Revenue = g.Sum(i => i.TotalPrice)
            })
            .OrderByDescending(p => p.SoldCount)
            .Take(5)
            .ToListAsync();

        // Recent orders
        var recentOrders = await GetOrdersAsync(null, new OrderQueryDto { PageSize = 10 });

        return new DashboardStatsDto
        {
            TodayRevenue = todayRevenue,
            MonthRevenue = monthRevenue,
            TotalRevenue = totalRevenue,
            TodayOrders = todayOrders,
            MonthOrders = monthOrders,
            TotalOrders = totalOrders,
            TotalUsers = totalUsers,
            TotalProducts = totalProducts,
            PendingOrders = pendingOrders,
            LowStockProducts = lowStockProducts,
            RevenueChart = chartData,
            TopProducts = topProducts,
            RecentOrders = recentOrders.Items
        };
    }

    private async Task RestoreStockAsync(int orderId)
    {
        var items = await _context.OrderItems
            .Where(i => i.OrderId == orderId && i.VariantId.HasValue)
            .ToListAsync();

        foreach (var item in items)
        {
            var variant = await _context.ProductVariants.FindAsync(item.VariantId!.Value);
            if (variant != null)
            {
                variant.Stock += item.Quantity;
            }

            var product = await _context.Products.FindAsync(item.ProductId);
            if (product != null)
            {
                product.SoldCount = Math.Max(0, product.SoldCount - item.Quantity);
                product.TotalStock += item.Quantity;
            }
        }
    }

    private async Task<string> GenerateOrderCodeAsync()
    {
        var date = DateTime.UtcNow.ToString("yyyyMMdd");
        var count = await _context.Orders.CountAsync(o => o.CreatedAt.Date == DateTime.UtcNow.Date);
        return $"ES{date}{(count + 1):D4}";
    }
}
