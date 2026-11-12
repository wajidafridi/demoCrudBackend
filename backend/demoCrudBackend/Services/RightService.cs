using DemoCrudBackend.Common;
using DemoCrudBackend.Data;
using DemoCrudBackend.Dtos;
using Microsoft.EntityFrameworkCore;

namespace DemoCrudBackend.Services
{
    public class RightService(ApplicationDbContext context) : IRightService
    {
        public async Task<PagedResult<RightResponseDto>> GetRightsAsync(
            int pageNumber,
            int pageSize,
            IReadOnlySet<string> callerPermissions,
            CancellationToken cancellationToken = default)
        {
            var (normalizedPageNumber, normalizedPageSize) = PageRequest.Normalize(pageNumber, pageSize);
            var permissionNames = callerPermissions.ToArray();

            if (permissionNames.Length == 0)
            {
                return EmptyPage(normalizedPageNumber, normalizedPageSize);
            }

            var query = context.Rights
                .AsNoTracking()
                .Where(right => permissionNames.Contains(right.Name));

            var totalCount = await query.CountAsync(cancellationToken);
            var items = await query
                .OrderBy(right => right.Id)
                .Skip((normalizedPageNumber - 1) * normalizedPageSize)
                .Take(normalizedPageSize)
                .Select(right => new RightResponseDto
                {
                    Id = right.Id,
                    Name = right.Name
                })
                .ToListAsync(cancellationToken);

            return new PagedResult<RightResponseDto>
            {
                Items = items,
                Pagination = PaginationMetadata.Create(normalizedPageNumber, normalizedPageSize, totalCount)
            };
        }

        private static PagedResult<RightResponseDto> EmptyPage(int pageNumber, int pageSize)
        {
            return new PagedResult<RightResponseDto>
            {
                Items = [],
                Pagination = PaginationMetadata.Create(pageNumber, pageSize, 0)
            };
        }
    }
}
