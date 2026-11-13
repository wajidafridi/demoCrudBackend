# Demo CRUD frontend

Vue application for the [Demo CRUD](../README.md) API. Sign-in, the application shell, users, roles, and role-right assignment are implemented against the existing API.

Backend setup, the database, JWT, and the API list are in the [repository README](../README.md). This file covers the frontend.

## Frontend overview

The app title is **Demo CRUD**. `npm run dev` serves the sign-in page and, after login, the dashboard.

| Area    | What it does                                                                                                                           |
| ------- | -------------------------------------------------------------------------------------------------------------------------------------- |
| Login   | `POST /api/auth/login`. Invalid credentials stay on the form. The password field is cleared after a successful login.                  |
| Session | Access token in `sessionStorage` under `demoCrud.accessToken`. Restored when the tab reloads. Cleared on logout, expiry, and HTTP 401. |
| HTTP    | Shared Axios client attaches `Authorization: Bearer` and clears the session on 401.                                                    |
| Routes  | Auth and permission guards. A missing permission opens Access Denied.                                                                  |
| Users   | Paged list, create, edit, delete. The role field is a dropdown of roles the API returns.                                               |
| Roles   | Paged list, create, edit, delete.                                                                                                      |
| Rights  | Assigned and available rights for one role. Assign and remove call the role-rights endpoints.                                          |
| Account | Username, role, and email from the current session, plus logout.                                                                       |

Permission checks in the UI are a guide. The API still enforces every policy.

## Technology stack

Declared in `package.json` and wired in source:

| Piece               | Used for                                               |
| ------------------- | ------------------------------------------------------ |
| Vue 3               | UI. Components use `<script setup lang="ts">`.         |
| TypeScript (strict) | `tsconfig.app.json`                                    |
| Vite 8              | Dev server and production build (`vite.config.ts`)     |
| Vue Router          | `src/router/index.ts`                                  |
| Pinia               | Auth store in `src/stores/authStore.ts`                |
| Axios               | Shared client in `src/services/http.ts`                |
| Tailwind CSS 4      | `@tailwindcss/vite`. Global import in `src/style.css`. |
| Vitest              | `npm test`, with Vue Test Utils and happy-dom          |

npm is the package manager (`package-lock.json`).

## Prerequisites

