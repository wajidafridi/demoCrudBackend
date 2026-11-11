using DemoCrudBackend.Dtos;
using DemoCrudBackend.Services;
using Microsoft.AspNetCore.Mvc;

namespace DemoCrudBackend.Controllers
{
    [Route("api/[controller]")]
    [ApiController]
    public class AuthController(IAuthService authService) : ControllerBase
    {
        [HttpPost("login")]
        public async Task<ActionResult<LoginResponseDto>> Login([FromBody] LoginRequestDto loginRequest)
        {
            var response = await authService.LoginAsync(loginRequest);

            if (response is null)
            {
                return Unauthorized("Invalid username or password.");
            }

            return Ok(response);
        }
    }
}
