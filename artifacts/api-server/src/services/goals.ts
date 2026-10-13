/**
 * Deterministic Financial Goal Calculations Engine
 * ALL CALCULATIONS ARE STRICTLY DETERMINISTIC.
 * NO GENERATIVE AI IS USED FOR THESE CALCULATIONS.
 */

export interface GoalCalculationInput {
  targetAmount: number;
  currentAmount: number;
  targetDate: string; // YYYY-MM-DD
  currentDate?: Date;
  availableMonthlySurplus?: number; // Optional monthly surplus (income - expenses)
  averageMonthlyContribution?: number; // Historical/current monthly contribution rate
}

export interface GoalCalculationResult {
  targetAmount: number;
  currentAmount: number;
  remainingAmount: number;
  progressPercentage: number;
  monthsRemaining: number;
  requiredMonthlyContribution: number;
  isCompleted: boolean;
  isPastTargetDate: boolean;
  needsAdjustment: boolean;
  statusNote: string;
  projectedCompletionDate: string | null;
}

export function calculateGoalMetrics(input: GoalCalculationInput): GoalCalculationResult {
  const safeTarget = Number.isFinite(input.targetAmount) && input.targetAmount > 0 ? input.targetAmount : 0.01;
  const safeCurrent = Number.isFinite(input.currentAmount) && input.currentAmount >= 0 ? input.currentAmount : 0;
  const now = input.currentDate ?? new Date();

  // 1. Remaining Amount
  const remainingAmount = Math.max(0, Math.round((safeTarget - safeCurrent) * 100) / 100);

  // 2. Current Progress Percentage (0 - 100%)
  const progressPercentage = safeTarget > 0
    ? Math.min(100, Math.round((safeCurrent / safeTarget) * 100 * 100) / 100)
    : 100;

  const isCompleted = remainingAmount === 0 || safeCurrent >= safeTarget;

  // 3. Months Remaining
  const targetParsed = new Date(`${input.targetDate.slice(0, 10)}T12:00:00.000Z`);
  const yearDiff = targetParsed.getUTCFullYear() - now.getUTCFullYear();
  const monthDiff = targetParsed.getUTCMonth() - now.getUTCMonth();
  const rawMonths = yearDiff * 12 + monthDiff;

  let monthsRemaining = 0;
  if (!isCompleted) {
    monthsRemaining = Math.max(0, rawMonths);
  }

  const isPastTargetDate = rawMonths < 0 && !isCompleted;
  const isZeroMonthsRemaining = rawMonths === 0 && !isCompleted;

  // 4. Required Monthly Contribution
  let requiredMonthlyContribution = 0;
  if (!isCompleted) {
    if (monthsRemaining <= 0) {
      // Due immediately or target date passed; entire remaining balance needed
      requiredMonthlyContribution = remainingAmount;
    } else {
      requiredMonthlyContribution = Math.round((remainingAmount / monthsRemaining) * 100) / 100;
    }
  }

  // 5. Projected Completion Date based on current contribution
  let projectedCompletionDate: string | null = null;
  if (isCompleted) {
    projectedCompletionDate = now.toISOString().slice(0, 10);
  } else {
    const monthlyRate =
      input.averageMonthlyContribution && input.averageMonthlyContribution > 0
        ? input.averageMonthlyContribution
        : 0;

    if (monthlyRate > 0) {
      const projectedMonths = Math.ceil(remainingAmount / monthlyRate);
      const projDate = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() + projectedMonths, now.getUTCDate()));
      projectedCompletionDate = projDate.toISOString().slice(0, 10);
    }
  }

  // 6. Feasibility check & Adjustment indicator ("Goal may require adjustment")
  let needsAdjustment = false;
  let statusNote = isCompleted ? "Goal completed" : "On track";

  if (isCompleted) {
    statusNote = "Goal completed";
  } else if (isPastTargetDate) {
    needsAdjustment = true;
    statusNote = "Goal may require adjustment (Target date has passed)";
  } else if (isZeroMonthsRemaining && input.availableMonthlySurplus !== undefined && remainingAmount > input.availableMonthlySurplus) {
    needsAdjustment = true;
    statusNote = "Goal may require adjustment (Target date is this month; required contribution exceeds available surplus)";
  } else if (
    input.availableMonthlySurplus !== undefined &&
    input.availableMonthlySurplus <= 0 &&
    remainingAmount > 0
  ) {
    needsAdjustment = true;
    statusNote = "Goal may require adjustment (Available monthly surplus is zero or negative)";
  } else if (
    input.availableMonthlySurplus !== undefined &&
    input.availableMonthlySurplus > 0 &&
    requiredMonthlyContribution > input.availableMonthlySurplus
  ) {
    needsAdjustment = true;
    statusNote = "Goal may require adjustment (Required monthly contribution exceeds available surplus)";
  } else if (
    projectedCompletionDate !== null &&
    projectedCompletionDate > input.targetDate.slice(0, 10)
  ) {
    needsAdjustment = true;
    statusNote = "Goal may require adjustment (Projected completion is after target date at current contribution rate)";
  } else if (input.availableMonthlySurplus === undefined) {
    needsAdjustment = false;
    statusNote = "Surplus data unavailable (no transaction history recorded)";
  } else {
    needsAdjustment = false;
    statusNote = "On track based on deterministic metrics";
  }

  return {
    targetAmount: Math.round(safeTarget * 100) / 100,
    currentAmount: Math.round(safeCurrent * 100) / 100,
    remainingAmount,
    progressPercentage,
    monthsRemaining,
    requiredMonthlyContribution,
    isCompleted,
    isPastTargetDate,
    needsAdjustment,
    statusNote,
    projectedCompletionDate,
  };
}
