using System.Net;
using System.Net.Http.Json;
using System.Text.Json;
using DemoCrudBackend.Authorization;
using DemoCrudBackend.Data;
using DemoCrudBackend.Models;
using Microsoft.AspNetCore.Identity;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.DependencyInjection;

namespace DemoCrudBackend.Tests
{
    public sealed class AccountApiTests : IClassFixture<DemoCrudApiFactory>
    {
        private const string KnownPassword = "Test@12345";

        private readonly DemoCrudApiFactory _factory;

        public AccountApiTests(DemoCrudApiFactory factory)
        {
            _factory = factory;
        }

        [Fact]
        public async Task GetAccount_AuthenticatedUser_ReturnsOwnProfile()
        {
            var roleName = NewName("member");
            var roleId = await AddRoleAsync(roleName, Permissions.UserView);
            var user = await AddUserAsync(NewName("member"), roleId, roleName);
            using var client = ClientFor(user, Permissions.UserView);

            var response = await client.GetAsync("/api/account");

            Assert.Equal(HttpStatusCode.OK, response.StatusCode);
            var body = await ReadAsync(response);
            var data = body.GetProperty("data");
            Assert.True(body.GetProperty("success").GetBoolean());
            Assert.Equal(user.Id, data.GetProperty("id").GetInt32());
            Assert.Equal(user.UserName, data.GetProperty("userName").GetString());
            Assert.Equal(user.Email, data.GetProperty("email").GetString());
            Assert.Equal(roleId, data.GetProperty("roleId").GetInt32());
            Assert.Equal(roleName, data.GetProperty("roleName").GetString());
            Assert.False(data.GetProperty("isSystem").GetBoolean());
        }

        [Fact]
        public async Task GetAccount_WithoutUserView_ReturnsOwnProfile()
        {
            var roleId = await AddRoleAsync(NewName("plain"), Permissions.UserView);
            var user = await AddUserAsync(NewName("plain"), roleId, "Plain");
            using var client = ClientFor(user);

            var response = await client.GetAsync("/api/account");

            Assert.Equal(HttpStatusCode.OK, response.StatusCode);
            var data = (await ReadAsync(response)).GetProperty("data");
            Assert.Equal(user.Id, data.GetProperty("id").GetInt32());
            Assert.Equal(user.UserName, data.GetProperty("userName").GetString());
        }

        [Fact]
        public async Task GetAccount_Unauthenticated_ReturnsUnauthorized()
        {
            using var client = _factory.CreateClient();

            var response = await client.GetAsync("/api/account");

            Assert.Equal(HttpStatusCode.Unauthorized, response.StatusCode);
            await AssertFailureAsync(response, "Authentication is required.");
        }

        [Fact]
        public async Task GetAccount_DeletedCaller_ReturnsNotFoundWithoutPasswordHash()
        {
            var roleId = await AddRoleAsync(NewName("gone"), Permissions.UserView);
            var user = await AddUserAsync(NewName("gone"), roleId, "Gone");
            using var client = ClientFor(user, Permissions.UserView);
            await DeleteUserAsync(user.Id);

            var response = await client.GetAsync("/api/account");

            Assert.Equal(HttpStatusCode.NotFound, response.StatusCode);
            await AssertFailureAsync(response, "Your account was not found.");
        }

        [Fact]
        public async Task UpdateAccount_UpdatesPermittedFields()
        {
            var roleId = await AddRoleAsync(NewName("member"), Permissions.UserEdit);
            var user = await AddUserAsync(NewName("member"), roleId, "Member");
            using var client = ClientFor(user, Permissions.UserEdit);
            var email = $"{NewName("mail")}@example.com";

            var response = await client.PutAsJsonAsync("/api/account", ProfileBody(email, "Ada"));

            Assert.Equal(HttpStatusCode.OK, response.StatusCode);
            var data = (await ReadAsync(response)).GetProperty("data");
            Assert.Equal("Ada", data.GetProperty("firstName").GetString());
            Assert.Equal(email, data.GetProperty("email").GetString());
            Assert.Equal("555-0100", data.GetProperty("phoneNumber").GetString());
            Assert.Equal(user.UserName, data.GetProperty("userName").GetString());
            Assert.Equal(user.Id, data.GetProperty("id").GetInt32());

            var stored = await LoadUserAsync(user.Id);
            Assert.Equal("Ada", stored.FirstName);
            Assert.Equal(email, stored.Email);
            Assert.Equal("555-0100", stored.PhoneNumber);
            Assert.Equal("London", stored.Address);
        }

