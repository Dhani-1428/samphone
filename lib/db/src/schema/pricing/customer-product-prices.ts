import { boolean, integer, pgTable, text, timestamp, uuid, varchar } from "drizzle-orm/pg-core";
import { customersTable } from "./customers";
import { productsTable } from "./products";

export const customerProductPricesTable = pgTable(
  "customer_product_prices",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    customerId: uuid("customer_id")
      .notNull()
      .references(() => customersTable.id, { onDelete: "cascade" }),
    productId: uuid("product_id").references(() => productsTable.id, { onDelete: "cascade" }),
    wooProductId: integer("woo_product_id"),
    ruleType: varchar("rule_type", { length: 32 }).notNull(),
    fixedPriceCents: integer("fixed_price_cents"),
    percentBps: integer("percent_bps"),
    minQuantity: integer("min_quantity").notNull().default(1),
    maxQuantity: integer("max_quantity"),
    vatMode: varchar("vat_mode", { length: 16 }).notNull().default("inclusive"),
    validFrom: timestamp("valid_from", { withTimezone: true }),
    validTo: timestamp("valid_to", { withTimezone: true }),
    isActive: boolean("is_active").notNull().default(true),
    notes: text("notes"),
    createdBy: uuid("created_by"),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
    deletedAt: timestamp("deleted_at", { withTimezone: true }),
  },
  (t) => ({
    customerProductIdx: { columns: [t.customerId, t.productId] },
    customerWooIdx: { columns: [t.customerId, t.wooProductId] },
    activeIdx: { columns: [t.isActive, t.validFrom, t.validTo] },
  }),
);

export type CustomerProductPrice = typeof customerProductPricesTable.$inferSelect;
