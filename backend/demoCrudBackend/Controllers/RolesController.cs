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
    public class RolesController(IRoleService service) : ApiControllerBase
    {
        private const string ForbiddenMessage = "You are not allowed to perform this role operation.";

        [Authorize(Policy = Permissions.RoleView)]
        [HttpGet]
        public async Task<ActionResult<PagedApiResponse<IReadOnlyList<RoleResponseDto>>>> GetRoles(
            [FromQuery] int pageNumber = PageRequest.DefaultPageNumber,
            [FromQuery] int pageSize = PageRequest.DefaultPageSize,
            CancellationToken cancellationToken = default)
        {
            var page = await service.GetRolesAsync(pageNumber, pageSize, cancellationToken);
            return ApiOkPaged(page.Items, "Roles fetched successfully.", page.Pagination);
        }

        [Authorize(Policy = Permissions.RoleView)]
        [HttpGet("{id:int}")]
        public async Task<ActionResult<ApiResponse<RoleResponseDto>>> GetRoleById(
            int id,
            CancellationToken cancellationToken)
        {
            var role = await service.GetRoleByIdAsync(id, cancellationToken);
            if (role is null)
            {
                return ApiNotFound($"Role with id = {id} was not found.");
            }

            return ApiOk(role, "Role fetched successfully.");
        }

        [Authorize(Policy = Permissions.RoleCreate)]
        [HttpPost]
        public async Task<ActionResult<ApiResponse<RoleResponseDto>>> AddRole(
            RoleRequestDto roleRequest,
            CancellationToken cancellationToken)
        {
            var result = await service.AddRoleAsync(roleRequest, CallerContext.UserId(User), cancellationToken);
            if (result.Status == WriteStatus.Success && result.Data is not null)
            {
                return ApiCreated(
                    nameof(GetRoleById),
                    new { id = result.Data.Id },
                    result.Data,
                    "Role created successfully.");
            }

            return MapFailure(result, id: null);
        }

        [Authorize(Policy = Permissions.RoleEdit)]
        [HttpPut("{id:int}")]
        public async Task<ActionResult<ApiResponse<RoleResponseDto>>> UpdateRole(
            int id,
            RoleRequestDto roleRequest,
            CancellationToken cancellationToken)
        {
            var result = await service.UpdateRoleAsync(id, roleRequest, CallerContext.UserId(User), cancellationToken);
            if (result.Status == WriteStatus.Success && result.Data is not null)
            {
                return ApiOk(result.Data, "Role updated successfully.");
            }

            return MapFailure(result, id);
        }

        [Authorize(Policy = Permissions.RoleDelete)]
        [HttpDelete("{id:int}")]
        public async Task<ActionResult<ApiResponse<object?>>> DeleteRole(
            int id,
            CancellationToken cancellationToken)
        {
            var result = await service.DeleteRoleAsync(id, CallerContext.UserId(User), cancellationToken);
            if (result.Status == WriteStatus.Success)
            {
                return ApiOkMessage("Role deleted successfully.");
            }

            return MapFailure(result, id);
        }

        [Authorize(Policy = Permissions.RoleView)]
        [HttpGet("{id:int}/rights")]
        public async Task<ActionResult<ApiResponse<IReadOnlyList<RightResponseDto>>>> GetRoleRights(
            int id,
            CancellationToken cancellationToken)
        {
            var rights = await service.GetRoleRightsAsync(id, CallerContext.PermissionNames(User), cancellationToken);
            if (rights is null)
            {
                return ApiNotFound($"Role with id = {id} was not found.");
            }

            return ApiOk(rights, "Role rights fetched successfully.");
        }

        [Authorize(Policy = Permissions.RoleRightAssign)]
        [HttpPost("{id:int}/rights")]
        public async Task<ActionResult<ApiResponse<IReadOnlyList<RightResponseDto>>>> AssignRights(
            int id,
            [FromBody] RoleRightsRequestDto rightsRequest,
            CancellationToken cancellationToken)
        {
            var result = await service.AssignRightsAsync(
                id,
                rightsRequest.RightIds,
                CallerContext.PermissionNames(User),
                CallerContext.UserId(User),
                cancellationToken);

            if (result.Status == WriteStatus.Success && result.Data is not null)
            {
                return ApiOk(result.Data, "Rights assigned successfully.");
            }

            return MapFailure(result, id);
        }

        [Authorize(Policy = Permissions.RoleRightAssign)]
        [HttpDelete("{id:int}/rights")]
        public async Task<ActionResult<ApiResponse<IReadOnlyList<RightResponseDto>>>> RemoveRights(
            int id,
            [FromBody] RoleRightsRequestDto rightsRequest,
            CancellationToken cancellationToken)
        {
            var result = await service.RemoveRightsAsync(
                id,
                rightsRequest.RightIds,
                CallerContext.PermissionNames(User),
                CallerContext.UserId(User),
                cancellationToken);

            if (result.Status == WriteStatus.Success && result.Data is not null)
            {
                return ApiOk(result.Data, "Rights removed successfully.");
            }

            return MapFailure(result, id);
        }

        private ActionResult MapFailure<T>(WriteResult<T> result, int? id)
        {
            return MapWriteFailure(
                result.Status,
                result.Message,
                notFoundMessage: $"Role with id = {id} was not found.",
                validationMessage: "The role request is invalid.",
                conflictMessage: "The role request conflicts with existing data.",
                forbiddenMessage: ForbiddenMessage);
        }
    }
}