        [Fact]
        public async Task UpdateAccount_FutureDateOfBirth_IsRejected()
        {
            var roleId = await AddRoleAsync(NewName("member"), Permissions.UserEdit);
            var user = await AddUserAsync(NewName("member"), roleId, "Member");
            using var client = ClientFor(user, Permissions.UserEdit);

            var future = await client.PutAsJsonAsync(
                "/api/account",
                ProfileBody(user.Email, "Ada", ("dateOfBirth", DateTime.UtcNow.Date.AddDays(2))));

            Assert.Equal(HttpStatusCode.BadRequest, future.StatusCode);
            var body = await ReadAsync(future);
            Assert.Equal("Date of birth cannot be in the future.", body.GetProperty("message").GetString());
            Assert.Equal(
                "Date of birth cannot be in the future.",
                body.GetProperty("errors").GetProperty("DateOfBirth")[0].GetString());

            var today = await client.PutAsJsonAsync(
                "/api/account",
                ProfileBody(user.Email, "Ada", ("dateOfBirth", DateTime.UtcNow.Date)));

            Assert.Equal(HttpStatusCode.OK, today.StatusCode);
        }

        [Fact]
        public async Task CreateUser_FutureDateOfBirth_IsRejected()
        {
            var editorRoleId = await AddRoleAsync(NewName("editor"), Permissions.UserView, Permissions.UserCreate);
            var viewerRoleId = await AddRoleAsync(NewName("viewer"), Permissions.UserView);
            var caller = await AddUserAsync(NewName("caller"), editorRoleId, "Editor");
            var userName = NewName("future");
            using var client = ClientFor(caller, Permissions.UserView, Permissions.UserCreate);

            var response = await client.PostAsJsonAsync("/api/users", new
            {
                firstName = "Ada",
                lastName = "Lovelace",
                email = $"{userName}@example.com",
                userName,
                password = "Secret12",
                roleId = viewerRoleId,
                dateOfBirth = DateTime.UtcNow.Date.AddDays(2)
            });

            Assert.Equal(HttpStatusCode.BadRequest, response.StatusCode);
            var body = await ReadAsync(response);
            Assert.Equal("Date of birth cannot be in the future.", body.GetProperty("message").GetString());
            Assert.True(body.GetProperty("errors").TryGetProperty("DateOfBirth", out _));
            Assert.Null(await FindUserByNameAsync(userName));
        }

        [Fact]
        public async Task UpdateAccount_WithoutUserEdit_UpdatesOwnProfile()
        {
            var roleId = await AddRoleAsync(NewName("plain"), Permissions.UserView);
            var user = await AddUserAsync(NewName("plain"), roleId, "Plain");
            using var client = ClientFor(user);

            var response = await client.PutAsJsonAsync("/api/account", ProfileBody(user.Email, "Edited"));

            Assert.Equal(HttpStatusCode.OK, response.StatusCode);
            Assert.Equal("Edited", (await LoadUserAsync(user.Id)).FirstName);
        }

        [Fact]
        public async Task UpdateAccount_DuplicateEmail_ReturnsConflict()
        {
            var roleId = await AddRoleAsync(NewName("member"), Permissions.UserView);
            var caller = await AddUserAsync(NewName("caller"), roleId, "Member");
            var other = await AddUserAsync(NewName("other"), roleId, "Member");
            using var client = ClientFor(caller);

            var response = await client.PutAsJsonAsync("/api/account", ProfileBody(other.Email, "Ada"));

            Assert.Equal(HttpStatusCode.Conflict, response.StatusCode);
            await AssertFailureAsync(response, "Email is already in use.");
            Assert.Equal(caller.Email, (await LoadUserAsync(caller.Id)).Email);
        }

        [Fact]
        public async Task UpdateAccount_IgnoresUserName()
        {
            var roleId = await AddRoleAsync(NewName("member"), Permissions.UserView);
            var user = await AddUserAsync(NewName("member"), roleId, "Member");
            using var client = ClientFor(user);

            var response = await client.PutAsJsonAsync(
                "/api/account",
                ProfileBody(user.Email, "Ada", ("userName", "taken-name")));

            Assert.Equal(HttpStatusCode.OK, response.StatusCode);
            Assert.Equal(user.UserName, (await LoadUserAsync(user.Id)).UserName);
            Assert.Equal(user.UserName, (await ReadAsync(response)).GetProperty("data").GetProperty("userName").GetString());
        }

