using System.Security.Cryptography;
using System.Text;

namespace DemoCrudBackend.Authorization
{
    /// <summary>
    /// The caller's role and rights as they are in the database right now.
    /// Loaded once per authenticated request, so revoked or added rights apply immediately.
    /// </summary>
    public sealed record AccessSnapshot(
        int UserId,
        string UserName,
        int RoleId,
        string RoleName,
        IReadOnlyList<string> Permissions,
        string Version)
    {
        /// <summary>Response header that carries <see cref="Version"/> on authenticated responses.</summary>
        public const string VersionHeader = "X-Access-Version";

        /// <summary>HttpContext.Items key for the snapshot of the current request.</summary>
        public const string HttpContextItemKey = "DemoCrud.AccessSnapshot";

        public static AccessSnapshot Create(
            int userId,
            string userName,
            int roleId,
            string roleName,
            IEnumerable<string> permissions)
        {
            var sorted = permissions
                .Where(permission => !string.IsNullOrWhiteSpace(permission))
                .Distinct(StringComparer.Ordinal)
                .Order(StringComparer.Ordinal)
                .ToArray();

            return new AccessSnapshot(userId, userName, roleId, roleName, sorted, ComputeVersion(roleId, roleName, sorted));
        }

        /// <summary>
        /// Short, opaque fingerprint of role + rights. It changes whenever a right is added or removed,
        /// or the user moves to another role. It is not a secret and carries no permission data.
        /// </summary>
        private static string ComputeVersion(int roleId, string roleName, IReadOnlyList<string> sortedPermissions)
        {
            var source = $"{roleId}\n{roleName}\n{string.Join('\n', sortedPermissions)}";
            var hash = SHA256.HashData(Encoding.UTF8.GetBytes(source));
            return Convert.ToHexString(hash, 0, 8).ToLowerInvariant();
        }
    }
}
