using System.Security.Claims;
using EcomShop.API.Data;
using EcomShop.API.DTOs.Auth;
using EcomShop.API.Models;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace EcomShop.API.Controllers;

[ApiController]
[Route("api/[controller]")]
[Authorize(Roles = "Admin")]
public class UsersController : ControllerBase
{
    private readonly AppDbContext _context;

    public UsersController(AppDbContext context)
    {
        _context = context;
    }

    [HttpGet]
    public async Task<IActionResult> GetUsers(
        [FromQuery] string? search,
        [FromQuery] string? role,
        [FromQuery] bool? isActive,
        [FromQuery] int page = 1,
        [FromQuery] int pageSize = 20)
    {
        var q = _context.Users.AsQueryable();

        if (!string.IsNullOrWhiteSpace(search))
        {
            var s = search.ToLower();
            q = q.Where(u => u.FullName.ToLower().Contains(s)
                || u.Email.ToLower().Contains(s)
                || (u.PhoneNumber != null && u.PhoneNumber.Contains(s)));
        }

        if (!string.IsNullOrWhiteSpace(role) && Enum.TryParse<UserRole>(role, true, out var roleEnum))
            q = q.Where(u => u.Role == roleEnum);

        if (isActive.HasValue)
            q = q.Where(u => u.IsActive == isActive.Value);

        var totalCount = await q.CountAsync();
        var users = await q
            .OrderByDescending(u => u.CreatedAt)
            .Skip((page - 1) * pageSize)
            .Take(pageSize)
            .Select(u => new UserDto
            {
                Id = u.Id,
                FullName = u.FullName,
                Email = u.Email,
                PhoneNumber = u.PhoneNumber,
                AvatarUrl = u.AvatarUrl,
                Role = u.Role.ToString(),
                IsActive = u.IsActive,
                CreatedAt = u.CreatedAt
            })
            .ToListAsync();

        return Ok(new
        {
            success = true,
            data = new
            {
                items = users,
                totalCount,
                page,
                pageSize,
                totalPages = (int)Math.Ceiling((double)totalCount / pageSize)
            }
        });
    }

    [HttpGet("{id:int}")]
    public async Task<IActionResult> GetById(int id)
    {
        var user = await _context.Users.FindAsync(id);
        if (user == null)
            return NotFound(new { success = false, message = "Không tìm thấy người dùng" });

        return Ok(new
        {
            success = true,
            data = new UserDto
            {
                Id = user.Id,
                FullName = user.FullName,
                Email = user.Email,
                PhoneNumber = user.PhoneNumber,
                AvatarUrl = user.AvatarUrl,
                Role = user.Role.ToString(),
                IsActive = user.IsActive,
                CreatedAt = user.CreatedAt
            }
        });
    }

    [HttpPost]
    public async Task<IActionResult> CreateUser([FromBody] CreateUserByAdminDto dto)
    {
        if (await _context.Users.AnyAsync(u => u.Email == dto.Email.ToLower()))
            return BadRequest(new { success = false, message = "Email đã được sử dụng" });

        if (!Enum.TryParse<UserRole>(dto.Role, true, out var role))
            return BadRequest(new { success = false, message = "Role không hợp lệ" });

        var user = new User
        {
            FullName = dto.FullName.Trim(),
            Email = dto.Email.ToLower().Trim(),
            PasswordHash = BCrypt.Net.BCrypt.HashPassword(dto.Password),
            PhoneNumber = dto.PhoneNumber,
            Role = role,
            IsActive = true,
            IsEmailVerified = true
        };

        _context.Users.Add(user);
        await _context.SaveChangesAsync();

        return Ok(new { success = true, message = "Tạo tài khoản thành công" });
    }

    [HttpPut("{id:int}/role")]
    public async Task<IActionResult> UpdateRole(int id, [FromBody] UpdateRoleDto dto)
    {
        var user = await _context.Users.FindAsync(id);
        if (user == null)
            return NotFound(new { success = false, message = "Không tìm thấy người dùng" });

        if (!Enum.TryParse<UserRole>(dto.Role, true, out var role))
            return BadRequest(new { success = false, message = "Role không hợp lệ" });

        user.Role = role;
        user.UpdatedAt = DateTime.UtcNow;
        await _context.SaveChangesAsync();

        return Ok(new { success = true, message = "Cập nhật quyền thành công" });
    }

    [HttpPut("{id:int}/status")]
    public async Task<IActionResult> ToggleStatus(int id)
    {
        var user = await _context.Users.FindAsync(id);
        if (user == null)
            return NotFound(new { success = false, message = "Không tìm thấy người dùng" });

        // Cannot deactivate yourself
        var currentUserId = int.Parse(User.FindFirst(ClaimTypes.NameIdentifier)!.Value);
        if (user.Id == currentUserId)
            return BadRequest(new { success = false, message = "Không thể khóa tài khoản của chính mình" });

        user.IsActive = !user.IsActive;
        user.UpdatedAt = DateTime.UtcNow;
        await _context.SaveChangesAsync();

        return Ok(new
        {
            success = true,
            message = user.IsActive ? "Mở khóa tài khoản thành công" : "Khóa tài khoản thành công"
        });
    }
}

public class CreateUserByAdminDto
{
    public string FullName { get; set; } = string.Empty;
    public string Email { get; set; } = string.Empty;
    public string Password { get; set; } = string.Empty;
    public string? PhoneNumber { get; set; }
    public string Role { get; set; } = "Customer";
}

public class UpdateRoleDto
{
    public string Role { get; set; } = string.Empty;
}
