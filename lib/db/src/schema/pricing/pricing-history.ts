import { integer, pgTable, text, timestamp, uuid, varchar } from "drizzle-orm/pg-core";
import { customersTable } from "./customers";

export const pricingHistoryTable = pgTable(
  "pricing_history",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    entityType: varchar("entity_type", { length: 64 }).notNull(),
    entityId: uuid("entity_id").notNull(),
    customerId: uuid("customer_id").references(() => customersTable.id),
    action: varchar("action", { length: 32 }).notNull(),
    snapshotJson: text("snapshot_json").notNull(),
    actorId: uuid("actor_id"),
    actorEmail: varchar("actor_email", { length: 320 }),
    ipAddress: varchar("ip_address", { length: 45 }),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => ({
    entityIdx: { columns: [t.entityType, t.entityId] },
    customerIdx: { columns: [t.customerId] },
    createdIdx: { columns: [t.createdAt] },
  }),
);
