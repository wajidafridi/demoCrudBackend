using System.Linq.Expressions;
using DemoCrudBackend.Common;
using DemoCrudBackend.Data;
using DemoCrudBackend.Dtos;
using DemoCrudBackend.Models;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Logging;

namespace DemoCrudBackend.Services
{
    public class RoleService(ApplicationDbContext context, ILogger<RoleService> logger) : IRoleService
    {
        private const string ForbiddenMessage = "You are not allowed to perform this role operation.";
        private const string NameInUseMessage = "Role name is already in use.";
        private const int MaxRoleNameLength = 100;

        private static readonly Expression<Func<Role, RoleResponseDto>> RoleProjection = role =>
            new RoleResponseDto
            {
                Id = role.Id,
                Name = role.Name
            };

        public async Task<PagedResult<RoleResponseDto>> GetRolesAsync(
            int pageNumber,
            int pageSize,
            CancellationToken cancellationToken = default)
        {
            var (normalizedPageNumber, normalizedPageSize) = PageRequest.Normalize(pageNumber, pageSize);
            var query = context.Roles.AsNoTracking().Where(role => !role.IsSystem);
            var totalCount = await query.CountAsync(cancellationToken);

            var items = await query
                .OrderBy(role => role.Id)
                .Skip((normalizedPageNumber - 1) * normalizedPageSize)
                .Take(normalizedPageSize)
                .Select(RoleProjection)
                .ToListAsync(cancellationToken);

            return new PagedResult<RoleResponseDto>
            {
                Items = items,
                Pagination = PaginationMetadata.Create(normalizedPageNumber, normalizedPageSize, totalCount)
            };
        }

        public async Task<RoleResponseDto?> GetRoleByIdAsync(int id, CancellationToken cancellationToken = default)
        {
            return await VisibleRoles()
                .Where(role => role.Id == id)
                .Select(RoleProjection)
                .FirstOrDefaultAsync(cancellationToken);
        }

        public async Task<WriteResult<RoleResponseDto>> AddRoleAsync(
            RoleRequestDto roleRequest,
            int? callerUserId,
            CancellationToken cancellationToken = default)
        {
            if (await CallerLookup.ResolveUserIdAsync(context, callerUserId, cancellationToken) is null)
            {
                logger.LogWarning(
                    "Denied role creation because caller {CallerUserId} could not be resolved.",
                    callerUserId);
                return WriteResult<RoleResponseDto>.Forbidden(ForbiddenMessage);
            }

            var nameResult = NormalizeRoleName(roleRequest.Name);
            if (nameResult.Error is not null)
            {
                return WriteResult<RoleResponseDto>.ValidationFailed(nameResult.Error);
            }

            if (await RoleNameExistsAsync(nameResult.Name!, excludeRoleId: null, cancellationToken))
            {
                return WriteResult<RoleResponseDto>.Conflict(NameInUseMessage);
            }

            var role = new Role
            {
                Name = nameResult.Name!,
                IsSystem = false
            };

            context.Roles.Add(role);

            var saveError = await SaveAsync<RoleResponseDto>(NameInUseMessage, cancellationToken);
            if (saveError is not null)
            {
                return saveError;
            }

            return WriteResult<RoleResponseDto>.Success(ToRoleResponse(role));
        }

        public async Task<WriteResult<RoleResponseDto>> UpdateRoleAsync(
            int id,
            RoleRequestDto roleRequest,
            int? callerUserId,
            CancellationToken cancellationToken = default)
        {
            if (await CallerLookup.ResolveUserIdAsync(context, callerUserId, cancellationToken) is null)
            {
                logger.LogWarning(
                    "Denied role update because caller {CallerUserId} could not be resolved.",
                    callerUserId);
                return WriteResult<RoleResponseDto>.Forbidden(ForbiddenMessage);
            }

            var role = await context.Roles.FirstOrDefaultAsync(existing => existing.Id == id, cancellationToken);
            var access = GuardWritableRole<RoleResponseDto>(role, id, callerUserId, "update");
            if (access is not null)
            {
                return access;
            }

            var nameResult = NormalizeRoleName(roleRequest.Name);
            if (nameResult.Error is not null)
            {
                return WriteResult<RoleResponseDto>.ValidationFailed(nameResult.Error);
            }

            if (await RoleNameExistsAsync(nameResult.Name!, id, cancellationToken))
            {
                return WriteResult<RoleResponseDto>.Conflict(NameInUseMessage);
            }

            role!.Name = nameResult.Name!;

            var saveError = await SaveAsync<RoleResponseDto>(NameInUseMessage, cancellationToken);
            if (saveError is not null)
            {
                return saveError;
            }

            return WriteResult<RoleResponseDto>.Success(ToRoleResponse(role));
        }