        [Fact]
        public async Task UpdateAccount_IgnoresRoleId()
        {
            var currentRoleId = await AddRoleAsync(NewName("current"), Permissions.UserView);
            var otherRoleId = await AddRoleAsync(NewName("other"), Permissions.UserEdit);
            var user = await AddUserAsync(NewName("member"), currentRoleId, "Current");
            using var client = ClientFor(user);

            var response = await client.PutAsJsonAsync(
                "/api/account",
                ProfileBody(user.Email, "Ada", ("roleId", otherRoleId)));

            Assert.Equal(HttpStatusCode.OK, response.StatusCode);
            var stored = await LoadUserAsync(user.Id);
            Assert.Equal(currentRoleId, stored.RoleId);
            Assert.Equal(currentRoleId, (await ReadAsync(response)).GetProperty("data").GetProperty("roleId").GetInt32());
        }

        [Fact]
        public async Task UpdateAccount_IgnoresIsSystem()
        {
            var roleId = await AddRoleAsync(NewName("member"), Permissions.UserView);
            var user = await AddUserAsync(NewName("member"), roleId, "Member");
            using var client = ClientFor(user);

            var response = await client.PutAsJsonAsync(
                "/api/account",
                ProfileBody(user.Email, "Ada", ("isSystem", true)));

            Assert.Equal(HttpStatusCode.OK, response.StatusCode);
            var stored = await LoadUserAsync(user.Id);
            Assert.False(stored.IsSystem);
            Assert.False((await ReadAsync(response)).GetProperty("data").GetProperty("isSystem").GetBoolean());
        }

        [Fact]
        public async Task UpdateAccount_IgnoresSuppliedUserId()
        {
            var roleId = await AddRoleAsync(NewName("member"), Permissions.UserView);
            var caller = await AddUserAsync(NewName("caller"), roleId, "Member");
            var other = await AddUserAsync(NewName("other"), roleId, "Member");
            using var client = ClientFor(caller);

            var response = await client.PutAsJsonAsync(
                "/api/account",
                ProfileBody(caller.Email, "Changed", ("id", other.Id)));

            Assert.Equal(HttpStatusCode.OK, response.StatusCode);
            Assert.Equal(caller.Id, (await ReadAsync(response)).GetProperty("data").GetProperty("id").GetInt32());
            Assert.Equal("Changed", (await LoadUserAsync(caller.Id)).FirstName);
            Assert.Equal(other.FirstName, (await LoadUserAsync(other.Id)).FirstName);
        }

        [Fact]
        public async Task UpdateAccount_Unauthenticated_ReturnsUnauthorized()
        {
            using var client = _factory.CreateClient();

            var response = await client.PutAsJsonAsync("/api/account", new
            {
                firstName = "Ada",
                lastName = "Lovelace",
                email = "ada@example.com"
            });

            Assert.Equal(HttpStatusCode.Unauthorized, response.StatusCode);
            await AssertFailureAsync(response, "Authentication is required.");
        }

        [Fact]
        public async Task ChangePassword_CorrectCurrentPassword_StoresNewHash()
        {
            var roleId = await AddRoleAsync(NewName("member"), Permissions.UserView);
            var user = await AddUserAsync(NewName("member"), roleId, "Member");
            using var client = ClientFor(user);
            const string newPassword = "Newpass12";

            var response = await client.PostAsJsonAsync("/api/account/change-password", new
            {
                currentPassword = KnownPassword,
                newPassword
            });

            Assert.Equal(HttpStatusCode.OK, response.StatusCode);
            var body = await ReadAsync(response);
            Assert.True(body.GetProperty("success").GetBoolean());
            Assert.Contains("remain valid until they expire", body.GetProperty("message").GetString(), StringComparison.Ordinal);

            var stored = await LoadUserAsync(user.Id);
            await using var scope = _factory.Services.CreateAsyncScope();
            var hasher = scope.ServiceProvider.GetRequiredService<IPasswordHasher<User>>();
            Assert.Equal(PasswordVerificationResult.Success, hasher.VerifyHashedPassword(stored, stored.PasswordHash, newPassword));
            Assert.Equal(PasswordVerificationResult.Failed, hasher.VerifyHashedPassword(stored, stored.PasswordHash, KnownPassword));
        }

        [Fact]
        public async Task ChangePassword_IncorrectCurrentPassword_ReturnsBadRequest()
        {
            var roleId = await AddRoleAsync(NewName("member"), Permissions.UserView);
            var user = await AddUserAsync(NewName("member"), roleId, "Member");
            var hashBefore = (await LoadUserAsync(user.Id)).PasswordHash;
            using var client = ClientFor(user);

            var response = await client.PostAsJsonAsync("/api/account/change-password", new
            {
                currentPassword = "Wrongpass1",
                newPassword = "Newpass12"
            });

            Assert.Equal(HttpStatusCode.BadRequest, response.StatusCode);
            var body = await ReadAsync(response);
            Assert.False(body.GetProperty("success").GetBoolean());
            Assert.Equal(
                "The current password is incorrect.",
                body.GetProperty("errors").GetProperty("CurrentPassword")[0].GetString());
            Assert.Equal(hashBefore, (await LoadUserAsync(user.Id)).PasswordHash);
        }

