using System.ComponentModel.DataAnnotations;

namespace DemoCrudBackend.Dtos
{
    public class RoleRightsRequestDto
    {
        [Required]
        [MinLength(1, ErrorMessage = "At least one right id is required.")]
        public List<int> RightIds { get; set; } = [];
    }
}
