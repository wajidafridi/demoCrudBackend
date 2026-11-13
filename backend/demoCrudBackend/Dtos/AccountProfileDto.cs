namespace DemoCrudBackend.Dtos
{
    public class AccountProfileDto
    {
        public int Id { get; set; }

        public string UserName { get; set; } = string.Empty;

        public string Email { get; set; } = string.Empty;

        public string FirstName { get; set; } = string.Empty;

        public string LastName { get; set; } = string.Empty;

        public string? PhoneNumber { get; set; }

        public string? Gender { get; set; }

        public DateTime? DateOfBirth { get; set; }

        public string? Address { get; set; }

        public string? ImageUrl { get; set; }

        public int RoleId { get; set; }

        public string? RoleName { get; set; }

        public bool IsSystem { get; set; }

        public DateTime CreatedAt { get; set; }
    }
}
