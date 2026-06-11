using DemoCrudBackend.Dtos;
using DemoCrudBackend.Models;

namespace DemoCrudBackend.Services
{
    public interface IUserService
    {
        Task<List<UserResponseDto>> GetAllUsersAsync();
        Task<UserResponseDto?> GetUserByIdAsync(int id);
        Task<UserResponseDto> AddUserAsync(CreateUserRequestDto user);
        Task<bool> UpdateUserAsync(int id, UpdateUserRequestDto user);
        Task<bool> DeleteUserAsync(int id);

    }
}
