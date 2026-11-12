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

        public static bool IsRoleChange(int currentRoleId, int requestedRoleId)
        {
            return currentRoleId != requestedRoleId;
        }
    }
}