        public async Task<WriteResult<RoleResponseDto>> DeleteRoleAsync(
            int id,
            int? callerUserId,
            CancellationToken cancellationToken = default)
        {
            if (await CallerLookup.ResolveUserIdAsync(context, callerUserId, cancellationToken) is null)
            {
                logger.LogWarning(
                    "Denied role delete because caller {CallerUserId} could not be resolved.",
                    callerUserId);
                return WriteResult<RoleResponseDto>.Forbidden(ForbiddenMessage);
            }

            var role = await context.Roles.FirstOrDefaultAsync(existing => existing.Id == id, cancellationToken);
            var access = GuardWritableRole<RoleResponseDto>(role, id, callerUserId, "delete");
            if (access is not null)
            {
                return access;
            }

            var hasUsers = await context.Users
                .AsNoTracking()
                .AnyAsync(user => user.RoleId == id, cancellationToken);

            if (hasUsers)
            {
                return WriteResult<RoleResponseDto>.Conflict(
                    "This role cannot be deleted while users are assigned to it.");
            }

            context.Roles.Remove(role!);
            try
            {
                await context.SaveChangesAsync(cancellationToken);
            }
            catch (DbUpdateException ex) when (MySqlErrors.IsDeleteRestricted(ex))
            {
                logger.LogWarning(ex, "Rejected delete of role {RoleId} because users are still assigned.", id);
                return WriteResult<RoleResponseDto>.Conflict(
                    "This role cannot be deleted while users are assigned to it.");
            }

            return WriteResult<RoleResponseDto>.Success();
        }

        public async Task<IReadOnlyList<RightResponseDto>?> GetRoleRightsAsync(
            int roleId,
            IReadOnlySet<string> callerPermissions,
            CancellationToken cancellationToken = default)
        {
            var visible = await VisibleRoles().AnyAsync(role => role.Id == roleId, cancellationToken);
            if (!visible)
            {
                return null;
            }

            return await LoadVisibleRightsAsync(roleId, callerPermissions, cancellationToken);
        }

        public Task<WriteResult<IReadOnlyList<RightResponseDto>>> AssignRightsAsync(
            int roleId,
            IReadOnlyCollection<int> rightIds,
            IReadOnlySet<string> callerPermissions,
            int? callerUserId,
            CancellationToken cancellationToken = default)
        {
            return ChangeRightsAsync(
                roleId,
                rightIds,
                callerPermissions,
                callerUserId,
                assign: true,
                cancellationToken);
        }

        public Task<WriteResult<IReadOnlyList<RightResponseDto>>> RemoveRightsAsync(
            int roleId,
            IReadOnlyCollection<int> rightIds,
            IReadOnlySet<string> callerPermissions,
            int? callerUserId,
            CancellationToken cancellationToken = default)
        {
            return ChangeRightsAsync(
                roleId,
                rightIds,
                callerPermissions,
                callerUserId,
                assign: false,
                cancellationToken);
        }

        private async Task<WriteResult<IReadOnlyList<RightResponseDto>>> ChangeRightsAsync(
            int roleId,
            IReadOnlyCollection<int> rightIds,
            IReadOnlySet<string> callerPermissions,
            int? callerUserId,
            bool assign,
            CancellationToken cancellationToken)
        {
            if (await CallerLookup.ResolveUserIdAsync(context, callerUserId, cancellationToken) is null)
            {
                logger.LogWarning(
                    "Denied role-right change because caller {CallerUserId} could not be resolved.",
                    callerUserId);
                return WriteResult<IReadOnlyList<RightResponseDto>>.Forbidden(ForbiddenMessage);
            }

            var role = await context.Roles
                .Include(existing => existing.RoleRight)
                .FirstOrDefaultAsync(existing => existing.Id == roleId, cancellationToken);

            var access = GuardWritableRole<IReadOnlyList<RightResponseDto>>(role, roleId, callerUserId, "change rights of");
            if (access is not null)
            {
                return access;
            }

            var idError = ValidateRightIds(rightIds);
            if (idError is not null)
            {
                return idError;
            }

            var distinctIds = rightIds.Distinct().ToArray();
            var rights = await context.Rights
                .AsNoTracking()
                .Where(right => distinctIds.Contains(right.Id))
                .ToListAsync(cancellationToken);

            if (rights.Count != distinctIds.Length)
            {
                return WriteResult<IReadOnlyList<RightResponseDto>>.ValidationFailed(
                    "One or more rights do not exist.");
            }

            if (rights.Any(right => !callerPermissions.Contains(right.Name)))
            {
                logger.LogWarning(
                    "Denied role-right change on role {RoleId} by caller {CallerUserId} because a right is outside the caller permissions.",
                    roleId,
                    callerUserId);
                return WriteResult<IReadOnlyList<RightResponseDto>>.Forbidden(
                    "You can only change rights that are assigned to you.");
            }

            var assignedIds = role!.RoleRight.Select(roleRight => roleRight.RightId).ToHashSet();
            if (assign)
            {
                if (distinctIds.Any(assignedIds.Contains))
                {
                    return WriteResult<IReadOnlyList<RightResponseDto>>.Conflict(
                        "One or more rights are already assigned to this role.");
                }

                foreach (var rightId in distinctIds)
                {
                    role.RoleRight.Add(new RoleRight
                    {
                        RoleId = role.Id,
                        RightId = rightId
                    });
                }
            }
            else
            {
                if (distinctIds.Any(rightId => !assignedIds.Contains(rightId)))
                {
                    return WriteResult<IReadOnlyList<RightResponseDto>>.Conflict(
                        "One or more rights are not assigned to this role.");
                }

                var toRemove = role.RoleRight.Where(roleRight => distinctIds.Contains(roleRight.RightId)).ToList();
                context.RoleRights.RemoveRange(toRemove);
            }

            var conflictMessage = assign
                ? "One or more rights are already assigned to this role."
                : "One or more rights are not assigned to this role.";

            var saveError = await SaveAsync<IReadOnlyList<RightResponseDto>>(conflictMessage, cancellationToken);
            if (saveError is not null)
            {
                return saveError;
            }

            var visibleRights = await LoadVisibleRightsAsync(role.Id, callerPermissions, cancellationToken);
            return WriteResult<IReadOnlyList<RightResponseDto>>.Success(visibleRights);
        }

