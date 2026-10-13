import { and, desc, eq, gte, lt, sql } from "drizzle-orm";
import { Router, type Request, type Response } from "express";
import { db, financialProfilesTable, transactionsTable } from "@workspace/db";
import { requireAuthentication } from "../middleware/auth";
import {
  buildHealthIndicators,
  calculateCategoryPercentages,
  calculateEmergencyFundCoverage,
  calculateExpenseToIncomeRatio,
  calculateSavings,
  calculateSavingsRate,
} from "../services/analytics";

const router = Router();

function sendError(response: Response, status: number, error: string, code: string): void {
  response.status(status).json({ error, code });
}

function getUserId(request: Request, response: Response): string | undefined {
  if (!request.authUserId) {
    sendError(response, 401, "Sign in to continue.", "UNAUTHENTICATED");
    return undefined;
  }
  return request.authUserId;
}

function formatMonth(date: Date): string {
  return `${date.getUTCFullYear()}-${String(date.getUTCMonth() + 1).padStart(2, "0")}`;
}

function toNumber(value: string | number | null | undefined): number {
  const parsed = Number(value ?? 0);
  return Number.isFinite(parsed) ? parsed : 0;
}

function serializeTransaction(row: typeof transactionsTable.$inferSelect) {
  return {
    id: row.id,
    type: row.type,
    amount: Number(row.amount),
    category: row.category,
    description: row.description,
    transactionDate: row.transactionDate,
    recurring: row.recurring,
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
  };
}

/**
 * GET /api/analytics/summary
 * Calculates overall and current-month numerical financial totals deterministically.
 */
router.get("/analytics/summary", requireAuthentication, async (request, response): Promise<void> => {
  const userId = getUserId(request, response);
  if (!userId) return;

  const now = new Date();
  const asOfDate = now.toISOString().slice(0, 10);
  const currentMonth = formatMonth(now);
  const currentMonthStart = `${currentMonth}-01`;
  const nextMonthStart = `${formatMonth(new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() + 1, 1)))}-01`;

  const incomeSum = sql<string>`COALESCE(SUM(CASE WHEN ${transactionsTable.type} = 'INCOME' THEN ${transactionsTable.amount} ELSE 0 END), 0)::text`;
  const expenseSum = sql<string>`COALESCE(SUM(CASE WHEN ${transactionsTable.type} = 'EXPENSE' THEN ${transactionsTable.amount} ELSE 0 END), 0)::text`;

  try {
    const [profile] = await db
      .select({ currencyCode: financialProfilesTable.currencyCode })
      .from(financialProfilesTable)
      .where(eq(financialProfilesTable.userId, userId))
      .limit(1);

    const [allTime] = await db
      .select({ income: incomeSum, expenses: expenseSum })
      .from(transactionsTable)
      .where(eq(transactionsTable.userId, userId));

    const [currentMonthTotals] = await db
      .select({ income: incomeSum, expenses: expenseSum })
      .from(transactionsTable)
      .where(
        and(
          eq(transactionsTable.userId, userId),
          gte(transactionsTable.transactionDate, currentMonthStart),
          lt(transactionsTable.transactionDate, nextMonthStart),
        ),
      );

    const totalIncome = toNumber(allTime?.income);
    const totalExpenses = toNumber(allTime?.expenses);
    const totalSavings = calculateSavings(totalIncome, totalExpenses);
    const allTimeSavingsRate = calculateSavingsRate(totalIncome, totalExpenses);

    const currentMonthIncome = toNumber(currentMonthTotals?.income);
    const currentMonthExpenses = toNumber(currentMonthTotals?.expenses);
    const currentMonthSavings = calculateSavings(currentMonthIncome, currentMonthExpenses);
    const currentMonthSavingsRate = calculateSavingsRate(currentMonthIncome, currentMonthExpenses);

    response.setHeader("Cache-Control", "no-store");
    response.json({
      currencyCode: profile?.currencyCode ?? null,
      asOfDate,
      currentMonth,
      totalIncome,
      totalExpenses,
      totalSavings,
      allTimeSavingsRate,
      currentMonthIncome,
      currentMonthExpenses,
      currentMonthSavings,
      currentMonthSavingsRate,
    });
  } catch {
    sendError(response, 500, "Analytics summary could not be calculated.", "ANALYTICS_SUMMARY_FAILED");
  }
});

