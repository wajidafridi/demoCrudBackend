namespace DemoCrudBackend.Dtos
{
    /// <summary>
    /// The signed-in user's current role and rights, read from the database on this request.
    /// The frontend uses it to refresh menus, buttons and route checks without a new login.
    /// </summary>
    public class CurrentAccessDto
    {
        public int Id { get; set; }

        public string UserName { get; set; } = string.Empty;

        public int RoleId { get; set; }

        public string RoleName { get; set; } = string.Empty;

        public IReadOnlyList<string> Permissions { get; set; } = [];

        /// <summary>Same value as the X-Access-Version response header.</summary>
        public string AccessVersion { get; set; } = string.Empty;
    }
}