        private IQueryable<Role> VisibleRoles()
        {
            return context.Roles.AsNoTracking().Where(role => !role.IsSystem);
        }

        private WriteResult<T>? GuardWritableRole<T>(Role? role, int roleId, int? callerUserId, string action)
        {
            if (role is null)
            {
                return WriteResult<T>.NotFound($"Role with id = {roleId} was not found.");
            }

            if (role.IsSystem)
            {
                logger.LogWarning(
                    "Denied {Action} system role {RoleId} by caller {CallerUserId}.",
                    action,
                    roleId,
                    callerUserId);
                return WriteResult<T>.Forbidden("The system role cannot be changed.");
            }

            return null;
        }

        private async Task<IReadOnlyList<RightResponseDto>> LoadVisibleRightsAsync(
            int roleId,
            IReadOnlySet<string> callerPermissions,
            CancellationToken cancellationToken)
        {
            var permissionNames = callerPermissions.ToArray();
            if (permissionNames.Length == 0)
            {
                return [];
            }

            return await context.RoleRights
                .AsNoTracking()
                .Where(roleRight => roleRight.RoleId == roleId && permissionNames.Contains(roleRight.Right.Name))
                .OrderBy(roleRight => roleRight.RightId)
                .Select(roleRight => new RightResponseDto
                {
                    Id = roleRight.RightId,
                    Name = roleRight.Right.Name
                })
                .ToListAsync(cancellationToken);
        }

        private static WriteResult<IReadOnlyList<RightResponseDto>>? ValidateRightIds(IReadOnlyCollection<int> rightIds)
        {
            if (rightIds.Count == 0)
            {
                return WriteResult<IReadOnlyList<RightResponseDto>>.ValidationFailed(
                    "At least one right id is required.");
            }

            if (rightIds.Any(rightId => rightId <= 0))
            {
                return WriteResult<IReadOnlyList<RightResponseDto>>.ValidationFailed(
                    "Right ids must be greater than zero.");
            }

            if (rightIds.Distinct().Count() != rightIds.Count)
            {
                return WriteResult<IReadOnlyList<RightResponseDto>>.ValidationFailed(
                    "Right ids must be unique.");
            }

            return null;
        }

        private async Task<bool> RoleNameExistsAsync(
            string roleName,
            int? excludeRoleId,
            CancellationToken cancellationToken)
        {
            var comparableName = roleName.ToLowerInvariant();
            return await context.Roles
                .AsNoTracking()
                .AnyAsync(
                    role => role.Name.ToLower() == comparableName
                        && (excludeRoleId == null || role.Id != excludeRoleId.Value),
                    cancellationToken);
        }

        private static (string? Name, string? Error) NormalizeRoleName(string? name)
        {
            if (string.IsNullOrWhiteSpace(name))
            {
                return (null, "Role name is required.");
            }

            var trimmed = name.Trim();
            if (trimmed.Length > MaxRoleNameLength)
            {
                return (null, "Role name must be 100 characters or fewer.");
            }

            return (trimmed, null);
        }

        private async Task<WriteResult<T>?> SaveAsync<T>(string conflictMessage, CancellationToken cancellationToken)
        {
            try
            {
                await context.SaveChangesAsync(cancellationToken);
                return null;
            }
            catch (DbUpdateException ex) when (MySqlErrors.IsDuplicateKey(ex))
            {
                logger.LogWarning(ex, "Unique constraint violation while saving role data.");
                return WriteResult<T>.Conflict(conflictMessage);
            }
        }

        private static RoleResponseDto ToRoleResponse(Role role)
        {
            return new RoleResponseDto
            {
                Id = role.Id,
                Name = role.Name
            };
        }
    }
}
