# Demo CRUD frontend

Vue application for the [Demo CRUD](../README.md) API. The dev server, layout, router, and a shared HTTP client are in place. Login and the user, role, and rights screens are not built yet.

Backend setup, the database, JWT, and the API list are in the [repository README](../README.md). This file covers only the frontend.

## Frontend overview

The app title is **Demo CRUD**. `npm run dev` serves a single home page that states the foundation is ready. Nothing in the UI calls the API.

| Implemented | Pending |
| --- | --- |
| Vite + Vue 3 + TypeScript project | Login and logout screens |
| `AppLayout` with a Home link | Access-token storage |
| Route `/` → `HomeView` | Navigation guards |
| Pinia created in `main.ts` | Pinia stores (the `stores/` folder is empty) |
| Axios instance in `src/services/http.ts` | Auth header, 401 handling, and feature services (`authService`, `userService`, and so on) |
| `ApiResponse` / `PagedApiResponse` types | User, role, and rights screens |
| Tailwind CSS on the layout and home page | Automated frontend tests (no test runner is installed) |

## Technology stack

Declared in `package.json` and wired in source:

| Piece | Used for |
| --- | --- |
| Vue 3 | UI. Components use `<script setup lang="ts">`. |
| TypeScript (strict) | `tsconfig.app.json` |
| Vite 8 | Dev server and production build (`vite.config.ts`) |
| Vue Router | `src/router/index.ts` |
| Pinia | `createPinia()` in `src/main.ts`. No store modules yet. |
| Axios | Shared client in `src/services/http.ts` |
| Tailwind CSS 4 | `@tailwindcss/vite`. Global import in `src/style.css`. |

npm is the package manager (`package-lock.json`).

## Prerequisites

- Node.js `^20.19.0` or `>=22.12.0` (the `engines` range of Vite 8).
- npm.
- The API from the repository root, if you are about to call it. The home page does not need the API running. See [Getting started](../README.md#getting-started) in the root README.

## Installation

From the `frontend` directory:

```bash
npm install
```

From the repository root, the same install is:

```bash
npm install --prefix frontend
```

## Environment configuration

Vite reads `frontend/.env`. That file is gitignored. The tracked template is `.env.example`:

```text
VITE_API_BASE_URL=http://localhost:5118/api
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

`VITE_API_BASE_URL` is the only variable declared in `src/env.d.ts`. It must include the `/api` prefix. The value above matches the backend `http` launch profile (`http://localhost:5118`).

Restart `npm run dev` after you change `.env`. Do not put passwords, JWT signing keys, or access tokens in env files.

The backend allows browser calls from `http://localhost:5173` when it runs in Development (`Cors:AllowedOrigin` in `backend/demoCrudBackend/appsettings.Development.json`). If the dev server binds a different port, update that setting and restart the API. Details are in the root README section on [backend configuration](../README.md#backend-configuration).

## Development server

From `frontend`:

```bash
npm run dev
```

`vite.config.ts` does not set `server.port`, so Vite uses `http://localhost:5173`. Open that URL. You should see the Demo CRUD header and the home page.

## Production build

```bash
npm run build
```

This runs `vue-tsc -b` and then `vite build`. Output goes to `frontend/dist/`, which is gitignored.

Preview the built files locally:

```bash
npm run preview
```

Vite's default preview port is 4173 when the config does not override it: `http://localhost:4173`. The current UI does not call the API. Any later client code would use the `VITE_API_BASE_URL` value that was present when `npm run build` ran.

## Folder structure

```text
frontend/
├── index.html
├── package.json
├── package-lock.json
├── vite.config.ts          # Vue, Tailwind, @ → src
├── tsconfig.json
├── tsconfig.app.json
├── tsconfig.node.json
├── .env.example
└── src/
    ├── assets/             # empty
    ├── components/         # empty; shared UI goes here
    ├── layouts/
    │   └── AppLayout.vue   # page shell and Home link
    ├── router/
    │   └── index.ts        # history mode, one route
    ├── services/
    │   └── http.ts         # shared Axios client
    ├── stores/             # empty; Pinia modules go here
    ├── types/
    │   └── api.ts          # envelope types
    ├── views/
    │   └── HomeView.vue
    ├── App.vue             # renders RouterView
    ├── main.ts             # creates the app, Pinia, and the router
    ├── env.d.ts
    └── style.css
```

Import application code with the `@/` alias (`@` is `src`).

## Routing

`src/router/index.ts` uses `createWebHistory`. The only route is:

| Path | Name | Layout | Page |
| --- | --- | --- | --- |
| `/` | `home` | `AppLayout` | `HomeView` |

There is no login route and no `beforeEach` guard. `App.vue` renders the matched route and nothing else.

Add a new page as a view under `src/views/`, then register it on this router. Protected routes are still to be designed; the backend already rejects calls that lack a token or permission.

## State management

Pinia is installed and `app.use(createPinia())` runs in `src/main.ts`. `src/stores/` has no modules, so there is no auth or session state.

When an auth store is added, keep the access token and the signed-in user there, and keep HTTP calls in `src/services/`. Views should read the store or call a service, not Axios.

## API integration

`src/services/http.ts` creates one Axios instance:

- `baseURL` is `import.meta.env.VITE_API_BASE_URL`
- Default headers are `Accept: application/json` and `Content-Type: application/json`

No request interceptor attaches `Authorization`. No response interceptor handles 401. No file under `src/services/` calls a specific endpoint. The home page does not import `http`.

When a feature needs the API, add a service that imports `http` and types the body with `src/types/api.ts`:

- `ApiResponse<T>` for login, get-by-id, and writes (`pagination` is null)
- `PagedApiResponse<T>` for lists

The backend list query names are `pageNumber` and `pageSize`. Protected calls must send:

```http
Authorization: Bearer <access_token>
```

That header is not sent by this app yet. The API catalog, login body, and Scalar UI are in the root README: [API documentation](../README.md#api-documentation) and [Authentication](../README.md#authentication).

## Authentication integration

Not built. There is no login form, no stored token, and no route guard.

The backend contract this app will call later:

1. `POST /api/auth/login` with `username` and `password`.
2. Read `data.accessToken` and `data.expiresAtUtc` from the envelope.
3. Send `Authorization: Bearer <access_token>` on later requests.

There is no refresh-token endpoint. Access tokens expire (30 minutes in the committed API settings). Permission names on the token, such as `User_View`, are what the API checks. A future UI may hide actions the user cannot perform; the API still enforces the policy.

The local seed username is `superadmin`. The local password is recorded with the seed data, not in this frontend. See the root README section [Database setup](../README.md#database-setup).

## Development guidelines

- Use `<script setup lang="ts">` and the Composition API.
- Prefer `ref` and `computed`. Avoid `any`.
- Put HTTP in `src/services/`. One module per area once those calls exist.
- Put shared session state in `src/stores/`. Do not read `localStorage` from random components.
- Use Tailwind utilities. Match the spacing and slate palette already used in `AppLayout.vue` and `HomeView.vue`.
- Show loading and error state from the envelope `message` and `errors` fields. Do not swallow failed requests.
- Keep a change easy to follow. This is a learning project; skip extra libraries and wrappers.
- Longer notes live in the repo-root `.cursor/rules/` files whose names start with `frontend-` (architecture, TypeScript, API, auth, styling, quality).

Before you open a pull request that touches the UI or types:

```bash
npm run build
```

Check the changed screen in the browser at `http://localhost:5173`. The root README describes the [branch and pull request](../README.md#contributing) steps.
