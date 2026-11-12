using DemoCrudBackend.Common;
using DemoCrudBackend.Dtos;

namespace DemoCrudBackend.Services
{
    public interface IRightService
    {
        Task<PagedResult<RightResponseDto>> GetRightsAsync(
            int pageNumber,
            int pageSize,
            IReadOnlySet<string> callerPermissions,
            CancellationToken cancellationToken = default);
    }
}
