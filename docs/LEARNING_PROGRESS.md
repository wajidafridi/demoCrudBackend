# Learning Progress

## Learning Objective

Build practical full-stack development skills using:

- C# and ASP.NET Core
- Entity Framework Core and MySQL
- JWT authentication and authorization
- Vue.js frontend
- Frontend and backend integration

The goal is to understand the implementation, not simply generate code with AI.

## Working Method

1. One task is defined at a time, with the concept explained.
2. The change is implemented in Cursor.
3. The result is reviewed and tested.
4. Progress notes are updated after the milestone.

## Backend Progress

### Phase 1 — Project Assessment

Status: COMPLETED

### Phase 2 — Authentication Foundation

Status: COMPLETED

- `PasswordHasher`, `AuthController` / `AuthService`, dependency injection, rehash handling, and login checks.

### Phase 3 — JWT Authentication

Status: COMPLETED

- JWT Bearer, user secrets for the signing key, `TokenService`, claim mapping, and login returning an access token plus expiry.
- Authentication and authorization middleware in `Program.cs`.

### Phase 4 — Authorization and RBAC

Status: COMPLETED

- Policies from `Permissions.All`. The JWT identifies the caller; role and rights are reloaded from the database on every request, so revocations and grants apply to active sessions.
- Dynamic roles. No hardcoded Admin or User hierarchy.
- System protection via `User.IsSystem` and `Role.IsSystem`.
- Unique username and email, pagination, and the shared `ApiResponse` / `PagedApiResponse` envelope.

### Phase 5 — Role, role-right, and rights read APIs

Status: COMPLETED

- Role CRUD. The system role is hidden on read (404) and rejected on write (403).
- Assign and remove rights. The caller can change only rights already on their token.
- Read-only paged rights catalog filtered to the caller. No right write API.
- Seeded `RoleRight_Assign` and `Right_View`.

### Account self-service API

Status: COMPLETED

- `GET` and `PUT /api/account`, and `POST /api/account/change-password`.
- The caller is the user id on the access token.
- Profile updates do not accept username, role, system flag, or a client-supplied user id.
- Password length is 8–100 characters. A new password must differ from the current password.
- Existing access tokens are not revoked when the password changes.

### Backend integration tests

Status: COMPLETED

- `backend/DemoCrudBackend.Tests` uses xUnit and `WebApplicationFactory`.
- The test host uses SQLite in memory and does not connect to MySQL.
- Tests cover account profile and password rules, and user write guards for self, system accounts, the system role, and the permission ceiling.

## Frontend Progress

### Authentication, HTTP client, and route guards

Status: COMPLETED

- Login and logout against `POST /api/auth/login`.
- Access token in `sessionStorage`. Axios sends the bearer token and clears the session on HTTP 401.
- Pinia restores the session after refresh and clears it when the token expires.
- Router guards for authentication and permission claims. A missing permission opens Access Denied.

### Users, roles, and rights

Status: COMPLETED

- Paged user and role lists, with create, edit, and delete.
- Rights management is `/rights`. It requires `Role_View` and `Right_View`. Changing assignments also requires `RoleRight_Assign`.
- `/roles/:id/rights` redirects to `/rights?roleId=`.
- User and role forms follow the API contracts. The user form still submits `roleId`.
- The users list hides edit and delete for the signed-in account, system accounts, and while the account id is unknown.

### Theme

Status: COMPLETED

- Preference `light`, `dark`, or `system`, stored in `localStorage` under `app-theme`.
- The document gets `data-theme` and `data-theme-preference` before Vue loads, and again from `useTheme`.
- The header control offers System, Light, and Dark. System is the default when nothing has been chosen. Light and Dark are explicit saved choices.
- Semantic color tokens live in `frontend/src/style.css`.

### Account, dashboard, and login UI

Status: COMPLETED

- My Account loads `GET /api/account`, edits the profile fields the API accepts, and changes the password on a separate form.
- The dashboard is a welcome heading plus shortcut cards. It does not call a statistics API.
- The login page includes the shared theme toggle and field-level validation.
- Unknown paths render a public 404 page with a link to the dashboard.
- Account, user, and role forms warn before discarding unsaved changes.
- Date of birth uses the UTC calendar date in the form and in the API.
- Gender is a select (Male, Female, Other) on the user and account forms.

### Live rights sync

Status: COMPLETED

- The store re-reads `GET /api/auth/me` when `X-Access-Version` changes, after a 403, before permission routes, on tab focus, and every 60 seconds while visible.
- `setupAccessWatcher` moves the user to Access Denied when the current route loses a needed right. Delete dialogs explain when a right was lost before confirming.
- Verified in the browser with three accounts in separate tabs and with the same account in two tabs.

### QA closure

Status: COMPLETED

- Keyboard pass (Tab, Shift+Tab, dialogs, drawer, Rights Management), tablet widths, failure handling during save, and a 127-user pagination check were done by hand.
- Fixes from that pass: visible focus outlines on inputs and selects, `aria-expanded` on the drawer button, a 30-second request timeout with a clear message, the tab title on cancelled navigation, and capped long values in the Users table.
- Last verified run: backend 74 tests, frontend 253 tests, lint, Prettier, `vue-tsc`, and `vite build` all pass.

## Current Phase

No further feature phase is in progress. This milestone's documentation matches the implementation above.

## Still open

- Refresh tokens, server logout, and revocation of access tokens that are already issued.
- Distributed rate limiting and audit logging. Login and password change use an in-memory limit on each API process.
- A rights create, update, or delete API.
- Browser end-to-end tests. Frontend coverage is Vitest. Backend coverage is the xUnit project above.
- Low-severity UI items: focus returns to the page body after Assign or Remove on Rights Management, the Create and Edit User pages have no heading element, and a direct router move between two user edit URLs keeps the first page's state until reload.
- No phone-number format rule. Any text up to 50 characters is accepted.
- Production deployment, secret rotation, and operational hardening. Those are outside the current learning app.
- The NuGet advisories listed in the root README are still reported on restore.

## Important Decisions

- Keep MySQL.
- Keep Controller → Service → DbContext.
- No repository pattern.
- SuperAdmin is a seeded system account and role (`IsSystem`), not a role the API will assign.
- Business roles are database rows. The role's current rights in the database decide what a request can do.
- One API envelope for every endpoint, including login.
- Account identity comes from the access token.

## Current Next Action

Use the root `README.md` and `frontend/README.md` to run the app. Rights changes apply to signed-in users on their next request. No new sign-in is needed.
