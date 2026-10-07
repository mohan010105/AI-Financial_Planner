import { relations, sql } from "drizzle-orm";
import { createInsertSchema } from "drizzle-zod";
import {
  boolean,
  check,
  date,
  index,
  numeric,
  pgEnum,
  pgTable,
  timestamp,
  uuid,
  varchar,
} from "drizzle-orm/pg-core";
import { z } from "zod/v4";
import { usersTable } from "./user-profiles";

export const transactionTypeEnum = pgEnum("transaction_type", ["INCOME", "EXPENSE"]);
export const transactionCategoryEnum = pgEnum("transaction_category", [
  "Salary",
  "Freelance",
  "Business",
  "Housing",
  "Food",
  "Transport",
  "Healthcare",
  "Education",
  "Shopping",
  "Entertainment",
  "Utilities",
  "EMI/Loans",
  "Subscriptions",
  "Other",
]);

export const transactionsTable = pgTable(
  "transactions",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    userId: uuid("user_id")
      .notNull()
      .references(() => usersTable.id, { onDelete: "cascade" }),
    type: transactionTypeEnum("type").notNull(),
    amount: numeric("amount", { precision: 14, scale: 2 }).notNull(),
    category: transactionCategoryEnum("category").notNull(),
    description: varchar("description", { length: 500 }).notNull().default(""),
    transactionDate: date("transaction_date").notNull(),
    recurring: boolean("recurring").notNull().default(false),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .defaultNow()
      .$onUpdate(() => new Date()),
  },
  (table) => [
    check(
      "transactions_amount_positive_check",
      sql`${table.amount} > 0 AND ${table.amount} <= 999999999999.99`,
    ),
    check(
      "transactions_category_matches_type_check",
      sql`(
        (${table.type} = 'INCOME' AND ${table.category} IN ('Salary', 'Freelance', 'Business', 'Other'))
        OR
        (${table.type} = 'EXPENSE' AND ${table.category} IN ('Housing', 'Food', 'Transport', 'Healthcare', 'Education', 'Shopping', 'Entertainment', 'Utilities', 'EMI/Loans', 'Subscriptions', 'Other'))
      )`,
    ),
    index("transactions_owner_date_idx").on(table.userId, table.transactionDate),
    index("transactions_owner_type_date_idx").on(table.userId, table.type, table.transactionDate),
    index("transactions_owner_category_date_idx").on(table.userId, table.category, table.transactionDate),
  ],
);

export const transactionsRelations = relations(transactionsTable, ({ one }) => ({
  user: one(usersTable, {
    fields: [transactionsTable.userId],
    references: [usersTable.id],
  }),
}));

export const insertTransactionSchema = createInsertSchema(transactionsTable).omit({
  id: true,
  userId: true,
  createdAt: true,
  updatedAt: true,
});

export type InsertTransaction = z.infer<typeof insertTransactionSchema>;
export type Transaction = typeof transactionsTable.$inferSelect;
