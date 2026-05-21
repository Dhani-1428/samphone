# @workspace/admin-db

PostgreSQL schema via **Prisma ORM** (UUIDs, soft deletes, indexes, FKs).

| Path | Purpose |
|------|---------|
| `prisma/schema.prisma` | Models (Step 3) |
| `prisma/migrations/` | SQL migrations |
| `sql/` | Raw SQL reference (Step 2) |
| `src/index.ts` | Prisma client singleton |

**Step 1:** scaffold only.
