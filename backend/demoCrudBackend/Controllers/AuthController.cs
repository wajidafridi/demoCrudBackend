using DemoCrudBackend.Authorization;
using DemoCrudBackend.Common;
using DemoCrudBackend.Dtos;
using DemoCrudBackend.Services;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.RateLimiting;

namespace DemoCrudBackend.Controllers
{
    [Route("api/[controller]")]
    public class AuthController(IAuthService authService) : ApiControllerBase
    {
        [AllowAnonymous]
        [EnableRateLimiting(RateLimitPolicies.Login)]
        [HttpPost("login")]
        public async Task<ActionResult<ApiResponse<LoginResponseDto>>> Login(
            [FromBody] LoginRequestDto loginRequest,
            CancellationToken cancellationToken)
        {
            var response = await authService.LoginAsync(loginRequest, cancellationToken);

            if (response is null)
            {
                return ApiUnauthorized("Invalid username or password.");
            }

            return ApiOk(response, "Login successful.");
        }

        /// <summary>
        /// Current role and rights of the signed-in user, read from the database on this request.
        /// Needs a valid token but no specific right. Returns 401 when the account no longer exists.
        /// </summary>
        [Authorize]
        [HttpGet("me")]
        public ActionResult<ApiResponse<CurrentAccessDto>> GetCurrentAccess()
        {
            var snapshot = AccessRefresh.Current(HttpContext);
            if (snapshot is null)
            {
                return ApiUnauthorized("Authentication is required.");
            }

            return ApiOk(
                new CurrentAccessDto
                {
                    Id = snapshot.UserId,
                    UserName = snapshot.UserName,
                    RoleId = snapshot.RoleId,
                    RoleName = snapshot.RoleName,
                    Permissions = snapshot.Permissions,
                    AccessVersion = snapshot.Version
                },
                "Current access fetched successfully.");
        }
    }
}
