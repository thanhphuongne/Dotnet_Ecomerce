using System;
using System.Collections.Generic;
using System.Linq;
using System.Reflection;
using System.Text.Json;
using System.Threading.Tasks;
using EcomShop.API.Data;
using EcomShop.API.Models;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.Logging;
using PayOS;
using PayOS.Models.V2.PaymentRequests;

namespace EcomShop.API.Services
{
    public class CreatePaymentLinkDto
    {
        public int OrderId { get; set; }
        public string ReturnUrl { get; set; } = string.Empty;
        public string CancelUrl { get; set; } = string.Empty;
    }

    public class PaymentLinkResultDto
    {
        public string CheckoutUrl { get; set; } = string.Empty;
        public string OrderCode { get; set; } = string.Empty;
    }

    public interface IPaymentService
    {
        Task<PaymentLinkResultDto> CreatePaymentLinkAsync(int userId, CreatePaymentLinkDto dto);
        Task HandleWebhookAsync(string rawBody, string? signatureHeader = null);
        Task<string?> LookupExistingPayOsCheckoutUrlAsync(string orderCodeOrKey);
    }

    public class PaymentService : IPaymentService
    {
        private readonly AppDbContext _context;
        private readonly PayOSClient _payosClient;
        private readonly IConfiguration _config;
        private readonly ILogger<PaymentService> _logger;

        public PaymentService(AppDbContext context, PayOSClient payosClient, IConfiguration config, ILogger<PaymentService> logger)
        {
            _context = context;
            _payosClient = payosClient;
            _config = config;
            _logger = logger;
        }

