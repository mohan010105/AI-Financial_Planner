import { and, asc, count, desc, eq, sql } from "drizzle-orm";
import { Router, type Request, type Response } from "express";
import { z } from "zod/v4";
import {
  db,
  financialGoalsTable,
  financialProfilesTable,
  goalContributionsTable,
  transactionsTable,
} from "@workspace/db";
import { requireAuthentication, requireSameOrigin } from "../middleware/auth";
import { calculateGoalMetrics } from "../services/goals";
import { getUserSubscription, PLAN_DEFINITIONS } from "../services/subscription";

const router = Router();

const goalTypes = [
  "emergency_fund",
  "education",
  "travel",
  "major_purchase",
  "debt_reduction",
  "savings",
  "custom_goal",
] as const;

const goalPriorities = ["low", "medium", "high", "critical"] as const;

function isValidIsoDate(value: string): boolean {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const parsed = new Date(`${value}T00:00:00.000Z`);
  return Number.isFinite(parsed.getTime()) && parsed.toISOString().slice(0, 10) === value;
}

const isoDateSchema = z.string().refine(isValidIsoDate, "Use a valid YYYY-MM-DD date.");

const goalInputSchema = z.object({
  name: z.string().trim().min(1, "Goal name is required.").max(100),
  type: z.enum(goalTypes),
  targetAmount: z.number().finite().min(0.01, "Target amount must be positive.").max(999999999999.99),
  currentAmount: z.number().finite().min(0, "Current amount cannot be negative.").default(0),
  targetDate: isoDateSchema,
  priority: z.enum(goalPriorities).default("medium"),
  notes: z.string().trim().max(1000).optional().default(""),
});

const contributionInputSchema = z.object({
  amount: z.number().finite().min(0.01, "Contribution amount must be positive.").max(999999999999.99),
  contributionDate: isoDateSchema,
  note: z.string().trim().max(500).optional().default(""),
});

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

function formatGoalRow(
  row: typeof financialGoalsTable.$inferSelect,
  availableMonthlySurplus?: number,
  averageMonthlyContribution?: number,
) {
  const targetAmount = Number(row.targetAmount);
  const currentAmount = Number(row.currentAmount);
  const metrics = calculateGoalMetrics({
    targetAmount,
    currentAmount,
    targetDate: row.targetDate,
    availableMonthlySurplus,
    averageMonthlyContribution,
  });

  return {
    id: row.id,
    userId: row.userId,
    name: row.name,
    type: row.type,
    targetAmount,
    currentAmount,
    targetDate: row.targetDate,
    priority: row.priority,
    notes: row.notes ?? "",
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
    metrics,
  };
}

async function getAvailableMonthlySurplus(userId: string): Promise<number | undefined> {
  const now = new Date();
  const currentMonth = `${now.getUTCFullYear()}-${String(now.getUTCMonth() + 1).padStart(2, "0")}`;
  const currentMonthStart = `${currentMonth}-01`;
  const nextMonthStart = `${now.getUTCMonth() === 11 ? now.getUTCFullYear() + 1 : now.getUTCFullYear()}-${String((now.getUTCMonth() + 1) % 12 + 1).padStart(2, "0")}-01`;

  // 1. Check current month transactions
  const incomeSum = sql<string>`COALESCE(SUM(CASE WHEN ${transactionsTable.type} = 'INCOME' THEN ${transactionsTable.amount} ELSE 0 END), 0)::text`;
  const expenseSum = sql<string>`COALESCE(SUM(CASE WHEN ${transactionsTable.type} = 'EXPENSE' THEN ${transactionsTable.amount} ELSE 0 END), 0)::text`;

  const [row] = await db
    .select({ income: incomeSum, expenses: expenseSum })
    .from(transactionsTable)
    .where(
      and(
        eq(transactionsTable.userId, userId),
        sql`${transactionsTable.transactionDate} >= ${currentMonthStart}`,
        sql`${transactionsTable.transactionDate} < ${nextMonthStart}`,
      ),
    );

  const monthlyIncome = Number(row?.income ?? 0);
  const monthlyExpenses = Number(row?.expenses ?? 0);

  if (monthlyIncome > 0 || monthlyExpenses > 0) {
    return monthlyIncome - monthlyExpenses;
  }

  // 2. If no current month transactions, check total transactions count
  const [txCountRow] = await db
    .select({ count: count() })
    .from(transactionsTable)
    .where(eq(transactionsTable.userId, userId));

  if (txCountRow && Number(txCountRow.count) > 0) {
    // Has transactions in other months: compute overall net monthly average
    const [allTxRow] = await db
      .select({ income: incomeSum, expenses: expenseSum })
      .from(transactionsTable)
      .where(eq(transactionsTable.userId, userId));
    const allIncome = Number(allTxRow?.income ?? 0);
    const allExpenses = Number(allTxRow?.expenses ?? 0);
    return allIncome - allExpenses;
  }

  // 3. If no transactions, fallback to financial profile income and fixed expenses
  const [profile] = await db
    .select()
    .from(financialProfilesTable)
    .where(eq(financialProfilesTable.userId, userId))
    .limit(1);

  if (profile) {
    const profIncome = Number(profile.monthlyIncome);
    const profExpenses = Number(profile.monthlyFixedExpenses);
    return profIncome - profExpenses;
  }

  // 4. Missing financial data: neither transactions nor financial profile found
  return undefined;
}

