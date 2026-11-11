using Microsoft.Extensions.Configuration;
using Microsoft.IdentityModel.Tokens;
using System.Globalization;
using System.IdentityModel.Tokens.Jwt;
using System.Security.Claims;
using System.Text;

namespace DemoCrudBackend.Services
{
    public class TokenService(IConfiguration configuration) : ITokenService
    {
        private const int MaximumAccessTokenMinutes = 1440;

        public AccessTokenResult CreateAccessToken(int userId, string username, string roleName)
        {
            var issuer = configuration["Jwt:Issuer"];
            var audience = configuration["Jwt:Audience"];
            var signingKey = configuration["Jwt:Key"];
            var accessTokenMinutesText = configuration["Jwt:AccessTokenMinutes"];

            if (string.IsNullOrWhiteSpace(issuer)
                || string.IsNullOrWhiteSpace(audience)
                || string.IsNullOrWhiteSpace(signingKey)
                || !int.TryParse(accessTokenMinutesText, out var accessTokenMinutes)
                || accessTokenMinutes <= 0
                || accessTokenMinutes > MaximumAccessTokenMinutes)
            {
                throw new InvalidOperationException(
                    "JWT configuration must include Issuer, Audience, Key, and an AccessTokenMinutes value from 1 through 1440.");
            }

            if (string.IsNullOrWhiteSpace(username) || string.IsNullOrWhiteSpace(roleName))
            {
                throw new InvalidOperationException("A username and role name are required to create an access token.");
            }

            var keyBytes = Encoding.UTF8.GetBytes(signingKey);
            if (keyBytes.Length < 32)
            {
                throw new InvalidOperationException("JWT signing key must be at least 32 bytes for HS256.");
            }

            var securityKey = new SymmetricSecurityKey(keyBytes);
            var signingCredentials = new SigningCredentials(securityKey, SecurityAlgorithms.HmacSha256);

            var claims = new List<Claim>
            {
                new(ClaimTypes.NameIdentifier, userId.ToString(CultureInfo.InvariantCulture)),
                new(ClaimTypes.Name, username),
                new(ClaimTypes.Role, roleName)
            };

            var expiresAtUtc = DateTime.UtcNow.AddMinutes(accessTokenMinutes);
            expiresAtUtc = expiresAtUtc.AddTicks(-(expiresAtUtc.Ticks % TimeSpan.TicksPerSecond));

            var token = new JwtSecurityToken(
                issuer,
                audience,
                claims,
                expires: expiresAtUtc,
                signingCredentials: signingCredentials);

            var accessToken = new JwtSecurityTokenHandler().WriteToken(token);

            return new AccessTokenResult
            {
                AccessToken = accessToken,
                ExpiresAtUtc = expiresAtUtc
            };
        }
    }
}
