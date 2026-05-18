import { boolean, integer, pgTable, timestamp, uuid, varchar } from "drizzle-orm/pg-core";

export const vatRulesTable = pgTable("vat_rules", {
  id: uuid("id").primaryKey().defaultRandom(),
  code: varchar("code", { length: 8 }).notNull(),
  name: varchar("name", { length: 128 }).notNull(),
  /** Rate in basis points: 2300 = 23% */
  rateBps: integer("rate_bps").notNull(),
  countryCode: varchar("country_code", { length: 2 }).notNull().default("PT"),
  isDefault: boolean("is_default").notNull().default(false),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  deletedAt: timestamp("deleted_at", { withTimezone: true }),
});

export type VatRuleRow = typeof vatRulesTable.$inferSelect;
