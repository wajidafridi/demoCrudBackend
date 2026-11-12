using System.Security.Cryptography;
using DemoCrudBackend.Data;
using DemoCrudBackend.Dtos;
using DemoCrudBackend.Models;
using Microsoft.AspNetCore.Identity;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Logging;

namespace DemoCrudBackend.Services
{
    public class AuthService(
        ApplicationDbContext context,
        IPasswordHasher<User> passwordHasher,
        ILogger<AuthService> logger,
        ITokenService tokenService) : IAuthService
    {
        public async Task<LoginResponseDto?> LoginAsync(
            LoginRequestDto loginRequest,
            CancellationToken cancellationToken = default)
        {
            var username = loginRequest.Username.Trim();
            if (string.IsNullOrEmpty(username))
            {
                return null;
            }

            var user = await FindUserForLoginAsync(username, cancellationToken);
            if (user is null)
            {
                return null;
            }

            if (!await ApplyPasswordVerificationAsync(user, loginRequest.Password, cancellationToken))
            {
                return null;
            }

            if (user.Role is null || string.IsNullOrWhiteSpace(user.Role.Name))
            {
                logger.LogError("User {UserId} has no resolvable role. Login was denied.", user.Id);
                return null;
            }

            var permissions = CollectPermissions(user);
            return BuildLoginResponse(user, permissions);
        }

        private async Task<User?> FindUserForLoginAsync(string username, CancellationToken cancellationToken)
        {
            return await context.Users
                .AsNoTracking()
                .Include(user => user.Role)
                    .ThenInclude(role => role.RoleRight)
                    .ThenInclude(roleRight => roleRight.Right)
                .FirstOrDefaultAsync(user => user.UserName == username, cancellationToken);
        }

        private PasswordVerificationResult VerifyPassword(User user, string password)
        {
            if (string.IsNullOrWhiteSpace(user.PasswordHash))
            {
                logger.LogWarning("Stored password hash for user {UserId} is missing or blank.", user.Id);
                return PasswordVerificationResult.Failed;
            }

            try
            {
                return passwordHasher.VerifyHashedPassword(user, user.PasswordHash, password);
            }
            catch (Exception ex) when (ex is FormatException or ArgumentException or CryptographicException)
            {
                logger.LogWarning(ex, "Stored password hash for user {UserId} is malformed.", user.Id);
                return PasswordVerificationResult.Failed;
            }
        }

        private async Task<bool> ApplyPasswordVerificationAsync(
            User user,
            string password,
            CancellationToken cancellationToken)
        {
            switch (VerifyPassword(user, password))
            {
                case PasswordVerificationResult.Failed:
                    return false;

                case PasswordVerificationResult.Success:
                    return true;

                case PasswordVerificationResult.SuccessRehashNeeded:
                    await TryRehashPasswordAsync(user, password, cancellationToken);
                    return true;

                default:
                    logger.LogWarning(
                        "Unexpected password verification result for user {UserId}.",
                        user.Id);
                    return false;
            }
        }

        // Login continues even if the upgraded hash cannot be saved.
        private async Task TryRehashPasswordAsync(User user, string password, CancellationToken cancellationToken)
        {
            try
            {
                var newHash = passwordHasher.HashPassword(user, password);
                await context.Users
                    .Where(existing => existing.Id == user.Id)
                    .ExecuteUpdateAsync(
                        setters => setters.SetProperty(existing => existing.PasswordHash, newHash),
                        cancellationToken);
            }
            catch (Exception ex) when (ex is not OperationCanceledException)
            {
                logger.LogError(
                    ex,
                    "Failed to save the rehashed password for user {UserId}. Login will continue.",
                    user.Id);
            }
        }

        private HashSet<string> CollectPermissions(User user)
        {
            var permissions = new HashSet<string>(StringComparer.Ordinal);

            foreach (var roleRight in user.Role.RoleRight)
            {
                var rightName = roleRight.Right?.Name;
                if (string.IsNullOrWhiteSpace(rightName))
                {
                    logger.LogWarning(
                        "Skipped an unresolved right for role {RoleId} while creating an access token.",
                        user.RoleId);
                    continue;
                }

                permissions.Add(rightName);
            }

            return permissions;
        }

        private LoginResponseDto BuildLoginResponse(User user, IReadOnlyCollection<string> permissions)
        {
            var accessToken = tokenService.CreateAccessToken(
                user.Id,
                user.UserName,
                user.Role.Name,
                permissions);

            return new LoginResponseDto
            {
                Id = user.Id,
                UserName = user.UserName,
                Email = user.Email,
                RoleId = user.RoleId,
                RoleName = user.Role.Name,
                AccessToken = accessToken.AccessToken,
                ExpiresAtUtc = accessToken.ExpiresAtUtc
            };
        }
    }
}
