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
├── .cursor/rules/          # Backend Cursor rules (FE rules later)
├── backend/
│   └── demoCrudBackend/
├── frontend/               # Vue planned
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

### Roles / Rights (data ready, APIs pending)
- Entities: Role, Right, RoleRight
- Seeded roles: SuperAdmin (`IsSystem=true`), Admin, User
- Seeded rights: `User_*`, `Role_*`
- Role CRUD / RoleRight management APIs not implemented yet

### System protection
- `User.IsSystem` / `Role.IsSystem` — never from client DTOs
- Cannot delete/demote SuperAdmin or assign the system role via APIs

### Common API envelope
- `Common/ApiResponse.cs`, `PagedApiResponse<T>`, `PaginationMetadata`
- Controllers use `ApiControllerBase`
- Validation + auth challenge/forbid return the same envelope shape

## 5. Dependency Injection (Program.cs)

- `IUserService` → `UserService`
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

## 7. Known Pending Work

- Role / Right / RoleRight HTTP APIs
- Register remaining permission policies as endpoints are added
- Automated backend tests
- Global exception handling (optional hardening)
- Vue frontend (login, token storage, guards, CRUD UI)
- Frontend Cursor rules (later)

## 8. Development Rules

- Understand before implementing.
- Keep changes small and focused.
- Test every milestone (label manual HTTP checks clearly).
- Follow `.cursor/rules` for backend conventions.
- Use Cursor for implementation; Claude for independent review; ChatGPT as mentor.
