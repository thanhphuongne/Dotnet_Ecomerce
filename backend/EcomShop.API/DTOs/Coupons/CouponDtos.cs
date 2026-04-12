using System;
using System.ComponentModel.DataAnnotations;
using EcomShop.API.Models;

namespace EcomShop.API.DTOs.Coupons;

public class CreateCouponDto
{
    [Required]
    public string Code { get; set; } = string.Empty;

    public string? Description { get; set; }

    [Required]
    public CouponType Type { get; set; }

    [Required]
    public decimal Value { get; set; }

    public decimal? MinOrderAmount { get; set; }
    public decimal? MaxDiscountAmount { get; set; }
    public int? UsageLimit { get; set; }
    public int? UsageLimitPerUser { get; set; }
    public bool IsActive { get; set; } = true;
    public DateTime? StartDate { get; set; }
    public DateTime? EndDate { get; set; }
}

public class UpdateCouponDto : CreateCouponDto { }

public class CouponDto
{
    public int Id { get; set; }
    public string Code { get; set; } = string.Empty;
    public string? Description { get; set; }
    public CouponType Type { get; set; }
    public decimal Value { get; set; }
    public decimal? MinOrderAmount { get; set; }
    public decimal? MaxDiscountAmount { get; set; }
    public int? UsageLimit { get; set; }
    public int UsedCount { get; set; }
    public int? UsageLimitPerUser { get; set; }
    public bool IsActive { get; set; }
    public DateTime? StartDate { get; set; }
    public DateTime? EndDate { get; set; }
}