        public async Task<PaymentLinkResultDto> CreatePaymentLinkAsync(int userId, CreatePaymentLinkDto dto)
        {
            var order = await _context.Orders
                .Include(o => o.Items).ThenInclude(i => i.Product)
                .FirstOrDefaultAsync(o => o.Id == dto.OrderId && o.UserId == userId)
                ?? throw new KeyNotFoundException("Không tìm thấy đơn hàng");

            if (order.PaymentMethod == PaymentMethod.COD)
                throw new InvalidOperationException("Đơn hàng COD không cần thanh toán online");

            if (order.PaymentStatus == PaymentStatus.Paid)
                throw new InvalidOperationException("Đơn hàng đã được thanh toán");

            // Build numeric orderCode
            var digits = new string(order.OrderCode.Where(char.IsDigit).ToArray());
            if (string.IsNullOrEmpty(digits)) digits = DateTimeOffset.UtcNow.ToUnixTimeSeconds().ToString();
            var composite = digits + order.Id.ToString();
            if (composite.Length > 18) composite = composite.Substring(composite.Length - 18);
            var orderCode = long.TryParse(composite, out var oc) ? oc : DateTimeOffset.UtcNow.ToUnixTimeSeconds();

            // Build items for PayOS request (use SDK model types)
            var payosItems = order.Items.Select(i => new PaymentLinkItem
            {
                Name = i.Product.Name.Length > 25 ? i.Product.Name.Substring(0, 25) : i.Product.Name,
                Quantity = i.Quantity,
                Price = Convert.ToInt64(Math.Round(i.UnitPrice))
            }).ToList();

            // Build typed request using SDK model (PascalCase properties)
            var request = new CreatePaymentLinkRequest
            {
                OrderCode = orderCode,
                Amount = Convert.ToInt64(Math.Round(order.TotalAmount)),
                Description = $"Thanh toan {order.OrderCode}",
                ReturnUrl = dto.ReturnUrl,
                CancelUrl = dto.CancelUrl,
                Items = payosItems
            };

            string? checkoutUrl = null;

            // Prefer calling SDK with concrete types
            try
            {
                // PaymentRequests property should be exposed on PayOSClient
                var paymentRequests = _payosClient?.PaymentRequests;
                if (paymentRequests == null)
                {
                    _logger?.LogWarning("PayOS client does not expose PaymentRequests; skipping SDK call for order {OrderId}.", order.Id);
                }
                else
                {
                    _logger?.LogDebug("Calling PayOS.PaymentRequests.CreateAsync for order {OrderId}", order.Id);
                    try
                    {
                        // Call typed SDK method with proper RequestOptions generic
                        var options = new PayOS.Models.RequestOptions<CreatePaymentLinkRequest>();
                        var response = await paymentRequests.CreateAsync(request, options);

                        if (response != null)
                        {
                            // Try typed property first
                            try
                            {
                                checkoutUrl = response.CheckoutUrl;
                            }
                            catch { }

                            var serialized = JsonSerializer.Serialize(response);
                            _logger?.LogDebug("PayOS CreateAsync raw response for order {OrderId}: {Response}", order.Id, serialized);

                            // Fallback to JSON string finder
                            if (string.IsNullOrEmpty(checkoutUrl))
                            {
                                checkoutUrl = TryFindCheckoutInJsonString(serialized);
                            }
                        }
                    }
                    catch (Exception sdkEx)
                    {
                        _logger?.LogError(sdkEx, "PayOS SDK CreateAsync failed for order {OrderId}", order.Id);
                        // Try to recover URL from exception
                        try
                        {
                            var recovered = TryExtractCheckoutUrlFromException(sdkEx);
                            if (!string.IsNullOrEmpty(recovered))
                            {
                                checkoutUrl = recovered;
                                _logger?.LogInformation("Recovered checkoutUrl from PayOS exception for order {OrderId}: {Url}", order.Id, checkoutUrl);
                            }
                        }
                        catch { }

                        // If still not found, attempt lookup via PaymentRequests methods (safe filtering)
                        if (string.IsNullOrEmpty(checkoutUrl))
                        {
                            try
                            {
                                var found = TryRetrieveExistingCheckoutUrl(paymentRequests, orderCode);
                                if (!string.IsNullOrEmpty(found))
                                {
                                    checkoutUrl = found;
                                    _logger?.LogInformation("Recovered checkoutUrl via lookup for order {OrderId}: {Url}", order.Id, checkoutUrl);
                                }
                            }
                            catch (Exception lookupEx)
                            {
                                _logger?.LogDebug(lookupEx, "Lookup for existing PayOS checkout failed for order {OrderId}", order.Id);
                            }
                        }
                    }
                }
            }
            catch (Exception ex)
            {
                _logger?.LogError(ex, "Unexpected error while calling PayOS SDK for order {OrderId}", order.Id);
            }

            // Final fallbacks: try direct PostAsync via client using reflection if needed (kept as last resort)
            if (string.IsNullOrEmpty(checkoutUrl))
            {
                try
                {
                    var clientType = _payosClient.GetType();
                    var postMethods = clientType.GetMethods(BindingFlags.Public | BindingFlags.Instance)
                        .Where(m => string.Equals(m.Name, "PostAsync", StringComparison.OrdinalIgnoreCase) && m.IsGenericMethodDefinition)
                        .ToList();

                    if (postMethods.Count > 0)
                    {
                        var post = postMethods.First();
                        // PostAsync likely expects two generic args: TResponse, TRequest
                        var genArgs = post.GetGenericArguments();
                        // Choose JsonElement for response
                        var genericMethod = post.MakeGenericMethod(typeof(JsonElement), request.GetType());
                        var optionsType = typeof(object); // placeholder if SDK expects RequestOptions<T>

                        object? invoked = null;
                        try
                        {
                            invoked = genericMethod.Invoke(_payosClient, new object[] { "/v2/payment-requests", request });
                        }
                        catch (TargetInvocationException tie)
                        {
                            invoked = tie.InnerException ?? tie;
                        }

                        if (invoked is Task tsk)
                        {
                            try { tsk.GetAwaiter().GetResult(); }
                            catch { }

                            var result = invoked.GetType().GetProperty("Result")?.GetValue(invoked);
                            if (result != null)
                            {
                                var serial = JsonSerializer.Serialize(result);
                                var found = TryFindCheckoutInJsonString(serial);
                                if (!string.IsNullOrEmpty(found)) checkoutUrl = found;
                            }
                        }
                    }
                }
                catch (Exception ex)
                {
                    _logger?.LogDebug(ex, "Direct PostAsync fallback failed for order {OrderId}", order.Id);
                }
            }

            if (string.IsNullOrEmpty(checkoutUrl))
            {
                _logger?.LogWarning("PayOS checkout URL not available; falling back to mock link for order {OrderId} ({OrderCode})", order.Id, order.OrderCode);
                checkoutUrl = dto.ReturnUrl?.TrimEnd('/') + $"?orderCode={order.OrderCode}&mock=1";
            }

            return new PaymentLinkResultDto
            {
                CheckoutUrl = checkoutUrl,
                OrderCode = order.OrderCode
            };
        }