- Node.js `^20.19.0` or `>=22.12.0` (the `engines` range of Vite 8).
- npm.
- The API from the repository root. See [Getting started](../README.md#getting-started).

## Installation

From the `frontend` directory:

```bash
npm install
```

From the repository root:

```bash
npm install --prefix frontend
```

## Environment configuration

Vite reads `frontend/.env`. That file is gitignored. The tracked template is `.env.example`:

```text
VITE_API_BASE_URL=https://localhost:7193/api
```

Create the local file.

PowerShell:

```powershell
Copy-Item .env.example .env
```

Bash:

```bash
cp .env.example .env
```

`VITE_API_BASE_URL` is required and must include the `/api` prefix. The value above matches the backend `https` launch profile (`https://localhost:7193`). If you run `--launch-profile http` instead, set it to `http://localhost:5118/api`.

`VITE_DEV_LOGIN_USERNAME` and `VITE_DEV_LOGIN_PASSWORD` are optional. They prefill the sign-in form only when Vite's mode is `development`. They are not used by `npm test` or `npm run build`. Do not put passwords, JWT signing keys, or access tokens in a file you commit.

Restart `npm run dev` after you change `.env`.

The backend allows browser calls from `http://localhost:5173` when it runs in Development (`Cors:AllowedOrigin` in `backend/demoCrudBackend/appsettings.Development.json`). If the dev server binds a different port, update that setting and restart the API.

## Development server

From `frontend`:

```bash
npm run dev
```

Open `http://localhost:5173`. Signed-out visitors are sent to `/login`.

The seeded username is `superadmin`. The password is the development seed on that user in `backend/demoCrudBackend/Data/ApplicationDbContext.cs`. It is not written in this file.

## Production build

```bash
npm run build
```

This runs `vue-tsc -b` and then `vite build`. Output goes to `frontend/dist/`, which is gitignored. The built client uses the `VITE_API_BASE_URL` that was present at build time.

Preview the built files locally:

```bash
npm run preview
```

Vite's default preview port is 4173 when the config does not override it: `http://localhost:4173`.

## Folder structure

```text
frontend/
├── index.html
├── package.json
├── package-lock.json
├── vite.config.ts
├── .env.example
└── src/
    ├── components/       # Shared fields, dialog, alerts, sidebar, header
    ├── features/         # Users and roles form helpers and feature components
    ├── layouts/
    │   └── AppLayout.vue
    ├── navigation/
    ├── router/           # Routes and the auth guard
    ├── services/         # Axios client, auth, users, roles, rights
    ├── stores/
    │   └── authStore.ts
    ├── types/
    ├── utils/
    ├── views/            # Login, dashboard, users, roles, account
    ├── App.vue
    ├── main.ts
    └── style.css
```

Import application code with the `@/` alias (`@` is `src`).

## Routing

`src/router/index.ts` uses `createWebHistory`. Protected pages sit under `AppLayout`.

| Path                | Name            | Permission                               |
| ------------------- | --------------- | ---------------------------------------- |
| `/login`            | `login`         | Public. Signed-in users leave this page. |
| `/`                 | `home`          | Signed in                                |
| `/access-denied`    | `access-denied` | Shown when a permission is missing       |
| `/users`            | `users`         | `User_View`                              |
| `/users/create`     | `users-create`  | `User_Create`                            |
| `/users/:id/edit`   | `users-edit`    | `User_Edit`                              |
| `/roles`            | `roles`         | `Role_View`                              |
| `/roles/create`     | `roles-create`  | `Role_Create`                            |
| `/roles/:id/edit`   | `roles-edit`    | `Role_Edit`                              |
| `/roles/:id/rights` | `roles-rights`  | `Role_View` and `RoleRight_Assign`       |
| `/account`          | `account`       | Signed in                                |

A route with several permissions requires every one of them. The guard reads the permission claims stored from the access token.

## State management

`useAuthStore` holds the access token, the signed-in user, permission names, and the expiry time. `src/services/tokenStorage.ts` is the only module that reads or writes `sessionStorage`. The Axios interceptor reads the token from that module.

There is no refresh token. The store schedules a timer from the token `exp` claim. When that timer fires, or a response is HTTP 401, the session is cleared and `App.vue` sends the browser to `/login` with a `redirect` query. `logout()` clears the session without that redirect.

Email and role id on the account page come from the login response. A tab reload restores the user id, username, role name, and permissions from the token. Email is not a claim, so it is blank until the next login.

## API integration

`src/services/http.ts` creates one Axios instance:

- `baseURL` is `import.meta.env.VITE_API_BASE_URL`
- Default headers are `Accept: application/json` and `Content-Type: application/json`
- The request interceptor sets `Authorization` when a token is stored and the request did not set one
- The response interceptor calls the registered session handler on HTTP 401 only

Feature modules:

| Module            | Calls                                                                |
| ----------------- | -------------------------------------------------------------------- |
| `authService.ts`  | `POST /auth/login`                                                   |
| `userService.ts`  | `/users` list, get, create, update, delete                           |
| `roleService.ts`  | `/roles` list, get, create, update, delete, and `/roles/{id}/rights` |
| `rightService.ts` | `GET /rights`                                                        |

Responses use `src/types/api.ts`:

- `ApiResponse<T>` for login, get-by-id, and writes
- `PagedApiResponse<T>` for lists (`data` is the item array)

List queries are `pageNumber` and `pageSize` (page size 20 on the lists, up to 100 when a form needs every visible role or right). `src/services/apiError.ts` maps the envelope `message` and `errors` onto form and page errors. HTTP 403, 404, and 409 stay on the page that made the call. They do not sign the user out.

## Authentication integration

1. `POST /api/auth/login` with `username` and `password`.
2. Read `data.accessToken` and `data.expiresAtUtc` from the envelope.
3. Later requests send `Authorization: Bearer <access_token>`.

Access tokens expire (30 minutes in the committed API settings). Permission names on the token, such as `User_View`, are what the API checks. Hiding a button does not replace that check.

## Development guidelines

- Use `<script setup lang="ts">` and the Composition API.
- Prefer `ref` and `computed`. Avoid `any`.
- Put HTTP in `src/services/`. One module per area.
- Do not read `localStorage` or `sessionStorage` from components.
- Use Tailwind utilities. Match the slate and violet styling already used in the layout and forms.
- Show loading, empty, and error states. Surface the envelope `message` and field `errors`.
- Keep a change easy to follow. This is a learning project; skip extra libraries and wrappers.
- Longer notes live in the repo-root `.cursor/rules/` files whose names start with `frontend-`.

### Scripts

| Command                | Purpose                        |
| ---------------------- | ------------------------------ |
| `npm run dev`          | Vite dev server                |
| `npm run build`        | Typecheck and production build |
| `npm run preview`      | Serve the production build     |
| `npm test`             | Vitest (`src/**/*.spec.ts`)    |
| `npm run lint`         | ESLint                         |
| `npm run lint:fix`     | ESLint with auto-fix           |
| `npm run format`       | Prettier write                 |
| `npm run format:check` | Prettier check                 |

Before you open a pull request that touches the UI or types:

```bash
npm run lint
npm run format:check
npm test
npm run build
```

Check the changed screen in the browser at `http://localhost:5173`. The root README describes the [branch and pull request](../README.md#contributing) steps.
