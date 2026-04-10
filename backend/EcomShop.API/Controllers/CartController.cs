using System.Security.Claims;
using EcomShop.API.Services;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace EcomShop.API.Controllers;

[ApiController]
[Route("api/[controller]")]
[Authorize]
public class CartController : ControllerBase
{
    private readonly ICartService _cartService;

    public CartController(ICartService cartService)
    {
        _cartService = cartService;
    }

    [HttpGet]
    public async Task<IActionResult> GetCart()
    {
        var userId = GetCurrentUserId();
        var cart = await _cartService.GetCartAsync(userId);
        return Ok(new { success = true, data = cart });
    }

    [HttpGet("count")]
    public async Task<IActionResult> GetCartCount()
    {
        var userId = GetCurrentUserId();
        var count = await _cartService.GetCartCountAsync(userId);
        return Ok(new { success = true, data = count });
    }

    [HttpPost("add")]
    public async Task<IActionResult> AddToCart([FromBody] AddToCartRequest request)
    {
        var userId = GetCurrentUserId();
        var cart = await _cartService.AddToCartAsync(userId, request.ProductId, request.VariantId, request.Quantity);
        return Ok(new { success = true, data = cart, message = "Thêm vào giỏ hàng thành công" });
    }

    [HttpPut("{cartItemId:int}")]
    public async Task<IActionResult> UpdateQuantity(int cartItemId, [FromBody] UpdateCartRequest request)
    {
        var userId = GetCurrentUserId();
        var cart = await _cartService.UpdateQuantityAsync(userId, cartItemId, request.Quantity);
        return Ok(new { success = true, data = cart });
    }

    [HttpDelete("{cartItemId:int}")]
    public async Task<IActionResult> RemoveItem(int cartItemId)
    {
        var userId = GetCurrentUserId();
        var cart = await _cartService.RemoveItemAsync(userId, cartItemId);
        return Ok(new { success = true, data = cart, message = "Đã xóa sản phẩm khỏi giỏ hàng" });
    }

    [HttpDelete]
    public async Task<IActionResult> ClearCart()
    {
        var userId = GetCurrentUserId();
        await _cartService.ClearCartAsync(userId);
        return Ok(new { success = true, message = "Đã xóa toàn bộ giỏ hàng" });
    }

    private int GetCurrentUserId()
    {
        var claim = User.FindFirst(ClaimTypes.NameIdentifier)?.Value
            ?? User.FindFirst(System.IdentityModel.Tokens.Jwt.JwtRegisteredClaimNames.Sub)?.Value;
        return int.Parse(claim ?? throw new UnauthorizedAccessException());
    }
}

public class AddToCartRequest
{
    public int ProductId { get; set; }
    public int? VariantId { get; set; }
    public int Quantity { get; set; } = 1;
}

public class UpdateCartRequest
{
    public int Quantity { get; set; }
}
