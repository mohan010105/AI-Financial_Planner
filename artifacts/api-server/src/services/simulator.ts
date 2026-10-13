/**
 * Deterministic Financial Simulation Engine (Phase 6)
 * ALL CALCULATIONS ARE STRICTLY DETERMINISTIC.
 * NO GENERATIVE AI IS USED FOR NUMERICAL CALCULATIONS.
 */

export interface SimulatorInput {
  // Baseline financial state
  baselineIncome: number;
  baselineExpenses: number;
  existingSavings: number; // Initial savings pool
  goalTargetAmount: number;
  goalCurrentAmount: number;
  goalTargetDate?: string; // YYYY-MM-DD (optional)

  // Simulation adjustments
  incomeAdjustment?: number; // e.g. +10000 or -2000
  expenseAdjustment?: number; // e.g. +5000 or -2000
  additionalMonthlySavings?: number; // e.g. +3000
  oneTimeExpense?: number; // e.g. 50000 (reduces starting savings)
  customTargetAmount?: number; // Optional modified goal target amount
  customTargetDate?: string; // Optional modified goal target date
  projectionMonths?: number; // Projection timeline horizon (default 36, max 120)

  currentDate?: Date;
}

export interface ScenarioResult {
  monthlyIncome: number;
  monthlyExpenses: number;
  monthlySavings: number; // Income - Expenses
  effectiveMonthlySavings: number; // (Income - Expenses) + additionalMonthlySavings
  startingSavings: number; // max(0, initial - oneTimeExpense)
  remainingGoalAmount: number;
  monthsToGoal: number | null; // null if unachievable (effective savings <= 0)
  projectedCompletionDate: string | null;
  isUnreachable: boolean;
  statusNote: string;
}

export interface MonthlyProjectionPoint {
  monthIndex: number; // 0, 1, 2, ...
  monthLabel: string; // YYYY-MM
  baselineAccumulated: number;
  simulatedAccumulated: number;
}

export interface SimulatorResult {
  baseline: ScenarioResult;
  simulated: ScenarioResult;
  comparison: {
    monthlySavingsDifference: number; // simulated - baseline
    monthsSaved: number | null; // baseline months - simulated months (positive = faster)
    completionDateDifferenceDays: number | null;
    totalSavingsAtHorizonDifference: number;
    summaryText: string;
  };
  monthlyTimeline: MonthlyProjectionPoint[];
  asOfDate: string;
}

function sanitizeAmount(val: number | undefined, min = 0, defaultVal = 0): number {
  if (val === undefined || !Number.isFinite(val)) return defaultVal;
  return Math.max(min, Math.round(val * 100) / 100);
}

