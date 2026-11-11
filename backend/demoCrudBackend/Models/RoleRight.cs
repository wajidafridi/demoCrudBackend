namespace DemoCrudBackend.Models
{
    public class RoleRight
    {
        public int RoleId { get; set; }

        public Role Role { get; set; } = null!;

        public int RightId { get; set; }

        public Right Right { get; set; } = null!;

    }
}
