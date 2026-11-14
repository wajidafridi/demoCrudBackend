using System.Globalization;
using System.Security.Claims;
using DemoCrudBackend.Services;
using Microsoft.AspNetCore.Authentication.JwtBearer;

namespace DemoCrudBackend.Authorization
{
    /// <summary>
    /// Runs after a JWT passes signature, issuer, audience and lifetime checks.
    ///
    /// The JWT proves who the caller is. It is not trusted for what the caller may do:
    /// the role and permission claims are replaced with the values in the database for this request.
    /// So a right removed from a role stops working on the next request, without a new login,
    /// and a right added to a role starts working the same way.
    ///
    /// Fail-closed rules:
    /// - User deleted or role unresolvable: authentication fails (401).
    /// - Database error: the exception propagates to the API exception handler (safe 500).
    ///   The request never reaches authorization with the token's stale claims.
    /// </summary>
    public static class AccessRefresh
    {
        public static async Task OnTokenValidated(TokenValidatedContext context)
        {
            if (context.Principal?.Identity is not ClaimsIdentity identity)
            {
                context.Fail("The access token has no identity.");
                return;
            }

            var userId = CallerContext.UserId(context.Principal);
            if (userId is null)
            {
                context.Fail("The access token has no valid user id.");
                return;
            }

            var service = context.HttpContext.RequestServices.GetRequiredService<IAccessSnapshotService>();
            var snapshot = await service.LoadAsync(userId.Value, context.HttpContext.RequestAborted);
            if (snapshot is null)
            {
                context.Fail("The account for this access token no longer exists.");
                return;
            }

            ReplaceClaims(identity, snapshot);

            context.HttpContext.Items[AccessSnapshot.HttpContextItemKey] = snapshot;
            context.HttpContext.Response.Headers[AccessSnapshot.VersionHeader] = snapshot.Version;
        }

        public static AccessSnapshot? Current(HttpContext httpContext)
        {
            return httpContext.Items.TryGetValue(AccessSnapshot.HttpContextItemKey, out var value)
                ? value as AccessSnapshot
                : null;
        }

        private static void ReplaceClaims(ClaimsIdentity identity, AccessSnapshot snapshot)
        {
            foreach (var claim in identity.FindAll(claim =>
                         claim.Type == ClaimTypes.Role
                         || claim.Type == ClaimTypes.Name
                         || claim.Type == Permissions.ClaimType
                         || claim.Type == RoleIdClaimType).ToList())
            {
                identity.RemoveClaim(claim);
            }

            identity.AddClaim(new Claim(ClaimTypes.Name, snapshot.UserName));
            identity.AddClaim(new Claim(ClaimTypes.Role, snapshot.RoleName));
            identity.AddClaim(new Claim(RoleIdClaimType, snapshot.RoleId.ToString(CultureInfo.InvariantCulture)));
            foreach (var permission in snapshot.Permissions)
            {
                identity.AddClaim(new Claim(Permissions.ClaimType, permission));
            }
        }

        private const string RoleIdClaimType = "role_id";
    }
}
