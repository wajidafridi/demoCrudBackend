# demoCrudBackend

Monorepo for the Demo CRUD application.

## Structure

- `backend/` — ASP.NET Core Web API
- `frontend/` — Vue application (not created yet)

## Backend

ASP.NET Core API with JWT auth, user CRUD, role CRUD, role-right assign/remove, and a read-only rights catalog. See `docs/PROJECT_CONTEXT.md` for the current API and seed.

From the repository root:

```bash
dotnet restore backend/demoCrudBackend.slnx
dotnet build backend/demoCrudBackend.slnx
dotnet run --project backend/demoCrudBackend/DemoCrudBackend.csproj
```
