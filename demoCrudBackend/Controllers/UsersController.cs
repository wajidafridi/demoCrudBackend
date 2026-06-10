using DemoCrudBackend.Models;
using DemoCrudBackend.Services;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Mvc;

namespace DemoCrudBackend.Controllers
{
    [Route("api/[controller]")]
    [ApiController]
    public class UsersController(IUserService service) : ControllerBase
    {
        [HttpGet]
        public async Task<ActionResult<List<User>>> GetUsers()
        {
            return Ok(await service.GetAllUsersAsync());
        }

        [HttpGet("{id}")]

        public async Task<ActionResult<User>> GetUser(int id)
        {
            var user = await service.GetUserByIdAsync(id);

            if (user is null)
            {
                return NotFound($"User with id = {id} was not found.");
            }
            return Ok(user);
        }
    }
}
