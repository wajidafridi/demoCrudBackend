namespace DemoCrudBackend.Dtos
{
    public class LoginResponseDto
    {
        public int Id { get; set; }

        public string UserName { get; set; } = string.Empty;

        public string Email { get; set; } = string.Empty;

        public int RoleId { get; set; }

        public string? RoleName { get; set; }

        public string AccessToken { get; set; } = string.Empty;

        public DateTime ExpiresAtUtc { get; set; }

        /// <summary>Rights of the role at login time. Later changes are reported by GET /api/auth/me.</summary>
        public IReadOnlyList<string> Permissions { get; set; } = [];

        /// <summary>Fingerprint of role + rights. Compare with the X-Access-Version response header.</summary>
        public string AccessVersion { get; set; } = string.Empty;
    }
}
