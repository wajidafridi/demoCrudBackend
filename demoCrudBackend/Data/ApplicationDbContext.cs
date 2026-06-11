using DemoCrudBackend.Models;
using Microsoft.EntityFrameworkCore;

namespace DemoCrudBackend.Data
{
    public class ApplicationDbContext(DbContextOptions<ApplicationDbContext> options): DbContext(options)
    {
        public DbSet<User> Users => Set<User>();
    }
}