        public async Task<string?> LookupExistingPayOsCheckoutUrlAsync(string orderCodeOrKey)
        {
            if (string.IsNullOrWhiteSpace(orderCodeOrKey)) return null;

            var digits = new string(orderCodeOrKey.Where(char.IsDigit).ToArray());
            if (string.IsNullOrEmpty(digits)) return null;
            if (!long.TryParse(digits, out var numeric)) return null;

            try
            {
                var paymentRequests = _payosClient?.PaymentRequests;
                if (paymentRequests == null)
                {
                    _logger?.LogWarning("PayOS client does not expose PaymentRequests for lookup.");
                    return null;
                }

                var found = TryRetrieveExistingCheckoutUrl(paymentRequests, numeric);
                return await Task.FromResult(found);
            }
            catch (Exception ex)
            {
                _logger?.LogDebug(ex, "LookupExistingPayOsCheckoutUrlAsync failed for {OrderCode}", orderCodeOrKey);
                return null;
            }
        }

        private string? TryRetrieveExistingCheckoutUrl(object paymentRequests, long orderCode)
        {
            if (paymentRequests == null) return null;
            try
            {
                var t = paymentRequests.GetType();
                var methods = t.GetMethods(BindingFlags.Public | BindingFlags.Instance)
                    .Where(m => (m.Name.StartsWith("Get", StringComparison.OrdinalIgnoreCase)
                                 || m.Name.IndexOf("Find", StringComparison.OrdinalIgnoreCase) >= 0
                                 || m.Name.IndexOf("Search", StringComparison.OrdinalIgnoreCase) >= 0
                                 || m.Name.IndexOf("Retrieve", StringComparison.OrdinalIgnoreCase) >= 0
                                 || m.Name.IndexOf("List", StringComparison.OrdinalIgnoreCase) >= 0
                                 || m.Name.IndexOf("Query", StringComparison.OrdinalIgnoreCase) >= 0)
                                && !m.IsSpecialName
                                && !string.Equals(m.Name, "GetType", StringComparison.OrdinalIgnoreCase)
                                && !m.Name.StartsWith("get_", StringComparison.OrdinalIgnoreCase))
                    .ToList();

                foreach (var m in methods)
                {
                    try
                    {
                        _logger?.LogDebug("Trying PayOS lookup method {Method} for orderCode {OrderCode}", m.Name, orderCode);
                        var parameters = m.GetParameters();

                        if (parameters.Any(p => !(p.ParameterType == typeof(string)
                                                   || p.ParameterType == typeof(int)
                                                   || p.ParameterType == typeof(long)
                                                   || p.ParameterType == typeof(System.Threading.CancellationToken))))
                        {
                            _logger?.LogDebug("Skipping PayOS lookup method {Method} because it requires complex parameter types.", m.Name);
                            continue;
                        }

                        var args = new object[parameters.Length];
                        for (int i = 0; i < parameters.Length; i++)
                        {
                            var pType = parameters[i].ParameterType;
                            if (pType == typeof(string))
                                args[i] = orderCode.ToString();
                            else if (pType == typeof(long) || pType == typeof(int))
                                args[i] = Convert.ChangeType(orderCode, pType);
                            else if (pType == typeof(System.Threading.CancellationToken))
                                args[i] = System.Threading.CancellationToken.None;
                            else
                                args[i] = null;
                        }

                        object? invoked = null;
                        try
                        {
                            invoked = m.Invoke(paymentRequests, args);
                        }
                        catch (TargetInvocationException tie)
                        {
                            var recovered = TryExtractCheckoutUrlFromException(tie);
                            if (!string.IsNullOrEmpty(recovered)) return recovered;
                            continue;
                        }
                        catch (Exception invokeEx)
                        {
                            var recovered = TryExtractCheckoutUrlFromException(invokeEx);
                            if (!string.IsNullOrEmpty(recovered)) return recovered;
                            continue;
                        }

                        if (invoked == null) continue;

                        if (invoked is Task task)
                        {
                            try { task.GetAwaiter().GetResult(); }
                            catch (Exception taskEx)
                            {
                                var recovered = TryExtractCheckoutUrlFromException(taskEx);
                                if (!string.IsNullOrEmpty(recovered)) return recovered;
                                continue;
                            }

                            var result = invoked.GetType().GetProperty("Result")?.GetValue(invoked);
                            if (result != null)
                            {
                                var serialized = JsonSerializer.Serialize(result);
                                var found = TryFindCheckoutInJsonString(serialized);
                                if (!string.IsNullOrEmpty(found)) return found;
                            }
                        }
                        else
                        {
                            var serialized = JsonSerializer.Serialize(invoked);
                            var found = TryFindCheckoutInJsonString(serialized);
                            if (!string.IsNullOrEmpty(found)) return found;
                        }
                    }
                    catch (Exception inner)
                    {
                        _logger?.LogDebug(inner, "Error trying PayOS lookup method {Method}", m.Name);
                    }
                }
            }
            catch (Exception ex)
            {
                _logger?.LogDebug(ex, "TryRetrieveExistingCheckoutUrl failed.");
            }

            return null;
        }

