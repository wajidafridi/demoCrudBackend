namespace DemoCrudBackend.Authorization
{
    /// <summary>
    /// Shared write-side helpers for user/role protection.
    /// Business roles (Admin, User, Coordinator, etc.) are dynamic DB rows — do not hardcode them here.
    ///
    /// Future RoleRight APIs must reject add/remove when the target role has IsSystem = true.
    /// Future Role edit/delete APIs must reject changes when Role.IsSystem = true.
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
