namespace DemoCrudBackend.Dtos
{
    public class LoginResponseDto
    {
        public int Id { get; set; }

        public string FirstName { get; set; } = string.Empty;

        public string LastName { get; set; } = string.Empty;

        public string FullName => string.IsNullOrWhiteSpace(FirstName) && string.IsNullOrWhiteSpace(LastName)
            ? string.Empty
            : $"{FirstName} {LastName}".Trim();

        public string Email { get; set; } = string.Empty;

        public string UserName { get; set; } = string.Empty;

        public int RoleId { get; set; }

        public string? RoleName { get; set; }

        public string? Address { get; set; }

        public string? PhoneNumber { get; set; }

        public string? Gender { get; set; }

        public DateTime? DateOfBirth { get; set; }

        public string? ImageUrl { get; set; }

        public DateTime CreatedAt { get; set; }

        public DateTime? UpdatedAt { get; set; }

        public int? Age
        {
            get
            {
                if (!DateOfBirth.HasValue) return null;
                var today = DateTime.UtcNow;
                var age = today.Year - DateOfBirth.Value.Year;
                if (DateOfBirth.Value.Date > today.AddYears(-age)) age--;
                return age;
            }
        }
    }
}
