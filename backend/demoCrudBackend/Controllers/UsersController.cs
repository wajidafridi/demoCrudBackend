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
    public class UsersController(IUserService service) : ApiControllerBase
    {
        private const string ForbiddenWriteMessage = "You are not allowed to perform this user operation.";

        [Authorize(Policy = Permissions.UserView)]
        [HttpGet]
        public async Task<ActionResult<PagedApiResponse<IReadOnlyList<UserResponseDto>>>> GetUsers(
            [FromQuery] int pageNumber = PageRequest.DefaultPageNumber,
            [FromQuery] int pageSize = PageRequest.DefaultPageSize,
            CancellationToken cancellationToken = default)
        {
            var page = await service.GetUsersAsync(pageNumber, pageSize, cancellationToken);
            return ApiOkPaged(page.Items, "Users fetched successfully.", page.Pagination);
        }

        [Authorize(Policy = Permissions.UserView)]
        [HttpGet("{id}")]
        public async Task<ActionResult<ApiResponse<UserResponseDto>>> GetUserById(
            int id,
            CancellationToken cancellationToken)
        {
            var user = await service.GetUserByIdAsync(id, cancellationToken);

            if (user is null)
            {
                return ApiNotFound($"User with id = {id} was not found.");
            }

            return ApiOk(user, "User fetched successfully.");
        }

        [Authorize(Policy = Permissions.UserCreate)]
        [HttpPost]
        public async Task<ActionResult<ApiResponse<UserResponseDto>>> AddUser(
            CreateUserRequestDto userRequest,
            CancellationToken cancellationToken)
        {
            var result = await service.AddUserAsync(
                userRequest,
                CallerContext.UserId(User),
                CallerContext.PermissionNames(User),
                cancellationToken);

            if (result.Status == WriteStatus.Success && result.Data is not null)
            {
                return ApiCreated(
                    nameof(GetUserById),
                    new { id = result.Data.Id },
                    result.Data,
                    "User created successfully.");
            }

            return MapWriteFailure(result, id: null);
        }

        [Authorize(Policy = Permissions.UserEdit)]
        [HttpPut("{id}")]
        public async Task<ActionResult<ApiResponse<object?>>> UpdateUser(
            int id,
            UpdateUserRequestDto userRequest,
            CancellationToken cancellationToken)
        {
            var result = await service.UpdateUserAsync(
                id,
                userRequest,
                CallerContext.UserId(User),
                CallerContext.PermissionNames(User),
                cancellationToken);
            return MapWriteResult(result, id, "User updated successfully.");
        }

        [Authorize(Policy = Permissions.UserDelete)]
        [HttpDelete("{id}")]
        public async Task<ActionResult<ApiResponse<object?>>> DeleteUser(
            int id,
            CancellationToken cancellationToken)
        {
            var result = await service.DeleteUserAsync(
                id,
                CallerContext.UserId(User),
                CallerContext.PermissionNames(User),
                cancellationToken);
            return MapWriteResult(result, id, "User deleted successfully.");
        }

        private ActionResult MapWriteResult(WriteResult<UserResponseDto> result, int id, string successMessage)
        {
            if (result.Status == WriteStatus.Success)
            {
                return ApiOkMessage(successMessage);
            }

            return MapWriteFailure(result, id);
        }

        private ActionResult MapWriteFailure(WriteResult<UserResponseDto> result, int? id)
        {
            return base.MapWriteFailure(
                result.Status,
                result.Message,
                notFoundMessage: $"User with id = {id} was not found.",
                validationMessage: "The user request is invalid.",
                conflictMessage: "Username or email is already in use.",
                forbiddenMessage: ForbiddenWriteMessage,
                errors: result.Errors);
        }
    }
}