        private string? TryExtractCheckoutUrlFromException(Exception ex)
        {
            if (ex == null) return null;

            var queue = new Queue<Exception>();
            queue.Enqueue(ex);
            while (queue.Count > 0)
            {
                var e = queue.Dequeue();
                if (e == null) continue;
                if (e is AggregateException agg)
                {
                    foreach (var ie in agg.InnerExceptions) if (ie != null) queue.Enqueue(ie);
                }
                else if (e.InnerException != null)
                {
                    queue.Enqueue(e.InnerException);
                }

                try
                {
                    var propNames = new[] { "Response", "HttpResponse", "Content", "RawBody", "Body", "Error", "Errors" };
                    var t = e.GetType();
                    foreach (var pn in propNames)
                    {
                        var pi = t.GetProperty(pn);
                        if (pi == null) continue;
                        try
                        {
                            var val = pi.GetValue(e);
                            if (val == null) continue;

                            if (val is string sVal)
                            {
                                var found = TryFindCheckoutInJsonString(sVal);
                                if (!string.IsNullOrEmpty(found)) return found;
                            }
                            else
                            {
                                var vt = val.GetType();
                                var contentProp = vt.GetProperty("Content");
                                if (contentProp != null)
                                {
                                    var content = contentProp.GetValue(val);
                                    if (content != null)
                                    {
                                        var readMethod = content.GetType().GetMethod("ReadAsStringAsync");
                                        if (readMethod != null)
                                        {
                                            try
                                            {
                                                var taskObj = readMethod.Invoke(content, null);
                                                if (taskObj != null)
                                                {
                                                    var getAwaiter = taskObj.GetType().GetMethod("GetAwaiter");
                                                    if (getAwaiter != null)
                                                    {
                                                        var awaiter = getAwaiter.Invoke(taskObj, null);
                                                        if (awaiter != null)
                                                        {
                                                            var getResult = awaiter.GetType().GetMethod("GetResult");
                                                            if (getResult != null)
                                                            {
                                                                var str = getResult.Invoke(awaiter, null) as string;
                                                                if (!string.IsNullOrEmpty(str))
                                                                {
                                                                    var found = TryFindCheckoutInJsonString(str);
                                                                    if (!string.IsNullOrEmpty(found)) return found;
                                                                }
                                                            }
                                                        }
                                                    }
                                                }
                                            }
                                            catch { }
                                        }
                                    }
                                }

                                try
                                {
                                    var serialized = JsonSerializer.Serialize(val);
                                    var found = TryFindCheckoutInJsonString(serialized);
                                    if (!string.IsNullOrEmpty(found)) return found;
                                }
                                catch { }
                            }
                        }
                        catch { }
                    }

                    if (!string.IsNullOrEmpty(e.Message))
                    {
                        var maybe = TryExtractUrlFromText(e.Message);
                        if (!string.IsNullOrEmpty(maybe)) return maybe;
                    }
                }
                catch { }
            }

            return null;
        }

        private string? TryFindCheckoutInJsonString(string s)
        {
            if (string.IsNullOrEmpty(s)) return null;
            try
            {
                var je = JsonSerializer.Deserialize<JsonElement>(s);
                if (je.ValueKind != JsonValueKind.Undefined)
                {
                    if (je.TryGetProperty("data", out var data))
                    {
                        if (data.TryGetProperty("checkoutUrl", out var cu) || data.TryGetProperty("checkout_url", out cu))
                            return cu.GetString();

                        foreach (var prop in data.EnumerateObject())
                        {
                            if (prop.Name.IndexOf("checkout", StringComparison.OrdinalIgnoreCase) >= 0 && prop.Value.ValueKind == JsonValueKind.String)
                                return prop.Value.GetString();
                        }
                    }

                    if (je.TryGetProperty("checkoutUrl", out var cu2))
                        return cu2.GetString();
                    if (je.TryGetProperty("checkout_url", out var cu3))
                        return cu3.GetString();
                }
            }
            catch { }
            return null;
        }

        private string? TryExtractUrlFromText(string text)
        {
            if (string.IsNullOrEmpty(text)) return null;
            var idx = text.IndexOf("http", StringComparison.OrdinalIgnoreCase);
            if (idx >= 0)
            {
                var end = text.IndexOfAny(new char[] { ' ', '\r', '\n', '"', '\'' }, idx);
                if (end < 0) end = text.Length;
                var url = text.Substring(idx, end - idx);
                if (url.StartsWith("http", StringComparison.OrdinalIgnoreCase)) return url;
            }
            return null;
        }

