using DemoCrudBackend.Data;
using DemoCrudBackend.Dtos;
using DemoCrudBackend.Models;
using Microsoft.AspNetCore.Identity;
using Microsoft.EntityFrameworkCore;

namespace DemoCrudBackend.Services
{
    public class AuthService(ApplicationDbContext context, IPasswordHasher<User> passwordHasher) : IAuthService
    {
        public async Task<LoginResponseDto?> LoginAsync(LoginRequestDto loginRequest)
        {
            var user = await context.Users.Include(u => u.Role).FirstOrDefaultAsync(u => u.UserName == loginRequest.Username);

            if (user is null)
            {
                return null;
            }

            var passwordVerificationResult = passwordHasher.VerifyHashedPassword(user, user.PasswordHash, loginRequest.Password);

            if (passwordVerificationResult == PasswordVerificationResult.Failed)
            {
                return null;
            }

            if(passwordVerificationResult == PasswordVerificationResult.SuccessRehashNeeded)
            {
                user.PasswordHash = passwordHasher.HashPassword(user, loginRequest.Password);
                await context.SaveChangesAsync();
            }

            return new LoginResponseDto
            {
                Id = user.Id,
                FirstName = user.FirstName,
                LastName = user.LastName,
                Email = user.Email,
                UserName = user.UserName,
                RoleId = user.RoleId,
                RoleName = user.Role.Name,
                Address = user.Address,
                PhoneNumber = user.PhoneNumber,
                Gender = user.Gender,
                DateOfBirth = user.DateOfBirth,
                ImageUrl = user.ImageUrl,
                CreatedAt = user.CreatedAt,
                UpdatedAt = user.UpdatedAt
            };
        }
    }
}
