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

## Frontend Progress

### Phase 6 — Authentication, HTTP client, and route guards
Status: COMPLETED

- Login and logout against `POST /api/auth/login`.
- Access token in `sessionStorage`. Axios sends the bearer token and clears the session on HTTP 401.
- Pinia auth store restores the session after refresh and clears it when the token expires.
- Router guards for authentication and permission claims. Missing permissions open Access Denied.

### Phase 7 — Users
Status: COMPLETED

- Paged user list, create, edit, and delete.
- Client validation plus API validation, conflict, forbidden, and not-found messages.
- Actions follow `User_View`, `User_Create`, `User_Edit`, and `User_Delete`.

### Phase 8 — Roles and rights
Status: COMPLETED

- Paged role list, create, edit, and delete. The form sends `{ "name" }` only.
- Role rights page loads assigned rights and the rights catalog from the API, then assigns or removes `{ "rightIds": [...] }`.
- The user form selects a role by name and still submits `roleId`. The system role is not offered because the API hides it.
- Actions follow `Role_View`, `Role_Create`, `Role_Edit`, `Role_Delete`, `RoleRight_Assign`, and `Right_View`.

### Phase 9 — Integration, quality, and documentation
Status: COMPLETED

- Session expiry and HTTP 401 return to the sign-in page. Explicit logout does not restore the previous path.
- Docs updated to the implemented API and Vue app.
- `npm test`, lint, format check, and production build are the frontend checks.

## Current Phase

No further feature phase is in progress.

Still open, and not part of the Vue work above:

- Automated backend tests for auth, users, roles, and role rights.
- Optional global exception handling.
- Browser end-to-end tests. Frontend coverage today is Vitest.

## Important Decisions

- Keep MySQL.
- Keep Controller → Service → DbContext.
- No repository pattern.
- SuperAdmin is a single seeded system account/role (`IsSystem`), not a normal assignable role.
- Business roles are dynamic DB rows; permissions drive capabilities.
- Unified API envelope for all endpoints (including login).
- Use small, understandable implementation steps.

## Current Next Action

The Vue learning UI is in place. The next backend improvement is automated tests for auth, users, roles, and role rights. Log in again after a role's rights change; existing tokens keep the permission claims they were issued with.
