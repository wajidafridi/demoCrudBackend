using DemoCrudBackend.Authorization;
using DemoCrudBackend.Data;
using Microsoft.EntityFrameworkCore;

namespace DemoCrudBackend.Services
{
    public interface IAccessSnapshotService
    {
        /// <summary>
        /// Loads the user's current role and rights. Returns null when the user no longer exists
        /// or has no resolvable role. Database errors are not caught here: the caller must fail closed.
        /// </summary>
        Task<AccessSnapshot?> LoadAsync(int userId, CancellationToken cancellationToken = default);
    }

    public sealed class AccessSnapshotService(ApplicationDbContext context) : IAccessSnapshotService
    {
        public async Task<AccessSnapshot?> LoadAsync(int userId, CancellationToken cancellationToken = default)
        {
            if (userId <= 0)
            {
                return null;
            }

            // One round trip: user, role and right names.
            var row = await context.Users
                .AsNoTracking()
                .Where(user => user.Id == userId)
                .Select(user => new
                {
                    user.Id,
                    user.UserName,
                    user.RoleId,
                    RoleName = user.Role.Name,
                    Rights = user.Role.RoleRight.Select(roleRight => roleRight.Right.Name).ToList()
                })
                .FirstOrDefaultAsync(cancellationToken);

            if (row is null || string.IsNullOrWhiteSpace(row.RoleName) || string.IsNullOrWhiteSpace(row.UserName))
            {
                return null;
            }

            return AccessSnapshot.Create(row.Id, row.UserName, row.RoleId, row.RoleName, row.Rights);
        }
    }
}
