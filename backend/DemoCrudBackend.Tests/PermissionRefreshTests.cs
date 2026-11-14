using System.IdentityModel.Tokens.Jwt;
using System.Net;
using System.Net.Http.Headers;
using System.Net.Http.Json;
using System.Security.Claims;
using System.Text;
using System.Text.Json;
using DemoCrudBackend.Authorization;
using DemoCrudBackend.Data;
using DemoCrudBackend.Services;
using Microsoft.AspNetCore.TestHost;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.IdentityModel.Tokens;

namespace DemoCrudBackend.Tests
{
    /// <summary>
    /// Regression tests for the stale-permission defect: a token issued before a right was removed
    /// kept working until it expired. Rights are now reloaded from the database on every request.
    /// </summary>
    public sealed class PermissionRefreshTests : IClassFixture<DemoCrudApiFactory>
    {
        private readonly DemoCrudApiFactory _factory;

        public PermissionRefreshTests(DemoCrudApiFactory factory)
        {
            _factory = factory;
        }

        [Fact]
        public async Task ActiveSession_EditAndDeleteRevoked_DeniedImmediately_ThenRestoredWithoutNewLogin()
        {
            var adminRoleId = await TestData.AddRoleAsync(
                _factory,
                TestData.NewName("admin"),
                Permissions.UserView,
                Permissions.UserCreate,
                Permissions.UserEdit,
                Permissions.UserDelete);
            var targetRoleId = await TestData.AddRoleAsync(_factory, TestData.NewName("member"), Permissions.UserView);
            var admin = await TestData.AddUserAsync(_factory, TestData.NewName("admin"), adminRoleId);
            var target = await TestData.AddUserAsync(_factory, TestData.NewName("target"), targetRoleId);
            using var superAdmin = await SuperAdminClientAsync();

            // 1. Admin signs in and receives a JWT that contains User_Edit and User_Delete.
            var login = await LoginAsync(admin.UserName);
            Assert.Contains(Permissions.UserEdit, login.Permissions);
            Assert.Contains(Permissions.UserDelete, login.Permissions);
            using var adminClient = BearerClient(login.AccessToken);

            // 2. SuperAdmin removes User_Edit and User_Delete from the Admin role.
            var removed = await SendJsonAsync(
                superAdmin,
                HttpMethod.Delete,
                $"/api/roles/{adminRoleId}/rights",
                new { rightIds = await RightIdsAsync(Permissions.UserEdit, Permissions.UserDelete) });
            Assert.Equal(HttpStatusCode.OK, removed.StatusCode);

            // 3-5. The same token is denied immediately, and the database does not change.
            var update = await adminClient.PutAsJsonAsync($"/api/users/{target.Id}", UpdateBody(target, targetRoleId, "Changed"));
            Assert.Equal(HttpStatusCode.Forbidden, update.StatusCode);
            var delete = await adminClient.DeleteAsync($"/api/users/{target.Id}");
            Assert.Equal(HttpStatusCode.Forbidden, delete.StatusCode);
            Assert.Equal("Test", await FirstNameAsync(target.Id));

            // 6. The frontend can see the change: /api/auth/me and the version header both moved.
            var revokedAccess = await CurrentAccessAsync(adminClient);
            Assert.DoesNotContain(Permissions.UserEdit, revokedAccess.Permissions);
            Assert.DoesNotContain(Permissions.UserDelete, revokedAccess.Permissions);
            Assert.Contains(Permissions.UserView, revokedAccess.Permissions);
            Assert.NotEqual(login.AccessVersion, revokedAccess.AccessVersion);
            Assert.Equal(revokedAccess.AccessVersion, update.Headers.GetValues(AccessSnapshot.VersionHeader).Single());

            // 8. SuperAdmin restores both rights.
            var restored = await SendJsonAsync(
                superAdmin,
                HttpMethod.Post,
                $"/api/roles/{adminRoleId}/rights",
                new { rightIds = await RightIdsAsync(Permissions.UserEdit, Permissions.UserDelete) });
            Assert.Equal(HttpStatusCode.OK, restored.StatusCode);

            // 9. The same active session regains them on the next request.
            var restoredAccess = await CurrentAccessAsync(adminClient);
            Assert.Equal(login.AccessVersion, restoredAccess.AccessVersion);
            var retryUpdate = await adminClient.PutAsJsonAsync($"/api/users/{target.Id}", UpdateBody(target, targetRoleId, "Changed"));
            Assert.Equal(HttpStatusCode.OK, retryUpdate.StatusCode);
            Assert.Equal("Changed", await FirstNameAsync(target.Id));

            // 10. A fresh login sees the same rights.
            var freshLogin = await LoginAsync(admin.UserName);
            Assert.Contains(Permissions.UserEdit, freshLogin.Permissions);
            Assert.Contains(Permissions.UserDelete, freshLogin.Permissions);
            using var freshClient = BearerClient(freshLogin.AccessToken);
            var retryDelete = await freshClient.DeleteAsync($"/api/users/{target.Id}");
            Assert.Equal(HttpStatusCode.OK, retryDelete.StatusCode);
            Assert.False(await UserExistsAsync(target.Id));
        }

