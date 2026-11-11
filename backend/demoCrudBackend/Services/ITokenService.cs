using DemoCrudBackend.Models;

namespace DemoCrudBackend.Services
{
    public interface ITokenService
    {
        AccessTokenResult CreateAccessToken(User user);
    }
}
