using System.ComponentModel.DataAnnotations;

namespace DemoCrudBackend.Dtos
{
    public class RoleRequestDto
    {
        [Required]
        [StringLength(100)]
        public string Name { get; set; } = string.Empty;
    }
}
