using DemoCrudBackend.Models;
using Microsoft.AspNetCore.Mvc;

namespace DemoCrudBackend.Services
{
    public class UserService : IUserService
    {
        static List<User> users = new List<User>
        {
            new User { Id = 1, FirstName = "John", LastName = "Doe", Email = "user1@example.com", UserName = "user1", RoleId = 1 },
            new User { Id = 2, FirstName = "Jane", LastName = "Smith", Email = "user2@example.com", UserName = "janesmith", RoleId = 2 },
            new User { Id = 3, FirstName = "Alice", LastName = "Johnson", Email = "user3@example.com", UserName = "alicejohnson", RoleId = 1 }
        };

        public Task<User> AddUserAsync(User user)
        {
            throw new NotImplementedException();
        }

        public Task<bool> DeleteUserAsync(int id)
        {
            throw new NotImplementedException();
        }

        public async Task<List<User>> GetAllUsersAsync()
        {
            return await Task.FromResult(users);
        }

        public async Task<User?> GetUserByIdAsync(int id)
        {
            var result = users.FirstOrDefault(u => u.Id == id);
            return await Task.FromResult(result);
        }

        public Task<bool> UpdateUserAsync(int id, User user)
        {
            throw new NotImplementedException();
        }
    }
}
