using System.ComponentModel.DataAnnotations;

namespace DemoCrudBackend.Dtos
{
    public class LoginRequestDto
    {
        [Required]
        [StringLength(100)]
        public string Username { get; set; } = string.Empty;

        [Required]
        [StringLength(100)]
        public string Password { get; set; } = string.Empty;
    }
}
