using System.ComponentModel.DataAnnotations;

namespace DemoCrudBackend.Models
{
    public class Role
    {
        public int Id { get; set; }

        [Required]
        [StringLength(100)]
        public string Name { get; set; } = string.Empty;

        /// <summary>
        /// Protected system role (seeded SuperAdmin). Never accept this from request DTOs.
        /// RoleRight APIs must reject add/remove when this flag is true.
        /// </summary>
        public bool IsSystem { get; set; }

        public ICollection<User> Users { get; set; } = [];

        public ICollection<RoleRight> RoleRight { get; set; } = [];
    }
}