        [Fact]
        public async Task ActiveSession_CreateRevoked_DeniedImmediately_AndNoUserIsCreated()
        {
            var roleId = await TestData.AddRoleAsync(
                _factory,
                TestData.NewName("creator"),
                Permissions.UserView,
                Permissions.UserCreate);
            var memberRoleId = await TestData.AddRoleAsync(_factory, TestData.NewName("member"), Permissions.UserView);
            var caller = await TestData.AddUserAsync(_factory, TestData.NewName("creator"), roleId);
            using var client = TokenClient(caller, Permissions.UserView, Permissions.UserCreate);

            await RemoveRightsDirectlyAsync(roleId, Permissions.UserCreate);

            var userName = TestData.NewName("blocked");
            var response = await client.PostAsJsonAsync("/api/users", CreateBody(userName, memberRoleId));

            Assert.Equal(HttpStatusCode.Forbidden, response.StatusCode);
            Assert.False(await UserNameExistsAsync(userName));
        }

        [Fact]
        public async Task ActiveSession_ViewRevoked_DeniesListAndDetails()
        {
            var roleId = await TestData.AddRoleAsync(_factory, TestData.NewName("viewer"), Permissions.UserView);
            var caller = await TestData.AddUserAsync(_factory, TestData.NewName("viewer"), roleId);
            using var client = TokenClient(caller, Permissions.UserView);
            Assert.Equal(HttpStatusCode.OK, (await client.GetAsync("/api/users")).StatusCode);

            await RemoveRightsDirectlyAsync(roleId, Permissions.UserView);

            Assert.Equal(HttpStatusCode.Forbidden, (await client.GetAsync("/api/users")).StatusCode);
            Assert.Equal(HttpStatusCode.Forbidden, (await client.GetAsync($"/api/users/{caller.Id}")).StatusCode);
        }

        [Fact]
        public async Task ActiveSession_RightGranted_WorksWithoutNewLogin()
        {
            var roleId = await TestData.AddRoleAsync(_factory, TestData.NewName("empty"));
            var caller = await TestData.AddUserAsync(_factory, TestData.NewName("empty"), roleId);
            using var client = TokenClient(caller);
            Assert.Equal(HttpStatusCode.Forbidden, (await client.GetAsync("/api/users")).StatusCode);

            await AddRightsDirectlyAsync(roleId, Permissions.UserView);

            var response = await client.GetAsync("/api/users");
            Assert.Equal(HttpStatusCode.OK, response.StatusCode);
            var access = await CurrentAccessAsync(client);
            Assert.Equal([Permissions.UserView], access.Permissions);
        }

        [Fact]
        public async Task TokenClaims_AreIgnored_WhenTheyExceedDatabaseRights()
        {
            // A token that claims every right gets only what the role has in the database.
            var roleId = await TestData.AddRoleAsync(_factory, TestData.NewName("narrow"), Permissions.UserView);
            var caller = await TestData.AddUserAsync(_factory, TestData.NewName("narrow"), roleId);
            using var client = TokenClient(caller, Permissions.All);

            Assert.Equal(HttpStatusCode.OK, (await client.GetAsync("/api/users")).StatusCode);
            Assert.Equal(HttpStatusCode.Forbidden, (await client.GetAsync("/api/roles")).StatusCode);
            var userName = TestData.NewName("blocked");
            var create = await client.PostAsJsonAsync("/api/users", CreateBody(userName, roleId));
            Assert.Equal(HttpStatusCode.Forbidden, create.StatusCode);
            Assert.False(await UserNameExistsAsync(userName));
        }

