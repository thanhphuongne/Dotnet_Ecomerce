using System.ComponentModel.DataAnnotations;
using EcomShop.API.Models;

namespace EcomShop.API.DTOs.Orders;

public class CreateOrderDto
{
    [Required]
    public int AddressId { get; set; }

    [Required]
    public PaymentMethod PaymentMethod { get; set; }

    public string? CouponCode { get; set; }
    public string? Note { get; set; }
    public List<OrderItemRequestDto>? Items { get; set; }  // null = use cart
}

public class OrderItemRequestDto
{
    [Required]
    public int ProductId { get; set; }

    public int? VariantId { get; set; }

    [Range(1, 100)]
    public int Quantity { get; set; } = 1;
}

public class UpdateOrderStatusDto
{
    [Required]
    public OrderStatus Status { get; set; }

    public string? Note { get; set; }
    public string? TrackingNumber { get; set; }
    public string? CancelReason { get; set; }
}

public class OrderListDto
{
    public int Id { get; set; }
    public string OrderCode { get; set; } = string.Empty;
    public string Status { get; set; } = string.Empty;
    public string PaymentStatus { get; set; } = string.Empty;
    public string PaymentMethod { get; set; } = string.Empty;
    public decimal TotalAmount { get; set; }
    public int ItemCount { get; set; }
    public string? FirstItemImage { get; set; }
    public string? FirstItemName { get; set; }
    public DateTime CreatedAt { get; set; }
    public string CustomerName { get; set; } = string.Empty;
    public string CustomerEmail { get; set; } = string.Empty;
}

public class OrderDetailDto : OrderListDto
{
    public string ShippingFullName { get; set; } = string.Empty;
    public string ShippingPhone { get; set; } = string.Empty;
    public string ShippingAddress { get; set; } = string.Empty;
    public string ShippingCity { get; set; } = string.Empty;
    public string ShippingDistrict { get; set; } = string.Empty;
    public string ShippingWard { get; set; } = string.Empty;
    public decimal SubTotal { get; set; }
    public decimal ShippingFee { get; set; }
    public decimal DiscountAmount { get; set; }
    public string? CouponCode { get; set; }
    public string? Note { get; set; }
    public string? TrackingNumber { get; set; }
    public string? CancelReason { get; set; }
    public DateTime UpdatedAt { get; set; }
    public DateTime? ShippedAt { get; set; }
    public DateTime? DeliveredAt { get; set; }
    public List<OrderItemDto> Items { get; set; } = new();
    public List<OrderStatusHistoryDto> StatusHistories { get; set; } = new();
}

public class OrderItemDto
{
    public int Id { get; set; }
    public int ProductId { get; set; }
    public string ProductName { get; set; } = string.Empty;
    public string? ProductImage { get; set; }
    public string? Size { get; set; }
    public string? Color { get; set; }
    public string? Sku { get; set; }
    public int Quantity { get; set; }
    public decimal UnitPrice { get; set; }
    public decimal TotalPrice { get; set; }
}

public class OrderStatusHistoryDto
{
    public int Id { get; set; }
    public string Status { get; set; } = string.Empty;
    public string? Note { get; set; }
    public DateTime CreatedAt { get; set; }
}

public class OrderQueryDto
{
    public string? Status { get; set; }
    public string? PaymentStatus { get; set; }
    public string? Search { get; set; }  // order code or customer name
    public DateTime? FromDate { get; set; }
    public DateTime? ToDate { get; set; }
    public int Page { get; set; } = 1;
    public int PageSize { get; set; } = 10;
    public string? SortBy { get; set; } = "createdAt";
    public string? SortOrder { get; set; } = "desc";
}

public class CouponValidateDto
{
    [Required]
    public string Code { get; set; } = string.Empty;

    [Required]
    [Range(0, double.MaxValue)]
    public decimal OrderAmount { get; set; }
}

public class CouponValidateResultDto
{
    public bool IsValid { get; set; }
    public string? Message { get; set; }
    public decimal DiscountAmount { get; set; }
    public string? CouponType { get; set; }
    public decimal CouponValue { get; set; }
}
