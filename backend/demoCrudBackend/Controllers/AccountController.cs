using DemoCrudBackend.Authorization;
using DemoCrudBackend.Common;
using DemoCrudBackend.Dtos;
using DemoCrudBackend.Services;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace DemoCrudBackend.Controllers
{
    [Authorize]
    [Route("api/account")]
    public class AccountController(IAccountService service) : ApiControllerBase
    {
        [HttpGet]
        public async Task<ActionResult<ApiResponse<AccountProfileDto>>> GetAccount(
            CancellationToken cancellationToken)
        {
            var result = await service.GetProfileAsync(CallerContext.UserId(User), cancellationToken);
            if (result.Status == WriteStatus.Success && result.Data is not null)
            {
                return ApiOk(result.Data, "Account fetched successfully.");
            }

            return MapAccountFailure(result);
        }

        [HttpPut]
        public async Task<ActionResult<ApiResponse<AccountProfileDto>>> UpdateAccount(
            UpdateAccountRequestDto accountRequest,
            CancellationToken cancellationToken)
        {
            var result = await service.UpdateProfileAsync(
                CallerContext.UserId(User),
                accountRequest,
                cancellationToken);

            if (result.Status == WriteStatus.Success && result.Data is not null)
            {
                return ApiOk(result.Data, "Account updated successfully.");
            }

            return MapAccountFailure(result);
        }

        /// <summary>
        /// Changes the signed-in user's password.
        /// Existing access tokens stay valid until they expire. This action does not revoke them.
        /// </summary>
        [HttpPost("change-password")]
        public async Task<ActionResult<ApiResponse<object?>>> ChangePassword(
            ChangePasswordRequestDto passwordRequest,
            CancellationToken cancellationToken)
        {
            var result = await service.ChangePasswordAsync(
                CallerContext.UserId(User),
                passwordRequest,
                cancellationToken);

            if (result.Status == WriteStatus.Success)
            {
                return ApiOkMessage(
                    "Password changed successfully. Existing access tokens remain valid until they expire.");
            }

            return MapAccountFailure(result);
        }

        private ActionResult MapAccountFailure(WriteResult<AccountProfileDto> result)
        {
            return MapWriteFailure(
                result.Status,
                result.Message,
                notFoundMessage: "Your account was not found.",
                validationMessage: "The account request is invalid.",
                conflictMessage: "Email is already in use.",
                forbiddenMessage: "You are not allowed to perform this account operation.",
                errors: result.Errors);
        }
    }
}
