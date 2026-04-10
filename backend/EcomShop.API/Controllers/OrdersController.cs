using System.Security.Claims;
using EcomShop.API.DTOs.Orders;
using EcomShop.API.Services;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace EcomShop.API.Controllers;

[ApiController]
[Route("api/[controller]")]
[Authorize]
public class OrdersController : ControllerBase
{
    private readonly IOrderService _orderService;

    public OrdersController(IOrderService orderService)
    {
        _orderService = orderService;
    }

    // Customer: Get my orders
    [HttpGet("my")]
    public async Task<IActionResult> GetMyOrders([FromQuery] OrderQueryDto query)
    {
        var userId = GetCurrentUserId();
        var orders = await _orderService.GetOrdersAsync(userId, query);
        return Ok(new { success = true, data = orders });
    }

    // Customer: Get my order detail
    [HttpGet("my/{id:int}")]
    public async Task<IActionResult> GetMyOrderDetail(int id)
    {
        var userId = GetCurrentUserId();
        var order = await _orderService.GetOrderDetailAsync(id, userId);
        return Ok(new { success = true, data = order });
    }

    // Admin/Staff: Get all orders
    [HttpGet]
    [Authorize(Roles = "Admin,Staff")]
    public async Task<IActionResult> GetAllOrders([FromQuery] OrderQueryDto query)
    {
        var orders = await _orderService.GetOrdersAsync(null, query);
        return Ok(new { success = true, data = orders });
    }

    // Admin/Staff: Get order detail
    [HttpGet("{id:int}")]
    [Authorize(Roles = "Admin,Staff")]
    public async Task<IActionResult> GetOrderDetail(int id)
    {
        var order = await _orderService.GetOrderDetailAsync(id);
        return Ok(new { success = true, data = order });
    }

    // Customer: Create order
    [HttpPost]
    public async Task<IActionResult> CreateOrder([FromBody] CreateOrderDto dto)
    {
        var userId = GetCurrentUserId();
        var order = await _orderService.CreateOrderAsync(userId, dto);
        return CreatedAtAction(nameof(GetMyOrderDetail), new { id = order.Id },
            new { success = true, data = order, message = "Đặt hàng thành công" });
    }

    // Admin/Staff: Update order status
    [HttpPut("{id:int}/status")]
    [Authorize(Roles = "Admin,Staff")]
    public async Task<IActionResult> UpdateStatus(int id, [FromBody] UpdateOrderStatusDto dto)
    {
        var staffId = GetCurrentUserId();
        var order = await _orderService.UpdateOrderStatusAsync(id, staffId, dto);
        return Ok(new { success = true, data = order, message = "Cập nhật trạng thái đơn hàng thành công" });
    }

    // Customer: Cancel order
    [HttpPost("my/{id:int}/cancel")]
    public async Task<IActionResult> CancelMyOrder(int id, [FromBody] CancelOrderRequest? request)
    {
        var userId = GetCurrentUserId();
        var order = await _orderService.CancelOrderAsync(id, userId, request?.Reason);
        return Ok(new { success = true, data = order, message = "Hủy đơn hàng thành công" });
    }

    // Validate coupon
    [HttpPost("validate-coupon")]
    public async Task<IActionResult> ValidateCoupon([FromBody] CouponValidateDto dto)
    {
        var userId = GetCurrentUserId();
        var result = await _orderService.ValidateCouponAsync(dto, userId);
        return Ok(new { success = true, data = result });
    }

    // Admin: Dashboard stats
    [HttpGet("dashboard-stats")]
    [Authorize(Roles = "Admin,Staff")]
    public async Task<IActionResult> GetDashboardStats()
    {
        var stats = await _orderService.GetDashboardStatsAsync();
        return Ok(new { success = true, data = stats });
    }

    private int GetCurrentUserId()
    {
        var claim = User.FindFirst(ClaimTypes.NameIdentifier)?.Value
            ?? User.FindFirst(System.IdentityModel.Tokens.Jwt.JwtRegisteredClaimNames.Sub)?.Value;
        return int.Parse(claim ?? throw new UnauthorizedAccessException());
    }
}

public class CancelOrderRequest
{
    public string? Reason { get; set; }
}
