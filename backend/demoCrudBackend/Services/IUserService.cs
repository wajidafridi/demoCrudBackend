using DemoCrudBackend.Common;
using DemoCrudBackend.Dtos;

namespace DemoCrudBackend.Services
{
    public interface IUserService
    {
        Task<PagedResult<UserResponseDto>> GetUsersAsync(
            int pageNumber,
            int pageSize,
            CancellationToken cancellationToken = default);

        Task<UserResponseDto?> GetUserByIdAsync(int id, CancellationToken cancellationToken = default);

        Task<WriteResult<UserResponseDto>> AddUserAsync(
            CreateUserRequestDto userRequest,
            int? callerUserId,
            IReadOnlySet<string> callerPermissions,
            CancellationToken cancellationToken = default);

        Task<WriteResult<UserResponseDto>> UpdateUserAsync(
            int id,
            UpdateUserRequestDto userRequest,
            int? callerUserId,
            IReadOnlySet<string> callerPermissions,
            CancellationToken cancellationToken = default);

        Task<WriteResult<UserResponseDto>> DeleteUserAsync(
            int id,
            int? callerUserId,
            CancellationToken cancellationToken = default);
    }
}
