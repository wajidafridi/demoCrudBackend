using System.Globalization;
using System.Security.Claims;
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
            [FromQuery] int pageNumber = 1,
            [FromQuery] int pageSize = 20,
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
            var result = await service.AddUserAsync(userRequest, CallerUserId(), cancellationToken);

            if (result.Status == UserWriteStatus.Success && result.User is not null)
            {
                return ApiCreated(
                    nameof(GetUserById),
                    new { id = result.User.Id },
                    result.User,
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
            var result = await service.UpdateUserAsync(id, userRequest, CallerUserId(), cancellationToken);
            return MapWriteResult(result, id, "User updated successfully.");
        }

        [Authorize(Policy = Permissions.UserDelete)]
        [HttpDelete("{id}")]
        public async Task<ActionResult<ApiResponse<object?>>> DeleteUser(
            int id,
            CancellationToken cancellationToken)
        {
            var result = await service.DeleteUserAsync(id, CallerUserId(), cancellationToken);
            return MapWriteResult(result, id, "User deleted successfully.");
        }

        private ActionResult MapWriteResult(UserWriteResult result, int id, string successMessage)
        {
            if (result.Status == UserWriteStatus.Success)
            {
                return ApiOkMessage(successMessage);
            }

            return MapWriteFailure(result, id);
        }

        private ActionResult MapWriteFailure(UserWriteResult result, int? id)
        {
            return result.Status switch
            {
                UserWriteStatus.NotFound => ApiNotFound(
                    result.Message ?? $"User with id = {id} was not found."),
                UserWriteStatus.ValidationFailed => ApiBadRequest(
                    result.Message ?? "The user request is invalid."),
                UserWriteStatus.Conflict => ApiConflict(
                    result.Message ?? "Username or email is already in use."),
                UserWriteStatus.Forbidden => ApiForbidden(
                    result.Message ?? ForbiddenWriteMessage),
                _ => ApiForbidden(ForbiddenWriteMessage)
            };
        }

        private int? CallerUserId()
        {
            var value = User.FindFirst(ClaimTypes.NameIdentifier)?.Value;
            if (!int.TryParse(value, NumberStyles.None, CultureInfo.InvariantCulture, out var userId) || userId <= 0)
            {
                return null;
            }

            return userId;
        }
    }
}
