# Project Context

## 1. Project Overview

An existing CRUD application being developed as a practical learning project for:
- ASP.NET Core Web API and C#
- Entity Framework Core
- MySQL
- Vue.js frontend
- Authentication and authorization

## 2. Repository Structure

```text
project-root/
├── .cursor/rules/          # Backend and frontend conventions
├── backend/
│   └── demoCrudBackend/
├── frontend/               # Vue 3 app (login, users, roles, rights)
└── docs/
    ├── LEARNING_PROGRESS.md
    ├── PROJECT_CONTEXT.md
    └── PROJECT_HANDOVER_PROMPT.md
```

## 3. Backend Technology

- ASP.NET Core Web API
- Target framework: .NET 10
- Entity Framework Core: 9
- Pomelo MySQL provider: 9
- Database: MySQL (`demoCrudDb`)
- Architecture: Controller → Service → DbContext

## 4. Backend Modules

### Auth
- `AuthController` / `AuthService` / `TokenService`
- Login: username/password → JWT with role + permission claims
- Access token lifetime: ~30 minutes (config); key in user secrets

### Users
- Full CRUD with permission policies (`User_View/Create/Edit/Delete`)
- Paged list: `GET /api/users?pageNumber=&pageSize=`
- Unique `UserName` / `Email`; trim normalization
- Write statuses: Success / NotFound / Forbidden / ValidationFailed / Conflict

### Roles
- `RolesController` / `RoleService`
- Paged list and get-by-id hide `IsSystem` roles (missing and system both return 404)
- Create and update take `{ "name" }` only. `IsSystem` is never accepted or returned
- Name is trimmed, max 100, unique case-insensitively (409 if taken, including `SuperAdmin`)
- Delete returns 409 while any user still has that `RoleId`. `Users.RoleId` stays `Restrict`. RoleRight rows cascade with the role
- Update, delete, assign, and remove return 403 for the system role

### Role rights
- `GET /api/roles/{id}/rights` requires `Role_View` and returns only rights the caller already holds
- `POST` assigns and `DELETE` removes `{ "rightIds": [1, 2] }`. Both require `RoleRight_Assign`
- The batch is all-or-nothing. Unknown or duplicate ids are 400. Already assigned / not assigned is 409. A right the caller does not hold is 403, and rights they cannot see stay on the role

### Rights
- Read-only catalog: `GET /api/rights` requires `Right_View`
- Paged, and filtered to permission names on the caller JWT
- No create, update, or delete right API. New rights are added by code plus a seed migration

### Seed (migration `20261112110243_SeedRoleManagementRights`, applied locally)
- Rights: `User_*`, `Role_View`, `Role_Create`, `Role_Edit`, `Role_Delete`, `RoleRight_Assign`, `Right_View`
- SuperAdmin (`IsSystem`) has every right
- Admin is an ordinary role with user management plus `Role_View`, `Role_Create`, `Role_Edit`, `Role_Delete`, `RoleRight_Assign`, and `Right_View`
- User has `User_View` only
- Existing tokens do not gain new permission claims until the next login

### System protection
- `User.IsSystem` / `Role.IsSystem` — never from client DTOs
- Cannot delete or demote the system user, assign the system role, or change the system role or its rights through normal APIs

### Common API envelope
- `Common/ApiResponse.cs`, `PagedApiResponse<T>`, `PaginationMetadata`
- Controllers use `ApiControllerBase`
- Validation + auth challenge/forbid return the same envelope shape

## 5. Dependency Injection (Program.cs)

- `IUserService` → `UserService`
- `IRoleService` → `RoleService`
- `IRightService` → `RightService`
- `IAuthService` → `AuthService`
- `ITokenService` → `TokenService`
- `IPasswordHasher<User>` → `PasswordHasher<User>`
- `IAuthorizationMiddlewareResultHandler` → `ApiAuthorizationMiddlewareResultHandler`
- JWT Bearer + permission policies

## 6. Architectural Decisions

- Keep MySQL and Controller → Service → DbContext.
- Do not introduce Repository Pattern without discussion.
- Do not hardcode business role hierarchies in C#.
- Prefer permission policies + service-layer system guards.
- JWT permissions are a snapshot until expiry.
- Unified response envelope for Vue and Scalar.

## 7. Frontend

Vue 3, TypeScript, Vite, Vue Router, Pinia, Axios, and Tailwind. Details and setup are in the root `README.md` and `frontend/README.md`.

- Login stores the access token in `sessionStorage` and restores it on refresh.
- Axios attaches the bearer token and clears the session on HTTP 401. Expiry and 401 return to `/login`. Explicit logout does not restore the previous path.
- Route meta permissions and button checks use the token's `permission` claims. The API remains authoritative.
- Users and roles support paged lists, create, edit, and delete. The user form submits `roleId` from a dropdown of roles returned by `GET /api/roles`.
- Role rights load `GET /api/roles/{id}/rights` and `GET /api/rights`, then assign or remove with `{ "rightIds": [...] }`.
- The UI does not invent rights or a permission matrix. Names come from the API.
- There is no rights create/update/delete screen, because the API has no write endpoints for rights.

## 8. Known Pending Work

- Automated backend tests
- Global exception handling (optional hardening)
- Frontend browser end-to-end tests (Vitest covers services, forms, lists, and guards)
- Refresh tokens (not in the API)
- `docs/PROJECT_HANDOVER_PROMPT.md` is an earlier mentor brief and is not the current setup guide

## 9. Role and rights HTTP API

| Method | Path | Permission | Success |
|---|---|---|---|
| GET | `/api/roles` | `Role_View` | 200 paged |
| GET | `/api/roles/{id}` | `Role_View` | 200 |
| POST | `/api/roles` | `Role_Create` | 201 |
| PUT | `/api/roles/{id}` | `Role_Edit` | 200 |
| DELETE | `/api/roles/{id}` | `Role_Delete` | 200 |
| GET | `/api/roles/{id}/rights` | `Role_View` | 200 |
| POST | `/api/roles/{id}/rights` | `RoleRight_Assign` | 200 |
| DELETE | `/api/roles/{id}/rights` | `RoleRight_Assign` | 200 |
| GET | `/api/rights` | `Right_View` | 200 paged |

Lists use `pageNumber` and `pageSize` (default 1 and 20, max 100). Write failures: 400 validation, 403 forbidden or system role, 404 missing or hidden system role on GET, 409 conflict.

## 10. Development Rules

- Understand before implementing.
- Keep changes small and focused.
- Test every milestone (label manual HTTP checks clearly).
- Follow `.cursor/rules` for backend conventions.
- Use Cursor for implementation; Claude for independent review; ChatGPT as mentor.
