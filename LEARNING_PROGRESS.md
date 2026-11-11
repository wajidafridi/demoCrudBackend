
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

- Explored existing project structure.
- Reviewed entities, DTOs, controllers and services.
- Understood EF Core and MySQL setup.
- Identified existing authentication and security gaps.

### Phase 2 — Authentication Foundation
Status: COMPLETED

#### 2.1 — Understand Password Hashing
- Understood PasswordHasher<User>.
- Understood salted password hashing.
- Understood VerifyHashedPassword.
- Understood why newly generated hashes cannot be compared directly.

#### 2.2 — Database-backed Login
- Implemented AuthController.
- Implemented IAuthService and AuthService.
- Loaded users and their roles from MySQL.
- Verified submitted passwords against stored hashes.
- Returned generic authentication failures.

#### 2.2.3 / 2.2.4 — Cleanup and Verification
- Registered IPasswordHasher<User> through DI.
- Injected the hasher into AuthService and UserService.
- Added password rehash handling.
- Added malformed hash handling and logging.
- Made rehash-save failure non-fatal.
- Removed plaintext password assignment to PasswordHash.
- Fixed Gender and ImageUrl create/update mappings.
- Reduced LoginResponseDto to essential login information.
- Tested successful login and both failure cases.
- Tested user creation and update mappings.

Result: All reported manual tests passed.

## Current Phase

### Phase 3 — JWT Authentication
Status: IN PROGRESS

#### 3.1 — JWT Architecture
Status: COMPLETED

- Inspected the existing login flow, packages, and configuration.
- Confirmed JwtBearer was not installed and that a 10.0.x package matches this API.

#### 3.2 — JWT Package and Configuration
Status: COMPLETED

- Installed Microsoft.AspNetCore.Authentication.JwtBearer.
- Initialized .NET User Secrets.
- Generated and stored JWT signing key outside source control.
- Verified the secret exists without exposing its value.
- Restored packages and confirmed successful build.

## Upcoming Phases

- Phase 4 — Authorization and role-based access.
- Phase 5 — Backend testing and cleanup.
- Vue frontend development.
- Login integration and token handling.
- Route guards and role-based UI.
- End-to-end testing.

## Important Decisions

- Keep MySQL.
- Keep Controller → Service → DbContext.
- Use small, understandable implementation steps.
- Do not move to the next task before reviewing the current one.

## Current Next Action

Phase 3.3 — JWT Token Service.
