# @workspace/admin-db

PostgreSQL schema via **SQL migrations** (Step 2) and **Prisma** (Step 3).

## Apply schema

```powershell
$env:DATABASE_URL = "postgresql://user:pass@localhost:5432/samphone_admin"
.\sql\migrate.ps1
```

## Structure

| Path | Purpose |
|------|---------|
| `sql/*.sql` | Ordered migrations (see `sql/README.md`) |
| `prisma/schema.prisma` | Prisma models — **Step 3** |
| `src/index.ts` | Prisma client singleton — **Step 3** |

Full table reference: `docs/ADMIN_DATABASE_SCHEMA.md`.
