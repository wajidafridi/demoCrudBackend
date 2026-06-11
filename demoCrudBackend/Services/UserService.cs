using DemoCrudBackend.Data;
using DemoCrudBackend.Models;
using Microsoft.AspNetCore.Http.HttpResults;
using Microsoft.AspNetCore.Identity;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace DemoCrudBackend.Services
{
    public class UserService(ApplicationDbContext context) : IUserService
    {
        public async Task<User> AddUserAsync(User user)
        {
            var newUser = new User
            {
                Email = user.Email,
                RoleId = user.RoleId,
                LastName = user.LastName,
                UserName = user.UserName,
                FirstName = user.FirstName,
                CreatedAt = DateTime.UtcNow,
                PasswordHash = user.PasswordHash,
            };

            context.Users.Add(newUser);
            await context.SaveChangesAsync();

            return newUser;
        }

        public async Task<bool> DeleteUserAsync(int id)
        {
            var userToDelete = await context.Users.FindAsync(id);

            if(userToDelete is null)
            {
                return false;
            }

            context.Users.Remove(userToDelete);
            await context.SaveChangesAsync();

            return true;
        }

        public async Task<List<User>> GetAllUsersAsync()
        {
            return await context.Users.ToListAsync();
        }

        public async Task<User?> GetUserByIdAsync(int id)
        {
            var result = await context.Users.FindAsync(id);
            return result;
        }

        public async Task<bool> UpdateUserAsync(int id, User user)
        {
            var existingUser = await context.Users.FindAsync(id);

            if (existingUser is null) 
            {
                return false;
            }

            existingUser.Email = user.Email;
            existingUser.RoleId = user.RoleId;
            existingUser.LastName = user.LastName;
            existingUser.UserName = user.UserName;
            existingUser.FirstName = user.FirstName;
            existingUser.UpdatedAt = DateTime.UtcNow;
            existingUser.PasswordHash = user.PasswordHash;

            await context.SaveChangesAsync();

            return true;
        }
    }
}
