import { integer, pgTable, timestamp, uuid, varchar } from "drizzle-orm/pg-core";
import { categoriesTable } from "./categories";
import { vatRulesTable } from "./vat-rules";

export const productsTable = pgTable(
  "products",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    wooProductId: integer("woo_product_id").unique(),
    sku: varchar("sku", { length: 64 }),
    name: varchar("name", { length: 512 }).notNull(),
    categoryId: uuid("category_id").references(() => categoriesTable.id),
    /** Catalog base price in EUR cents */
    basePriceCents: integer("base_price_cents").notNull().default(0),
    currency: varchar("currency", { length: 3 }).notNull().default("EUR"),
    vatRuleId: uuid("vat_rule_id").references(() => vatRulesTable.id),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
    deletedAt: timestamp("deleted_at", { withTimezone: true }),
  },
  (t) => ({
    wooIdx: { columns: [t.wooProductId] },
    skuIdx: { columns: [t.sku] },
    categoryIdx: { columns: [t.categoryId] },
  }),
);

export type Product = typeof productsTable.$inferSelect;
