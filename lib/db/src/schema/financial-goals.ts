import { relations, sql } from "drizzle-orm";
import { createInsertSchema } from "drizzle-zod";
import {
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

export const goalTypeEnum = pgEnum("goal_type", [
  "emergency_fund",
  "education",
  "travel",
  "major_purchase",
  "debt_reduction",
  "savings",
  "custom_goal",
]);

export const goalPriorityEnum = pgEnum("goal_priority", [
  "low",
  "medium",
  "high",
  "critical",
]);

export const financialGoalsTable = pgTable(
  "financial_goals",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    userId: uuid("user_id")
      .notNull()
      .references(() => usersTable.id, { onDelete: "cascade" }),
    name: varchar("name", { length: 120 }).notNull(),
    type: goalTypeEnum("type").notNull(),
    targetAmount: numeric("target_amount", { precision: 14, scale: 2 }).notNull(),
    currentAmount: numeric("current_amount", { precision: 14, scale: 2 }).notNull().default("0"),
    targetDate: date("target_date").notNull(),
    priority: goalPriorityEnum("priority").notNull().default("medium"),
    notes: varchar("notes", { length: 1000 }).notNull().default(""),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .defaultNow()
      .$onUpdate(() => new Date()),
  },
  (table) => [
    check(
      "goals_target_amount_check",
      sql`${table.targetAmount} > 0 AND ${table.targetAmount} <= 999999999999.99`,
    ),
    check(
      "goals_current_amount_check",
      sql`${table.currentAmount} >= 0 AND ${table.currentAmount} <= 999999999999.99`,
    ),
    index("goals_owner_target_date_idx").on(table.userId, table.targetDate),
    index("goals_owner_priority_idx").on(table.userId, table.priority),
  ],
);

export const goalContributionsTable = pgTable(
  "goal_contributions",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    goalId: uuid("goal_id")
      .notNull()
      .references(() => financialGoalsTable.id, { onDelete: "cascade" }),
    userId: uuid("user_id")
      .notNull()
      .references(() => usersTable.id, { onDelete: "cascade" }),
    amount: numeric("amount", { precision: 14, scale: 2 }).notNull(),
    contributionDate: date("contribution_date").notNull(),
    notes: varchar("notes", { length: 255 }).notNull().default(""),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    check(
      "contributions_amount_check",
      sql`${table.amount} > 0 AND ${table.amount} <= 999999999999.99`,
    ),
    index("contributions_goal_date_idx").on(table.goalId, table.contributionDate),
    index("contributions_owner_date_idx").on(table.userId, table.contributionDate),
  ],
);

export const financialGoalsRelations = relations(financialGoalsTable, ({ one, many }) => ({
  user: one(usersTable, {
    fields: [financialGoalsTable.userId],
    references: [usersTable.id],
  }),
  contributions: many(goalContributionsTable),
}));

export const goalContributionsRelations = relations(goalContributionsTable, ({ one }) => ({
  goal: one(financialGoalsTable, {
    fields: [goalContributionsTable.goalId],
    references: [financialGoalsTable.id],
  }),
  user: one(usersTable, {
    fields: [goalContributionsTable.userId],
    references: [usersTable.id],
  }),
}));

export const insertFinancialGoalSchema = createInsertSchema(financialGoalsTable).omit({
  id: true,
  userId: true,
  createdAt: true,
  updatedAt: true,
});

export const insertGoalContributionSchema = createInsertSchema(goalContributionsTable).omit({
  id: true,
  userId: true,
  createdAt: true,
});

export type InsertFinancialGoal = z.infer<typeof insertFinancialGoalSchema>;
export type FinancialGoal = typeof financialGoalsTable.$inferSelect;
export type InsertGoalContribution = z.infer<typeof insertGoalContributionSchema>;
export type GoalContribution = typeof goalContributionsTable.$inferSelect;
