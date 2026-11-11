namespace DemoCrudBackend.Services
{
    public class AccessTokenResult
    {
        public string AccessToken { get; init; } = string.Empty;

        public DateTime ExpiresAtUtc { get; init; }
    }
}
