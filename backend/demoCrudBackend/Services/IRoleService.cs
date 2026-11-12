using DemoCrudBackend.Common;
using DemoCrudBackend.Dtos;

namespace DemoCrudBackend.Services
{
    public interface IRoleService
    {
        Task<PagedResult<RoleResponseDto>> GetRolesAsync(
            int pageNumber,
            int pageSize,
            CancellationToken cancellationToken = default);

        Task<RoleResponseDto?> GetRoleByIdAsync(int id, CancellationToken cancellationToken = default);

        Task<WriteResult<RoleResponseDto>> AddRoleAsync(
            RoleRequestDto roleRequest,
            int? callerUserId,
            CancellationToken cancellationToken = default);

        Task<WriteResult<RoleResponseDto>> UpdateRoleAsync(
            int id,
            RoleRequestDto roleRequest,
            int? callerUserId,
            CancellationToken cancellationToken = default);

        Task<WriteResult<RoleResponseDto>> DeleteRoleAsync(
            int id,
            int? callerUserId,
            CancellationToken cancellationToken = default);

        Task<IReadOnlyList<RightResponseDto>?> GetRoleRightsAsync(
            int roleId,
            IReadOnlySet<string> callerPermissions,
            CancellationToken cancellationToken = default);

        Task<WriteResult<IReadOnlyList<RightResponseDto>>> AssignRightsAsync(
            int roleId,
            IReadOnlyCollection<int> rightIds,
            IReadOnlySet<string> callerPermissions,
            int? callerUserId,
            CancellationToken cancellationToken = default);

        Task<WriteResult<IReadOnlyList<RightResponseDto>>> RemoveRightsAsync(
            int roleId,
            IReadOnlyCollection<int> rightIds,
            IReadOnlySet<string> callerPermissions,
            int? callerUserId,
            CancellationToken cancellationToken = default);
    }
}
