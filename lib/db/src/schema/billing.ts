import { relations, sql } from "drizzle-orm";
import {
  boolean,
  index,
  numeric,
  pgTable,
  text,
  timestamp,
  uniqueIndex,
  uuid,
  varchar,
} from "drizzle-orm/pg-core";
import { usersTable } from "./user-profiles";

export const subscriptionPlansTable = pgTable(
  "subscription_plans",
  {
    id: varchar("id", { length: 50 }).primaryKey(), // 'FREE', 'PREMIUM_MONTHLY', 'PREMIUM_ANNUAL', 'FAMILY_MONTHLY', 'FAMILY_ANNUAL'
    tier: varchar("tier", { length: 20 }).notNull(), // 'FREE', 'PREMIUM', 'FAMILY'
    name: varchar("name", { length: 100 }).notNull(),
    billingCycle: varchar("billing_cycle", { length: 20 }).notNull().default("monthly"), // 'monthly', 'annual'
    price: numeric("price", { precision: 14, scale: 2 }).notNull().default("0"),
    currency: varchar("currency", { length: 10 }).notNull().default("INR"),
    razorpayPlanId: varchar("razorpay_plan_id", { length: 100 }),
    description: text("description").notNull().default(""),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
);

export const userSubscriptionsTable = pgTable(
  "user_subscriptions",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    userId: uuid("user_id")
      .notNull()
      .references(() => usersTable.id, { onDelete: "cascade" }),
    tier: varchar("tier", { length: 20 }).notNull().default("FREE"), // 'FREE', 'PREMIUM', 'FAMILY'
    billingCycle: varchar("billing_cycle", { length: 20 }).notNull().default("monthly"), // 'monthly', 'annual'
    status: varchar("status", { length: 30 }).notNull().default("active"), // 'created', 'active', 'past_due', 'cancelled', 'expired'
    razorpaySubscriptionId: varchar("razorpay_subscription_id", { length: 100 }),
    razorpayPlanId: varchar("razorpay_plan_id", { length: 100 }),
    currentPeriodStart: timestamp("current_period_start", { withTimezone: true }),
    currentPeriodEnd: timestamp("current_period_end", { withTimezone: true }),
    cancelAtPeriodEnd: boolean("cancel_at_period_end").notNull().default(false),
    cancelledAt: timestamp("cancelled_at", { withTimezone: true }),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    uniqueIndex("user_subscriptions_user_id_unique").on(table.userId),
    index("user_subscriptions_status_idx").on(table.status),
    index("user_subscriptions_rzp_sub_idx").on(table.razorpaySubscriptionId),
  ],
);

export const paymentTransactionsTable = pgTable(
  "payment_transactions",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    userId: uuid("user_id")
      .notNull()
      .references(() => usersTable.id, { onDelete: "cascade" }),
    userSubscriptionId: uuid("user_subscription_id").references(
      () => userSubscriptionsTable.id,
      { onDelete: "set null" },
    ),
    razorpayPaymentId: varchar("razorpay_payment_id", { length: 100 }).notNull(),
    razorpayOrderId: varchar("razorpay_order_id", { length: 100 }),
    razorpaySubscriptionId: varchar("razorpay_subscription_id", { length: 100 }),
    amount: numeric("amount", { precision: 14, scale: 2 }).notNull(),
    currency: varchar("currency", { length: 10 }).notNull().default("INR"),
    status: varchar("status", { length: 30 }).notNull(), // 'captured', 'failed', 'refunded', 'authorized'
    method: varchar("method", { length: 50 }), // 'card', 'upi', 'netbanking', 'wallet'
    tier: varchar("tier", { length: 20 }).notNull(),
    billingCycle: varchar("billing_cycle", { length: 20 }).notNull().default("monthly"),
    errorCode: varchar("error_code", { length: 100 }),
    errorDescription: text("error_description"),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    uniqueIndex("payment_transactions_rzp_payment_id_unique").on(table.razorpayPaymentId),
    index("payment_transactions_user_id_idx").on(table.userId),
    index("payment_transactions_order_id_idx").on(table.razorpayOrderId),
    index("payment_transactions_created_at_idx").on(table.createdAt),
  ],
);

export const webhookEventsTable = pgTable(
  "webhook_events",
  {
    id: varchar("id", { length: 100 }).primaryKey(), // Razorpay event ID (x-razorpay-event-id or payload id)
    eventType: varchar("event_type", { length: 100 }).notNull(),
    status: varchar("status", { length: 30 }).notNull().default("processed"), // 'processed', 'failed', 'duplicate'
    payload: text("payload").notNull(),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    index("webhook_events_event_type_idx").on(table.eventType),
    index("webhook_events_created_at_idx").on(table.createdAt),
  ],
);

export const userSubscriptionsRelations = relations(userSubscriptionsTable, ({ one, many }) => ({
  user: one(usersTable, {
    fields: [userSubscriptionsTable.userId],
    references: [usersTable.id],
  }),
  payments: many(paymentTransactionsTable),
}));

export const paymentTransactionsRelations = relations(paymentTransactionsTable, ({ one }) => ({
  user: one(usersTable, {
    fields: [paymentTransactionsTable.userId],
    references: [usersTable.id],
  }),
  subscription: one(userSubscriptionsTable, {
    fields: [paymentTransactionsTable.userSubscriptionId],
    references: [userSubscriptionsTable.id],
  }),
}));

export type SubscriptionPlan = typeof subscriptionPlansTable.$inferSelect;
export type UserSubscriptionRecord = typeof userSubscriptionsTable.$inferSelect;
export type PaymentTransactionRecord = typeof paymentTransactionsTable.$inferSelect;
export type WebhookEventRecord = typeof webhookEventsTable.$inferSelect;
