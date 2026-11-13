namespace DemoCrudBackend.Authorization
{
    /// <summary>
    /// Shared write-side helpers for user/role protection.
    /// Business roles (Admin, User, Coordinator, etc.) are dynamic DB rows — do not hardcode them here.
    ///
    /// RoleService rejects update, delete, and right changes when Role.IsSystem is true.
    /// Never trust IsSystem values from request bodies; load them from the database.
    /// </summary>
    public static class RoleAssignment
    {
        public static bool IsSelfDeletion(int callerUserId, int targetUserId)
        {
            return callerUserId == targetUserId;
        }

        public static bool IsSelfUpdate(int callerUserId, int targetUserId)
        {
            return callerUserId == targetUserId;
        }

        /// <summary>
        /// True when <paramref name="roleRightNames"/> contains a right that is not in the caller's permission claims.
        /// An empty role does not exceed the caller.
        /// </summary>
        public static bool ExceedsCallerPermissions(
            IEnumerable<string> roleRightNames,
            IReadOnlySet<string> callerPermissions)
        {
            foreach (var rightName in roleRightNames)
            {
                if (!callerPermissions.Contains(rightName))
                {
                    return true;
                }
            }

            return false;
        }
    }
}
