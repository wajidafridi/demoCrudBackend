using DemoCrudBackend.Dtos;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Mvc;

namespace DemoCrudBackend.Controllers
{
    [Route("api/[controller]")]
    [ApiController]
    public class AuthController : ControllerBase
    {
        [HttpPost("login")]
        public async Task<ActionResult<LoginResponseDto>> Login([FromBody] LoginRequestDto loginRequest)
        {
            // Implement your login logic here
            // For example, validate the user credentials and return a token if valid
            // Placeholder response for demonstration purposes
            if (loginRequest.Username == "admin" && loginRequest.Password == "password")
            {
                return Ok(new { Token = "your_generated_token_here" });
            }
            return Unauthorized("Invalid username or password.");
        }
    }
}
