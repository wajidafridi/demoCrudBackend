
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
├── backend/
│   └── demoCrudBackend/
└── frontend/
```

## 3. Backend Technology

- ASP.NET Core Web API
- Target framework: .NET 10
- Entity Framework Core: 9
- Pomelo MySQL provider: 9
- Database: MySQL
- Database name: demoCrudDb
- API architecture: Controller → Service → DbContext

## 4. Existing Backend Modules

### Users
- User CRUD
- Password hashing with PasswordHasher<User>
- User and Role relationship

### Roles and Permissions
- Role, Right and RoleRight entities
- Seeded roles: SuperAdmin, Admin, User
- Seeded permissions for user and role operations
- CRUD endpoints for these entities still need to be evaluated.

### Authentication
- AuthController
- IAuthService
- AuthService
- Database-backed username/password verification
- Password hashes stored in PasswordHash
- Login response includes Id, UserName, Email, RoleId and RoleName
- JWT implementation: Not yet completed

## 5. Dependency Injection

Currently registered in Program.cs:
- IUserService → UserService
- IAuthService → AuthService
- IPasswordHasher<User> → PasswordHasher<User>

## 6. Important Architectural Decisions

- Keep MySQL for this project.
- Preserve Controller → Service → DbContext.
- Do not introduce Repository Pattern without discussing it.
- Use dependency injection for services.
- Keep authentication logic out of controllers.
- Keep token creation separate from AuthService through ITokenService.
- Use configuration/environment secrets for JWT signing keys.

## 7. Known Pending Improvements

- JWT authentication and token validation.
- Protect API endpoints with authorization.
- Role-based and permission-based access.
- Unique username/email indexes.
- Global exception handling.
- API validation and security hardening.
- Automated backend tests.
- Vue frontend implementation.

## 8. Development Rules

- Understand before implementing.
- Keep changes small and focused.
- Test every milestone.
- Use Cursor for implementation.
- Use Claude for independent review.
- Use ChatGPT as technical mentor and reviewer.
