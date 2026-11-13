using DemoCrudBackend.Authorization;
using DemoCrudBackend.Common;
using DemoCrudBackend.Dtos;
using DemoCrudBackend.Services;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace DemoCrudBackend.Controllers
{
    [Authorize]
    [Route("api/[controller]")]
    public class RightsController(IRightService service) : ApiControllerBase
    {
        [Authorize(Policy = Permissions.RightView)]
        [HttpGet]
        public async Task<ActionResult<PagedApiResponse<IReadOnlyList<RightResponseDto>>>> GetRights(
            [FromQuery] int pageNumber = PageRequest.DefaultPageNumber,
            [FromQuery] int pageSize = PageRequest.DefaultPageSize,
            CancellationToken cancellationToken = default)
        {
            var page = await service.GetRightsAsync(
                pageNumber,
                pageSize,
                CallerContext.PermissionNames(User),
                cancellationToken);

            return ApiOkPaged(page.Items, "Rights fetched successfully.", page.Pagination);
        }
    }
}