        [Fact]
        public async Task RoleCeiling_UsesCurrentDatabaseRights()
        {
            var callerRoleId = await TestData.AddRoleAsync(
                _factory,
                TestData.NewName("creator"),
                Permissions.UserView,
                Permissions.UserCreate,
                Permissions.UserDelete);
            var deleterRoleId = await TestData.AddRoleAsync(
                _factory,
                TestData.NewName("deleter"),
                Permissions.UserView,
                Permissions.UserDelete);
            var caller = await TestData.AddUserAsync(_factory, TestData.NewName("creator"), callerRoleId);
            using var client = TokenClient(caller, Permissions.UserView, Permissions.UserCreate, Permissions.UserDelete);

            // After User_Delete is revoked, the caller can no longer hand out a role that has it.
            await RemoveRightsDirectlyAsync(callerRoleId, Permissions.UserDelete);

            var userName = TestData.NewName("ceiling");
            var response = await client.PostAsJsonAsync("/api/users", CreateBody(userName, deleterRoleId));
            Assert.Equal(HttpStatusCode.Forbidden, response.StatusCode);
            Assert.False(await UserNameExistsAsync(userName));
        }

        [Fact]
        public async Task ActiveSession_RoleRightsRevoked_RoleOperationsDeniedImmediately()
        {
            var managerRoleId = await TestData.AddRoleAsync(
                _factory,
                TestData.NewName("manager"),
                Permissions.RoleView,
                Permissions.RoleCreate,
                Permissions.RoleEdit,
                Permissions.RoleDelete,
                Permissions.RoleRightAssign,
                Permissions.RightView,
                Permissions.UserView);
            var spareRoleId = await TestData.AddRoleAsync(_factory, TestData.NewName("spare"));
            var spareName = await RoleNameAsync(spareRoleId);
            var caller = await TestData.AddUserAsync(_factory, TestData.NewName("manager"), managerRoleId);
            using var client = TokenClient(caller, Permissions.All);

            await RemoveRightsDirectlyAsync(
                managerRoleId,
                Permissions.RoleCreate,
                Permissions.RoleEdit,
                Permissions.RoleDelete,
                Permissions.RoleRightAssign);

            var newRoleName = TestData.NewName("new");
            var create = await client.PostAsJsonAsync("/api/roles", new { name = newRoleName });
            var update = await client.PutAsJsonAsync($"/api/roles/{spareRoleId}", new { name = "renamed" });
            var delete = await client.DeleteAsync($"/api/roles/{spareRoleId}");
            var assign = await SendJsonAsync(
                client,
                HttpMethod.Post,
                $"/api/roles/{spareRoleId}/rights",
                new { rightIds = await RightIdsAsync(Permissions.UserView) });

            Assert.Equal(HttpStatusCode.Forbidden, create.StatusCode);
            Assert.Equal(HttpStatusCode.Forbidden, update.StatusCode);
            Assert.Equal(HttpStatusCode.Forbidden, delete.StatusCode);
            Assert.Equal(HttpStatusCode.Forbidden, assign.StatusCode);
            Assert.False(await RoleNameExistsAsync(newRoleName));
            Assert.Equal(spareName, await RoleNameAsync(spareRoleId));
            Assert.Empty(await RoleRightNamesAsync(spareRoleId));

            // Role_View is still assigned, so viewing still works.
            Assert.Equal(HttpStatusCode.OK, (await client.GetAsync("/api/roles")).StatusCode);
        }

        [Fact]
        public async Task ActiveSession_UserMovedToAnotherRole_UsesNewRoleRights()
        {
            var fullRoleId = await TestData.AddRoleAsync(
                _factory,
                TestData.NewName("full"),
                Permissions.UserView,
                Permissions.RoleView);
            var narrowRoleId = await TestData.AddRoleAsync(_factory, TestData.NewName("narrow"), Permissions.UserView);
            var caller = await TestData.AddUserAsync(_factory, TestData.NewName("mover"), fullRoleId);
            using var client = TokenClient(caller, Permissions.UserView, Permissions.RoleView);
            Assert.Equal(HttpStatusCode.OK, (await client.GetAsync("/api/roles")).StatusCode);

            await using (var scope = _factory.Services.CreateAsyncScope())
            {
                var database = scope.ServiceProvider.GetRequiredService<ApplicationDbContext>();
                await database.Users
                    .Where(user => user.Id == caller.Id)
                    .ExecuteUpdateAsync(setters => setters.SetProperty(user => user.RoleId, narrowRoleId));
            }

            Assert.Equal(HttpStatusCode.Forbidden, (await client.GetAsync("/api/roles")).StatusCode);
            var access = await CurrentAccessAsync(client);
            Assert.Equal(narrowRoleId, access.RoleId);
        }

