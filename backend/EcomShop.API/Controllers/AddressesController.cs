using System.Security.Claims;
using EcomShop.API.Data;
using EcomShop.API.Models;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace EcomShop.API.Controllers;

[ApiController]
[Route("api/[controller]")]
[Authorize]
public class AddressesController : ControllerBase
{
    private readonly AppDbContext _context;

    public AddressesController(AppDbContext context)
    {
        _context = context;
    }

    [HttpGet]
    public async Task<IActionResult> GetMyAddresses()
    {
        var userId = GetCurrentUserId();
        var addresses = await _context.Addresses
            .Where(a => a.UserId == userId)
            .OrderByDescending(a => a.IsDefault)
            .ThenByDescending(a => a.CreatedAt)
            .ToListAsync();
        return Ok(new { success = true, data = addresses });
    }

    [HttpPost]
    public async Task<IActionResult> CreateAddress([FromBody] CreateAddressDto dto)
    {
        var userId = GetCurrentUserId();

        // Limit to 5 addresses per user
        var count = await _context.Addresses.CountAsync(a => a.UserId == userId);
        if (count >= 5)
            return BadRequest(new { success = false, message = "Tối đa 5 địa chỉ giao hàng" });

        if (dto.IsDefault)
            await ClearDefaultAsync(userId);

        var address = new Address
        {
            UserId = userId,
            FullName = dto.FullName,
            PhoneNumber = dto.PhoneNumber,
            AddressLine = dto.AddressLine,
            Ward = dto.Ward,
            District = dto.District,
            City = dto.City,
            IsDefault = dto.IsDefault || count == 0
        };

        _context.Addresses.Add(address);
        await _context.SaveChangesAsync();
        return Ok(new { success = true, data = address, message = "Thêm địa chỉ thành công" });
    }

    [HttpPut("{id:int}")]
    public async Task<IActionResult> UpdateAddress(int id, [FromBody] CreateAddressDto dto)
    {
        var userId = GetCurrentUserId();
        var address = await _context.Addresses
            .FirstOrDefaultAsync(a => a.Id == id && a.UserId == userId);

        if (address == null)
            return NotFound(new { success = false, message = "Không tìm thấy địa chỉ" });

        if (dto.IsDefault && !address.IsDefault)
            await ClearDefaultAsync(userId);

        address.FullName = dto.FullName;
        address.PhoneNumber = dto.PhoneNumber;
        address.AddressLine = dto.AddressLine;
        address.Ward = dto.Ward;
        address.District = dto.District;
        address.City = dto.City;
        address.IsDefault = dto.IsDefault;

        await _context.SaveChangesAsync();
        return Ok(new { success = true, data = address, message = "Cập nhật địa chỉ thành công" });
    }

    [HttpPut("{id:int}/set-default")]
    public async Task<IActionResult> SetDefault(int id)
    {
        var userId = GetCurrentUserId();
        var address = await _context.Addresses
            .FirstOrDefaultAsync(a => a.Id == id && a.UserId == userId);

        if (address == null)
            return NotFound(new { success = false, message = "Không tìm thấy địa chỉ" });

        await ClearDefaultAsync(userId);
        address.IsDefault = true;
        await _context.SaveChangesAsync();
        return Ok(new { success = true, message = "Đã đặt làm địa chỉ mặc định" });
    }

    [HttpDelete("{id:int}")]
    public async Task<IActionResult> DeleteAddress(int id)
    {
        var userId = GetCurrentUserId();
        var address = await _context.Addresses
            .FirstOrDefaultAsync(a => a.Id == id && a.UserId == userId);

        if (address == null)
            return NotFound(new { success = false, message = "Không tìm thấy địa chỉ" });

        _context.Addresses.Remove(address);
        await _context.SaveChangesAsync();
        return Ok(new { success = true, message = "Xóa địa chỉ thành công" });
    }

    private async Task ClearDefaultAsync(int userId)
    {
        await _context.Addresses
            .Where(a => a.UserId == userId && a.IsDefault)
            .ExecuteUpdateAsync(s => s.SetProperty(a => a.IsDefault, false));
    }

    private int GetCurrentUserId()
    {
        var claim = User.FindFirst(ClaimTypes.NameIdentifier)?.Value
            ?? User.FindFirst(System.IdentityModel.Tokens.Jwt.JwtRegisteredClaimNames.Sub)?.Value;
        return int.Parse(claim ?? throw new UnauthorizedAccessException());
    }
}

public class CreateAddressDto
{
    public string FullName { get; set; } = string.Empty;
    public string PhoneNumber { get; set; } = string.Empty;
    public string AddressLine { get; set; } = string.Empty;
    public string Ward { get; set; } = string.Empty;
    public string District { get; set; } = string.Empty;
    public string City { get; set; } = string.Empty;
    public bool IsDefault { get; set; } = false;
}
