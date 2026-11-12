# Frontend

Vue 3 + TypeScript application for the Demo CRUD project (scaffold not created yet).

## Cursor coding rules

Permanent frontend coding standards live in the repo-root [`.cursor/rules/`](../.cursor/rules/) as `frontend-*.mdc`. Cursor applies them when working under `frontend/`. Follow them for every frontend task.

| Rule file | Focus |
|---|---|
| `frontend-core.mdc` | Vue 3 / Composition API / TypeScript principles |
| `frontend-architecture.mdc` | Project layout and separation of concerns |
| `frontend-vue-typescript.mdc` | Components, props/emits, composables, typing |
| `frontend-api.mdc` | Axios client and `ApiResponse` envelopes |
| `frontend-auth.mdc` | Pinia auth, guards, permissions, 401 handling |
| `frontend-styling.mdc` | Tailwind CSS and UI conventions |
| `frontend-quality.mdc` | ESLint/Prettier, errors, keep buildable |
| `frontend-testing.mdc` | When and what to test |

Backend rules (`backend-*.mdc`) live in the same folder and stay separate via their globs.