// GET /api/goals/list
router.get("/goals/list", requireAuthentication, async (request, response): Promise<void> => {
  const userId = getUserId(request, response);
  if (!userId) return;

  const statusFilter = request.query.status as string | undefined;

  try {
    const surplus = await getAvailableMonthlySurplus(userId);

    // Group contributions by goal to compute active contribution rates
    const contribRows = await db
      .select({
        goalId: goalContributionsTable.goalId,
        total: sql<string>`COALESCE(SUM(${goalContributionsTable.amount}), 0)::text`,
        recent: sql<string>`COALESCE(SUM(CASE WHEN ${goalContributionsTable.contributionDate} >= (CURRENT_DATE - INTERVAL '30 days') THEN ${goalContributionsTable.amount} ELSE 0 END), 0)::text`,
        firstDate: sql<string>`MIN(${goalContributionsTable.contributionDate})`,
      })
      .from(goalContributionsTable)
      .where(eq(goalContributionsTable.userId, userId))
      .groupBy(goalContributionsTable.goalId);

    const contributionsMap = new Map<string, number>();
    const now = new Date();
    for (const c of contribRows) {
      const recent = Number(c.recent);
      if (recent > 0) {
        contributionsMap.set(c.goalId, recent);
      } else {
        const total = Number(c.total);
        if (total > 0 && c.firstDate) {
          const first = new Date(c.firstDate);
          const months = Math.max(
            1,
            (now.getUTCFullYear() - first.getUTCFullYear()) * 12 +
              (now.getUTCMonth() - first.getUTCMonth()),
          );
          contributionsMap.set(c.goalId, Math.round((total / months) * 100) / 100);
        }
      }
    }

    const rows = await db
      .select()
      .from(financialGoalsTable)
      .where(eq(financialGoalsTable.userId, userId))
      .orderBy(asc(financialGoalsTable.targetDate), desc(financialGoalsTable.createdAt));

    const allGoals = rows.map((row) =>
      formatGoalRow(row, surplus, contributionsMap.get(row.id)),
    );

    let filteredGoals = allGoals;
    if (statusFilter === "active") {
      filteredGoals = allGoals.filter((g) => !g.metrics.isCompleted);
    } else if (statusFilter === "completed") {
      filteredGoals = allGoals.filter((g) => g.metrics.isCompleted);
    }

    const totalTarget = allGoals.reduce((sum, g) => sum + g.targetAmount, 0);
    const totalSaved = allGoals.reduce((sum, g) => sum + g.currentAmount, 0);
    const activeGoalsCount = allGoals.filter((g) => !g.metrics.isCompleted).length;
    const completedGoalsCount = allGoals.filter((g) => g.metrics.isCompleted).length;
    const needsAdjustmentCount = allGoals.filter((g) => g.metrics.needsAdjustment).length;

    response.setHeader("Cache-Control", "no-store");
    response.json({
      goals: filteredGoals,
      overallSummary: {
        totalGoals: allGoals.length,
        activeGoalsCount,
        completedGoalsCount,
        needsAdjustmentCount,
        totalTargetAmount: Math.round(totalTarget * 100) / 100,
        totalCurrentAmount: Math.round(totalSaved * 100) / 100,
        totalRemainingAmount: Math.round(Math.max(0, totalTarget - totalSaved) * 100) / 100,
        overallProgressPercentage:
          totalTarget > 0
            ? Math.min(100, Math.round((totalSaved / totalTarget) * 100 * 100) / 100)
            : 0,
      },
    });
  } catch {
    sendError(response, 500, "Financial goals could not be retrieved.", "GOAL_LIST_FAILED");
  }
});