        public async Task HandleWebhookAsync(string rawBody, string? signatureHeader = null)
        {
            var checksumKey = _config["PayOS:ChecksumKey"];
            if (!string.IsNullOrWhiteSpace(checksumKey))
            {
                if (string.IsNullOrEmpty(signatureHeader))
                    throw new UnauthorizedAccessException("Missing webhook signature");

                var sig = signatureHeader.Trim();
                var eq = sig.IndexOf('=');
                if (eq >= 0) sig = sig.Substring(eq + 1);

                byte[] keyBytes;
                try
                {
                    keyBytes = Convert.FromHexString(checksumKey);
                }
                catch
                {
                    try { keyBytes = Convert.FromBase64String(checksumKey); }
                    catch { keyBytes = System.Text.Encoding.UTF8.GetBytes(checksumKey); }
                }

                using var hmac = new System.Security.Cryptography.HMACSHA256(keyBytes);
                var bodyBytes = System.Text.Encoding.UTF8.GetBytes(rawBody);
                var computed = hmac.ComputeHash(bodyBytes);
                var computedBase64 = Convert.ToBase64String(computed);
                var computedHex = BitConverter.ToString(computed).Replace("-", "").ToLowerInvariant();

                string? canonical = null;
                try
                {
                    var obj = JsonSerializer.Deserialize<object>(rawBody);
                    if (obj != null) canonical = JsonSerializer.Serialize(obj);
                }
                catch { }

                string? canonicalBase64 = null;
                string? canonicalHex = null;
                if (!string.IsNullOrEmpty(canonical))
                {
                    var canonicalBytes = System.Text.Encoding.UTF8.GetBytes(canonical);
                    var computed2 = hmac.ComputeHash(canonicalBytes);
                    canonicalBase64 = Convert.ToBase64String(computed2);
                    canonicalHex = BitConverter.ToString(computed2).Replace("-", "").ToLowerInvariant();
                }

                var sigNorm = sig.Trim();
                if (!string.Equals(sigNorm, computedBase64, StringComparison.Ordinal) &&
                    !string.Equals(sigNorm, computedHex, StringComparison.OrdinalIgnoreCase) &&
                    !(canonicalBase64 != null && string.Equals(sigNorm, canonicalBase64, StringComparison.Ordinal)) &&
                    !(canonicalHex != null && string.Equals(sigNorm, canonicalHex, StringComparison.OrdinalIgnoreCase)))
                {
                    throw new UnauthorizedAccessException("Invalid webhook signature");
                }
            }

            var webhookData = JsonSerializer.Deserialize<JsonElement>(rawBody);
            if (webhookData.ValueKind == JsonValueKind.Undefined) return;

            long orderCodeNumeric = 0;
            if (webhookData.TryGetProperty("OrderCode", out var oc1))
                long.TryParse(oc1.ToString(), out orderCodeNumeric);
            else if (webhookData.TryGetProperty("orderCode", out var oc2))
                long.TryParse(oc2.ToString(), out orderCodeNumeric);

            var key = orderCodeNumeric.ToString();
            var orders = await _context.Orders
                .Where(o => o.OrderCode.Contains(key))
                .ToListAsync();

            var order = orders.FirstOrDefault();
            if (order == null) return;

            string code = string.Empty;
            if (webhookData.TryGetProperty("Code", out var c1)) code = c1.GetString() ?? string.Empty;
            else if (webhookData.TryGetProperty("code", out var c2)) code = c2.GetString() ?? string.Empty;

            string reference = string.Empty;
            if (webhookData.TryGetProperty("Reference", out var r1)) reference = r1.GetString() ?? string.Empty;
            else if (webhookData.TryGetProperty("reference", out var r2)) reference = r2.GetString() ?? string.Empty;

            if (code == "00")
            {
                order.PaymentStatus = PaymentStatus.Paid;
                order.PaidAt = DateTime.UtcNow;
                if (order.Status == OrderStatus.Pending)
                    order.Status = OrderStatus.Confirmed;

                order.StatusHistories ??= new List<OrderStatusHistory>();
                order.StatusHistories.Add(new OrderStatusHistory
                {
                    OrderId = order.Id,
                    Status = order.Status,
                    Note = $"Thanh toán PayOS thành công. Mã giao dịch: {reference}",
                    CreatedAt = DateTime.UtcNow
                });
            }
            else
            {
                order.PaymentStatus = PaymentStatus.Failed;
            }

            order.UpdatedAt = DateTime.UtcNow;
            await _context.SaveChangesAsync();
        }
    }
}
