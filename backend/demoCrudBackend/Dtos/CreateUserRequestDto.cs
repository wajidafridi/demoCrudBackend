namespace DemoCrudBackend.Dtos
{
    public class CreateUserRequestDto
    {
        public string FirstName { get; set; } = string.Empty;

        public string LastName { get; set; } = string.Empty;

        public string Email { get; set; } = string.Empty;

        public string UserName { get; set; } = string.Empty;

        public string Password { get; set; } = string.Empty;

        public int RoleId { get; set; }

        public string? Address { get; set; }

        public string? PhoneNumber { get; set; }

        public string? Gender { get; set; }

        public DateTime? DateOfBirth { get; set; }

        public string? ImageUrl { get; set; }
    }
}