/**
 * GET /api/analytics/monthly
 * Calculates 6-month trend history for income, expenses, savings, and savings rates.
 */
router.get("/analytics/monthly", requireAuthentication, async (request, response): Promise<void> => {
  const userId = getUserId(request, response);
  if (!userId) return;

  const now = new Date();
  const asOfDate = now.toISOString().slice(0, 10);
  const nextMonthStart = `${formatMonth(new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() + 1, 1)))}-01`;
  const firstTrendMonth = formatMonth(new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() - 5, 1)));
  const firstTrendDate = `${firstTrendMonth}-01`;

  const monthExpression = sql<string>`to_char(${transactionsTable.transactionDate}::date, 'YYYY-MM')`;
  const incomeSum = sql<string>`COALESCE(SUM(CASE WHEN ${transactionsTable.type} = 'INCOME' THEN ${transactionsTable.amount} ELSE 0 END), 0)::text`;
  const expenseSum = sql<string>`COALESCE(SUM(CASE WHEN ${transactionsTable.type} = 'EXPENSE' THEN ${transactionsTable.amount} ELSE 0 END), 0)::text`;

  try {
    const [profile] = await db
      .select({ currencyCode: financialProfilesTable.currencyCode })
      .from(financialProfilesTable)
      .where(eq(financialProfilesTable.userId, userId))
      .limit(1);

    const monthRows = await db
      .select({
        month: monthExpression,
        income: incomeSum,
        expenses: expenseSum,
      })
      .from(transactionsTable)
      .where(
        and(
          eq(transactionsTable.userId, userId),
          gte(transactionsTable.transactionDate, firstTrendDate),
          lt(transactionsTable.transactionDate, nextMonthStart),
        ),
      )
      .groupBy(monthExpression)
      .orderBy(monthExpression);

    const monthTotalsMap = new Map(
      monthRows.map((row) => [
        row.month,
        {
          income: toNumber(row.income),
          expenses: toNumber(row.expenses),
        },
      ]),
    );

    const months = Array.from({ length: 6 }, (_, index) => {
      const monthDate = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() - 5 + index, 1));
      const month = formatMonth(monthDate);
      const totals = monthTotalsMap.get(month) ?? { income: 0, expenses: 0 };
      const savings = calculateSavings(totals.income, totals.expenses);
      const savingsRate = calculateSavingsRate(totals.income, totals.expenses);

      return {
        month,
        income: totals.income,
        expenses: totals.expenses,
        savings,
        savingsRate,
        netCashFlow: savings,
      };
    });

    response.setHeader("Cache-Control", "no-store");
    response.json({
      currencyCode: profile?.currencyCode ?? null,
      asOfDate,
      months,
    });
  } catch (err) {
    request.log?.error({ err }, "Monthly analytics trend calculation failed");
    sendError(response, 500, "Monthly analytics trend could not be calculated.", "ANALYTICS_MONTHLY_FAILED");
  }
});

/**
 * GET /api/analytics/categories
 * Calculates expense category breakdown and percentage of total expenses.
 */
