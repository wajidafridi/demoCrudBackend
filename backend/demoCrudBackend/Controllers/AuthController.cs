using DemoCrudBackend.Common;
using DemoCrudBackend.Dtos;
using DemoCrudBackend.Services;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace DemoCrudBackend.Controllers
{
    [Route("api/[controller]")]
    public class AuthController(IAuthService authService) : ApiControllerBase
    {
        [AllowAnonymous]
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
    }
}
