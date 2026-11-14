using DemoCrudBackend.Data;
using DemoCrudBackend.Models;
using Microsoft.AspNetCore.Identity;
using Microsoft.AspNetCore.Mvc.Testing;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.DependencyInjection;

namespace DemoCrudBackend.Tests
{
    /// <summary>
    /// Seeds real rows. The API reloads role and rights from the database on every request,
    /// so a token only works for a user that exists, and only with that user's current rights.
    /// </summary>
    internal static class TestData
    {
        public const string KnownPassword = "Test@12345";

        public static string NewName(string prefix)
        {
            return $"{prefix}-{Guid.NewGuid():N}";
        }

        public static async Task<int> AddRoleAsync(
            WebApplicationFactory<Program> factory,
            string name,
            params string[] rightNames)
        {
            var distinctNames = rightNames.Distinct(StringComparer.Ordinal).ToArray();
            await using var scope = factory.Services.CreateAsyncScope();
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

        public static async Task<(int Id, string UserName)> AddUserAsync(
            WebApplicationFactory<Program> factory,
            string userName,
            int roleId)
        {
            await using var scope = factory.Services.CreateAsyncScope();
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
            return (user.Id, user.UserName);
        }
    }
}