router.get("/analytics/categories", requireAuthentication, async (request, response): Promise<void> => {
  const userId = getUserId(request, response);
  if (!userId) return;

  const now = new Date();
  const asOfDate = now.toISOString().slice(0, 10);
  const currentMonth = formatMonth(now);
  const currentMonthStart = `${currentMonth}-01`;
  const nextMonthStart = `${formatMonth(new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() + 1, 1)))}-01`;

  const categorySum = sql<string>`COALESCE(SUM(${transactionsTable.amount}), 0)::text`;

  try {
    const [profile] = await db
      .select({ currencyCode: financialProfilesTable.currencyCode })
      .from(financialProfilesTable)
      .where(eq(financialProfilesTable.userId, userId))
      .limit(1);

    const currentMonthRows = await db
      .select({
        category: transactionsTable.category,
        amount: categorySum,
      })
      .from(transactionsTable)
      .where(
        and(
          eq(transactionsTable.userId, userId),
          eq(transactionsTable.type, "EXPENSE"),
          gte(transactionsTable.transactionDate, currentMonthStart),
          lt(transactionsTable.transactionDate, nextMonthStart),
        ),
      )
      .groupBy(transactionsTable.category)
      .orderBy(desc(categorySum));

    const allTimeRows = await db
      .select({
        category: transactionsTable.category,
        amount: categorySum,
      })
      .from(transactionsTable)
      .where(
        and(
          eq(transactionsTable.userId, userId),
          eq(transactionsTable.type, "EXPENSE"),
        ),
      )
      .groupBy(transactionsTable.category)
      .orderBy(desc(categorySum));

    const totalCurrentMonthExpenses = currentMonthRows.reduce((sum, r) => sum + toNumber(r.amount), 0);
    const totalAllTimeExpenses = allTimeRows.reduce((sum, r) => sum + toNumber(r.amount), 0);

    const currentMonthCategories = calculateCategoryPercentages(
      currentMonthRows.map((r) => ({ category: r.category, amount: toNumber(r.amount) })),
      totalCurrentMonthExpenses,
    );

    const allTimeCategories = calculateCategoryPercentages(
      allTimeRows.map((r) => ({ category: r.category, amount: toNumber(r.amount) })),
      totalAllTimeExpenses,
    );

    response.setHeader("Cache-Control", "no-store");
    response.json({
      currencyCode: profile?.currencyCode ?? null,
      asOfDate,
      currentMonth,
      totalCurrentMonthExpenses,
      totalAllTimeExpenses,
      currentMonthCategories,
      allTimeCategories,
    });
  } catch {
    sendError(response, 500, "Category analytics breakdown could not be calculated.", "ANALYTICS_CATEGORIES_FAILED");
  }
});

/**
 * GET /api/analytics/recurring
 * Calculates recurring transactions, total recurring expenses, and percentage.
 */
router.get("/analytics/recurring", requireAuthentication, async (request, response): Promise<void> => {
  const userId = getUserId(request, response);
  if (!userId) return;

  const now = new Date();
  const asOfDate = now.toISOString().slice(0, 10);
  const currentMonth = formatMonth(now);
  const currentMonthStart = `${currentMonth}-01`;
  const nextMonthStart = `${formatMonth(new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() + 1, 1)))}-01`;

  try {
    const [profile] = await db
      .select({ currencyCode: financialProfilesTable.currencyCode })
      .from(financialProfilesTable)
      .where(eq(financialProfilesTable.userId, userId))
      .limit(1);

    const recurringRows = await db
      .select()
      .from(transactionsTable)
      .where(
        and(
          eq(transactionsTable.userId, userId),
          eq(transactionsTable.recurring, true),
        ),
      )
      .orderBy(desc(transactionsTable.transactionDate));

    const [currentMonthTotal] = await db
      .select({
        totalExpenses: sql<string>`COALESCE(SUM(CASE WHEN ${transactionsTable.type} = 'EXPENSE' THEN ${transactionsTable.amount} ELSE 0 END), 0)::text`,
      })
      .from(transactionsTable)
      .where(
        and(
          eq(transactionsTable.userId, userId),
          gte(transactionsTable.transactionDate, currentMonthStart),
          lt(transactionsTable.transactionDate, nextMonthStart),
        ),
      );

    const totalRecurringMonthlyIncome = recurringRows
      .filter((r) => r.type === "INCOME")
      .reduce((sum, r) => sum + toNumber(r.amount), 0);

    const totalRecurringMonthlyExpenses = recurringRows
      .filter((r) => r.type === "EXPENSE")
      .reduce((sum, r) => sum + toNumber(r.amount), 0);

    const totalExpensesMonth = toNumber(currentMonthTotal?.totalExpenses);
    const recurringExpensesPercentage =
      totalExpensesMonth > 0
        ? Math.round((totalRecurringMonthlyExpenses / totalExpensesMonth) * 100 * 100) / 100
        : 0;

    response.setHeader("Cache-Control", "no-store");
    response.json({
      currencyCode: profile?.currencyCode ?? null,
      asOfDate,
      totalRecurringMonthlyIncome: Math.round(totalRecurringMonthlyIncome * 100) / 100,
      totalRecurringMonthlyExpenses: Math.round(totalRecurringMonthlyExpenses * 100) / 100,
      recurringExpensesPercentage,
      recurringItemCount: recurringRows.length,
      items: recurringRows.map(serializeTransaction),
    });
  } catch {
    sendError(response, 500, "Recurring analytics summary could not be calculated.", "ANALYTICS_RECURRING_FAILED");
  }
});

