import { eq } from "drizzle-orm";
import { Router, type IRouter } from "express";
import {
  GetFinancialProfileResponse,
  UpdateFinancialProfileBody,
  UpdateFinancialProfileResponse,
} from "@workspace/api-zod";
import { db, financialProfilesTable } from "@workspace/db";
import { requireAuthentication, requireSameOrigin } from "../middleware/auth";

const router: IRouter = Router();

const amountFields = [
  "monthlyIncome",
  "existingSavings",
  "monthlyFixedExpenses",
  "monthlyVariableExpenses",
  "monthlyLoanPayments",
  "emergencyFundAmount",
] as const;

function hasAtMostTwoDecimalPlaces(value: number): boolean {
  return Math.abs(value * 100 - Math.round(value * 100)) < 0.000001;
}

function toApiProfile(row: typeof financialProfilesTable.$inferSelect) {
  return {
    name: row.name,
    ageRange: row.ageRange,
    employmentStatus: row.employmentStatus,
    currencyCode: row.currencyCode,
    monthlyIncome: Number(row.monthlyIncome),
    existingSavings: Number(row.existingSavings),
    monthlyFixedExpenses: Number(row.monthlyFixedExpenses),
    monthlyVariableExpenses: Number(row.monthlyVariableExpenses),
    monthlyLoanPayments: Number(row.monthlyLoanPayments),
    emergencyFundAmount: Number(row.emergencyFundAmount),
    primaryGoal: row.primaryGoal,
    planningHorizon: row.planningHorizon,
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
  };
}

router.get("/profile", requireAuthentication, async (request, response): Promise<void> => {
  response.set("Cache-Control", "no-store, private");
  const userId = request.authUserId;
  if (!userId) {
    response.status(401).json({ error: "Sign in to continue.", code: "AUTHENTICATION_REQUIRED" });
    return;
  }

  const [profile] = await db
    .select()
    .from(financialProfilesTable)
    .where(eq(financialProfilesTable.userId, userId))
    .limit(1);

  response.json(GetFinancialProfileResponse.parse({ profile: profile ? toApiProfile(profile) : null }));
});

router.put(
  "/profile",
  requireSameOrigin,
  requireAuthentication,
  async (request, response): Promise<void> => {
    response.set("Cache-Control", "no-store, private");
    const userId = request.authUserId;
    if (!userId) {
      response.status(401).json({ error: "Sign in to continue.", code: "AUTHENTICATION_REQUIRED" });
      return;
    }

    const parsed = UpdateFinancialProfileBody.safeParse(request.body);
    if (!parsed.success) {
      request.log.warn("Rejected invalid financial profile fields");
      response.status(400).json({
        error: "Check the required fields and enter valid amounts within the allowed ranges.",
        code: "INVALID_INPUT",
      });
      return;
    }

    if (amountFields.some((field) => !hasAtMostTwoDecimalPlaces(parsed.data[field]))) {
      response.status(400).json({
        error: "Financial amounts can have no more than two decimal places.",
        code: "INVALID_AMOUNT_PRECISION",
      });
      return;
    }

    const name = parsed.data.name
      .normalize("NFC")
      .replace(/[\u0000-\u001f\u007f]/g, "")
      .trim();
    if (!name) {
      response.status(400).json({ error: "Enter a name.", code: "INVALID_NAME" });
      return;
    }

    const values = {
      userId,
      name,
      ageRange: parsed.data.ageRange,
      employmentStatus: parsed.data.employmentStatus,
      currencyCode: parsed.data.currencyCode,
      monthlyIncome: parsed.data.monthlyIncome.toFixed(2),
      existingSavings: parsed.data.existingSavings.toFixed(2),
      monthlyFixedExpenses: parsed.data.monthlyFixedExpenses.toFixed(2),
      monthlyVariableExpenses: parsed.data.monthlyVariableExpenses.toFixed(2),
      monthlyLoanPayments: parsed.data.monthlyLoanPayments.toFixed(2),
      emergencyFundAmount: parsed.data.emergencyFundAmount.toFixed(2),
      primaryGoal: parsed.data.primaryGoal,
      planningHorizon: parsed.data.planningHorizon,
    };

    const [profile] = await db
      .insert(financialProfilesTable)
      .values(values)
      .onConflictDoUpdate({
        target: financialProfilesTable.userId,
        set: { ...values, updatedAt: new Date() },
      })
      .returning();

    response.json(
      UpdateFinancialProfileResponse.parse({ profile: toApiProfile(profile) }),
    );
  },
);

export default router;
