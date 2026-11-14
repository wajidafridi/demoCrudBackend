using Microsoft.AspNetCore.Hosting;

namespace DemoCrudBackend.Tests
{
    /// <summary>
    /// Same API host as <see cref="DemoCrudApiFactory"/>, with a small fixed window so rate-limit tests do not wait.
    /// </summary>
    public sealed class RateLimitApiFactory : DemoCrudApiFactory
    {
        public const int PermitLimit = 3;

        protected override void ConfigureWebHost(IWebHostBuilder builder)
        {
            base.ConfigureWebHost(builder);
            builder.UseSetting("RateLimiting:LoginPermitLimit", PermitLimit.ToString());
            builder.UseSetting("RateLimiting:ChangePasswordPermitLimit", PermitLimit.ToString());
            builder.UseSetting("RateLimiting:LoginWindowSeconds", "60");
            builder.UseSetting("RateLimiting:ChangePasswordWindowSeconds", "60");
        }
    }
}