// GET /api/goals/status
router.get("/goals/status", requireAuthentication, async (request, response): Promise<void> => {
  const userId = getUserId(request, response);
  if (!userId) return;

  try {
    const surplus = await getAvailableMonthlySurplus(userId);
    const rows = await db
      .select()
      .from(financialGoalsTable)
      .where(eq(financialGoalsTable.userId, userId));

    const goals = rows.map((row) => formatGoalRow(row, surplus));
    const totalTarget = goals.reduce((sum, g) => sum + g.targetAmount, 0);
    const totalSaved = goals.reduce((sum, g) => sum + g.currentAmount, 0);

    response.setHeader("Cache-Control", "no-store");
    response.json({
      totalGoals: goals.length,
      activeGoalsCount: goals.filter((g) => !g.metrics.isCompleted).length,
      completedGoalsCount: goals.filter((g) => g.metrics.isCompleted).length,
      needsAdjustmentCount: goals.filter((g) => g.metrics.needsAdjustment).length,
      totalTargetAmount: Math.round(totalTarget * 100) / 100,
      totalCurrentAmount: Math.round(totalSaved * 100) / 100,
      totalRemainingAmount: Math.round(Math.max(0, totalTarget - totalSaved) * 100) / 100,
      overallProgressPercentage:
        totalTarget > 0
          ? Math.min(100, Math.round((totalSaved / totalTarget) * 100 * 100) / 100)
          : 0,
    });
  } catch {
    sendError(response, 500, "Goal status could not be retrieved.", "GOAL_STATUS_FAILED");
  }
});

// POST /api/goals
router.post("/goals", requireSameOrigin, requireAuthentication, async (request, response): Promise<void> => {
  const userId = getUserId(request, response);
  if (!userId) return;

  const parsed = goalInputSchema.safeParse(request.body);
  if (!parsed.success) {
    sendError(response, 400, "Financial goal details are invalid.", "INVALID_GOAL_INPUT");
    return;
  }

  try {
    const userSub = getUserSubscription(userId);
    const entitlements = PLAN_DEFINITIONS[userSub.tier].entitlements;
    if (!entitlements.hasUnlimitedGoals) {
      const [existingCount] = await db
        .select({ count: count() })
        .from(financialGoalsTable)
        .where(eq(financialGoalsTable.userId, userId));
      if (Number(existingCount?.count ?? 0) >= entitlements.maxGoals) {
        sendError(
          response,
          403,
          `Free plan limit reached (maximum ${entitlements.maxGoals} goals). Upgrade to Premium for unlimited goals.`,
          "UPGRADE_REQUIRED",
        );
        return;
      }
    }

    const [row] = await db
      .insert(financialGoalsTable)
      .values({
        userId,
        name: parsed.data.name,
        type: parsed.data.type,
        targetAmount: parsed.data.targetAmount.toFixed(2),
        currentAmount: parsed.data.currentAmount.toFixed(2),
        targetDate: parsed.data.targetDate,
        priority: parsed.data.priority,
        notes: parsed.data.notes ?? "",
      })
      .returning();

    if (!row) {
      sendError(response, 500, "Financial goal could not be created.", "GOAL_CREATE_FAILED");
      return;
    }

    const surplus = await getAvailableMonthlySurplus(userId);
    response.status(201).json({ goal: formatGoalRow(row, surplus) });
  } catch {
    sendError(response, 500, "Financial goal could not be created.", "GOAL_CREATE_FAILED");
  }
});