        [Fact]
        public async Task ChangePassword_NewPasswordShorterThanEight_ReturnsBadRequest()
        {
            var roleId = await AddRoleAsync(NewName("member"), Permissions.UserView);
            var user = await AddUserAsync(NewName("member"), roleId, "Member");
            var hashBefore = (await LoadUserAsync(user.Id)).PasswordHash;
            using var client = ClientFor(user);

            var response = await client.PostAsJsonAsync("/api/account/change-password", new
            {
                currentPassword = KnownPassword,
                newPassword = "Secret1"
            });

            Assert.Equal(HttpStatusCode.BadRequest, response.StatusCode);
            var body = await ReadAsync(response);
            Assert.False(body.GetProperty("success").GetBoolean());
            Assert.True(body.GetProperty("errors").TryGetProperty("NewPassword", out _));
            Assert.Equal(hashBefore, (await LoadUserAsync(user.Id)).PasswordHash);
        }

        [Fact]
        public async Task ChangePassword_NewPasswordSameAsCurrent_ReturnsBadRequest()
        {
            var roleId = await AddRoleAsync(NewName("member"), Permissions.UserView);
            var user = await AddUserAsync(NewName("member"), roleId, "Member");
            var hashBefore = (await LoadUserAsync(user.Id)).PasswordHash;
            using var client = ClientFor(user);

            var response = await client.PostAsJsonAsync("/api/account/change-password", new
            {
                currentPassword = KnownPassword,
                newPassword = KnownPassword
            });

            Assert.Equal(HttpStatusCode.BadRequest, response.StatusCode);
            var body = await ReadAsync(response);
            Assert.False(body.GetProperty("success").GetBoolean());
            Assert.Equal(
                "New password must be different from the current password.",
                body.GetProperty("errors").GetProperty("NewPassword")[0].GetString());
            Assert.Equal(hashBefore, (await LoadUserAsync(user.Id)).PasswordHash);
        }

        [Fact]
        public async Task ChangePassword_Unauthenticated_ReturnsUnauthorized()
        {
            using var client = _factory.CreateClient();

            var response = await client.PostAsJsonAsync("/api/account/change-password", new
            {
                currentPassword = KnownPassword,
                newPassword = "Newpass12"
            });

            Assert.Equal(HttpStatusCode.Unauthorized, response.StatusCode);
            await AssertFailureAsync(response, "Authentication is required.");
        }

        [Fact]
        public async Task CreateUser_PasswordWithEightCharacters_IsAccepted()
        {
            var editorRoleId = await AddRoleAsync(NewName("editor"), Permissions.UserView, Permissions.UserCreate);
            var viewerRoleId = await AddRoleAsync(NewName("viewer"), Permissions.UserView);
            var caller = await AddUserAsync(NewName("caller"), editorRoleId, "Editor");
            var userName = NewName("created");
            using var client = ClientFor(caller, Permissions.UserView, Permissions.UserCreate);

            var response = await client.PostAsJsonAsync("/api/users", new
            {
                firstName = "Ada",
                lastName = "Lovelace",
                email = $"{userName}@example.com",
                userName,
                password = "Secret12",
                roleId = viewerRoleId
            });

            Assert.Equal(HttpStatusCode.Created, response.StatusCode);
            var stored = await LoadUserByNameAsync(userName);
            await using var scope = _factory.Services.CreateAsyncScope();
            var hasher = scope.ServiceProvider.GetRequiredService<IPasswordHasher<User>>();
            Assert.Equal(
                PasswordVerificationResult.Success,
                hasher.VerifyHashedPassword(stored, stored.PasswordHash, "Secret12"));
        }

