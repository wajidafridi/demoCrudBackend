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

        Task<UserWriteResult> AddUserAsync(
            CreateUserRequestDto userRequest,
            int? callerUserId,
            CancellationToken cancellationToken = default);

        Task<UserWriteResult> UpdateUserAsync(
            int id,
            UpdateUserRequestDto userRequest,
            int? callerUserId,
            CancellationToken cancellationToken = default);

        Task<UserWriteResult> DeleteUserAsync(
            int id,
            int? callerUserId,
            CancellationToken cancellationToken = default);
    }
}