        [Fact]
        public async Task DeletedAccount_ExistingToken_ReturnsUnauthorized()
        {
            var roleId = await TestData.AddRoleAsync(_factory, TestData.NewName("gone"), Permissions.UserView);
            var caller = await TestData.AddUserAsync(_factory, TestData.NewName("gone"), roleId);
            using var client = TokenClient(caller, Permissions.UserView);

            await using (var scope = _factory.Services.CreateAsyncScope())
            {
                var database = scope.ServiceProvider.GetRequiredService<ApplicationDbContext>();
                await database.Users.Where(user => user.Id == caller.Id).ExecuteDeleteAsync();
            }

            Assert.Equal(HttpStatusCode.Unauthorized, (await client.GetAsync("/api/users")).StatusCode);
            Assert.Equal(HttpStatusCode.Unauthorized, (await client.GetAsync("/api/auth/me")).StatusCode);
        }

        [Fact]
        public async Task AccessLookupFailure_FailsClosedWithSafe500()
        {
            var roleId = await TestData.AddRoleAsync(_factory, TestData.NewName("viewer"), Permissions.UserView);
            var caller = await TestData.AddUserAsync(_factory, TestData.NewName("viewer"), roleId);
            using var failingFactory = _factory.WithWebHostBuilder(builder =>
                builder.ConfigureTestServices(services =>
                    services.AddScoped<IAccessSnapshotService, ThrowingAccessSnapshotService>()));
            using var client = failingFactory.CreateClient();
            client.DefaultRequestHeaders.Authorization = new AuthenticationHeaderValue("Bearer", MintToken(caller, Permissions.All));

            var list = await client.GetAsync("/api/users");
            var delete = await client.DeleteAsync($"/api/users/{caller.Id}");
            var json = await list.Content.ReadAsStringAsync();

            Assert.Equal(HttpStatusCode.InternalServerError, list.StatusCode);
            Assert.Equal(HttpStatusCode.InternalServerError, delete.StatusCode);
            Assert.DoesNotContain("secret", json, StringComparison.OrdinalIgnoreCase);
            Assert.DoesNotContain("Exception", json, StringComparison.Ordinal);
            Assert.True(await UserExistsAsync(caller.Id));
        }

        [Fact]
        public async Task CurrentAccess_ReturnsDatabaseRightsAndMatchingHeader()
        {
            var roleId = await TestData.AddRoleAsync(
                _factory,
                TestData.NewName("reader"),
                Permissions.RoleView,
                Permissions.UserView);
            var caller = await TestData.AddUserAsync(_factory, TestData.NewName("reader"), roleId);
            using var client = TokenClient(caller);

            var response = await client.GetAsync("/api/auth/me");
            Assert.Equal(HttpStatusCode.OK, response.StatusCode);
            var access = await ReadDataAsync<CurrentAccess>(response);

            Assert.Equal(caller.Id, access.Id);
            Assert.Equal(roleId, access.RoleId);
            Assert.Equal([Permissions.RoleView, Permissions.UserView], access.Permissions);
            Assert.Equal(access.AccessVersion, response.Headers.GetValues(AccessSnapshot.VersionHeader).Single());
        }

        [Fact]
        public async Task CurrentAccess_WithoutToken_ReturnsUnauthorized_AndNoVersionHeader()
        {
            using var client = _factory.CreateClient();

            var response = await client.GetAsync("/api/auth/me");

            Assert.Equal(HttpStatusCode.Unauthorized, response.StatusCode);
            Assert.False(response.Headers.Contains(AccessSnapshot.VersionHeader));
        }

        [Theory]
        [InlineData(null)]
        [InlineData("Bearer")]
        [InlineData("Bearer not-a-jwt")]
        [InlineData("Basic dXNlcjpwYXNz")]
        [InlineData("bearer eyJhbGciOiJub25lIn0.eyJzdWIiOiIxIn0.")]
        public async Task ProtectedEndpoint_MissingOrMalformedAuthorization_Returns401(string? header)
        {
            using var client = _factory.CreateClient();
            using var request = new HttpRequestMessage(HttpMethod.Get, "/api/users");
            if (header is not null)
            {
                request.Headers.TryAddWithoutValidation("Authorization", header);
            }

            var response = await client.SendAsync(request);

            Assert.Equal(HttpStatusCode.Unauthorized, response.StatusCode);
        }