        [Fact]
        public async Task CreateUser_PasswordShorterThanEight_IsRejected()
        {
            var editorRoleId = await AddRoleAsync(NewName("editor"), Permissions.UserView, Permissions.UserCreate);
            var viewerRoleId = await AddRoleAsync(NewName("viewer"), Permissions.UserView);
            var caller = await AddUserAsync(NewName("caller"), editorRoleId, "Editor");
            var userName = NewName("short");
            using var client = ClientFor(caller, Permissions.UserView, Permissions.UserCreate);

            var response = await client.PostAsJsonAsync("/api/users", new
            {
                firstName = "Ada",
                lastName = "Lovelace",
                email = $"{userName}@example.com",
                userName,
                password = "Secret1",
                roleId = viewerRoleId
            });

            Assert.Equal(HttpStatusCode.BadRequest, response.StatusCode);
            var body = await ReadAsync(response);
            Assert.False(body.GetProperty("success").GetBoolean());
            Assert.Equal("Validation failed", body.GetProperty("message").GetString());
            Assert.True(body.GetProperty("errors").TryGetProperty("Password", out _));
            Assert.Null(await FindUserByNameAsync(userName));
        }

        private HttpClient ClientFor(TestUser user, params string[] permissions)
        {
            return _factory.CreateAuthenticatedClient(user.Id, user.UserName, user.RoleName, permissions);
        }

        private static Dictionary<string, object?> ProfileBody(
            string email,
            string firstName,
            params (string Name, object? Value)[] extras)
        {
            var body = new Dictionary<string, object?>
            {
                ["firstName"] = firstName,
                ["lastName"] = "Lovelace",
                ["email"] = email,
                ["phoneNumber"] = "555-0100",
                ["gender"] = "Female",
                ["dateOfBirth"] = new DateTime(1991, 2, 3),
                ["address"] = "London",
                ["imageUrl"] = "https://example.com/ada.png"
            };

            foreach (var (name, value) in extras)
            {
                body[name] = value;
            }

            return body;
        }

        private async Task<int> AddRoleAsync(string name, params string[] rightNames)
        {
            var distinctNames = rightNames.Distinct(StringComparer.Ordinal).ToArray();
            await using var scope = _factory.Services.CreateAsyncScope();
            var database = scope.ServiceProvider.GetRequiredService<ApplicationDbContext>();
            var rights = await database.Rights.Where(right => distinctNames.Contains(right.Name)).ToListAsync();
            if (rights.Count != distinctNames.Length)
            {
                throw new InvalidOperationException("One or more rights were not seeded.");
            }

            var role = new Role { Name = name, IsSystem = false };
            database.Roles.Add(role);
            await database.SaveChangesAsync();
            foreach (var right in rights)
            {
                database.RoleRights.Add(new RoleRight { RoleId = role.Id, RightId = right.Id });
            }

            await database.SaveChangesAsync();
            return role.Id;
        }

        private async Task<TestUser> AddUserAsync(string userName, int roleId, string roleName)
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
            return new TestUser(user.Id, user.UserName, user.Email, user.FirstName, roleName);
        }

        private async Task DeleteUserAsync(int userId)
        {
            await using var scope = _factory.Services.CreateAsyncScope();
            var database = scope.ServiceProvider.GetRequiredService<ApplicationDbContext>();
            var user = await database.Users.SingleAsync(existing => existing.Id == userId);
            database.Users.Remove(user);
            await database.SaveChangesAsync();
        }

        private async Task<User> LoadUserAsync(int userId)
        {
            await using var scope = _factory.Services.CreateAsyncScope();
            var database = scope.ServiceProvider.GetRequiredService<ApplicationDbContext>();
            return await database.Users.AsNoTracking().SingleAsync(user => user.Id == userId);
        }

        private async Task<User> LoadUserByNameAsync(string userName)
        {
            var user = await FindUserByNameAsync(userName);
            return user ?? throw new InvalidOperationException($"User {userName} was not created.");
        }

        private async Task<User?> FindUserByNameAsync(string userName)
        {
            await using var scope = _factory.Services.CreateAsyncScope();
            var database = scope.ServiceProvider.GetRequiredService<ApplicationDbContext>();
            return await database.Users.AsNoTracking().SingleOrDefaultAsync(user => user.UserName == userName);
        }

        private static async Task AssertFailureAsync(HttpResponseMessage response, string message)
        {
            var body = await ReadAsync(response);
            Assert.False(body.GetProperty("success").GetBoolean());
            Assert.Equal(message, body.GetProperty("message").GetString());
        }

        private static async Task<JsonElement> ReadAsync(HttpResponseMessage response)
        {
            var json = await response.Content.ReadAsStringAsync();
            Assert.DoesNotContain("passwordHash", json, StringComparison.OrdinalIgnoreCase);
            using var document = JsonDocument.Parse(json);
            return document.RootElement.Clone();
        }

        private static string NewName(string prefix)
        {
            return $"{prefix}-{Guid.NewGuid():N}";
        }

        private sealed record TestUser(int Id, string UserName, string Email, string FirstName, string RoleName);
    }
}
