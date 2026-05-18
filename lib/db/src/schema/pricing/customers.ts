import { boolean, pgTable, text, timestamp, uuid, varchar } from "drizzle-orm/pg-core";

export const customersTable = pgTable(
  "customers",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    email: varchar("email", { length: 320 }).notNull().unique(),
    name: varchar("name", { length: 255 }).notNull(),
    /** retail | b2b | dealer | wholesale */
    customerType: varchar("customer_type", { length: 32 }).notNull().default("retail"),
    locale: varchar("locale", { length: 8 }).notNull().default("pt-PT"),
    vatNumber: varchar("vat_number", { length: 32 }),
    gdprConsentAt: timestamp("gdpr_consent_at", { withTimezone: true }),
    isActive: boolean("is_active").notNull().default(true),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
    deletedAt: timestamp("deleted_at", { withTimezone: true }),
  },
  (t) => ({
    emailIdx: { columns: [t.email] },
    typeIdx: { columns: [t.customerType] },
  }),
);

export type Customer = typeof customersTable.$inferSelect;
export type InsertCustomer = typeof customersTable.$inferInsert;
