using System;
using System.Linq;
using System.Threading.Tasks;
using EcomShop.API.Data;
using EcomShop.API.DTOs.Coupons;
using EcomShop.API.Models;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace EcomShop.API.Controllers;

[ApiController]
[Route("api/[controller]")]
[Authorize(Roles = "Admin,Staff")]
public class CouponsController : ControllerBase
{
    private readonly AppDbContext _context;

    public CouponsController(AppDbContext context)
    {
        _context = context;
    }

    [HttpGet]
    public async Task<IActionResult> GetAll()
    {
        var coupons = await _context.Coupons.OrderByDescending(c => c.CreatedAt).ToListAsync();
        return Ok(new { success = true, data = coupons });
    }

    [HttpGet("{id:int}")]
    public async Task<IActionResult> Get(int id)
    {
        var coupon = await _context.Coupons.FindAsync(id);
        if (coupon == null) return NotFound(new { success = false, message = "Không tìm thấy mã" });
        return Ok(new { success = true, data = coupon });
    }

    [HttpPost]
    public async Task<IActionResult> Create([FromBody] CreateCouponDto dto)
    {
        if (string.IsNullOrWhiteSpace(dto.Code))
            return BadRequest(new { success = false, message = "Code is required" });

        var exists = await _context.Coupons.AnyAsync(c => c.Code == dto.Code.ToUpper());
        if (exists) return BadRequest(new { success = false, message = "Mã đã tồn tại" });

        var coupon = new Coupon
        {
            Code = dto.Code.ToUpper(),
            Description = dto.Description,
            Type = dto.Type,
            Value = dto.Value,
            MinOrderAmount = dto.MinOrderAmount,
            MaxDiscountAmount = dto.MaxDiscountAmount,
            UsageLimit = dto.UsageLimit,
            UsageLimitPerUser = dto.UsageLimitPerUser,
            IsActive = dto.IsActive,
            StartDate = dto.StartDate,
            EndDate = dto.EndDate,
            CreatedAt = DateTime.UtcNow
        };

        _context.Coupons.Add(coupon);
        await _context.SaveChangesAsync();

        return CreatedAtAction(nameof(Get), new { id = coupon.Id }, new { success = true, data = coupon });
    }

    [HttpPut("{id:int}")]
    public async Task<IActionResult> Update(int id, [FromBody] UpdateCouponDto dto)
    {
        var coupon = await _context.Coupons.FindAsync(id);
        if (coupon == null) return NotFound(new { success = false, message = "Không tìm thấy mã" });

        coupon.Code = dto.Code.ToUpper();
        coupon.Description = dto.Description;
        coupon.Type = dto.Type;
        coupon.Value = dto.Value;
        coupon.MinOrderAmount = dto.MinOrderAmount;
        coupon.MaxDiscountAmount = dto.MaxDiscountAmount;
        coupon.UsageLimit = dto.UsageLimit;
        coupon.UsageLimitPerUser = dto.UsageLimitPerUser;
        coupon.IsActive = dto.IsActive;
        coupon.StartDate = dto.StartDate;
        coupon.EndDate = dto.EndDate;

        await _context.SaveChangesAsync();
        return Ok(new { success = true, data = coupon });
    }

    [HttpDelete("{id:int}")]
    public async Task<IActionResult> Delete(int id)
    {
        var coupon = await _context.Coupons.FindAsync(id);
        if (coupon == null) return NotFound(new { success = false, message = "Không tìm thấy mã" });

        _context.Coupons.Remove(coupon);
        await _context.SaveChangesAsync();
        return Ok(new { success = true });
    }
}
