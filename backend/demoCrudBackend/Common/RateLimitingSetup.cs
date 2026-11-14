using System.Globalization;
using System.Security.Claims;
using System.Threading.RateLimiting;
using Microsoft.AspNetCore.RateLimiting;

namespace DemoCrudBackend.Common
{
    public static class RateLimitPolicies
    {
        public const string Login = "login";

        public const string ChangePassword = "change-password";

        public const string TooManyRequestsMessage = "Too many requests. Try again later.";
    }

    public static class RateLimitingSetup
    {
        public static IServiceCollection AddDemoCrudRateLimiting(
            this IServiceCollection services,
            IConfiguration configuration)
        {
            var loginPermit = ReadPositive(configuration, "RateLimiting:LoginPermitLimit", 5);
            var loginWindowSeconds = ReadPositive(configuration, "RateLimiting:LoginWindowSeconds", 60);
            var changePasswordPermit = ReadPositive(configuration, "RateLimiting:ChangePasswordPermitLimit", 5);
            var changePasswordWindowSeconds = ReadPositive(configuration, "RateLimiting:ChangePasswordWindowSeconds", 60);

            services.AddRateLimiter(options =>
            {
                options.RejectionStatusCode = StatusCodes.Status429TooManyRequests;
                options.OnRejected = WriteTooManyRequestsAsync;

                // Per client IP. The username is not part of the key, so changing it does not open a new window.
                options.AddPolicy(RateLimitPolicies.Login, httpContext =>
                    RateLimitPartition.GetFixedWindowLimiter(
                        ClientIp(httpContext),
                        _ => Window(loginPermit, loginWindowSeconds)));

                // Per authenticated user. Callers do not share a bucket.
                options.AddPolicy(RateLimitPolicies.ChangePassword, httpContext =>
                    RateLimitPartition.GetFixedWindowLimiter(
                        UserPartition(httpContext),
                        _ => Window(changePasswordPermit, changePasswordWindowSeconds)));
            });

            return services;
        }

        private static FixedWindowRateLimiterOptions Window(int permitLimit, int windowSeconds)
        {
            return new FixedWindowRateLimiterOptions
            {
                PermitLimit = permitLimit,
                Window = TimeSpan.FromSeconds(windowSeconds),
                QueueLimit = 0,
                AutoReplenishment = true
            };
        }

        private static async ValueTask WriteTooManyRequestsAsync(
            OnRejectedContext context,
            CancellationToken cancellationToken)
        {
            if (context.Lease.TryGetMetadata(MetadataName.RetryAfter, out var retryAfter))
            {
                var seconds = Math.Max(1, (int)Math.Ceiling(retryAfter.TotalSeconds));
                context.HttpContext.Response.Headers.RetryAfter =
                    seconds.ToString(CultureInfo.InvariantCulture);
            }

            context.HttpContext.Response.StatusCode = StatusCodes.Status429TooManyRequests;
            await context.HttpContext.Response.WriteAsJsonAsync(
                ApiResponse.Fail(RateLimitPolicies.TooManyRequestsMessage),
                cancellationToken);
        }

        private static string ClientIp(HttpContext httpContext)
        {
            return httpContext.Connection.RemoteIpAddress?.ToString() ?? "unknown-ip";
        }

        private static string UserPartition(HttpContext httpContext)
        {
            var userId = httpContext.User.FindFirstValue(ClaimTypes.NameIdentifier);
            if (!string.IsNullOrWhiteSpace(userId))
            {
                return "user:" + userId;
            }

            return "ip:" + ClientIp(httpContext);
        }

        private static int ReadPositive(IConfiguration configuration, string key, int fallback)
        {
            var value = configuration.GetValue<int?>(key);
            return value is > 0 ? value.Value : fallback;
        }
    }
}
