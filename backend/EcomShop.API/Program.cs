using System.Text;
using System.Linq;
using EcomShop.API.Data;
using EcomShop.API.Middleware;
using EcomShop.API.Services;
using Microsoft.AspNetCore.Authentication.JwtBearer;
using Microsoft.EntityFrameworkCore;
using Microsoft.IdentityModel.Tokens;
using Microsoft.OpenApi.Models;
using PayOS;
using System.Text.Json.Serialization;

var builder = WebApplication.CreateBuilder(args);

// ─── Local overrides (not committed to git) ───────────────────────────────
builder.Configuration.AddJsonFile("appsettings.Local.json", optional: true, reloadOnChange: true);

// ─── Database ────────────────────────────────────────────────────────────────
var connectionString = builder.Configuration.GetConnectionString("DefaultConnection")
    ?? throw new InvalidOperationException("Connection string 'DefaultConnection' not found.");

builder.Services.AddDbContext<AppDbContext>(options =>
    options.UseNpgsql(connectionString,
        npgsqlOptions => npgsqlOptions.EnableRetryOnFailure(3)));

// ─── Authentication & Authorization ──────────────────────────────────────────
var jwtSettings = builder.Configuration.GetSection("JwtSettings");
var secretKey = jwtSettings["SecretKey"]
    ?? throw new InvalidOperationException("JWT SecretKey not configured");

builder.Services.AddAuthentication(options =>
{
    options.DefaultAuthenticateScheme = JwtBearerDefaults.AuthenticationScheme;
    options.DefaultChallengeScheme = JwtBearerDefaults.AuthenticationScheme;
})
.AddJwtBearer(options =>
{
    options.TokenValidationParameters = new TokenValidationParameters
    {
        ValidateIssuer = true,
        ValidateAudience = true,
        ValidateLifetime = true,
        ValidateIssuerSigningKey = true,
        ValidIssuer = jwtSettings["Issuer"],
        ValidAudience = jwtSettings["Audience"],
        IssuerSigningKey = new SymmetricSecurityKey(Encoding.UTF8.GetBytes(secretKey)),
        ClockSkew = TimeSpan.Zero
    };
});

builder.Services.AddAuthorization();

// ─── CORS ─────────────────────────────────────────────────────────────────────
var allowedOrigins = builder.Configuration.GetSection("AllowedOrigins").Get<string[]>()
    ?? new[] { "http://localhost:3000" };

builder.Services.AddCors(options =>
{
    options.AddPolicy("AllowFrontend", policy =>
    {
        policy.WithOrigins(allowedOrigins)
              .AllowAnyHeader()
              .AllowAnyMethod()
              .AllowCredentials();
    });
});

// ─── Application Services ─────────────────────────────────────────────────────
builder.Services.AddScoped<IAuthService, AuthService>();
builder.Services.AddScoped<IProductService, ProductService>();
builder.Services.AddScoped<IOrderService, OrderService>();
builder.Services.AddScoped<ICartService, CartService>();
// PayOS client and payment service
var payosSection = builder.Configuration.GetSection("PayOS");
builder.Services.AddSingleton(sp =>
{
    var cfg = sp.GetRequiredService<IConfiguration>().GetSection("PayOS");
    var options = new PayOSOptions
    {
        ClientId = cfg["ClientId"],
        ApiKey = cfg["ApiKey"],
        ChecksumKey = cfg["ChecksumKey"]
    };
    return new PayOSClient(options);
});
builder.Services.AddScoped<IPaymentService, PaymentService>();

// ─── Controllers & API ────────────────────────────────────────────────────────
builder.Services.AddControllers()
    .AddJsonOptions(options =>
    {
        options.JsonSerializerOptions.ReferenceHandler = System.Text.Json.Serialization.ReferenceHandler.IgnoreCycles;
        options.JsonSerializerOptions.DefaultIgnoreCondition = System.Text.Json.Serialization.JsonIgnoreCondition.WhenWritingNull;
        options.JsonSerializerOptions.Converters.Add(new JsonStringEnumConverter());
    });

builder.Services.AddEndpointsApiExplorer();

// ─── Swagger ──────────────────────────────────────────────────────────────────
builder.Services.AddSwaggerGen(c =>
{
    c.SwaggerDoc("v1", new OpenApiInfo
    {
        Title = "EcomShop API",
        Version = "v1",
        Description = "API cho ứng dụng thương mại điện tử bán quần áo"
    });

    c.AddSecurityDefinition("Bearer", new OpenApiSecurityScheme
    {
        Description = "JWT Authorization. Nhập: Bearer {token}",
        Name = "Authorization",
        In = ParameterLocation.Header,
        Type = SecuritySchemeType.ApiKey,
        Scheme = "Bearer"
    });

    c.AddSecurityRequirement(new OpenApiSecurityRequirement
    {
        {
            new OpenApiSecurityScheme
            {
                Reference = new OpenApiReference { Type = ReferenceType.SecurityScheme, Id = "Bearer" }
            },
            Array.Empty<string>()
        }
    });
});

// ─── Static Files ─────────────────────────────────────────────────────────────
builder.Services.AddHttpContextAccessor();

// ─── HTTPS Redirection ───────────────────────────────────────────────────────
// Explicitly set the HTTPS port so the HttpsRedirection middleware can
// determine the correct target when the app is run without automatic
// HTTPS development settings (e.g., in Production or custom hosts).
builder.Services.AddHttpsRedirection(options =>
{
    options.HttpsPort = 5001;
});

// ─── Health Check ─────────────────────────────────────────────────────────────
builder.Services.AddHealthChecks();

var app = builder.Build();

// ─── Migrate & Seed Database ──────────────────────────────────────────────────
using (var scope = app.Services.CreateScope())
{
    var db = scope.ServiceProvider.GetRequiredService<AppDbContext>();
    try
    {
        await db.Database.MigrateAsync();
        await DbSeeder.SeedAsync(db);
    }
    catch (Exception ex)
    {
        var logger = scope.ServiceProvider.GetRequiredService<ILogger<Program>>();
        logger.LogError(ex, "Lỗi khi migrate/seed database");
    }
}

// ─── Middleware Pipeline ──────────────────────────────────────────────────────
app.UseMiddleware<ExceptionMiddleware>();

if (app.Environment.IsDevelopment())
{
    app.UseSwagger();
    app.UseSwaggerUI(c =>
    {
        c.SwaggerEndpoint("/swagger/v1/swagger.json", "EcomShop API V1");
        c.RoutePrefix = "swagger";
    });
}

// Ensure CORS runs before HTTPS redirection so preflight (OPTIONS)
// requests are handled without being redirected.
app.UseCors("AllowFrontend");

// Only redirect HTTP -> HTTPS when an HTTPS URL is configured.
// This prevents the app from issuing a 307 redirect to an unbound
// HTTPS port (e.g. https://localhost:5001) which causes
// client-side ECONNREFUSED in local development setups.
var urlsEnv = System.Environment.GetEnvironmentVariable("ASPNETCORE_URLS")
              ?? builder.Configuration["Urls"];
if (!string.IsNullOrEmpty(urlsEnv) &&
    urlsEnv.Split(';').Any(u => u.Trim().StartsWith("https", System.StringComparison.OrdinalIgnoreCase)))
{
    app.UseHttpsRedirection();
}

app.UseStaticFiles();

app.UseAuthentication();
app.UseAuthorization();

app.MapControllers();
app.MapHealthChecks("/health");

app.Run();
