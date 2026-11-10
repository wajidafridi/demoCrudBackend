using DemoCrudBackend.Models;
using Microsoft.EntityFrameworkCore;

namespace DemoCrudBackend.Data
{
    public class ApplicationDbContext(DbContextOptions<ApplicationDbContext> options) : DbContext(options)
    {
        public DbSet<User> Users => Set<User>();

        public DbSet<Role> Roles => Set<Role>();

        public DbSet<Right> Rights => Set<Right>();

        public DbSet<RoleRight> RoleRights => Set<RoleRight>();

        protected override void OnModelCreating(ModelBuilder modelBuilder)
        {
            base.OnModelCreating(modelBuilder);

            modelBuilder.Entity<RoleRight>()
                .HasKey(rp => new
                {
                    rp.RoleId,
                    rp.RightId
                });

            modelBuilder.Entity<Role>().HasData(
                new Role { Id = 1, Name = "SuperAdmin" },
                new Role { Id = 2, Name = "Admin" },
                new Role { Id = 3, Name = "User" }
            );

            modelBuilder.Entity<Right>().HasData(
                new Right { Id = 1, Name = "User_View" },
                new Right { Id = 2, Name = "User_Create" },
                new Right { Id = 3, Name = "User_Edit" },
                new Right { Id = 4, Name = "User_Delete" },

                new Right { Id = 5, Name = "Role_View" },
                new Right { Id = 6, Name = "Role_Create" },
                new Right { Id = 7, Name = "Role_Edit" },
                new Right { Id = 8, Name = "Role_Delete" }
            );

            modelBuilder.Entity<RoleRight>().HasData(
                // SuperAdmin → all rights
                new RoleRight { RoleId = 1, RightId = 1 },
                new RoleRight { RoleId = 1, RightId = 2 },
                new RoleRight { RoleId = 1, RightId = 3 },
                new RoleRight { RoleId = 1, RightId = 4 },
                new RoleRight { RoleId = 1, RightId = 5 },
                new RoleRight { RoleId = 1, RightId = 6 },
                new RoleRight { RoleId = 1, RightId = 7 },
                new RoleRight { RoleId = 1, RightId = 8 },

                // Admin → limited
                new RoleRight { RoleId = 2, RightId = 1 },
                new RoleRight { RoleId = 2, RightId = 2 },
                new RoleRight { RoleId = 2, RightId = 3 },
                new RoleRight { RoleId = 2, RightId = 4 },

                // User → read-only
                new RoleRight { RoleId = 3, RightId = 1 }
            );

            modelBuilder.Entity<User>().HasData(
                new User
                {
                    Id = 1,
                    RoleId = 1,
                    Gender = "Male",
                    LastName = "Admin",
                    FirstName = "Super",
                    UserName = "superadmin",
                    Address = "123 Admin St",
                    PhoneNumber = "123-456-7890",
                    Email = "superadmin@email.com",
                    DateOfBirth = new DateTime(1990, 1, 1),
                    PasswordHash = "AQAAAAIAAYagAAAAEL0tk8ql339knuAjCF3pcFH+AYsnV+XGu5j+lif0bILBs8ysx4JFlJ9BfXNMA4dFhQ==", //Admin@123
                }
            );
        }
    }
}