/**
 * GET /api/analytics/financial-health
 * Calculates transparent, objective financial health indicators based on user data.
 */
router.get("/analytics/financial-health", requireAuthentication, async (request, response): Promise<void> => {
  const userId = getUserId(request, response);
  if (!userId) return;

  const now = new Date();
  const asOfDate = now.toISOString().slice(0, 10);
  const currentMonth = formatMonth(now);
  const currentMonthStart = `${currentMonth}-01`;
  const nextMonthStart = `${formatMonth(new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() + 1, 1)))}-01`;

  const incomeSum = sql<string>`COALESCE(SUM(CASE WHEN ${transactionsTable.type} = 'INCOME' THEN ${transactionsTable.amount} ELSE 0 END), 0)::text`;
  const expenseSum = sql<string>`COALESCE(SUM(CASE WHEN ${transactionsTable.type} = 'EXPENSE' THEN ${transactionsTable.amount} ELSE 0 END), 0)::text`;

  try {
    const [profile] = await db
      .select()
      .from(financialProfilesTable)
      .where(eq(financialProfilesTable.userId, userId))
      .limit(1);

    const [currentMonthTotals] = await db
      .select({ income: incomeSum, expenses: expenseSum })
      .from(transactionsTable)
      .where(
        and(
          eq(transactionsTable.userId, userId),
          gte(transactionsTable.transactionDate, currentMonthStart),
          lt(transactionsTable.transactionDate, nextMonthStart),
        ),
      );

    const currentMonthIncome = toNumber(currentMonthTotals?.income);
    const currentMonthExpenses = toNumber(currentMonthTotals?.expenses);

    const savingsRate = calculateSavingsRate(currentMonthIncome, currentMonthExpenses);
    const expenseToIncomeRatio = calculateExpenseToIncomeRatio(currentMonthIncome, currentMonthExpenses);

    const emergencyFundAmount = profile ? toNumber(profile.emergencyFundAmount) : 0;
    const monthlyFixedExpenses = profile ? toNumber(profile.monthlyFixedExpenses) : 0;
    const monthlyVariableExpenses = profile ? toNumber(profile.monthlyVariableExpenses) : 0;
    const essentialMonthlyExpenses = monthlyFixedExpenses > 0 ? monthlyFixedExpenses : currentMonthExpenses;

    const emergencyFundCoverageMonths = calculateEmergencyFundCoverage(
      emergencyFundAmount,
      essentialMonthlyExpenses,
    );

    const healthMetrics = {
      savingsRate,
      expenseToIncomeRatio,
      emergencyFundCoverageMonths,
      emergencyFundAmount,
      monthlyFixedExpenses,
      monthlyVariableExpenses,
      essentialMonthlyExpenses,
      primaryGoal: profile?.primaryGoal ?? null,
      planningHorizon: profile?.planningHorizon ?? null,
      hasFinancialProfile: !!profile,
    };

    const indicators = buildHealthIndicators(healthMetrics);

    response.setHeader("Cache-Control", "no-store");
    response.json({
      currencyCode: profile?.currencyCode ?? null,
      asOfDate,
      metrics: healthMetrics,
      indicators,
    });
  } catch {
    sendError(response, 500, "Financial health indicators could not be calculated.", "ANALYTICS_HEALTH_FAILED");
  }
});

export default router;
