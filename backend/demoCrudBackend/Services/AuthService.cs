using DemoCrudBackend.Data;
using DemoCrudBackend.Dtos;
using DemoCrudBackend.Models;
using Microsoft.AspNetCore.Identity;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Logging;
using System.Security.Cryptography;

namespace DemoCrudBackend.Services
{
    public class AuthService(
        ApplicationDbContext context,
        IPasswordHasher<User> passwordHasher,
        ILogger<AuthService> logger) : IAuthService
    {
        public async Task<LoginResponseDto?> LoginAsync(LoginRequestDto loginRequest)
        {
            var user = await context.Users
                .Include(u => u.Role)
                .FirstOrDefaultAsync(u => u.UserName == loginRequest.Username);

            if (user is null)
            {
                return null;
            }

            if (string.IsNullOrWhiteSpace(user.PasswordHash))
            {
                logger.LogWarning("Stored password hash for user {UserId} is missing or blank.", user.Id);
                return null;
            }

            PasswordVerificationResult passwordVerificationResult;
            try
            {
                passwordVerificationResult = passwordHasher.VerifyHashedPassword(
                    user,
                    user.PasswordHash,
                    loginRequest.Password);
            }
            catch (Exception ex) when (ex is FormatException or ArgumentException or CryptographicException)
            {
                logger.LogWarning(ex, "Stored password hash for user {UserId} is malformed.", user.Id);
                return null;
            }

            switch (passwordVerificationResult)
            {
                case PasswordVerificationResult.Failed:
                    return null;

                case PasswordVerificationResult.Success:
                    break;

                case PasswordVerificationResult.SuccessRehashNeeded:
                    try
                    {
                        user.PasswordHash = passwordHasher.HashPassword(user, loginRequest.Password);
                        await context.SaveChangesAsync();
                    }
                    catch (Exception ex) when (ex is not OperationCanceledException)
                    {
                        logger.LogError(
                            ex,
                            "Failed to save the rehashed password for user {UserId}. Login will continue.",
                            user.Id);
                    }
                    break;

                default:
                    logger.LogWarning(
                        "Unexpected password verification result {VerificationResult} for user {UserId}.",
                        passwordVerificationResult,
                        user.Id);
                    return null;
            }

            return new LoginResponseDto
            {
                Id = user.Id,
                UserName = user.UserName,
                Email = user.Email,
                RoleId = user.RoleId,
                RoleName = user.Role.Name
            };
        }
    }
}
