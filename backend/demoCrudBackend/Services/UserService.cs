using System.Linq.Expressions;
using DemoCrudBackend.Authorization;
using DemoCrudBackend.Common;
using DemoCrudBackend.Data;
using DemoCrudBackend.Dtos;
using DemoCrudBackend.Models;
using Microsoft.AspNetCore.Identity;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Logging;

namespace DemoCrudBackend.Services
{
    public class UserService(
        ApplicationDbContext context,
        IPasswordHasher<User> passwordHasher,
        ILogger<UserService> logger) : IUserService
    {
        private static readonly Expression<Func<User, UserResponseDto>> UserResponseProjection = user =>
            new UserResponseDto
            {
                Id = user.Id,
                IsSystem = user.IsSystem,
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

        public async Task<PagedResult<UserResponseDto>> GetUsersAsync(
            int pageNumber,
            int pageSize,
            CancellationToken cancellationToken = default)
        {
            var (normalizedPageNumber, normalizedPageSize) = PageRequest.Normalize(pageNumber, pageSize);

            var query = context.Users.AsNoTracking();
            var totalCount = await query.CountAsync(cancellationToken);

            var items = await query
                .OrderBy(user => user.Id)
                .Skip((normalizedPageNumber - 1) * normalizedPageSize)
                .Take(normalizedPageSize)
                .Select(UserResponseProjection)
                .ToListAsync(cancellationToken);

            return new PagedResult<UserResponseDto>
            {
                Items = items,
                Pagination = PaginationMetadata.Create(normalizedPageNumber, normalizedPageSize, totalCount)
            };
        }

        public async Task<UserResponseDto?> GetUserByIdAsync(int id, CancellationToken cancellationToken = default)
        {
            return await context.Users
                .AsNoTracking()
                .Where(user => user.Id == id)
                .Select(UserResponseProjection)
                .FirstOrDefaultAsync(cancellationToken);
        }

        public async Task<WriteResult<UserResponseDto>> AddUserAsync(
            CreateUserRequestDto userRequest,
            int? callerUserId,
            IReadOnlySet<string> callerPermissions,
            CancellationToken cancellationToken = default)
        {
            callerPermissions ??= new HashSet<string>(StringComparer.Ordinal);
            if (await CallerLookup.ResolveUserIdAsync(context, callerUserId, cancellationToken) is null)
            {
                logger.LogWarning(
                    "Denied user creation because caller {CallerUserId} could not be resolved.",
                    callerUserId);
                return WriteResult<UserResponseDto>.Forbidden("You are not allowed to perform this user operation.");
            }

            var userName = NormalizeUserName(userRequest.UserName);
            if (userName is null)
            {
                return WriteResult<UserResponseDto>.ValidationFailed("Username is required.");
            }

            var email = NormalizeEmail(userRequest.Email);
            if (email is null)
            {
                return WriteResult<UserResponseDto>.ValidationFailed("Email is required.");
            }

            var requestedRole = await GetRoleAsync(userRequest.RoleId, cancellationToken);
            if (requestedRole is null)
            {
                return WriteResult<UserResponseDto>.ValidationFailed("The requested role does not exist.");
            }

            if (requestedRole.IsSystem)
            {
                logger.LogWarning(
                    "Denied user creation. Caller {CallerUserId} cannot assign the system role {RequestedRoleId}.",
                    callerUserId,
                    userRequest.RoleId);
                return WriteResult<UserResponseDto>.Forbidden("You are not allowed to assign the system role.");
            }

            if (await RoleExceedsCallerPermissionsAsync(requestedRole.Id, callerPermissions, cancellationToken))
            {
                logger.LogWarning(
                    "Denied user creation. Caller {CallerUserId} cannot assign role {RequestedRoleId} because it exceeds their permissions.",
                    callerUserId,
                    requestedRole.Id);
                return WriteResult<UserResponseDto>.Forbidden(
                    "You cannot assign a role that includes permissions you do not have.");
            }

            if (DateOfBirthRules.IsFuture(userRequest.DateOfBirth, DateTime.UtcNow))
            {
                return WriteResult<UserResponseDto>.ValidationFailed(
                    DateOfBirthRules.FutureMessage,
                    FieldError("DateOfBirth", DateOfBirthRules.FutureMessage));
            }

            var uniqueness = await CheckUniquenessAsync(userName, email, excludeUserId: null, cancellationToken);
            if (uniqueness is not null)
            {
                return uniqueness;
            }

            var newUser = new User
            {
                IsSystem = false,
                UserName = userName,
                Email = email,
                RoleId = userRequest.RoleId,
                Gender = userRequest.Gender,
                Address = userRequest.Address,
                LastName = userRequest.LastName,
                ImageUrl = userRequest.ImageUrl,
                FirstName = userRequest.FirstName,
                DateOfBirth = userRequest.DateOfBirth,
                PhoneNumber = userRequest.PhoneNumber,
                CreatedAt = DateTime.UtcNow,
            };

            newUser.PasswordHash = passwordHasher.HashPassword(newUser, userRequest.Password);

            context.Users.Add(newUser);

            var saveResult = await SaveChangesHandlingConflictsAsync(cancellationToken);
            if (saveResult is not null)
            {
                return saveResult;
            }

            return WriteResult<UserResponseDto>.Success(ToUserResponseDto(newUser, requestedRole.Name));
        }

        public async Task<WriteResult<UserResponseDto>> UpdateUserAsync(
            int id,
            UpdateUserRequestDto userRequest,
            int? callerUserId,
            IReadOnlySet<string> callerPermissions,
            CancellationToken cancellationToken = default)
        {
            callerPermissions ??= new HashSet<string>(StringComparer.Ordinal);

            var callerId = await CallerLookup.ResolveUserIdAsync(context, callerUserId, cancellationToken);
            if (callerId is null)
            {
                logger.LogWarning(
                    "Denied user update because caller {CallerUserId} could not be resolved.",
                    callerUserId);
                return WriteResult<UserResponseDto>.Forbidden("You are not allowed to perform this user operation.");
            }

            if (RoleAssignment.IsSelfUpdate(callerId.Value, id))
            {
                logger.LogWarning("Denied self-update of user {UserId}.", id);
                return WriteResult<UserResponseDto>.Forbidden("You cannot update your own account.");
            }

            var userName = NormalizeUserName(userRequest.UserName);
            if (userName is null)
            {
                return WriteResult<UserResponseDto>.ValidationFailed("Username is required.");
            }

            var email = NormalizeEmail(userRequest.Email);
            if (email is null)
            {
                return WriteResult<UserResponseDto>.ValidationFailed("Email is required.");
            }

            var existingUser = await context.Users
                .FirstOrDefaultAsync(existing => existing.Id == id, cancellationToken);

            if (existingUser is null)
            {
                return WriteResult<UserResponseDto>.NotFound($"User with id = {id} was not found.");
            }

            var requestedRole = await GetRoleAsync(userRequest.RoleId, cancellationToken);
            if (requestedRole is null)
            {
                return WriteResult<UserResponseDto>.ValidationFailed("The requested role does not exist.");
            }

            if (existingUser.IsSystem)
            {
                logger.LogWarning(
                    "Denied update of system user {UserId} by caller {CallerUserId}.",
                    id,
                    callerId);
                return WriteResult<UserResponseDto>.Forbidden("You are not allowed to modify the system user.");
            }

            if (requestedRole.IsSystem)
            {
                logger.LogWarning(
                    "Denied assignment of system role {RequestedRoleId} to user {UserId} by caller {CallerUserId}.",
                    userRequest.RoleId,
                    id,
                    callerId);
                return WriteResult<UserResponseDto>.Forbidden("You are not allowed to assign the system role.");
            }

            if (await RoleExceedsCallerPermissionsAsync(existingUser.RoleId, callerPermissions, cancellationToken))
            {
                logger.LogWarning(
                    "Denied update of user {UserId} by caller {CallerUserId} because current role {RoleId} exceeds their permissions.",
                    id,
                    callerId,
                    existingUser.RoleId);
                return WriteResult<UserResponseDto>.Forbidden(
                    "You cannot edit a user whose role includes permissions you do not have.");
            }

            if (await RoleExceedsCallerPermissionsAsync(requestedRole.Id, callerPermissions, cancellationToken))
            {
                logger.LogWarning(
                    "Denied update of user {UserId} by caller {CallerUserId} because requested role {RoleId} exceeds their permissions.",
                    id,
                    callerId,
                    requestedRole.Id);
                return WriteResult<UserResponseDto>.Forbidden(
                    "You cannot assign a role that includes permissions you do not have.");
            }

            if (DateOfBirthRules.IsFuture(userRequest.DateOfBirth, DateTime.UtcNow))
            {
                return WriteResult<UserResponseDto>.ValidationFailed(
                    DateOfBirthRules.FutureMessage,
                    FieldError("DateOfBirth", DateOfBirthRules.FutureMessage));
            }

            var uniqueness = await CheckUniquenessAsync(userName, email, excludeUserId: id, cancellationToken);
            if (uniqueness is not null)
            {
                return uniqueness;
            }

            ApplyUpdate(existingUser, userRequest, userName, email);

            var saveResult = await SaveChangesHandlingConflictsAsync(cancellationToken);
            if (saveResult is not null)
            {
                return saveResult;
            }

            return WriteResult<UserResponseDto>.Success();
        }

        public async Task<WriteResult<UserResponseDto>> DeleteUserAsync(
            int id,
            int? callerUserId,
            IReadOnlySet<string> callerPermissions,
            CancellationToken cancellationToken = default)
        {
            callerPermissions ??= new HashSet<string>(StringComparer.Ordinal);

            var callerId = await CallerLookup.ResolveUserIdAsync(context, callerUserId, cancellationToken);
            if (callerId is null)
            {
                logger.LogWarning(
                    "Denied user delete because caller {CallerUserId} could not be resolved.",
                    callerUserId);
                return WriteResult<UserResponseDto>.Forbidden("You are not allowed to perform this user operation.");
            }

            var userToDelete = await context.Users
                .FirstOrDefaultAsync(user => user.Id == id, cancellationToken);

            if (userToDelete is null)
            {
                return WriteResult<UserResponseDto>.NotFound($"User with id = {id} was not found.");
            }

            if (userToDelete.IsSystem)
            {
                logger.LogWarning(
                    "Denied delete of system user {UserId} by caller {CallerUserId}.",
                    id,
                    callerId);
                return WriteResult<UserResponseDto>.Forbidden("The system user cannot be deleted.");
            }

            if (RoleAssignment.IsSelfDeletion(callerId.Value, id))
            {
                logger.LogWarning("Denied self-delete of user {UserId}.", id);
                return WriteResult<UserResponseDto>.Forbidden("You cannot delete your own account.");
            }

            if (await RoleExceedsCallerPermissionsAsync(userToDelete.RoleId, callerPermissions, cancellationToken))
            {
                logger.LogWarning(
                    "Denied delete of user {UserId} by caller {CallerUserId} because role {RoleId} exceeds their permissions.",
                    id,
                    callerId,
                    userToDelete.RoleId);
                return WriteResult<UserResponseDto>.Forbidden(
                    "You cannot delete a user whose role includes permissions you do not have.");
            }

            context.Users.Remove(userToDelete);
            await context.SaveChangesAsync(cancellationToken);
            return WriteResult<UserResponseDto>.Success();
        }

        private async Task<bool> RoleExceedsCallerPermissionsAsync(
            int roleId,
            IReadOnlySet<string> callerPermissions,
            CancellationToken cancellationToken)
        {
            var rightNames = await context.RoleRights
                .AsNoTracking()
                .Where(roleRight => roleRight.RoleId == roleId)
                .Select(roleRight => roleRight.Right.Name)
                .ToListAsync(cancellationToken);

            return RoleAssignment.ExceedsCallerPermissions(rightNames, callerPermissions);
        }

        private async Task<Role?> GetRoleAsync(int roleId, CancellationToken cancellationToken)
        {
            return await context.Roles
                .AsNoTracking()
                .FirstOrDefaultAsync(role => role.Id == roleId, cancellationToken);
        }

        private async Task<WriteResult<UserResponseDto>?> CheckUniquenessAsync(
            string userName,
            string email,
            int? excludeUserId,
            CancellationToken cancellationToken)
        {
            var userNameTaken = await context.Users
                .AsNoTracking()
                .AnyAsync(
                    user => user.UserName == userName
                        && (excludeUserId == null || user.Id != excludeUserId.Value),
                    cancellationToken);

            if (userNameTaken)
            {
                return WriteResult<UserResponseDto>.Conflict("Username is already taken.");
            }

            var emailTaken = await context.Users
                .AsNoTracking()
                .AnyAsync(
                    user => user.Email == email
                        && (excludeUserId == null || user.Id != excludeUserId.Value),
                    cancellationToken);

            if (emailTaken)
            {
                return WriteResult<UserResponseDto>.Conflict("Email is already in use.");
            }

            return null;
        }

        private async Task<WriteResult<UserResponseDto>?> SaveChangesHandlingConflictsAsync(CancellationToken cancellationToken)
        {
            try
            {
                await context.SaveChangesAsync(cancellationToken);
                return null;
            }
            catch (DbUpdateException ex) when (MySqlErrors.IsDuplicateKey(ex))
            {
                logger.LogWarning(ex, "Unique constraint violation while saving a user.");
                return WriteResult<UserResponseDto>.Conflict("Username or email is already in use.");
            }
        }

        private static IReadOnlyDictionary<string, string[]> FieldError(string field, string message)
        {
            return new Dictionary<string, string[]>
            {
                [field] = [message]
            };
        }

        private static string? NormalizeUserName(string? userName)
        {
            if (string.IsNullOrWhiteSpace(userName))
            {
                return null;
            }

            return userName.Trim();
        }

        private static string? NormalizeEmail(string? email)
        {
            if (string.IsNullOrWhiteSpace(email))
            {
                return null;
            }

            return email.Trim();
        }

        private static void ApplyUpdate(
            User existingUser,
            UpdateUserRequestDto userRequest,
            string userName,
            string email)
        {
            existingUser.Email = email;
            existingUser.RoleId = userRequest.RoleId;
            existingUser.Gender = userRequest.Gender;
            existingUser.Address = userRequest.Address;
            existingUser.LastName = userRequest.LastName;
            existingUser.UserName = userName;
            existingUser.ImageUrl = userRequest.ImageUrl;
            existingUser.FirstName = userRequest.FirstName;
            existingUser.UpdatedAt = DateTime.UtcNow;
            existingUser.DateOfBirth = userRequest.DateOfBirth;
            existingUser.PhoneNumber = userRequest.PhoneNumber;
            // IsSystem is never copied from the request DTO.
        }

        private static UserResponseDto ToUserResponseDto(User user, string roleName)
        {
            return new UserResponseDto
            {
                Id = user.Id,
                IsSystem = user.IsSystem,
                Email = user.Email,
                RoleName = roleName,
                RoleId = user.RoleId,
                Gender = user.Gender,
                Address = user.Address,
                LastName = user.LastName,
                ImageUrl = user.ImageUrl,
                UserName = user.UserName,
                FirstName = user.FirstName,
                PhoneNumber = user.PhoneNumber,
                DateOfBirth = user.DateOfBirth,
                CreatedAt = user.CreatedAt,
                UpdatedAt = user.UpdatedAt
            };
        }
    }
}
