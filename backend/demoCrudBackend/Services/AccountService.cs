using System.Linq.Expressions;
using System.Security.Cryptography;
using DemoCrudBackend.Common;
using DemoCrudBackend.Data;
using DemoCrudBackend.Dtos;
using DemoCrudBackend.Models;
using Microsoft.AspNetCore.Identity;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Logging;

namespace DemoCrudBackend.Services
{
    public class AccountService(
        ApplicationDbContext context,
        IPasswordHasher<User> passwordHasher,
        ILogger<AccountService> logger) : IAccountService
    {
        private const string AccountNotFoundMessage = "Your account was not found.";

        private static readonly Expression<Func<User, AccountProfileDto>> ProfileProjection = user =>
            new AccountProfileDto
            {
                Id = user.Id,
                UserName = user.UserName,
                Email = user.Email,
                FirstName = user.FirstName,
                LastName = user.LastName,
                PhoneNumber = user.PhoneNumber,
                Gender = user.Gender,
                DateOfBirth = user.DateOfBirth,
                Address = user.Address,
                ImageUrl = user.ImageUrl,
                RoleId = user.RoleId,
                RoleName = user.Role.Name,
                IsSystem = user.IsSystem,
                CreatedAt = user.CreatedAt
            };

        public async Task<WriteResult<AccountProfileDto>> GetProfileAsync(
            int? callerUserId,
            CancellationToken cancellationToken = default)
        {
            var callerId = await CallerLookup.ResolveUserIdAsync(context, callerUserId, cancellationToken);
            if (callerId is null)
            {
                return WriteResult<AccountProfileDto>.NotFound(AccountNotFoundMessage);
            }

            var profile = await LoadProfileAsync(callerId.Value, cancellationToken);
            if (profile is null)
            {
                return WriteResult<AccountProfileDto>.NotFound(AccountNotFoundMessage);
            }

            return WriteResult<AccountProfileDto>.Success(profile);
        }

        public async Task<WriteResult<AccountProfileDto>> UpdateProfileAsync(
            int? callerUserId,
            UpdateAccountRequestDto accountRequest,
            CancellationToken cancellationToken = default)
        {
            var callerId = await CallerLookup.ResolveUserIdAsync(context, callerUserId, cancellationToken);
            if (callerId is null)
            {
                return WriteResult<AccountProfileDto>.NotFound(AccountNotFoundMessage);
            }

            var email = NormalizeEmail(accountRequest.Email);
            if (email is null)
            {
                return WriteResult<AccountProfileDto>.ValidationFailed("Email is required.");
            }

            var user = await context.Users
                .FirstOrDefaultAsync(existing => existing.Id == callerId.Value, cancellationToken);

            if (user is null)
            {
                return WriteResult<AccountProfileDto>.NotFound(AccountNotFoundMessage);
            }

            var emailTaken = await context.Users
                .AsNoTracking()
                .AnyAsync(
                    existing => existing.Email == email && existing.Id != user.Id,
                    cancellationToken);

            if (emailTaken)
            {
                return WriteResult<AccountProfileDto>.Conflict("Email is already in use.");
            }

            if (DateOfBirthRules.IsFuture(accountRequest.DateOfBirth, DateTime.UtcNow))
            {
                return WriteResult<AccountProfileDto>.ValidationFailed(
                    DateOfBirthRules.FutureMessage,
                    FieldError("DateOfBirth", DateOfBirthRules.FutureMessage));
            }

            user.FirstName = accountRequest.FirstName;
            user.LastName = accountRequest.LastName;
            user.Email = email;
            user.PhoneNumber = accountRequest.PhoneNumber;
            user.Gender = accountRequest.Gender;
            user.DateOfBirth = accountRequest.DateOfBirth;
            user.Address = accountRequest.Address;
            user.ImageUrl = accountRequest.ImageUrl;
            user.UpdatedAt = DateTime.UtcNow;

            var saveError = await SaveChangesHandlingConflictsAsync(cancellationToken);
            if (saveError is not null)
            {
                return saveError;
            }

            var profile = await LoadProfileAsync(user.Id, cancellationToken);
            return WriteResult<AccountProfileDto>.Success(profile);
        }

        public async Task<WriteResult<AccountProfileDto>> ChangePasswordAsync(
            int? callerUserId,
            ChangePasswordRequestDto passwordRequest,
            CancellationToken cancellationToken = default)
        {
            var callerId = await CallerLookup.ResolveUserIdAsync(context, callerUserId, cancellationToken);
            if (callerId is null)
            {
                return WriteResult<AccountProfileDto>.NotFound(AccountNotFoundMessage);
            }

            if (passwordRequest.NewPassword.Length < PasswordRules.MinimumLength
                || passwordRequest.NewPassword.Length > PasswordRules.MaximumLength)
            {
                return WriteResult<AccountProfileDto>.ValidationFailed(
                    "New password must be between 8 and 100 characters.",
                    FieldError("NewPassword", "New password must be between 8 and 100 characters."));
            }

            var user = await context.Users
                .FirstOrDefaultAsync(existing => existing.Id == callerId.Value, cancellationToken);

            if (user is null)
            {
                return WriteResult<AccountProfileDto>.NotFound(AccountNotFoundMessage);
            }

            if (!PasswordMatches(user, passwordRequest.CurrentPassword))
            {
                logger.LogWarning("Denied password change for user {UserId} because the current password was incorrect.", user.Id);
                return WriteResult<AccountProfileDto>.ValidationFailed(
                    "The current password is incorrect.",
                    FieldError("CurrentPassword", "The current password is incorrect."));
            }

            if (PasswordMatches(user, passwordRequest.NewPassword))
            {
                return WriteResult<AccountProfileDto>.ValidationFailed(
                    "New password must be different from the current password.",
                    FieldError("NewPassword", "New password must be different from the current password."));
            }

            user.PasswordHash = passwordHasher.HashPassword(user, passwordRequest.NewPassword);
            user.UpdatedAt = DateTime.UtcNow;
            await context.SaveChangesAsync(cancellationToken);

            return WriteResult<AccountProfileDto>.Success();
        }

        private async Task<AccountProfileDto?> LoadProfileAsync(int userId, CancellationToken cancellationToken)
        {
            return await context.Users
                .AsNoTracking()
                .Where(user => user.Id == userId)
                .Select(ProfileProjection)
                .FirstOrDefaultAsync(cancellationToken);
        }

        private bool PasswordMatches(User user, string password)
        {
            if (string.IsNullOrWhiteSpace(user.PasswordHash) || string.IsNullOrEmpty(password))
            {
                return false;
            }

            try
            {
                var result = passwordHasher.VerifyHashedPassword(user, user.PasswordHash, password);
                return result is PasswordVerificationResult.Success or PasswordVerificationResult.SuccessRehashNeeded;
            }
            catch (Exception ex) when (ex is FormatException or ArgumentException or CryptographicException)
            {
                logger.LogWarning(ex, "Stored password hash for user {UserId} is malformed.", user.Id);
                return false;
            }
        }

        private async Task<WriteResult<AccountProfileDto>?> SaveChangesHandlingConflictsAsync(
            CancellationToken cancellationToken)
        {
            try
            {
                await context.SaveChangesAsync(cancellationToken);
                return null;
            }
            catch (DbUpdateException ex) when (MySqlErrors.IsDuplicateKey(ex))
            {
                logger.LogWarning(ex, "Unique constraint violation while saving an account profile.");
                return WriteResult<AccountProfileDto>.Conflict("Email is already in use.");
            }
        }

        private static string? NormalizeEmail(string? email)
        {
            if (string.IsNullOrWhiteSpace(email))
            {
                return null;
            }

            return email.Trim();
        }

        private static IReadOnlyDictionary<string, string[]> FieldError(string field, string message)
        {
            return new Dictionary<string, string[]>
            {
                [field] = [message]
            };
        }
    }
}