// GET /api/goals/:goalId
router.get("/goals/:goalId", requireAuthentication, async (request, response): Promise<void> => {
  const userId = getUserId(request, response);
  if (!userId) return;

  const goalId = z.string().uuid().safeParse(request.params.goalId);
  if (!goalId.success) {
    sendError(response, 400, "Goal ID is invalid.", "INVALID_GOAL_ID");
    return;
  }

  try {
    const [row] = await db
      .select()
      .from(financialGoalsTable)
      .where(and(eq(financialGoalsTable.id, goalId.data), eq(financialGoalsTable.userId, userId)))
      .limit(1);

    if (!row) {
      sendError(response, 404, "Financial goal was not found.", "GOAL_NOT_FOUND");
      return;
    }

    const contributions = await db
      .select()
      .from(goalContributionsTable)
      .where(and(eq(goalContributionsTable.goalId, goalId.data), eq(goalContributionsTable.userId, userId)))
      .orderBy(desc(goalContributionsTable.contributionDate), desc(goalContributionsTable.createdAt));

    let goalContribRate: number | undefined;
    if (contributions.length > 0) {
      const recent30Days = new Date();
      recent30Days.setDate(recent30Days.getDate() - 30);
      const recent30Iso = recent30Days.toISOString().slice(0, 10);
      const recentContribs = contributions.filter((c) => c.contributionDate >= recent30Iso);
      if (recentContribs.length > 0) {
        goalContribRate = recentContribs.reduce((sum, c) => sum + Number(c.amount), 0);
      } else {
        const total = contributions.reduce((sum, c) => sum + Number(c.amount), 0);
        const first = new Date(contributions[contributions.length - 1].contributionDate);
        const now = new Date();
        const months = Math.max(
          1,
          (now.getUTCFullYear() - first.getUTCFullYear()) * 12 +
            (now.getUTCMonth() - first.getUTCMonth()),
        );
        goalContribRate = Math.round((total / months) * 100) / 100;
      }
    }

    const surplus = await getAvailableMonthlySurplus(userId);
    const goal = formatGoalRow(row, surplus, goalContribRate);

    response.setHeader("Cache-Control", "no-store");
    response.json({
      goal,
      contributions: contributions.map((c) => ({
        id: c.id,
        goalId: c.goalId,
        userId: c.userId,
        amount: Number(c.amount),
        contributionDate: c.contributionDate,
        note: c.notes,
        createdAt: c.createdAt.toISOString(),
      })),
    });
  } catch {
    sendError(response, 500, "Goal details could not be retrieved.", "GOAL_FETCH_FAILED");
  }
});

// PUT /api/goals/:goalId
router.put("/goals/:goalId", requireSameOrigin, requireAuthentication, async (request, response): Promise<void> => {
  const userId = getUserId(request, response);
  if (!userId) return;

  const goalId = z.string().uuid().safeParse(request.params.goalId);
  if (!goalId.success) {
    sendError(response, 400, "Goal ID is invalid.", "INVALID_GOAL_ID");
    return;
  }

  const parsed = goalInputSchema.safeParse(request.body);
  if (!parsed.success) {
    sendError(response, 400, "Financial goal details are invalid.", "INVALID_GOAL_INPUT");
    return;
  }

  try {
    const [row] = await db
      .update(financialGoalsTable)
      .set({
        name: parsed.data.name,
        type: parsed.data.type,
        targetAmount: parsed.data.targetAmount.toFixed(2),
        currentAmount: parsed.data.currentAmount.toFixed(2),
        targetDate: parsed.data.targetDate,
        priority: parsed.data.priority,
        notes: parsed.data.notes ?? "",
        updatedAt: new Date(),
      })
      .where(and(eq(financialGoalsTable.id, goalId.data), eq(financialGoalsTable.userId, userId)))
      .returning();

    if (!row) {
      sendError(response, 404, "Financial goal was not found.", "GOAL_NOT_FOUND");
      return;
    }

    const [contribStats] = await db
      .select({
        total: sql<string>`COALESCE(SUM(${goalContributionsTable.amount}), 0)::text`,
        recent: sql<string>`COALESCE(SUM(CASE WHEN ${goalContributionsTable.contributionDate} >= (CURRENT_DATE - INTERVAL '30 days') THEN ${goalContributionsTable.amount} ELSE 0 END), 0)::text`,
      })
      .from(goalContributionsTable)
      .where(and(eq(goalContributionsTable.goalId, goalId.data), eq(goalContributionsTable.userId, userId)));

    const recentAmount = Number(contribStats?.recent ?? 0);
    const totalAmount = Number(contribStats?.total ?? 0);
    const contribRate = recentAmount > 0 ? recentAmount : totalAmount > 0 ? totalAmount : undefined;

    const surplus = await getAvailableMonthlySurplus(userId);
    response.json({ goal: formatGoalRow(row, surplus, contribRate) });
  } catch {
    sendError(response, 500, "Financial goal could not be updated.", "GOAL_UPDATE_FAILED");
  }
});

