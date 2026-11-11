namespace DemoCrudBackend.Models
{
    public class Right
    {
        public int Id { get; set; }

        public string Name { get; set; } = string.Empty;

        public ICollection<RoleRight> RoleRight { get; set; } = [];
    }
}