        [Fact]
        public async Task ProtectedEndpoint_ExpiredOrWronglySignedToken_Returns401()
        {
            var roleId = await TestData.AddRoleAsync(_factory, TestData.NewName("viewer"), Permissions.UserView);
            var caller = await TestData.AddUserAsync(_factory, TestData.NewName("viewer"), roleId);

            using var expired = BearerClient(MintToken(caller, [Permissions.UserView], expiresInMinutes: -10));
            using var forged = BearerClient(MintToken(caller, [Permissions.UserView], signingKey: "another-signing-key-0123456789-abcdef"));

            Assert.Equal(HttpStatusCode.Unauthorized, (await expired.GetAsync("/api/users")).StatusCode);
            Assert.Equal(HttpStatusCode.Unauthorized, (await forged.GetAsync("/api/users")).StatusCode);
        }

        private sealed class ThrowingAccessSnapshotService : IAccessSnapshotService
        {
            public Task<AccessSnapshot?> LoadAsync(int userId, CancellationToken cancellationToken = default)
            {
                throw new InvalidOperationException("Database unavailable: server=db; password=secret");
            }
        }

        private sealed record LoginData(string AccessToken, string[] Permissions, string AccessVersion);

        private sealed record CurrentAccess(int Id, string UserName, int RoleId, string RoleName, string[] Permissions, string AccessVersion);

        private async Task<LoginData> LoginAsync(string userName)
        {
            using var client = _factory.CreateClient();
            var response = await client.PostAsJsonAsync(
                "/api/auth/login",
                new { username = userName, password = TestData.KnownPassword });
            Assert.Equal(HttpStatusCode.OK, response.StatusCode);
            return await ReadDataAsync<LoginData>(response);
        }

        private static async Task<CurrentAccess> CurrentAccessAsync(HttpClient client)
        {
            var response = await client.GetAsync("/api/auth/me");
            Assert.Equal(HttpStatusCode.OK, response.StatusCode);
            return await ReadDataAsync<CurrentAccess>(response);
        }

        private static async Task<T> ReadDataAsync<T>(HttpResponseMessage response)
        {
            var json = await response.Content.ReadAsStringAsync();
            using var document = JsonDocument.Parse(json);
            return document.RootElement.GetProperty("data").Deserialize<T>(new JsonSerializerOptions(JsonSerializerDefaults.Web))!;
        }

        private async Task<HttpClient> SuperAdminClientAsync()
        {
            await using var scope = _factory.Services.CreateAsyncScope();
            var database = scope.ServiceProvider.GetRequiredService<ApplicationDbContext>();
            var system = await database.Users.AsNoTracking().SingleAsync(user => user.IsSystem);
            return TokenClient((system.Id, system.UserName), Permissions.All);
        }

        private HttpClient TokenClient((int Id, string UserName) user, params string[] permissions)
        {
            return BearerClient(MintToken(user, permissions));
        }

        private HttpClient BearerClient(string token)
        {
            var client = _factory.CreateClient();
            client.DefaultRequestHeaders.Authorization = new AuthenticationHeaderValue("Bearer", token);
            return client;
        }

        private string MintToken((int Id, string UserName) user, IReadOnlyCollection<string> permissions)
        {
            using var scope = _factory.Services.CreateScope();
            var tokenService = scope.ServiceProvider.GetRequiredService<ITokenService>();
            return tokenService.CreateAccessToken(user.Id, user.UserName, "Any", permissions).AccessToken;
        }

        private static string MintToken(
            (int Id, string UserName) user,
            IReadOnlyCollection<string> permissions,
            int expiresInMinutes = 30,
            string signingKey = DemoCrudApiFactory.JwtKey)
        {
            var claims = new List<Claim>
            {
                new(ClaimTypes.NameIdentifier, user.Id.ToString()),
                new(ClaimTypes.Name, user.UserName),
                new(ClaimTypes.Role, "Any")
            };
            claims.AddRange(permissions.Select(permission => new Claim(Permissions.ClaimType, permission)));
            var now = DateTime.UtcNow;
            var token = new JwtSecurityToken(
                DemoCrudApiFactory.JwtIssuer,
                DemoCrudApiFactory.JwtAudience,
                claims,
                notBefore: now.AddMinutes(Math.Min(0, expiresInMinutes) - 5),
                expires: now.AddMinutes(expiresInMinutes),
                signingCredentials: new SigningCredentials(
                    new SymmetricSecurityKey(Encoding.UTF8.GetBytes(signingKey)),
                    SecurityAlgorithms.HmacSha256));
            return new JwtSecurityTokenHandler().WriteToken(token);
        }

