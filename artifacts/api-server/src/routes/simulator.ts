import { and, eq, sql } from "drizzle-orm";
import { Router, type Request, type Response } from "express";
import { z } from "zod/v4";
import {
  db,
  financialGoalsTable,
  financialProfilesTable,
  transactionsTable,
} from "@workspace/db";
import { requireAuthentication } from "../middleware/auth";
import { calculateSimulation } from "../services/simulator";
import { checkFeatureEntitlement } from "../services/subscription";

const router = Router();

function isValidIsoDate(value: string): boolean {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const parsed = new Date(`${value}T00:00:00.000Z`);
  return Number.isFinite(parsed.getTime()) && parsed.toISOString().slice(0, 10) === value;
}

const isoDateSchema = z.string().refine(isValidIsoDate, "Use a valid YYYY-MM-DD date.");

const runSimulationSchema = z.object({
  baselineIncome: z.number().finite().min(0).max(999999999999.99).optional(),
  baselineExpenses: z.number().finite().min(0).max(999999999999.99).optional(),
  existingSavings: z.number().finite().min(0).max(999999999999.99).optional(),
  goalTargetAmount: z.number().finite().min(0.01).max(999999999999.99).optional(),
  goalCurrentAmount: z.number().finite().min(0).max(999999999999.99).optional(),
  goalTargetDate: isoDateSchema.optional(),
  goalId: z.string().uuid().optional(),

  incomeAdjustment: z.number().finite().min(-999999999999.99).max(999999999999.99).optional().default(0),
  expenseAdjustment: z.number().finite().min(-999999999999.99).max(999999999999.99).optional().default(0),
  additionalMonthlySavings: z.number().finite().min(0).max(999999999999.99).optional().default(0),
  oneTimeExpense: z.number().finite().min(0).max(999999999999.99).optional().default(0),
  customTargetAmount: z.number().finite().min(0.01).max(999999999999.99).optional(),
  customTargetDate: isoDateSchema.optional(),
  projectionMonths: z.number().int().min(6).max(120).optional().default(36),
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

// GET /api/simulator/status
router.get("/simulator/status", requireAuthentication, async (_request, response): Promise<void> => {
  response.setHeader("Cache-Control", "no-store");
  response.json({
    phase: 6,
    status: "active",
    module: "simulator",
  });
});

// POST /api/simulator/run
router.post("/simulator/run", requireAuthentication, async (request, response): Promise<void> => {
  const userId = getUserId(request, response);
  if (!userId) return;

  const parsed = runSimulationSchema.safeParse(request.body ?? {});
  if (!parsed.success) {
    sendError(response, 400, "Simulation parameters are invalid.", "INVALID_SIMULATOR_INPUT");
    return;
  }

  const input = parsed.data;

  // Check entitlement for advanced custom scenario adjustments
  const isCustomScenario = (
    input.incomeAdjustment !== 0 ||
    input.expenseAdjustment !== 0 ||
    input.additionalMonthlySavings !== 0 ||
    input.oneTimeExpense !== 0 ||
    Boolean(input.customTargetAmount) ||
    Boolean(input.customTargetDate)
  );

  if (isCustomScenario) {
    const entitlement = checkFeatureEntitlement(userId, "what_if_simulator");
    if (!entitlement.allowed) {
      sendError(
        response,
        403,
        entitlement.reason || "Advanced What-If scenario simulations require a Premium subscription.",
        "UPGRADE_REQUIRED",
      );
      return;
    }
  }

  try {
    // Determine baseline numbers if not explicitly provided
    let baselineIncome = input.baselineIncome;
    let baselineExpenses = input.baselineExpenses;
    let existingSavings = input.existingSavings;
    let goalTargetAmount = input.goalTargetAmount;
    let goalCurrentAmount = input.goalCurrentAmount;
    let goalTargetDate = input.goalTargetDate;

    // Fetch user profile if any baseline is missing
    const [profile] = await db
      .select()
      .from(financialProfilesTable)
      .where(eq(financialProfilesTable.userId, userId))
      .limit(1);

    // Fetch current month transaction totals for realistic income/expenses
    const now = new Date();
    const currentMonth = `${now.getUTCFullYear()}-${String(now.getUTCMonth() + 1).padStart(2, "0")}`;
    const currentMonthStart = `${currentMonth}-01`;

    const incomeSum = sql<string>`COALESCE(SUM(CASE WHEN ${transactionsTable.type} = 'INCOME' THEN ${transactionsTable.amount} ELSE 0 END), 0)::text`;
    const expenseSum = sql<string>`COALESCE(SUM(CASE WHEN ${transactionsTable.type} = 'EXPENSE' THEN ${transactionsTable.amount} ELSE 0 END), 0)::text`;

    const [txTotals] = await db
      .select({ income: incomeSum, expenses: expenseSum })
      .from(transactionsTable)
      .where(
        and(
          eq(transactionsTable.userId, userId),
          sql`${transactionsTable.transactionDate} >= ${currentMonthStart}`,
        ),
      );

    const txIncome = Number(txTotals?.income ?? 0);
    const txExpenses = Number(txTotals?.expenses ?? 0);

    if (baselineIncome === undefined) {
      baselineIncome = txIncome > 0 ? txIncome : Number(profile?.monthlyIncome ?? 60000);
    }
    if (baselineExpenses === undefined) {
      baselineExpenses =
        txExpenses > 0
          ? txExpenses
          : Number(profile?.monthlyFixedExpenses ?? 0) + Number(profile?.monthlyVariableExpenses ?? 0);
      if (baselineExpenses === 0) baselineExpenses = Math.round(baselineIncome * 0.7);
    }
    if (existingSavings === undefined) {
      existingSavings = Number(profile?.existingSavings ?? 50000);
    }

    // If goalId provided or selected, fetch goal details
    if (input.goalId) {
      const [goalRow] = await db
        .select()
        .from(financialGoalsTable)
        .where(and(eq(financialGoalsTable.id, input.goalId), eq(financialGoalsTable.userId, userId)))
        .limit(1);

      if (goalRow) {
        if (goalTargetAmount === undefined) goalTargetAmount = Number(goalRow.targetAmount);
        if (goalCurrentAmount === undefined) goalCurrentAmount = Number(goalRow.currentAmount);
        if (goalTargetDate === undefined) goalTargetDate = goalRow.targetDate;
      }
    }

    // Default target parameters if still unassigned
    if (goalTargetAmount === undefined) goalTargetAmount = 200000;
    if (goalCurrentAmount === undefined) goalCurrentAmount = 50000;

    const result = calculateSimulation({
      baselineIncome,
      baselineExpenses,
      existingSavings,
      goalTargetAmount,
      goalCurrentAmount,
      goalTargetDate,
      incomeAdjustment: input.incomeAdjustment,
      expenseAdjustment: input.expenseAdjustment,
      additionalMonthlySavings: input.additionalMonthlySavings,
      oneTimeExpense: input.oneTimeExpense,
      customTargetAmount: input.customTargetAmount,
      customTargetDate: input.customTargetDate,
      projectionMonths: input.projectionMonths,
    });

    response.setHeader("Cache-Control", "no-store");
    response.json(result);
  } catch {
    sendError(response, 500, "Simulation could not be computed.", "SIMULATION_FAILED");
  }
});

export default router;
