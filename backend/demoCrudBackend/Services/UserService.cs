using DemoCrudBackend.Data;
using DemoCrudBackend.Dtos;
using DemoCrudBackend.Models;
using Microsoft.AspNetCore.Identity;
using Microsoft.EntityFrameworkCore;

namespace DemoCrudBackend.Services
{
    public class UserService(ApplicationDbContext context, IPasswordHasher<User> passwordHasher) : IUserService
    {
        public async Task<List<UserResponseDto>> GetAllUsersAsync()
        {

            return await context.Users
                .Select(user => new UserResponseDto
                {
                    Id = user.Id,
                    FirstName = user.FirstName,
                    LastName = user.LastName,
                    Email = user.Email,
                    UserName = user.UserName,
                    RoleId = user.RoleId,
                    Address = user.Address,
                    PhoneNumber = user.PhoneNumber,
                    Gender = user.Gender,
                    DateOfBirth = user.DateOfBirth,
                    ImageUrl = user.ImageUrl,
                    CreatedAt = user.CreatedAt,
                    UpdatedAt = user.UpdatedAt
                })
                .ToListAsync();
        }

        public async Task<UserResponseDto?> GetUserByIdAsync(int id)
        {
            return await context.Users
                .Where(x => x.Id == id)
                .Select(user => new UserResponseDto
                {
                    Id = user.Id,
                    FirstName = user.FirstName,
                    LastName = user.LastName,
                    Email = user.Email,
                    UserName = user.UserName,
                    RoleId = user.RoleId,
                    Address = user.Address,
                    PhoneNumber = user.PhoneNumber,
                    Gender = user.Gender,
                    DateOfBirth = user.DateOfBirth,
                    ImageUrl = user.ImageUrl,
                    CreatedAt = user.CreatedAt,
                    UpdatedAt = user.UpdatedAt

                })
                .FirstOrDefaultAsync();
        }

        public async Task<UserResponseDto> AddUserAsync(CreateUserRequestDto user)
        {
            var newUser = new User
            {
                Email = user.Email,
                RoleId = user.RoleId,
                Gender = user.Gender,
                Address = user.Address,
                LastName = user.LastName,
                UserName = user.UserName,
                ImageUrl = user.ImageUrl,
                FirstName = user.FirstName,
                CreatedAt = DateTime.UtcNow,
                DateOfBirth = user.DateOfBirth,
                PhoneNumber = user.PhoneNumber,
            };

            newUser.PasswordHash = passwordHasher.HashPassword(newUser, user.Password);

            context.Users.Add(newUser);
            await context.SaveChangesAsync();

            return new UserResponseDto
            {
                Id = newUser.Id,
                Email = newUser.Email,
                RoleId = newUser.RoleId,
                UserName = newUser.UserName,
                LastName = newUser.LastName,
                FirstName = newUser.FirstName,
                Gender = newUser.Gender,
                Address = newUser.Address,
                ImageUrl = newUser.ImageUrl,
                PhoneNumber = newUser.PhoneNumber,
                DateOfBirth = newUser.DateOfBirth,
                CreatedAt = newUser.CreatedAt,
                UpdatedAt = newUser.UpdatedAt
            };
        }

        public async Task<bool> UpdateUserAsync(int id, UpdateUserRequestDto user)
        {
            var existingUser = await context.Users.FindAsync(id);

            if (existingUser is null)
            {
                return false;
            }

            existingUser.Email = user.Email;
            existingUser.RoleId = user.RoleId;
            existingUser.Gender = user.Gender;
            existingUser.Address = user.Address;
            existingUser.LastName = user.LastName;
            existingUser.UserName = user.UserName;
            existingUser.ImageUrl = user.ImageUrl;
            existingUser.FirstName = user.FirstName;
            existingUser.UpdatedAt = DateTime.UtcNow;
            existingUser.DateOfBirth = user.DateOfBirth;
            existingUser.PhoneNumber = user.PhoneNumber;

            await context.SaveChangesAsync();

            return true;
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
    }
}
