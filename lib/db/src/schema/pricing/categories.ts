import { integer, pgTable, text, timestamp, uuid, varchar } from "drizzle-orm/pg-core";

export const categoriesTable = pgTable(
  "categories",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    wooCategoryId: integer("woo_category_id").unique(),
    slug: varchar("slug", { length: 128 }).notNull().unique(),
    name: varchar("name", { length: 255 }).notNull(),
    parentId: uuid("parent_id"),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
    deletedAt: timestamp("deleted_at", { withTimezone: true }),
  },
  (t) => ({
    slugIdx: { columns: [t.slug] },
    wooIdx: { columns: [t.wooCategoryId] },
  }),
);

export type Category = typeof categoriesTable.$inferSelect;
