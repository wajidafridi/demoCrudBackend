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
    public sealed class UserSecurityTests : IClassFixture<DemoCrudApiFactory>
    {
        private readonly DemoCrudApiFactory _factory;

        public UserSecurityTests(DemoCrudApiFactory factory)
        {
            _factory = factory;
        }

        [Fact]
        public async Task GetUser_SystemAccount_ReturnsIsSystemTrue()
        {
            var systemUser = await GetSystemUserAsync();
            using var client = ClientFor(systemUser, Permissions.UserView);

            var byId = await GetUserAsync(client, systemUser.Id);
            Assert.True(byId.GetProperty("isSystem").GetBoolean());

            var listed = await FindUserAsync(client, systemUser.Id);
            Assert.True(listed.GetProperty("isSystem").GetBoolean());
        }

        [Fact]
        public async Task GetUser_NormalAccount_ReturnsIsSystemFalse()
        {
            var roleId = await AddRoleAsync(NewName("viewer"), Permissions.UserView);
            var user = await AddUserAsync(NewName("user"), roleId, "Viewer");
            var caller = await AddUserAsync(NewName("caller"), roleId, "Viewer");
            using var client = ClientFor(caller, Permissions.UserView);

            var byId = await GetUserAsync(client, user.Id);
            Assert.False(byId.GetProperty("isSystem").GetBoolean());

            var listed = await FindUserAsync(client, user.Id);
            Assert.False(listed.GetProperty("isSystem").GetBoolean());
        }

        [Fact]
        public async Task UpdateUser_Self_ReturnsForbidden()
        {
            var roleId = await AddRoleAsync(NewName("editor"), Permissions.UserView, Permissions.UserEdit);
            var caller = await AddUserAsync(NewName("caller"), roleId, "Editor");
            using var client = ClientFor(caller, Permissions.UserView, Permissions.UserEdit);

            var response = await client.PutAsJsonAsync(
                $"/api/users/{caller.Id}",
                UpdateBody(caller, roleId, "Changed"));

            Assert.Equal(HttpStatusCode.Forbidden, response.StatusCode);
            await AssertFailureAsync(response, "You cannot update your own account.");
            await AssertFirstNameAsync(caller.Id, caller.FirstName);
        }

        [Fact]
        public async Task UpdateUser_SystemAccount_ReturnsForbidden()
        {
            var systemUser = await GetSystemUserAsync();
            using var client = ClientFor(systemUser, Permissions.All);

            var response = await client.PutAsJsonAsync(
                $"/api/users/{systemUser.Id}",
                UpdateBody(systemUser, systemUser.RoleId, "Changed"));

            Assert.Equal(HttpStatusCode.Forbidden, response.StatusCode);
            await AssertFailureAsync(response, "You cannot update your own account.");
            await AssertFirstNameAsync(systemUser.Id, systemUser.FirstName);
        }

        [Fact]
        public async Task UpdateUser_OtherCallerCannotModifySystemUser()
        {
            var systemUser = await GetSystemUserAsync();
            var roleId = await AddRoleAsync(NewName("full"), Permissions.All);
            var caller = await AddUserAsync(NewName("caller"), roleId, "Full");
            using var client = ClientFor(caller, Permissions.All);

            var response = await client.PutAsJsonAsync(
                $"/api/users/{systemUser.Id}",
                UpdateBody(systemUser, systemUser.RoleId, "Changed"));

            Assert.Equal(HttpStatusCode.Forbidden, response.StatusCode);
            await AssertFailureAsync(response, "You are not allowed to modify the system user.");
            await AssertFirstNameAsync(systemUser.Id, systemUser.FirstName);
        }

        [Fact]
        public async Task UpdateUser_OtherUserWithinCeiling_Succeeds()
        {
            var editorRoleId = await AddRoleAsync(NewName("editor"), Permissions.UserView, Permissions.UserEdit);
            var viewerRoleId = await AddRoleAsync(NewName("viewer"), Permissions.UserView);
            var caller = await AddUserAsync(NewName("caller"), editorRoleId, "Editor");
            var target = await AddUserAsync(NewName("target"), viewerRoleId, "Viewer");
            using var client = ClientFor(caller, Permissions.UserView, Permissions.UserEdit);

            var response = await client.PutAsJsonAsync(
                $"/api/users/{target.Id}",
                UpdateBody(target, viewerRoleId, "Updated"));

            Assert.Equal(HttpStatusCode.OK, response.StatusCode);
            var body = await ReadAsync(response);
            Assert.True(body.GetProperty("success").GetBoolean());

            var updated = await GetUserAsync(client, target.Id);
            Assert.Equal("Updated", updated.GetProperty("firstName").GetString());
            Assert.False(updated.GetProperty("isSystem").GetBoolean());
            Assert.Equal(viewerRoleId, updated.GetProperty("roleId").GetInt32());
        }

        [Fact]
        public async Task CreateUser_RoleWithinCeiling_Succeeds()
        {
            var editorRoleId = await AddRoleAsync(
                NewName("editor"),
                Permissions.UserView,
                Permissions.UserCreate);
            var viewerRoleId = await AddRoleAsync(NewName("viewer"), Permissions.UserView);
            var caller = await AddUserAsync(NewName("caller"), editorRoleId, "Editor");
            var userName = NewName("created");
            var email = $"{userName}@example.com";
            using var client = ClientFor(caller, Permissions.UserView, Permissions.UserCreate);

            var response = await client.PostAsJsonAsync("/api/users", new
            {
                firstName = "Ada",
                lastName = "Lovelace",
                email,
                userName,
                password = "Secret12",
                roleId = viewerRoleId
            });

            Assert.Equal(HttpStatusCode.Created, response.StatusCode);
            var body = await ReadAsync(response);
            Assert.True(body.GetProperty("success").GetBoolean());
            var created = body.GetProperty("data");
            Assert.False(created.GetProperty("isSystem").GetBoolean());
            var createdId = created.GetProperty("id").GetInt32();

            await using var scope = _factory.Services.CreateAsyncScope();
            var database = scope.ServiceProvider.GetRequiredService<ApplicationDbContext>();
            var hasher = scope.ServiceProvider.GetRequiredService<IPasswordHasher<User>>();
            var stored = await database.Users.AsNoTracking().SingleAsync(user => user.Id == createdId);
            Assert.False(stored.IsSystem);
            Assert.Equal(
                PasswordVerificationResult.Success,
                hasher.VerifyHashedPassword(stored, stored.PasswordHash, "Secret12"));
        }

        [Fact]
        public async Task CreateUser_RoleExceedsCeiling_ReturnsForbidden()
        {
            var editorRoleId = await AddRoleAsync(NewName("editor"), Permissions.UserView, Permissions.UserCreate);
            var elevatedRoleId = await AddRoleAsync(NewName("elevated"), Permissions.UserView, Permissions.UserDelete);
            var caller = await AddUserAsync(NewName("caller"), editorRoleId, "Editor");
            var userName = NewName("blocked");
            using var client = ClientFor(caller, Permissions.UserView, Permissions.UserCreate);

            var response = await client.PostAsJsonAsync("/api/users", new
            {
                firstName = "Grace",
                lastName = "Hopper",
                email = $"{userName}@example.com",
                userName,
                password = "Secret12",
                roleId = elevatedRoleId
            });

            Assert.Equal(HttpStatusCode.Forbidden, response.StatusCode);
            await AssertFailureAsync(response, "You cannot assign a role that includes permissions you do not have.");
            await AssertUserMissingAsync(userName);
        }

        [Fact]
        public async Task CreateUser_SystemRole_ReturnsForbidden()
        {
            var fullRoleId = await AddRoleAsync(NewName("full"), Permissions.All);
            var caller = await AddUserAsync(NewName("caller"), fullRoleId, "Full");
            var systemRoleId = await GetSystemRoleIdAsync();
            var userName = NewName("systemrole");
            using var client = ClientFor(caller, Permissions.All);

            var response = await client.PostAsJsonAsync("/api/users", new
            {
                firstName = "Grace",
                lastName = "Hopper",
                email = $"{userName}@example.com",
                userName,
                password = "Secret12",
                roleId = systemRoleId
            });

            Assert.Equal(HttpStatusCode.Forbidden, response.StatusCode);
            await AssertFailureAsync(response, "You are not allowed to assign the system role.");
            await AssertUserMissingAsync(userName);
        }

        [Fact]
        public async Task UpdateUser_CurrentRoleExceedsCeiling_ReturnsForbidden()
        {
            var editorRoleId = await AddRoleAsync(NewName("editor"), Permissions.UserView, Permissions.UserEdit);
            var elevatedRoleId = await AddRoleAsync(NewName("elevated"), Permissions.UserView, Permissions.UserDelete);
            var viewerRoleId = await AddRoleAsync(NewName("viewer"), Permissions.UserView);
            var caller = await AddUserAsync(NewName("caller"), editorRoleId, "Editor");
            var target = await AddUserAsync(NewName("target"), elevatedRoleId, "Elevated");
            using var client = ClientFor(caller, Permissions.UserView, Permissions.UserEdit);

            var response = await client.PutAsJsonAsync(
                $"/api/users/{target.Id}",
                UpdateBody(target, viewerRoleId, "Changed"));

            Assert.Equal(HttpStatusCode.Forbidden, response.StatusCode);
            await AssertFailureAsync(
                response,
                "You cannot edit a user whose role includes permissions you do not have.");
            await AssertFirstNameAsync(target.Id, target.FirstName);
        }

        [Fact]
        public async Task UpdateUser_RequestedRoleExceedsCeiling_ReturnsForbidden()
        {
            var editorRoleId = await AddRoleAsync(NewName("editor"), Permissions.UserView, Permissions.UserEdit);
            var viewerRoleId = await AddRoleAsync(NewName("viewer"), Permissions.UserView);
            var elevatedRoleId = await AddRoleAsync(NewName("elevated"), Permissions.UserView, Permissions.UserDelete);
            var caller = await AddUserAsync(NewName("caller"), editorRoleId, "Editor");
            var target = await AddUserAsync(NewName("target"), viewerRoleId, "Viewer");
            using var client = ClientFor(caller, Permissions.UserView, Permissions.UserEdit);

            var response = await client.PutAsJsonAsync(
                $"/api/users/{target.Id}",
                UpdateBody(target, elevatedRoleId, "Changed"));

            Assert.Equal(HttpStatusCode.Forbidden, response.StatusCode);
            await AssertFailureAsync(response, "You cannot assign a role that includes permissions you do not have.");
            await AssertFirstNameAsync(target.Id, target.FirstName);
            await AssertRoleAsync(target.Id, viewerRoleId);
        }

        [Fact]
        public async Task UpdateUser_CurrentAndRequestedRolesWithinCeiling_Succeeds()
        {
            var editorRoleId = await AddRoleAsync(
                NewName("editor"),
                Permissions.UserView,
                Permissions.UserCreate,
                Permissions.UserEdit);
            var viewerRoleId = await AddRoleAsync(NewName("viewer"), Permissions.UserView);
            var creatorRoleId = await AddRoleAsync(NewName("creator"), Permissions.UserView, Permissions.UserCreate);
            var caller = await AddUserAsync(NewName("caller"), editorRoleId, "Editor");
            var target = await AddUserAsync(NewName("target"), viewerRoleId, "Viewer");
            using var client = ClientFor(
                caller,
                Permissions.UserView,
                Permissions.UserCreate,
                Permissions.UserEdit);

            var response = await client.PutAsJsonAsync(
                $"/api/users/{target.Id}",
                UpdateBody(target, creatorRoleId, "Promoted"));

            Assert.Equal(HttpStatusCode.OK, response.StatusCode);
            var updated = await GetUserAsync(client, target.Id);
            Assert.Equal("Promoted", updated.GetProperty("firstName").GetString());
            Assert.Equal(creatorRoleId, updated.GetProperty("roleId").GetInt32());
            Assert.False(updated.GetProperty("isSystem").GetBoolean());
        }

        [Fact]
        public async Task DeleteUser_RoleExceedsCeiling_ReturnsForbidden()
        {
            var callerRoleId = await AddRoleAsync(NewName("deleter"), Permissions.UserView, Permissions.UserDelete);
            var elevatedRoleId = await AddRoleAsync(NewName("elevated"), Permissions.UserView, Permissions.UserEdit);
            var caller = await AddUserAsync(NewName("caller"), callerRoleId, "Deleter");
            var target = await AddUserAsync(NewName("target"), elevatedRoleId, "Elevated");
            using var client = ClientFor(caller, Permissions.UserView, Permissions.UserDelete);

            var response = await client.DeleteAsync($"/api/users/{target.Id}");

            Assert.Equal(HttpStatusCode.Forbidden, response.StatusCode);
            await AssertFailureAsync(
                response,
                "You cannot delete a user whose role includes permissions you do not have.");
            await AssertUserExistsAsync(target.Id);
        }

        [Fact]
        public async Task DeleteUser_EqualPrivilege_Succeeds()
        {
            var roleId = await AddRoleAsync(NewName("peer"), Permissions.UserView, Permissions.UserDelete);
            var caller = await AddUserAsync(NewName("caller"), roleId, "Peer");
            var target = await AddUserAsync(NewName("target"), roleId, "Peer");
            using var client = ClientFor(caller, Permissions.UserView, Permissions.UserDelete);

            var response = await client.DeleteAsync($"/api/users/{target.Id}");

            Assert.Equal(HttpStatusCode.OK, response.StatusCode);
            var body = await ReadAsync(response);
            Assert.True(body.GetProperty("success").GetBoolean());
            await AssertUserMissingByIdAsync(target.Id);
            await AssertUserExistsAsync(caller.Id);
        }

        [Fact]
        public async Task DeleteUser_LowerPrivilege_Succeeds()
        {
            var callerRoleId = await AddRoleAsync(NewName("deleter"), Permissions.UserView, Permissions.UserDelete);
            var viewerRoleId = await AddRoleAsync(NewName("viewer"), Permissions.UserView);
            var caller = await AddUserAsync(NewName("caller"), callerRoleId, "Deleter");
            var target = await AddUserAsync(NewName("target"), viewerRoleId, "Viewer");
            using var client = ClientFor(caller, Permissions.UserView, Permissions.UserDelete);

            var response = await client.DeleteAsync($"/api/users/{target.Id}");

            Assert.Equal(HttpStatusCode.OK, response.StatusCode);
            await AssertUserMissingByIdAsync(target.Id);
        }

        [Fact]
        public async Task DeleteUser_Self_ReturnsForbidden()
        {
            var roleId = await AddRoleAsync(NewName("deleter"), Permissions.UserView, Permissions.UserDelete);
            var caller = await AddUserAsync(NewName("caller"), roleId, "Deleter");
            using var client = ClientFor(caller, Permissions.UserView, Permissions.UserDelete);

            var response = await client.DeleteAsync($"/api/users/{caller.Id}");

            Assert.Equal(HttpStatusCode.Forbidden, response.StatusCode);
            await AssertFailureAsync(response, "You cannot delete your own account.");
            await AssertUserExistsAsync(caller.Id);
        }

        [Fact]
        public async Task DeleteUser_SystemAccount_ReturnsForbidden()
        {
            var systemUser = await GetSystemUserAsync();
            var roleId = await AddRoleAsync(NewName("full"), Permissions.All);
            var caller = await AddUserAsync(NewName("caller"), roleId, "Full");
            using var client = ClientFor(caller, Permissions.All);

            var response = await client.DeleteAsync($"/api/users/{systemUser.Id}");

            Assert.Equal(HttpStatusCode.Forbidden, response.StatusCode);
            await AssertFailureAsync(response, "The system user cannot be deleted.");
            await AssertUserExistsAsync(systemUser.Id);
        }

        [Theory]
        [InlineData(Permissions.RoleRightAssign)]
        [InlineData(Permissions.RoleView)]
        [InlineData(Permissions.RightView)]
        public async Task RemoveRights_GuardedRightOnOwnRole_ReturnsForbidden(string guardedRight)
        {
            var roleId = await AddRoleAsync(
                NewName("manager"),
                Permissions.RoleRightAssign,
                Permissions.RoleView,
                Permissions.RightView,
                Permissions.UserView);
            var caller = await AddUserAsync(NewName("caller"), roleId, "Manager");
            using var client = ClientFor(
                caller,
                Permissions.RoleRightAssign,
                Permissions.RoleView,
                Permissions.RightView,
                Permissions.UserView);

            var response = await DeleteJsonAsync(
                client,
                $"/api/roles/{roleId}/rights",
                new { rightIds = new[] { await GetRightIdAsync(guardedRight) } });

            Assert.Equal(HttpStatusCode.Forbidden, response.StatusCode);
            await AssertFailureAsync(response, "You cannot remove role-management rights from your own role.");
            Assert.True(await RoleHasRightAsync(roleId, guardedRight));
        }

        [Fact]
        public async Task RemoveRights_NonGuardedRightOnOwnRole_Succeeds()
        {
            var roleId = await AddRoleAsync(
                NewName("manager"),
                Permissions.RoleRightAssign,
                Permissions.RoleView,
                Permissions.RightView,
                Permissions.UserView);
            var caller = await AddUserAsync(NewName("caller"), roleId, "Manager");
            using var client = ClientFor(
                caller,
                Permissions.RoleRightAssign,
                Permissions.RoleView,
                Permissions.RightView,
                Permissions.UserView);

            var response = await DeleteJsonAsync(
                client,
                $"/api/roles/{roleId}/rights",
                new { rightIds = new[] { await GetRightIdAsync(Permissions.UserView) } });

            Assert.Equal(HttpStatusCode.OK, response.StatusCode);
            var body = await ReadAsync(response);
            Assert.True(body.GetProperty("success").GetBoolean());
            Assert.False(await RoleHasRightAsync(roleId, Permissions.UserView));
            Assert.True(await RoleHasRightAsync(roleId, Permissions.RoleRightAssign));
            Assert.True(await RoleHasRightAsync(roleId, Permissions.RoleView));
            Assert.True(await RoleHasRightAsync(roleId, Permissions.RightView));
        }

        [Fact]
        public async Task RemoveRights_GuardedRightOnAnotherRole_Succeeds()
        {
            var callerRoleId = await AddRoleAsync(
                NewName("manager"),
                Permissions.RoleRightAssign,
                Permissions.RoleView,
                Permissions.RightView);
            var otherRoleId = await AddRoleAsync(NewName("viewer"), Permissions.RoleView);
            var caller = await AddUserAsync(NewName("caller"), callerRoleId, "Manager");
            using var client = ClientFor(
                caller,
                Permissions.RoleRightAssign,
                Permissions.RoleView,
                Permissions.RightView);

            var response = await DeleteJsonAsync(
                client,
                $"/api/roles/{otherRoleId}/rights",
                new { rightIds = new[] { await GetRightIdAsync(Permissions.RoleView) } });

            Assert.Equal(HttpStatusCode.OK, response.StatusCode);
            Assert.False(await RoleHasRightAsync(otherRoleId, Permissions.RoleView));
            Assert.True(await RoleHasRightAsync(callerRoleId, Permissions.RoleView));
        }

        [Fact]
        public async Task RemoveRights_RightOutsideCallerPermissions_ReturnsForbidden()
        {
            // The ceiling uses the caller's rights in the database, not the token claims.
            var callerRoleId = await AddRoleAsync(
                NewName("manager"),
                Permissions.RoleRightAssign,
                Permissions.RoleView,
                Permissions.RightView);
            var targetRoleId = await AddRoleAsync(NewName("target"), Permissions.UserDelete);
            var caller = await AddUserAsync(NewName("caller"), callerRoleId, "Manager");
            using var client = ClientFor(caller, Permissions.All);

            var response = await DeleteJsonAsync(
                client,
                $"/api/roles/{targetRoleId}/rights",
                new { rightIds = new[] { await GetRightIdAsync(Permissions.UserDelete) } });

            Assert.Equal(HttpStatusCode.Forbidden, response.StatusCode);
            await AssertFailureAsync(response, "You can only change rights that are assigned to you.");
            Assert.True(await RoleHasRightAsync(targetRoleId, Permissions.UserDelete));
        }

        private HttpClient ClientFor(TestUser user, params string[] permissions)
        {
            return _factory.CreateAuthenticatedClient(user.Id, user.UserName, user.RoleName, permissions);
        }

        private async Task<JsonElement> GetUserAsync(HttpClient client, int userId)
        {
            var response = await client.GetAsync($"/api/users/{userId}");
            Assert.Equal(HttpStatusCode.OK, response.StatusCode);
            var body = await ReadAsync(response);
            Assert.True(body.GetProperty("success").GetBoolean());
            return body.GetProperty("data");
        }

        private async Task<JsonElement> FindUserAsync(HttpClient client, int userId)
        {
            var pageNumber = 1;
            while (true)
            {
                var response = await client.GetAsync($"/api/users?pageNumber={pageNumber}&pageSize=100");
                Assert.Equal(HttpStatusCode.OK, response.StatusCode);
                var body = await ReadAsync(response);
                foreach (var item in body.GetProperty("data").EnumerateArray())
                {
                    if (item.GetProperty("id").GetInt32() == userId)
                    {
                        return item.Clone();
                    }
                }

                if (!body.GetProperty("pagination").GetProperty("hasNextPage").GetBoolean())
                {
                    throw new InvalidOperationException($"User {userId} was not returned by the user list.");
                }

                pageNumber++;
            }
        }

        private async Task<int> AddRoleAsync(string name, params string[] rightNames)
        {
            var distinctNames = rightNames.Distinct(StringComparer.Ordinal).ToArray();
            await using var scope = _factory.Services.CreateAsyncScope();
            var database = scope.ServiceProvider.GetRequiredService<ApplicationDbContext>();
            var rights = await database.Rights
                .Where(right => distinctNames.Contains(right.Name))
                .ToListAsync();

            if (rights.Count != distinctNames.Length)
            {
                throw new InvalidOperationException("One or more rights were not seeded.");
            }

            var role = new Role
            {
                Name = name,
                IsSystem = false
            };
            database.Roles.Add(role);
            await database.SaveChangesAsync();

            foreach (var right in rights)
            {
                database.RoleRights.Add(new RoleRight
                {
                    RoleId = role.Id,
                    RightId = right.Id
                });
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
            user.PasswordHash = hasher.HashPassword(user, "Test@12345");
            database.Users.Add(user);
            await database.SaveChangesAsync();

            return new TestUser(user.Id, user.UserName, user.Email, user.RoleId, roleName, user.FirstName, user.LastName);
        }

        private async Task<TestUser> GetSystemUserAsync()
        {
            await using var scope = _factory.Services.CreateAsyncScope();
            var database = scope.ServiceProvider.GetRequiredService<ApplicationDbContext>();
            var user = await database.Users
                .AsNoTracking()
                .Include(existing => existing.Role)
                .SingleAsync(existing => existing.IsSystem);

            return new TestUser(
                user.Id,
                user.UserName,
                user.Email,
                user.RoleId,
                user.Role.Name,
                user.FirstName,
                user.LastName);
        }

        private async Task<int> GetSystemRoleIdAsync()
        {
            await using var scope = _factory.Services.CreateAsyncScope();
            var database = scope.ServiceProvider.GetRequiredService<ApplicationDbContext>();
            return await database.Roles
                .Where(role => role.IsSystem)
                .Select(role => role.Id)
                .SingleAsync();
        }

        private async Task AssertFirstNameAsync(int userId, string firstName)
        {
            await using var scope = _factory.Services.CreateAsyncScope();
            var database = scope.ServiceProvider.GetRequiredService<ApplicationDbContext>();
            var stored = await database.Users.AsNoTracking().SingleAsync(user => user.Id == userId);
            Assert.Equal(firstName, stored.FirstName);
        }

        private async Task AssertRoleAsync(int userId, int roleId)
        {
            await using var scope = _factory.Services.CreateAsyncScope();
            var database = scope.ServiceProvider.GetRequiredService<ApplicationDbContext>();
            var stored = await database.Users.AsNoTracking().SingleAsync(user => user.Id == userId);
            Assert.Equal(roleId, stored.RoleId);
        }

        private async Task AssertUserMissingAsync(string userName)
        {
            await using var scope = _factory.Services.CreateAsyncScope();
            var database = scope.ServiceProvider.GetRequiredService<ApplicationDbContext>();
            var exists = await database.Users.AsNoTracking().AnyAsync(user => user.UserName == userName);
            Assert.False(exists);
        }

        private async Task AssertUserExistsAsync(int userId)
        {
            await using var scope = _factory.Services.CreateAsyncScope();
            var database = scope.ServiceProvider.GetRequiredService<ApplicationDbContext>();
            var exists = await database.Users.AsNoTracking().AnyAsync(user => user.Id == userId);
            Assert.True(exists);
        }

        private async Task AssertUserMissingByIdAsync(int userId)
        {
            await using var scope = _factory.Services.CreateAsyncScope();
            var database = scope.ServiceProvider.GetRequiredService<ApplicationDbContext>();
            var exists = await database.Users.AsNoTracking().AnyAsync(user => user.Id == userId);
            Assert.False(exists);
        }

        private async Task<int> GetRightIdAsync(string rightName)
        {
            await using var scope = _factory.Services.CreateAsyncScope();
            var database = scope.ServiceProvider.GetRequiredService<ApplicationDbContext>();
            return await database.Rights
                .AsNoTracking()
                .Where(right => right.Name == rightName)
                .Select(right => right.Id)
                .SingleAsync();
        }

        private async Task<bool> RoleHasRightAsync(int roleId, string rightName)
        {
            await using var scope = _factory.Services.CreateAsyncScope();
            var database = scope.ServiceProvider.GetRequiredService<ApplicationDbContext>();
            return await database.RoleRights
                .AsNoTracking()
                .AnyAsync(roleRight => roleRight.RoleId == roleId && roleRight.Right.Name == rightName);
        }

        private static async Task<HttpResponseMessage> DeleteJsonAsync(HttpClient client, string url, object body)
        {
            using var request = new HttpRequestMessage(HttpMethod.Delete, url)
            {
                Content = JsonContent.Create(body)
            };
            return await client.SendAsync(request);
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
            using var document = JsonDocument.Parse(json);
            return document.RootElement.Clone();
        }

        private static object UpdateBody(TestUser user, int roleId, string firstName)
        {
            return new
            {
                firstName,
                lastName = user.LastName,
                email = user.Email,
                userName = user.UserName,
                roleId
            };
        }

        private static string NewName(string prefix)
        {
            return $"{prefix}-{Guid.NewGuid():N}";
        }

        private sealed record TestUser(
            int Id,
            string UserName,
            string Email,
            int RoleId,
            string RoleName,
            string FirstName,
            string LastName);
    }
}
