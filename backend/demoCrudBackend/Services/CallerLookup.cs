using DemoCrudBackend.Data;
using Microsoft.EntityFrameworkCore;

namespace DemoCrudBackend.Services
{
    public static class CallerLookup
    {
        public static async Task<int?> ResolveUserIdAsync(
            ApplicationDbContext context,
            int? callerUserId,
            CancellationToken cancellationToken)
        {
            if (callerUserId is null || callerUserId <= 0)
            {
                return null;
            }

            var exists = await context.Users
                .AsNoTracking()
                .AnyAsync(user => user.Id == callerUserId.Value, cancellationToken);

            return exists ? callerUserId : null;
        }
    }
}
