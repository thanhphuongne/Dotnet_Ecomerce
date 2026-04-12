using System.Security.Claims;
using System.Text.Json;
using System.IO;
using System.Linq;
using EcomShop.API.Services;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace EcomShop.API.Controllers;

[ApiController]
[Route("api/[controller]")]
public class PaymentsController : ControllerBase
{
    private readonly IPaymentService _paymentService;
    private readonly IConfiguration _config;

    public PaymentsController(IPaymentService paymentService, IConfiguration config)
    {
        _paymentService = paymentService;
        _config = config;
    }

    /// <summary>
    /// Tạo link thanh toán PayOS cho đơn hàng
    /// </summary>
    [HttpPost("create-link")]
    [Authorize]
    public async Task<IActionResult> CreatePaymentLink([FromBody] CreatePaymentLinkDto dto)
    {
        var userId = int.Parse(User.FindFirstValue(ClaimTypes.NameIdentifier)!);
        // Determine frontend base URL to use for return/cancel links.
        // Priority: 1) client-provided dto.ReturnUrl (if its origin is whitelisted)
        //           2) Origin header from the request (if whitelisted)
        //           3) AllowedOrigins[0] from config (fallback)
        var allowedOrigins = _config.GetSection("AllowedOrigins").Get<string[]>() ?? new[] { "http://localhost:3000" };

        string? frontendBase = null;

        // If client provided a full ReturnUrl, validate its origin against allowed origins
        if (!string.IsNullOrWhiteSpace(dto.ReturnUrl) && Uri.TryCreate(dto.ReturnUrl, UriKind.Absolute, out var providedUri))
        {
            var providedOrigin = providedUri.GetLeftPart(UriPartial.Authority);
            if (allowedOrigins.Any(a => string.Equals(a.TrimEnd('/'), providedOrigin.TrimEnd('/'), StringComparison.OrdinalIgnoreCase)))
            {
                frontendBase = providedOrigin;
            }
        }

        // If not set yet, try the Origin header (set by browsers on CORS requests)
        if (frontendBase == null && Request.Headers.TryGetValue("Origin", out var originVals) && originVals.Count > 0)
        {
            var originHeader = originVals[0];
            if (Uri.TryCreate(originHeader, UriKind.Absolute, out var originUri))
            {
                var origin = originUri.GetLeftPart(UriPartial.Authority);
                if (allowedOrigins.Any(a => string.Equals(a.TrimEnd('/'), origin.TrimEnd('/'), StringComparison.OrdinalIgnoreCase)))
                {
                    frontendBase = origin;
                }
            }
        }

        // Fallback to configured AllowedOrigins[0]
        if (frontendBase == null)
        {
            frontendBase = allowedOrigins.Length > 0 ? allowedOrigins[0] : "http://localhost:3000";
        }

        dto.ReturnUrl = $"{frontendBase}/payment/success";
        dto.CancelUrl = $"{frontendBase}/payment/cancel";

        var result = await _paymentService.CreatePaymentLinkAsync(userId, dto);
        return Ok(new { success = true, data = result });
    }

    /// <summary>
    /// Webhook nhận kết quả thanh toán từ PayOS
    /// </summary>
    [HttpPost("webhook")]
    public async Task<IActionResult> Webhook()
    {
        try
        {
            // Read raw body so we can verify signature
            using var reader = new StreamReader(Request.Body);
            var body = await reader.ReadToEndAsync();

            // Try common header names for signatures/checksum
            var signatureHeaders = new[] { "X-PayOS-Signature", "X-PAYOS-SIGNATURE", "X-Payos-Signature", "X-PayOS-Checksum", "X-Checksum", "Checksum", "Signature", "X-Signature" };
            string? signature = null;
            foreach (var h in signatureHeaders)
            {
                if (Request.Headers.TryGetValue(h, out var v) && v.Count > 0)
                {
                    signature = v.FirstOrDefault();
                    break;
                }
            }

            await _paymentService.HandleWebhookAsync(body, signature);
            return Ok(new { success = true });
        }
        catch (Exception ex)
        {
            return BadRequest(new { success = false, message = ex.Message });
        }
    }

    /// <summary>
    /// Debug: lookup existing PayOS checkout URL by orderCode (returns null if not found)
    /// </summary>
    [HttpGet("debug/payos/{orderCode}")]
    [Authorize]
    public async Task<IActionResult> DebugLookupPayOs(string orderCode)
    {
        try
        {
            var url = await _paymentService.LookupExistingPayOsCheckoutUrlAsync(orderCode);
            if (string.IsNullOrEmpty(url)) return NotFound(new { success = false, message = "No checkout URL found" });
            return Ok(new { success = true, checkoutUrl = url });
        }
        catch (Exception ex)
        {
            return BadRequest(new { success = false, message = ex.Message });
        }
    }
}
