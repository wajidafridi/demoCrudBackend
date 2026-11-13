using DemoCrudBackend.Dtos;

namespace DemoCrudBackend.Services
{
    public interface IAccountService
    {
        Task<WriteResult<AccountProfileDto>> GetProfileAsync(
            int? callerUserId,
            CancellationToken cancellationToken = default);

        Task<WriteResult<AccountProfileDto>> UpdateProfileAsync(
            int? callerUserId,
            UpdateAccountRequestDto accountRequest,
            CancellationToken cancellationToken = default);

        Task<WriteResult<AccountProfileDto>> ChangePasswordAsync(
            int? callerUserId,
            ChangePasswordRequestDto passwordRequest,
            CancellationToken cancellationToken = default);
    }
}
