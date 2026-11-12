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

### Phase 5 — Role, role-right, and rights read APIs
Status: COMPLETED

- Role CRUD with paged list. System role is hidden on read (404) and rejected on write (403).
- Explicit assign and remove of rights. Caller can change only rights already on their token. Unseen rights stay on the role.
- Read-only paged rights catalog filtered to the caller. No right create/update/delete API.
- Seeded `RoleRight_Assign` and `Right_View`. Admin also receives the role-management rights. User stays `User_View` only.
- Migration `20261112110243_SeedRoleManagementRights` applied to local `demoCrudDb`.
- Shared `WriteResult<T>`, `PageRequest`, `CallerLookup`, `CallerContext`, and `MySqlErrors`.
- Manual HTTP checks passed (auth, hide/reject system role, conflicts, privilege filter, delete blocked while users are assigned). Re-login is required before old tokens see the new permissions.

## Current Phase

### Phase 6 — Backend tests, then Vue
Status: NEXT

Planned:
- Automated backend tests for auth, users, roles, and role rights.
- Optional global exception handling.
- Then Vue frontend (login, token storage, guards, CRUD UI).

## Important Decisions

- Keep MySQL.
- Keep Controller → Service → DbContext.
- No repository pattern.
- SuperAdmin is a single seeded system account/role (`IsSystem`), not a normal assignable role.
- Business roles are dynamic DB rows; permissions drive capabilities.
- Unified API envelope for all endpoints (including login).
- Use small, understandable implementation steps.

## Current Next Action

Add automated tests for the role, role-right, and rights APIs, or start the Vue login and API client. Restart the Visual Studio debug session and log in again before calling the new endpoints with an old token.
