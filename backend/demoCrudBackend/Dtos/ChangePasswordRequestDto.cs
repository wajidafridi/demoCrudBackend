using System.ComponentModel.DataAnnotations;
using DemoCrudBackend.Common;

namespace DemoCrudBackend.Dtos
{
    public class ChangePasswordRequestDto
    {
        [Required]
        [StringLength(PasswordRules.MaximumLength)]
        public string CurrentPassword { get; set; } = string.Empty;

        [Required]
        [StringLength(PasswordRules.MaximumLength, MinimumLength = PasswordRules.MinimumLength)]
        public string NewPassword { get; set; } = string.Empty;
    }
}
