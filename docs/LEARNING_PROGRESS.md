# Learning Progress

## Learning Objective

Build practical full-stack development skills using:
- C# and ASP.NET Core
- Entity Framework Core and MySQL
- JWT authentication and authorization
- Vue.js frontend
- Frontend/backend integration

The goal is to understand the implementation, not simply generate code with AI.

## Working Method

1. ChatGPT provides one task at a time and explains concepts.
2. I implement with Cursor.
3. Claude independently reviews the implementation.
4. I test the changes.
5. ChatGPT reviews the code and verifies completion.
6. Progress is updated after each milestone.

## Backend Progress

### Phase 1 — Project Assessment
Status: COMPLETED

### Phase 2 — Authentication Foundation
Status: COMPLETED

- PasswordHasher, AuthController/AuthService, DI, rehash handling, login tests.

### Phase 3 — JWT Authentication
Status: COMPLETED

- JwtBearer package, user secrets for signing key, TokenService, claim mapping, login returns access token + expiry.
- Authentication + authorization middleware wired in Program.cs.

### Phase 4 — Authorization and RBAC
Status: COMPLETED (Users surface)

- Permission claims in JWT; `PermissionAuthorizationHandler` + `User_*` policies on UsersController.
- Simplified RBAC: dynamic roles; no hardcoded Admin/User hierarchy.
- System protection via `User.IsSystem` / `Role.IsSystem` (seeded SuperAdmin only).
- Removed last-SuperAdmin concurrency locking (no longer needed).
- Auth polish: CancellationToken, HashSet permissions, helpers.
- Users polish: shared DTO projection, RoleName, write-status mapping (400/403/404/409).
- Unique indexes on UserName/Email; pagination on GET /api/users.
- Global `ApiResponse` / `PagedApiResponse` envelope (Scalar-friendly pagination null on non-paged APIs).
- Cursor rules added under `.cursor/rules/` for backend continuity.

## Current Phase

### Phase 5 — Role / Right APIs and backend cleanup
Status: NEXT

Planned:
- Role CRUD + RoleRight assign/remove (protect `Role.IsSystem`).
- Right CRUD (as needed) + register `Role_*` / `Right_*` policies.
- Further testing/hardening as needed.
- Then Vue frontend.

## Important Decisions

- Keep MySQL.
- Keep Controller → Service → DbContext.
- No repository pattern.
- SuperAdmin is a single seeded system account/role (`IsSystem`), not a normal assignable role.
- Business roles are dynamic DB rows; permissions drive capabilities.
- Unified API envelope for all endpoints (including login).
- Use small, understandable implementation steps.

## Current Next Action

Implement Role (and related) APIs following existing Users/Auth patterns and `.cursor/rules` backend conventions.
