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

        [HttpPost]
        public async Task<ActionResult<User>> AddUser(User user)
        {
            var createdUser = await service.AddUserAsync(user);
            return CreatedAtAction(nameof(GetUser), new { id = createdUser.Id }, createdUser);
        }

        [HttpPut("{id}")]
        public async Task<ActionResult> UpdateUser(int id, User user)
        {
            var updated = await service.UpdateUserAsync(id, user);

            if (updated)
            {
                return NoContent();
            }

            return NotFound($"User with id = {id} was not found.");
        }

        [HttpDelete("{id}")]
        public async Task<ActionResult> DeleteUser(int id)
        {
            var deleted = await service.DeleteUserAsync(id);

            if (deleted)
            {
                return NoContent();
            }
            return NotFound($"User with id = {id} was not found.");
        }
    }
}
