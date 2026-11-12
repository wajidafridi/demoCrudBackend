using System.Globalization;
using System.Security.Claims;

namespace DemoCrudBackend.Authorization
{
    public static class CallerContext
    {
        public static int? UserId(ClaimsPrincipal principal)
        {
            var value = principal.FindFirst(ClaimTypes.NameIdentifier)?.Value;
            if (!int.TryParse(value, NumberStyles.None, CultureInfo.InvariantCulture, out var userId) || userId <= 0)
            {
                return null;
            }

            return userId;
        }

        public static IReadOnlySet<string> PermissionNames(ClaimsPrincipal principal)
        {
            var permissions = new HashSet<string>(StringComparer.Ordinal);
            foreach (var claim in principal.FindAll(Permissions.ClaimType))
            {
                if (!string.IsNullOrWhiteSpace(claim.Value))
                {
                    permissions.Add(claim.Value);
                }
            }

            return permissions;
        }
    }
}