// DELETE /api/goals/:goalId
router.delete("/goals/:goalId", requireSameOrigin, requireAuthentication, async (request, response): Promise<void> => {
  const userId = getUserId(request, response);
  if (!userId) return;

  const goalId = z.string().uuid().safeParse(request.params.goalId);
  if (!goalId.success) {
    sendError(response, 400, "Goal ID is invalid.", "INVALID_GOAL_ID");
    return;
  }

  try {
    const [deleted] = await db
      .delete(financialGoalsTable)
      .where(and(eq(financialGoalsTable.id, goalId.data), eq(financialGoalsTable.userId, userId)))
      .returning({ id: financialGoalsTable.id });

    if (!deleted) {
      sendError(response, 404, "Financial goal was not found.", "GOAL_NOT_FOUND");
      return;
    }

    response.status(204).end();
  } catch {
    sendError(response, 500, "Financial goal could not be deleted.", "GOAL_DELETE_FAILED");
  }
});

// POST /api/goals/:goalId/contributions
router.post("/goals/:goalId/contributions", requireSameOrigin, requireAuthentication, async (request, response): Promise<void> => {
  const userId = getUserId(request, response);
  if (!userId) return;

  const goalId = z.string().uuid().safeParse(request.params.goalId);
  if (!goalId.success) {
    sendError(response, 400, "Goal ID is invalid.", "INVALID_GOAL_ID");
    return;
  }

  const parsed = contributionInputSchema.safeParse(request.body);
  if (!parsed.success) {
    sendError(response, 400, "Contribution details are invalid.", "INVALID_CONTRIBUTION_INPUT");
    return;
  }

  try {
    let resultGoal: typeof financialGoalsTable.$inferSelect | undefined;
    let resultContribution: typeof goalContributionsTable.$inferSelect | undefined;

    await db.transaction(async (tx) => {
      const [goalRow] = await tx
        .select()
        .from(financialGoalsTable)
        .where(and(eq(financialGoalsTable.id, goalId.data), eq(financialGoalsTable.userId, userId)))
        .limit(1);

      if (!goalRow) return;

      const newCurrentAmount = Number(goalRow.currentAmount) + parsed.data.amount;

      const [updatedGoal] = await tx
        .update(financialGoalsTable)
        .set({
          currentAmount: newCurrentAmount.toFixed(2),
          updatedAt: new Date(),
        })
        .where(eq(financialGoalsTable.id, goalId.data))
        .returning();

      const [contrib] = await tx
        .insert(goalContributionsTable)
        .values({
          goalId: goalId.data,
          userId,
          amount: parsed.data.amount.toFixed(2),
          contributionDate: parsed.data.contributionDate,
          notes: parsed.data.note ?? "",
        })
        .returning();

      resultGoal = updatedGoal;
      resultContribution = contrib;
    });

    if (!resultGoal || !resultContribution) {
      sendError(response, 404, "Financial goal was not found.", "GOAL_NOT_FOUND");
      return;
    }

    const [contribStats] = await db
      .select({
        total: sql<string>`COALESCE(SUM(${goalContributionsTable.amount}), 0)::text`,
        recent: sql<string>`COALESCE(SUM(CASE WHEN ${goalContributionsTable.contributionDate} >= (CURRENT_DATE - INTERVAL '30 days') THEN ${goalContributionsTable.amount} ELSE 0 END), 0)::text`,
      })
      .from(goalContributionsTable)
      .where(and(eq(goalContributionsTable.goalId, goalId.data), eq(goalContributionsTable.userId, userId)));

    const recentAmount = Number(contribStats?.recent ?? 0);
    const totalAmount = Number(contribStats?.total ?? 0);
    const contribRate = recentAmount > 0 ? recentAmount : totalAmount > 0 ? totalAmount : undefined;

    const surplus = await getAvailableMonthlySurplus(userId);

    response.status(201).json({
      goal: formatGoalRow(resultGoal, surplus, contribRate),
      contribution: {
        id: resultContribution.id,
        goalId: resultContribution.goalId,
        userId: resultContribution.userId,
        amount: Number(resultContribution.amount),
        contributionDate: resultContribution.contributionDate,
        note: resultContribution.notes,
        createdAt: resultContribution.createdAt.toISOString(),
      },
    });
  } catch {
    sendError(response, 500, "Contribution could not be saved.", "CONTRIBUTION_CREATE_FAILED");
  }
});

export default router;
