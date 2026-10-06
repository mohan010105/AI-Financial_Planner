import { sql } from "drizzle-orm";
import { createInsertSchema } from "drizzle-zod";
import {
  check,
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

export const ageRangeEnum = pgEnum("age_range", [
  "18-24",
  "25-34",
  "35-44",
  "45-54",
  "55-64",
  "65+",
]);
export const employmentStatusEnum = pgEnum("employment_status", [
  "employed",
  "self_employed",
  "unemployed",
  "student",
  "retired",
  "other",
]);
export const financialGoalEnum = pgEnum("financial_goal", [
  "emergency_fund",
  "debt_repayment",
  "home_purchase",
  "education",
  "retirement",
  "long_term_savings",
  "other",
]);
export const planningHorizonEnum = pgEnum("planning_horizon", [
  "under_1_year",
  "1_to_3_years",
  "3_to_5_years",
  "5_plus_years",
]);

export const financialProfilesTable = pgTable(
  "financial_profiles",
  {
    userId: uuid("user_id")
      .primaryKey()
      .references(() => usersTable.id, { onDelete: "cascade" }),
    name: varchar("name", { length: 120 }).notNull(),
    ageRange: ageRangeEnum("age_range").notNull(),
    employmentStatus: employmentStatusEnum("employment_status").notNull(),
    currencyCode: varchar("currency_code", { length: 3 }).notNull(),
    monthlyIncome: numeric("monthly_income", { precision: 14, scale: 2 }).notNull(),
    existingSavings: numeric("existing_savings", { precision: 14, scale: 2 }).notNull(),
    monthlyFixedExpenses: numeric("monthly_fixed_expenses", { precision: 14, scale: 2 }).notNull(),
    monthlyVariableExpenses: numeric("monthly_variable_expenses", { precision: 14, scale: 2 }).notNull(),
    monthlyLoanPayments: numeric("monthly_loan_payments", { precision: 14, scale: 2 }).notNull(),
    emergencyFundAmount: numeric("emergency_fund_amount", { precision: 14, scale: 2 }).notNull(),
    primaryGoal: financialGoalEnum("primary_goal").notNull(),
    planningHorizon: planningHorizonEnum("planning_horizon").notNull(),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .defaultNow()
      .$onUpdate(() => new Date()),
  },
  (table) => [
    check(
      "financial_profiles_monthly_amounts_check",
      sql`${table.monthlyIncome} BETWEEN 0 AND 100000000
        AND ${table.monthlyFixedExpenses} BETWEEN 0 AND 100000000
        AND ${table.monthlyVariableExpenses} BETWEEN 0 AND 100000000
        AND ${table.monthlyLoanPayments} BETWEEN 0 AND 100000000`,
    ),
    check(
      "financial_profiles_savings_amounts_check",
      sql`${table.existingSavings} BETWEEN 0 AND 999999999999.99
        AND ${table.emergencyFundAmount} BETWEEN 0 AND 999999999999.99`,
    ),
    index("financial_profiles_updated_at_idx").on(table.updatedAt),
  ],
);

export const insertFinancialProfileSchema = createInsertSchema(financialProfilesTable).omit({
  createdAt: true,
  updatedAt: true,
});

export type InsertFinancialProfile = z.infer<typeof insertFinancialProfileSchema>;
export type FinancialProfile = typeof financialProfilesTable.$inferSelect;
