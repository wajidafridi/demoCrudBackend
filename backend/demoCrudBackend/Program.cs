using System.Text;
using Scalar.AspNetCore;
using DemoCrudBackend.Data;
using DemoCrudBackend.Common;
using DemoCrudBackend.Models;
using System.Security.Claims;
using DemoCrudBackend.Services;
using DemoCrudBackend.Authorization;
using Microsoft.AspNetCore.Identity;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using Microsoft.IdentityModel.Tokens;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Authentication.JwtBearer;

var builder = WebApplication.CreateBuilder(args);

// Add services to the container.

builder.Services.AddControllers()
    .ConfigureApiBehaviorOptions(options =>
    {
        options.InvalidModelStateResponseFactory = ApiValidation.InvalidModelStateResponse;
    });
// Learn more about configuring OpenAPI at https://aka.ms/aspnet/openapi
builder.Services.AddOpenApi(options =>
{
    options.AddSchemaTransformer<ApiResponseSchemaTransformer>();
    options.AddDocumentTransformer<BearerSecuritySchemeTransformer>();
    options.AddOperationTransformer<BearerSecurityRequirementTransformer>();
});

builder.Services.AddScoped<IUserService, UserService>();
builder.Services.AddScoped<IAccountService, AccountService>();
builder.Services.AddScoped<IRoleService, RoleService>();
builder.Services.AddScoped<IRightService, RightService>();
builder.Services.AddScoped<IAuthService, AuthService>();
builder.Services.AddScoped<ITokenService, TokenService>();
builder.Services.AddScoped<IPasswordHasher<User>, PasswordHasher<User>>();
builder.Services.AddSingleton<IAuthorizationMiddlewareResultHandler, ApiAuthorizationMiddlewareResultHandler>();
builder.Services.AddExceptionHandler<ApiExceptionHandler>();
builder.Services.AddProblemDetails(options =>
{
    // Fallback only. The API handler writes the envelope first.
    // Clear anything a host might add, including exception text in Development.
    options.CustomizeProblemDetails = context =>
    {
        context.ProblemDetails.Detail = null;
        context.ProblemDetails.Extensions.Clear();
    };
});
builder.Services.AddDemoCrudRateLimiting(builder.Configuration);

var connectionString =
    builder.Configuration.GetConnectionString("DefaultConnection");

// Tests set Database:Provider=Sqlite before the host starts so AutoDetect never opens MySQL.
var databaseProvider = builder.Configuration["Database:Provider"];
if (!string.Equals(databaseProvider, "Sqlite", StringComparison.OrdinalIgnoreCase))
{
    builder.Services.AddDbContext<ApplicationDbContext>(options =>
        options.UseMySql(connectionString, ServerVersion.AutoDetect(connectionString)));
}

var jwtKey = builder.Configuration["Jwt:Key"];
var jwtIssuer = builder.Configuration["Jwt:Issuer"];
var jwtAudience = builder.Configuration["Jwt:Audience"];

if (string.IsNullOrWhiteSpace(jwtKey)
    || string.IsNullOrWhiteSpace(jwtIssuer)
    || string.IsNullOrWhiteSpace(jwtAudience))
{
    throw new InvalidOperationException(
        "JWT configuration is missing. Check Jwt:Key, Jwt:Issuer, and Jwt:Audience.");
}

var keyBytes = Encoding.UTF8.GetBytes(jwtKey);

if (keyBytes.Length < 32)
{
    throw new InvalidOperationException(
        "JWT signing key must be at least 32 bytes for HS256.");
}

builder.Services
    .AddAuthentication(JwtBearerDefaults.AuthenticationScheme)
    .AddJwtBearer(options =>
    {
        options.TokenValidationParameters = new TokenValidationParameters
        {
            ValidateIssuerSigningKey = true,
            IssuerSigningKey = new SymmetricSecurityKey(keyBytes),

            ValidateIssuer = true,
            ValidIssuer = jwtIssuer,

            ValidateAudience = true,
            ValidAudience = jwtAudience,

            ValidateLifetime = true,
            RequireExpirationTime = true,
            ClockSkew = TimeSpan.FromSeconds(30),

            NameClaimType = ClaimTypes.Name,
            RoleClaimType = ClaimTypes.Role
        };
    });

const string VueFrontendCorsPolicy = "VueFrontend";
var vueOrigin = builder.Configuration["Cors:AllowedOrigin"];
var corsOrigins = new List<string>();

if (!string.IsNullOrWhiteSpace(vueOrigin))
{
    corsOrigins.Add(vueOrigin);

    // Browsers treat localhost and 127.0.0.1 as different origins.
    if (vueOrigin.Contains("localhost", StringComparison.OrdinalIgnoreCase))
    {
        corsOrigins.Add(
            vueOrigin.Replace("localhost", "127.0.0.1", StringComparison.OrdinalIgnoreCase));
    }
}

if (corsOrigins.Count > 0)
{
    builder.Services.AddCors(options =>
    {
        options.AddPolicy(VueFrontendCorsPolicy, policy =>
        {
            // Accept is CORS-safelisted, so only these two need approval.
            // Add any custom request header here (e.g. X-Request-Id).
            policy.WithOrigins(corsOrigins.ToArray())
                .WithHeaders("Authorization", "Content-Type")
                .WithMethods(
                    HttpMethods.Get,
                    HttpMethods.Post,
                    HttpMethods.Put,
                    HttpMethods.Delete,
                    HttpMethods.Options);
        });
    });
}

builder.Services.AddSingleton<IAuthorizationHandler, PermissionAuthorizationHandler>();
builder.Services.AddAuthorization(options =>
{
    foreach (var permission in Permissions.All)
    {
        options.AddPolicy(permission, policy =>
        {
            policy.RequireAuthenticatedUser();
            policy.Requirements.Add(new PermissionRequirement(permission));
        });
    }
});

var app = builder.Build();

// Configure the HTTP request pipeline.
if (app.Environment.IsDevelopment())
{
    app.MapOpenApi();
    app.MapScalarApiReference(options =>
    {
        options.AddPreferredSecuritySchemes(BearerSecuritySchemeTransformer.SchemeId);
    });
}

// CORS must run before HTTPS redirection so preflight OPTIONS is not redirected without ACAO headers.
// It also wraps the exception handler so a 500 or 429 still receives CORS headers.
if (corsOrigins.Count > 0)
{
    app.UseCors(VueFrontendCorsPolicy);
}

// Same safe envelope in every environment. Details are logged, not returned.
app.UseExceptionHandler();

if (!app.Environment.IsEnvironment("Testing"))
{
    app.UseHttpsRedirection();
}

app.UseAuthentication();
app.UseAuthorization();

// After authorization so the password-change limit can see the user id,
// and before endpoints so a rejected request never runs the action.
// Counters are in memory for this process only.
app.UseRateLimiter();

app.MapControllers();

if (app.Environment.IsEnvironment("Testing"))
{
    app.MapGet("/api/test/unhandled", () =>
    {
        throw new InvalidOperationException(
            "SQLite connection string Data Source=secret; password=secret; at C:\\secrets\\db");
    });
}

app.Run();

/// <summary>
/// Exposed so the xUnit host can bootstrap this API.
/// </summary>
public partial class Program
{
}
