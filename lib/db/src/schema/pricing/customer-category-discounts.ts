import { boolean, integer, pgTable, timestamp, uuid, varchar } from "drizzle-orm/pg-core";
import { categoriesTable } from "./categories";
import { customersTable } from "./customers";

export const customerCategoryDiscountsTable = pgTable(
  "customer_category_discounts",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    customerId: uuid("customer_id")
      .notNull()
      .references(() => customersTable.id, { onDelete: "cascade" }),
    categoryId: uuid("category_id")
      .notNull()
      .references(() => categoriesTable.id, { onDelete: "cascade" }),
    ruleType: varchar("rule_type", { length: 32 }).notNull(),
    fixedPriceCents: integer("fixed_price_cents"),
    percentBps: integer("percent_bps"),
    validFrom: timestamp("valid_from", { withTimezone: true }),
    validTo: timestamp("valid_to", { withTimezone: true }),
    isActive: boolean("is_active").notNull().default(true),
    createdBy: uuid("created_by"),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
    deletedAt: timestamp("deleted_at", { withTimezone: true }),
  },
  (t) => ({
    customerCategoryIdx: { columns: [t.customerId, t.categoryId] },
  }),
);

export type CustomerCategoryDiscount = typeof customerCategoryDiscountsTable.$inferSelect;
