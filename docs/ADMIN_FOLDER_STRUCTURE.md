# Step 1 — Complete folder structure

```
Scroll-Animation/
├── docs/
│   ├── ADMIN_PANEL.md              # Master plan + 10-step flow
│   └── ADMIN_FOLDER_STRUCTURE.md   # This file
├── deploy/
│   └── admin/                      # Docker / prod (Step 10)
│
├── lib/
│   ├── admin-shared/               # Types, IVA, i18n, Zod
│   │   └── src/
│   │       ├── constants.ts
│   │       ├── types/
│   │       ├── vat/
│   │       ├── i18n/
│   │       └── validation/
│   ├── admin-db/                   # Prisma + PostgreSQL
│   │   ├── prisma/                 # schema.prisma (Step 3)
│   │   ├── sql/                    # Raw SQL (Step 2)
│   │   └── src/index.ts
│   └── pricing/                    # Existing engine (reused Step 7)
│
├── artifacts/
│   ├── admin-api/                  # Express REST :8090
│   │   └── src/
│   │       ├── index.ts
│   │       ├── app.ts
│   │       ├── config/
│   │       ├── routes/
│   │       ├── middleware/
│   │       ├── utils/
│   │       ├── types/
│   │       └── modules/
│   │           ├── auth/
│   │           ├── products/
│   │           ├── categories/
│   │           ├── customers/
│   │           ├── pricing/
│   │           ├── promotions/
│   │           ├── orders/
│   │           ├── inventory/
│   │           ├── vat/
│   │           ├── analytics/
│   │           └── audit/
│   │
│   ├── admin-dashboard/            # Next.js :3001
│   │   └── src/
│   │       ├── app/
│   │       │   ├── (auth)/login/
│   │       │   └── (dashboard)/
│   │       │       ├── dashboard/
│   │       │       ├── products/ [id] new/
│   │       │       ├── categories/
│   │       │       ├── customers/ [id]/
│   │       │       ├── pricing/
│   │       │       ├── promotions/
│   │       │       ├── orders/ [id]/
│   │       │       ├── inventory/
│   │       │       └── settings/
│   │       ├── components/ layout ui charts tables forms
│   │       ├── lib/ api-client auth i18n
│   │       ├── hooks/
│   │       ├── types/
│   │       └── config/navigation.ts
│   │
│   ├── samphone/                   # Existing storefront
│   └── api-server/                 # Legacy pricing API
```

## Ports

| Service | Port |
|---------|------|
| Storefront (samphone) | Vite dev |
| Legacy API | 8080 |
| **Admin API** | **8090** |
| **Admin Dashboard** | **3001** |

## Confirm Step 1

Reply **confirm Step 1** to begin **Step 2: PostgreSQL database schema**.
