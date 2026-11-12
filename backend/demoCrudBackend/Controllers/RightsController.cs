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
            [FromQuery] int pageNumber = 1,
            [FromQuery] int pageSize = 20,
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
