using DemoCrudBackend.Dtos;

namespace DemoCrudBackend.Services
{
    public interface IAuthService
    {
        Task<LoginResponseDto?>LoginAsync(LoginRequestDto loginRequest);
    }
}
