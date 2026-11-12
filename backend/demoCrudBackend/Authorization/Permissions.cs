namespace DemoCrudBackend.Authorization
{
    public static class Permissions
    {
        public const string ClaimType = "permission";

        public const string UserView = "User_View";

        public const string UserCreate = "User_Create";

        public const string UserEdit = "User_Edit";

        public const string UserDelete = "User_Delete";

        public const string RoleView = "Role_View";

        public const string RoleCreate = "Role_Create";

        public const string RoleEdit = "Role_Edit";

        public const string RoleDelete = "Role_Delete";

        public const string RoleRightAssign = "RoleRight_Assign";

        public const string RightView = "Right_View";

        public static readonly string[] All =
        [
            UserView,
            UserCreate,
            UserEdit,
            UserDelete,
            RoleView,
            RoleCreate,
            RoleEdit,
            RoleDelete,
            RoleRightAssign,
            RightView
        ];
    }
}