        private static async Task<HttpResponseMessage> SendJsonAsync(HttpClient client, HttpMethod method, string url, object body)
        {
            using var request = new HttpRequestMessage(method, url) { Content = JsonContent.Create(body) };
            return await client.SendAsync(request);
        }

        private static object UpdateBody((int Id, string UserName) user, int roleId, string firstName)
        {
            return new
            {
                firstName,
                lastName = "User",
                email = $"{user.UserName}@example.com",
                userName = user.UserName,
                roleId
            };
        }

        private static object CreateBody(string userName, int roleId)
        {
            return new
            {
                firstName = "New",
                lastName = "User",
                email = $"{userName}@example.com",
                userName,
                password = "Secret12",
                roleId
            };
        }

        private async Task<int[]> RightIdsAsync(params string[] names)
        {
            await using var scope = _factory.Services.CreateAsyncScope();
            var database = scope.ServiceProvider.GetRequiredService<ApplicationDbContext>();
            return await database.Rights.Where(right => names.Contains(right.Name)).Select(right => right.Id).ToArrayAsync();
        }

        private async Task RemoveRightsDirectlyAsync(int roleId, params string[] names)
        {
            await using var scope = _factory.Services.CreateAsyncScope();
            var database = scope.ServiceProvider.GetRequiredService<ApplicationDbContext>();
            await database.RoleRights
                .Where(roleRight => roleRight.RoleId == roleId && names.Contains(roleRight.Right.Name))
                .ExecuteDeleteAsync();
        }

        private async Task AddRightsDirectlyAsync(int roleId, params string[] names)
        {
            await using var scope = _factory.Services.CreateAsyncScope();
            var database = scope.ServiceProvider.GetRequiredService<ApplicationDbContext>();
            foreach (var rightId in await database.Rights.Where(right => names.Contains(right.Name)).Select(right => right.Id).ToListAsync())
            {
                database.RoleRights.Add(new Models.RoleRight { RoleId = roleId, RightId = rightId });
            }

            await database.SaveChangesAsync();
        }

        private async Task<string?> FirstNameAsync(int userId)
        {
            await using var scope = _factory.Services.CreateAsyncScope();
            var database = scope.ServiceProvider.GetRequiredService<ApplicationDbContext>();
            return await database.Users.AsNoTracking().Where(user => user.Id == userId).Select(user => user.FirstName).SingleOrDefaultAsync();
        }

        private async Task<bool> UserExistsAsync(int userId)
        {
            await using var scope = _factory.Services.CreateAsyncScope();
            var database = scope.ServiceProvider.GetRequiredService<ApplicationDbContext>();
            return await database.Users.AsNoTracking().AnyAsync(user => user.Id == userId);
        }

        private async Task<bool> UserNameExistsAsync(string userName)
        {
            await using var scope = _factory.Services.CreateAsyncScope();
            var database = scope.ServiceProvider.GetRequiredService<ApplicationDbContext>();
            return await database.Users.AsNoTracking().AnyAsync(user => user.UserName == userName);
        }

        private async Task<string> RoleNameAsync(int roleId)
        {
            await using var scope = _factory.Services.CreateAsyncScope();
            var database = scope.ServiceProvider.GetRequiredService<ApplicationDbContext>();
            return await database.Roles.AsNoTracking().Where(role => role.Id == roleId).Select(role => role.Name).SingleAsync();
        }

        private async Task<bool> RoleNameExistsAsync(string name)
        {
            await using var scope = _factory.Services.CreateAsyncScope();
            var database = scope.ServiceProvider.GetRequiredService<ApplicationDbContext>();
            return await database.Roles.AsNoTracking().AnyAsync(role => role.Name == name);
        }

        private async Task<List<string>> RoleRightNamesAsync(int roleId)
        {
            await using var scope = _factory.Services.CreateAsyncScope();
            var database = scope.ServiceProvider.GetRequiredService<ApplicationDbContext>();
            return await database.RoleRights.AsNoTracking()
                .Where(roleRight => roleRight.RoleId == roleId)
                .Select(roleRight => roleRight.Right.Name)
                .ToListAsync();
        }
    }
}
