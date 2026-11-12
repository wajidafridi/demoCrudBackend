using Microsoft.AspNetCore.Authorization;
using System.Security.Claims;

namespace DemoCrudBackend.Authorization
{
    public sealed class PermissionAuthorizationHandler : AuthorizationHandler<PermissionRequirement>
    {
        protected override Task HandleRequirementAsync(
            AuthorizationHandlerContext context,
            PermissionRequirement requirement)
        {
            if (context.User.Identity?.IsAuthenticated != true)
            {
                return Task.CompletedTask;
            }

            if (string.IsNullOrWhiteSpace(requirement.Permission))
            {
                return Task.CompletedTask;
            }

            var hasRole = context.User.Claims.Any(claim =>
                claim.Type == ClaimTypes.Role &&
                !string.IsNullOrWhiteSpace(claim.Value));

            if (!hasRole)
            {
                return Task.CompletedTask;
            }

            var hasPermission = context.User.Claims.Any(claim =>
                claim.Type == Permissions.ClaimType &&
                string.Equals(claim.Value, requirement.Permission, StringComparison.Ordinal));

            if (hasPermission)
            {
                context.Succeed(requirement);
            }

            return Task.CompletedTask;
        }
    }
}
