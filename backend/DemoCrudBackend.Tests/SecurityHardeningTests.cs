using System.Net;
using System.Net.Http.Json;
using System.Text.Json;
using DemoCrudBackend.Authorization;
using DemoCrudBackend.Common;
using DemoCrudBackend.Data;
using DemoCrudBackend.Models;
using Microsoft.AspNetCore.Identity;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.DependencyInjection;

namespace DemoCrudBackend.Tests
{
    public sealed class ExceptionHandlingTests : IClassFixture<DemoCrudApiFactory>
    {
        private readonly DemoCrudApiFactory _factory;

        public ExceptionHandlingTests(DemoCrudApiFactory factory)
        {
            _factory = factory;
        }

        [Fact]
        public async Task UnhandledException_ReturnsSafe500()
        {
            using var client = _factory.CreateClient();

            var response = await client.GetAsync("/api/test/unhandled");
            var json = await response.Content.ReadAsStringAsync();

            Assert.Equal(HttpStatusCode.InternalServerError, response.StatusCode);
            using var document = JsonDocument.Parse(json);
            var body = document.RootElement;
            Assert.False(body.GetProperty("success").GetBoolean());
            Assert.Equal(ApiExceptionHandler.UnexpectedErrorMessage, body.GetProperty("message").GetString());
            Assert.False(body.TryGetProperty("stackTrace", out _));
            Assert.DoesNotContain("InvalidOperationException", json, StringComparison.Ordinal);
            Assert.DoesNotContain("password=secret", json, StringComparison.OrdinalIgnoreCase);
            Assert.DoesNotContain("SQLite", json, StringComparison.OrdinalIgnoreCase);
            Assert.DoesNotContain("C:\\secrets", json, StringComparison.OrdinalIgnoreCase);
            Assert.DoesNotContain("at DemoCrud", json, StringComparison.Ordinal);
        }

        [Fact]
        public async Task Login_MissingFields_Returns400()
        {
            using var client = _factory.CreateClient();

            var response = await client.PostAsJsonAsync("/api/auth/login", new { });

            Assert.Equal(HttpStatusCode.BadRequest, response.StatusCode);
            await AssertFailureAsync(response, "Validation failed");
        }

        [Fact]
        public async Task Login_UnknownUser_Returns401()
        {
            using var client = _factory.CreateClient();

            var response = await client.PostAsJsonAsync("/api/auth/login", new
            {
                username = "missing-user",
                password = "not-the-password"
            });

            Assert.Equal(HttpStatusCode.Unauthorized, response.StatusCode);
            await AssertFailureAsync(response, "Invalid username or password.");
        }

        [Fact]
        public async Task Users_WithoutPermission_Returns403()
        {
            var roleId = await TestData.AddRoleAsync(_factory, TestData.NewName("plain"));
            var user = await TestData.AddUserAsync(_factory, TestData.NewName("plain"), roleId);
            using var client = _factory.CreateAuthenticatedClient(user.Id, user.UserName, "Plain", []);

            var response = await client.GetAsync("/api/users");

            Assert.Equal(HttpStatusCode.Forbidden, response.StatusCode);
            await AssertFailureAsync(response, "You are not allowed to access this resource.");
        }

        [Fact]
        public async Task Users_MissingId_Returns404()
        {
            var roleId = await TestData.AddRoleAsync(_factory, TestData.NewName("reader"), Permissions.UserView);
            var user = await TestData.AddUserAsync(_factory, TestData.NewName("reader"), roleId);
            using var client = _factory.CreateAuthenticatedClient(user.Id, user.UserName, "Reader", [Permissions.UserView]);

            var response = await client.GetAsync("/api/users/99999999");

            Assert.Equal(HttpStatusCode.NotFound, response.StatusCode);
            await AssertFailureAsync(response, "User with id = 99999999 was not found.");
        }

        private static async Task AssertFailureAsync(HttpResponseMessage response, string message)
        {
            var json = await response.Content.ReadAsStringAsync();
            using var document = JsonDocument.Parse(json);
            var body = document.RootElement;
            Assert.False(body.GetProperty("success").GetBoolean());
            Assert.Equal(message, body.GetProperty("message").GetString());
        }
    }

    public sealed class RateLimitTests : IClassFixture<RateLimitApiFactory>
    {
        private const string KnownPassword = "Test@12345";

        private readonly RateLimitApiFactory _factory;

        public RateLimitTests(RateLimitApiFactory factory)
        {
            _factory = factory;
        }