export function calculateSimulation(input: SimulatorInput): SimulatorResult {
  const now = input.currentDate ?? new Date();
  const asOfDate = now.toISOString().slice(0, 10);

  // 1. Sanitize Baseline Inputs
  const baseIncome = sanitizeAmount(input.baselineIncome, 0, 0);
  const baseExpenses = sanitizeAmount(input.baselineExpenses, 0, 0);
  const initialSavings = sanitizeAmount(input.existingSavings, 0, 0);
  const goalTarget = sanitizeAmount(input.customTargetAmount ?? input.goalTargetAmount, 0.01, 100000);
  const goalCurrent = sanitizeAmount(input.goalCurrentAmount, 0, 0);
  const projectionHorizon = Math.min(120, Math.max(6, input.projectionMonths ?? 36));

  // 2. Compute Baseline Scenario
  const baseMonthlySavings = Math.max(0, Math.round((baseIncome - baseExpenses) * 100) / 100);
  const baseRemainingGoal = Math.max(0, Math.round((goalTarget - goalCurrent) * 100) / 100);

  let baseMonthsToGoal: number | null = null;
  let baseProjDate: string | null = null;
  let baseUnreachable = false;
  let baseNote = "On track";

  if (baseRemainingGoal <= 0) {
    baseMonthsToGoal = 0;
    baseProjDate = asOfDate;
    baseNote = "Goal already completed";
  } else if (baseMonthlySavings <= 0) {
    baseUnreachable = true;
    baseNote = "Goal unreachable with zero or negative baseline savings";
  } else {
    baseMonthsToGoal = Math.ceil(baseRemainingGoal / baseMonthlySavings);
    const d = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() + baseMonthsToGoal, now.getUTCDate()));
    baseProjDate = d.toISOString().slice(0, 10);
  }

  const baselineResult: ScenarioResult = {
    monthlyIncome: baseIncome,
    monthlyExpenses: baseExpenses,
    monthlySavings: baseMonthlySavings,
    effectiveMonthlySavings: baseMonthlySavings,
    startingSavings: goalCurrent,
    remainingGoalAmount: baseRemainingGoal,
    monthsToGoal: baseMonthsToGoal,
    projectedCompletionDate: baseProjDate,
    isUnreachable: baseUnreachable,
    statusNote: baseNote,
  };

  // 3. Compute Simulated Scenario
  const simIncome = Math.max(0, Math.round((baseIncome + (input.incomeAdjustment ?? 0)) * 100) / 100);
  const simExpenses = Math.max(0, Math.round((baseExpenses + (input.expenseAdjustment ?? 0)) * 100) / 100);
  const oneTimeCost = Math.max(0, input.oneTimeExpense ?? 0);
  const addSavings = Math.max(0, input.additionalMonthlySavings ?? 0);

  const rawSimMonthlySavings = simIncome - simExpenses;
  const simEffectiveSavings = Math.max(0, Math.round((rawSimMonthlySavings + addSavings) * 100) / 100);

  // One-time expense reduces starting goal savings
  const simStartingSavings = Math.max(0, Math.round((goalCurrent - oneTimeCost) * 100) / 100);
  const simRemainingGoal = Math.max(0, Math.round((goalTarget - simStartingSavings) * 100) / 100);

  let simMonthsToGoal: number | null = null;
  let simProjDate: string | null = null;
  let simUnreachable = false;
  let simNote = "On track";

  if (simRemainingGoal <= 0) {
    simMonthsToGoal = 0;
    simProjDate = asOfDate;
    simNote = "Goal achieved immediately with starting funds";
  } else if (simEffectiveSavings <= 0) {
    simUnreachable = true;
    simNote = "Goal unreachable: simulated monthly savings are zero or negative";
  } else {
    simMonthsToGoal = Math.ceil(simRemainingGoal / simEffectiveSavings);
    const d = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() + simMonthsToGoal, now.getUTCDate()));
    simProjDate = d.toISOString().slice(0, 10);
  }

  const simulatedResult: ScenarioResult = {
    monthlyIncome: simIncome,
    monthlyExpenses: simExpenses,
    monthlySavings: Math.max(0, Math.round(rawSimMonthlySavings * 100) / 100),
    effectiveMonthlySavings: simEffectiveSavings,
    startingSavings: simStartingSavings,
    remainingGoalAmount: simRemainingGoal,
    monthsToGoal: simMonthsToGoal,
    projectedCompletionDate: simProjDate,
    isUnreachable: simUnreachable,
    statusNote: simNote,
  };

  // 4. Comparison Summary
  const monthlySavingsDiff = Math.round((simEffectiveSavings - baseMonthlySavings) * 100) / 100;

  let monthsSaved: number | null = null;
  if (baseMonthsToGoal !== null && simMonthsToGoal !== null) {
    monthsSaved = baseMonthsToGoal - simMonthsToGoal;
  }

  let summaryText = "";
  if (monthsSaved !== null) {
    if (monthsSaved > 0) {
      summaryText = `This scenario reaches your goal ${monthsSaved} month${monthsSaved === 1 ? '' : 's'} earlier!`;
    } else if (monthsSaved < 0) {
      summaryText = `This scenario extends goal completion by ${Math.abs(monthsSaved)} month${Math.abs(monthsSaved) === 1 ? '' : 's'}.`;
    } else {
      summaryText = "This scenario keeps your goal target timeline unchanged.";
    }
  } else if (baseUnreachable && !simUnreachable) {
    summaryText = "This scenario makes an unreachable goal achievable!";
  } else if (!baseUnreachable && simUnreachable) {
    summaryText = "Warning: This scenario turns an active goal into an unreachable one due to a deficit.";
  } else {
    summaryText = "Scenario calculated based on your custom adjustments.";
  }

  let completionDateDifferenceDays: number | null = null;
  if (baseProjDate && simProjDate) {
    const baseMs = new Date(baseProjDate).getTime();
    const simMs = new Date(simProjDate).getTime();
    completionDateDifferenceDays = Math.round((baseMs - simMs) / (1000 * 60 * 60 * 24));
  }

  const targetDateStr = input.customTargetDate ?? input.goalTargetDate;
  if (targetDateStr && simMonthsToGoal !== null) {
    const targetParsed = new Date(`${targetDateStr.slice(0, 10)}T12:00:00.000Z`);
    const targetMonths =
      (targetParsed.getUTCFullYear() - now.getUTCFullYear()) * 12 +
      (targetParsed.getUTCMonth() - now.getUTCMonth());

    if (monthsSaved !== null && monthsSaved > 0) {
      if (simMonthsToGoal <= targetMonths && (baseMonthsToGoal === null || baseMonthsToGoal > targetMonths)) {
        summaryText = `This scenario achieves your goal by your target date! Reaches completion ${monthsSaved} month${monthsSaved === 1 ? '' : 's'} earlier.`;
      }
    }
  }

  // 5. Monthly Timeline Data Points (for Recharts)
  const monthlyTimeline: MonthlyProjectionPoint[] = [];
  let baseAccum = goalCurrent;
  let simAccum = simStartingSavings;

  for (let i = 0; i <= projectionHorizon; i++) {
    const projDate = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() + i, 1));
    const monthLabel = `${projDate.getUTCFullYear()}-${String(projDate.getUTCMonth() + 1).padStart(2, "0")}`;

    if (i > 0) {
      baseAccum = Math.min(goalTarget, Math.round((baseAccum + baseMonthlySavings) * 100) / 100);
      simAccum = Math.min(goalTarget, Math.round((simAccum + simEffectiveSavings) * 100) / 100);
    }

    monthlyTimeline.push({
      monthIndex: i,
      monthLabel,
      baselineAccumulated: baseAccum,
      simulatedAccumulated: simAccum,
    });
  }

  const horizonBaseAccum = monthlyTimeline[monthlyTimeline.length - 1]?.baselineAccumulated ?? 0;
  const horizonSimAccum = monthlyTimeline[monthlyTimeline.length - 1]?.simulatedAccumulated ?? 0;

  return {
    baseline: baselineResult,
    simulated: simulatedResult,
    comparison: {
      monthlySavingsDifference: monthlySavingsDiff,
      monthsSaved,
      completionDateDifferenceDays,
      totalSavingsAtHorizonDifference: Math.round((horizonSimAccum - horizonBaseAccum) * 100) / 100,
      summaryText,
    },
    monthlyTimeline,
    asOfDate,
  };
}
