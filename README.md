# demoCrudBackend

Monorepo for the Demo CRUD application.

## Structure

- `backend/` — ASP.NET Core Web API
- `frontend/` — Vue application (not created yet)

## Backend

From the repository root:

```bash
dotnet restore backend/demoCrudBackend.slnx
dotnet build backend/demoCrudBackend.slnx
dotnet run --project backend/demoCrudBackend/DemoCrudBackend.csproj
```