        [Fact]
        public async Task Login_OverLimit_Returns429WithoutCredentialHint()
        {
            using var client = _factory.CreateClient();

            for (var attempt = 1; attempt <= RateLimitApiFactory.PermitLimit; attempt++)
            {
                var allowed = await PostLoginAsync(client, $"missing-{attempt}", "not-the-password");
                Assert.Equal(HttpStatusCode.Unauthorized, allowed.StatusCode);
                await AssertMessageAsync(allowed, "Invalid username or password.");
            }

            var blocked = await PostLoginAsync(client, "different-name", "another-password");
            var json = await blocked.Content.ReadAsStringAsync();

            Assert.Equal(HttpStatusCode.TooManyRequests, blocked.StatusCode);
            Assert.True(blocked.Headers.TryGetValues("Retry-After", out var retryAfter));
            Assert.True(int.TryParse(retryAfter!.Single(), out var seconds));
            Assert.True(seconds >= 1);
            await AssertMessageAsync(blocked, RateLimitPolicies.TooManyRequestsMessage);
            Assert.DoesNotContain("Invalid username", json, StringComparison.Ordinal);
            Assert.DoesNotContain("different-name", json, StringComparison.Ordinal);
            Assert.DoesNotContain("another-password", json, StringComparison.Ordinal);
        }

        [Fact]
        public async Task ChangePassword_OverLimit_DoesNotBlockAnotherUser()
        {
            var roleId = await AddRoleAsync(NewName("member"));
            var limited = await AddUserAsync(NewName("limited"), roleId);
            var other = await AddUserAsync(NewName("other"), roleId);
            using var limitedClient = _factory.CreateAuthenticatedClient(limited.Id, limited.UserName, "Member", []);
            using var otherClient = _factory.CreateAuthenticatedClient(other.Id, other.UserName, "Member", []);

            for (var attempt = 1; attempt <= RateLimitApiFactory.PermitLimit; attempt++)
            {
                var allowed = await PostPasswordAsync(limitedClient, "Wrongpass1", "Newpass12");
                Assert.Equal(HttpStatusCode.BadRequest, allowed.StatusCode);
                await AssertMessageAsync(allowed, "The current password is incorrect.");
            }

            var blocked = await PostPasswordAsync(limitedClient, "Wrongpass1", "Newpass12");
            Assert.Equal(HttpStatusCode.TooManyRequests, blocked.StatusCode);
            Assert.True(blocked.Headers.Contains("Retry-After"));
            await AssertMessageAsync(blocked, RateLimitPolicies.TooManyRequestsMessage);

            var otherResponse = await PostPasswordAsync(otherClient, KnownPassword, "Newpass12");
            Assert.Equal(HttpStatusCode.OK, otherResponse.StatusCode);
            var otherBody = await ReadAsync(otherResponse);
            Assert.True(otherBody.GetProperty("success").GetBoolean());
            Assert.Contains(
                "remain valid until they expire",
                otherBody.GetProperty("message").GetString(),
                StringComparison.Ordinal);
        }

        private static Task<HttpResponseMessage> PostLoginAsync(HttpClient client, string username, string password)
        {
            return client.PostAsJsonAsync("/api/auth/login", new { username, password });
        }

        private static Task<HttpResponseMessage> PostPasswordAsync(
            HttpClient client,
            string currentPassword,
            string newPassword)
        {
            return client.PostAsJsonAsync("/api/account/change-password", new { currentPassword, newPassword });
        }

        private async Task<int> AddRoleAsync(string name)
        {
            await using var scope = _factory.Services.CreateAsyncScope();
            var database = scope.ServiceProvider.GetRequiredService<ApplicationDbContext>();
            var role = new Role { Name = name, IsSystem = false };
            database.Roles.Add(role);
            await database.SaveChangesAsync();
            return role.Id;
        }

        private async Task<TestUser> AddUserAsync(string userName, int roleId)
        {
            await using var scope = _factory.Services.CreateAsyncScope();
            var database = scope.ServiceProvider.GetRequiredService<ApplicationDbContext>();
            var hasher = scope.ServiceProvider.GetRequiredService<IPasswordHasher<User>>();
            var user = new User
            {
                FirstName = "Test",
                LastName = "User",
                Email = $"{userName}@example.com",
                UserName = userName,
                RoleId = roleId,
                IsSystem = false,
                CreatedAt = new DateTime(2026, 1, 1, 0, 0, 0, DateTimeKind.Utc)
            };
            user.PasswordHash = hasher.HashPassword(user, KnownPassword);
            database.Users.Add(user);
            await database.SaveChangesAsync();
            return new TestUser(user.Id, user.UserName);
        }

        private static async Task AssertMessageAsync(HttpResponseMessage response, string message)
        {
            var body = await ReadAsync(response);
            Assert.Equal(message, body.GetProperty("message").GetString());
        }

        private static async Task<JsonElement> ReadAsync(HttpResponseMessage response)
        {
            var json = await response.Content.ReadAsStringAsync();
            using var document = JsonDocument.Parse(json);
            return document.RootElement.Clone();
        }

        private static string NewName(string prefix)
        {
            return $"{prefix}-{Guid.NewGuid():N}";
        }

        private sealed record TestUser(int Id, string UserName);
    }
}
