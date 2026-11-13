using System.Net.Http.Headers;
using DemoCrudBackend.Data;
using DemoCrudBackend.Services;
using Microsoft.AspNetCore.Hosting;
using Microsoft.AspNetCore.Mvc.Testing;
using Microsoft.Data.Sqlite;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Hosting;

namespace DemoCrudBackend.Tests
{
    public sealed class DemoCrudApiFactory : WebApplicationFactory<Program>
    {
        public const string ConnectionString = "Data Source=DemoCrudSecurityTests;Mode=Memory;Cache=Shared";

        public const string JwtKey = "integration-test-signing-key-0123456789";

        public const string JwtIssuer = "DemoCrudBackend";

        public const string JwtAudience = "DemoCrudFrontend";

        private readonly SqliteConnection _connection;

        static DemoCrudApiFactory()
        {
            // Read by Program before service registration, so AutoDetect never opens MySQL.
            Environment.SetEnvironmentVariable("ASPNETCORE_ENVIRONMENT", "Testing");
            Environment.SetEnvironmentVariable("Database__Provider", "Sqlite");
            Environment.SetEnvironmentVariable("ConnectionStrings__DefaultConnection", ConnectionString);
            Environment.SetEnvironmentVariable("Jwt__Key", JwtKey);
            Environment.SetEnvironmentVariable("Jwt__Issuer", JwtIssuer);
            Environment.SetEnvironmentVariable("Jwt__Audience", JwtAudience);
            Environment.SetEnvironmentVariable("Jwt__AccessTokenMinutes", "30");
        }

        public DemoCrudApiFactory()
        {
            var dataSource = $"DemoCrudTests-{Guid.NewGuid():N}";
            _connection = new SqliteConnection($"Data Source={dataSource};Mode=Memory;Cache=Shared");
            _connection.Open();
        }

        public HttpClient CreateAuthenticatedClient(
            int userId,
            string userName,
            string roleName,
            IReadOnlyCollection<string> permissions)
        {
            using var scope = Services.CreateScope();
            var tokenService = scope.ServiceProvider.GetRequiredService<ITokenService>();
            var accessToken = tokenService.CreateAccessToken(userId, userName, roleName, permissions);

            var client = CreateClient();
            client.DefaultRequestHeaders.Authorization =
                new AuthenticationHeaderValue("Bearer", accessToken.AccessToken);
            return client;
        }

        protected override void ConfigureWebHost(IWebHostBuilder builder)
        {
            builder.UseEnvironment("Testing");
            builder.ConfigureServices(services =>
            {
                services.AddDbContext<ApplicationDbContext>(options => options.UseSqlite(_connection));
            });
        }

        protected override IHost CreateHost(IHostBuilder builder)
        {
            var host = base.CreateHost(builder);
            using var scope = host.Services.CreateScope();
            var database = scope.ServiceProvider.GetRequiredService<ApplicationDbContext>();
            if (database.Database.ProviderName?.Contains("Sqlite", StringComparison.OrdinalIgnoreCase) != true)
            {
                throw new InvalidOperationException(
                    $"Tests refused to start because the database provider was '{database.Database.ProviderName}', not SQLite.");
            }

            database.Database.EnsureCreated();
            return host;
        }

        protected override void Dispose(bool disposing)
        {
            base.Dispose(disposing);
            if (disposing)
            {
                _connection.Dispose();
            }
        }
    }
}
