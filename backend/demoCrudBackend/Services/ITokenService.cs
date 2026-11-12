namespace DemoCrudBackend.Services
{
    public interface ITokenService
    {
        AccessTokenResult CreateAccessToken(
            int userId,
            string username,
            string roleName,
            IReadOnlyCollection<string> permissions);
    }
}
