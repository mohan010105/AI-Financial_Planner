/**
 * Deterministic Financial Analytics Engine
 * Pure math functions and deterministic financial metric calculations.
 * AI MUST NOT BE USED FOR THESE NUMERICAL CALCULATIONS.
 */

export interface PureSummaryMetrics {
  totalIncome: number;
  totalExpenses: number;
  totalSavings: number;
  allTimeSavingsRate: number;
  currentMonthIncome: number;
  currentMonthExpenses: number;
  currentMonthSavings: number;
  currentMonthSavingsRate: number;
}

export interface PureMonthlyTrendItem {
  month: string;
  income: number;
  expenses: number;
  savings: number;
  savingsRate: number;
  netCashFlow: number;
}

export interface PureCategoryItem {
  category: string;
  amount: number;
  percentage: number;
}

export interface HealthMetricsInput {
  savingsRate: number;
  expenseToIncomeRatio: number;
  emergencyFundCoverageMonths: number;
  emergencyFundAmount: number;
  monthlyFixedExpenses: number;
  monthlyVariableExpenses: number;
  essentialMonthlyExpenses: number;
  primaryGoal: string | null;
  planningHorizon: string | null;
  hasFinancialProfile: boolean;
}

export interface HealthIndicatorItem {
  id: string;
  title: string;
  description: string;
  valueText: string;
  status: "HEALTHY" | "ATTENTION" | "NEUTRAL" | "INCOMPLETE";
}

/**
 * Calculates net savings (Income - Expenses), safely rounded to 2 decimal places.
 */
export function calculateSavings(income: number, expenses: number): number {
  const safeIncome = Number.isFinite(income) && income > 0 ? income : 0;
  const safeExpenses = Number.isFinite(expenses) && expenses > 0 ? expenses : 0;
  const savings = safeIncome - safeExpenses;
  return Math.round(savings * 100) / 100;
}

/**
 * Calculates savings rate percentage: (Savings / Income) * 100.
 * Returns 0 if income is zero or negative. Rounded to 2 decimal places.
 */
export function calculateSavingsRate(income: number, expenses: number): number {
  const safeIncome = Number.isFinite(income) && income > 0 ? income : 0;
  if (safeIncome <= 0) return 0;
  const safeExpenses = Number.isFinite(expenses) && expenses > 0 ? expenses : 0;
  const savings = safeIncome - safeExpenses;
  const rate = (savings / safeIncome) * 100;
  return Math.round(rate * 100) / 100;
}

/**
 * Calculates Expense-to-Income Ratio: (Expenses / Income) * 100.
 * Returns 0 if income is zero or negative. Rounded to 2 decimal places.
 */
export function calculateExpenseToIncomeRatio(income: number, expenses: number): number {
  const safeIncome = Number.isFinite(income) && income > 0 ? income : 0;
  if (safeIncome <= 0) return 0;
  const safeExpenses = Number.isFinite(expenses) && expenses > 0 ? expenses : 0;
  const ratio = (safeExpenses / safeIncome) * 100;
  return Math.round(ratio * 100) / 100;
}

/**
 * Calculates category amounts as a percentage of total expenses.
 * Safe against zero total expenses.
 */
export function calculateCategoryPercentages<T extends { category: string; amount: number }>(
  items: T[],
  totalExpenses: number,
): PureCategoryItem[] {
  const safeTotal = Number.isFinite(totalExpenses) && totalExpenses > 0 ? totalExpenses : 0;
  return items.map((item) => {
    const safeAmount = Number.isFinite(item.amount) && item.amount > 0 ? item.amount : 0;
    const percentage = safeTotal > 0 ? Math.round((safeAmount / safeTotal) * 100 * 100) / 100 : 0;
    return {
      category: item.category,
      amount: Math.round(safeAmount * 100) / 100,
      percentage,
    };
  });
}

/**
 * Calculates Emergency Fund Coverage in months: Emergency Fund Amount / Essential Monthly Expenses.
 * Returns 0 if essential monthly expenses are zero. Rounded to 1 decimal place.
 */
export function calculateEmergencyFundCoverage(
  emergencyFundAmount: number,
  essentialMonthlyExpenses: number,
): number {
  const safeFund = Number.isFinite(emergencyFundAmount) && emergencyFundAmount > 0 ? emergencyFundAmount : 0;
  const safeExpenses = Number.isFinite(essentialMonthlyExpenses) && essentialMonthlyExpenses > 0 ? essentialMonthlyExpenses : 0;
  if (safeExpenses <= 0) return 0;
  const months = safeFund / safeExpenses;
  return Math.round(months * 10) / 10;
}

/**
 * Generates transparent, objective indicators for user financial health based on measurable data.
 */
export function buildHealthIndicators(input: HealthMetricsInput): HealthIndicatorItem[] {
  const indicators: HealthIndicatorItem[] = [];

  // 1. Savings Rate Indicator
  if (input.savingsRate >= 20) {
    indicators.push({
      id: "savings-rate",
      title: "Savings Rate",
      description: "Percentage of income saved after expenses.",
      valueText: `${input.savingsRate}%`,
      status: "HEALTHY",
    });
  } else if (input.savingsRate < 0) {
    indicators.push({
      id: "savings-rate",
      title: "Savings Rate",
      description: "Expenses exceeded income in this period.",
      valueText: `${input.savingsRate}%`,
      status: "ATTENTION",
    });
  } else {
    indicators.push({
      id: "savings-rate",
      title: "Savings Rate",
      description: "Percentage of income saved after expenses.",
      valueText: `${input.savingsRate}%`,
      status: "NEUTRAL",
    });
  }

  // 2. Expense-to-Income Ratio Indicator
  if (input.expenseToIncomeRatio === 0) {
    indicators.push({
      id: "expense-ratio",
      title: "Expense-to-Income Ratio",
      description: "Recorded expenses as a proportion of income.",
      valueText: "No income recorded",
      status: "INCOMPLETE",
    });
  } else if (input.expenseToIncomeRatio <= 70) {
    indicators.push({
      id: "expense-ratio",
      title: "Expense-to-Income Ratio",
      description: "Expenses remain well within recorded income.",
      valueText: `${input.expenseToIncomeRatio}%`,
      status: "HEALTHY",
    });
  } else if (input.expenseToIncomeRatio > 90) {
    indicators.push({
      id: "expense-ratio",
      title: "Expense-to-Income Ratio",
      description: "Expenses account for over 90% of recorded income.",
      valueText: `${input.expenseToIncomeRatio}%`,
      status: "ATTENTION",
    });
  } else {
    indicators.push({
      id: "expense-ratio",
      title: "Expense-to-Income Ratio",
      description: "Recorded expenses relative to income.",
      valueText: `${input.expenseToIncomeRatio}%`,
      status: "NEUTRAL",
    });
  }

  // 3. Emergency Fund Coverage Indicator
  if (!input.hasFinancialProfile) {
    indicators.push({
      id: "emergency-fund",
      title: "Emergency Fund Coverage",
      description: "Set up your financial profile to measure reserve coverage.",
      valueText: "Profile incomplete",
      status: "INCOMPLETE",
    });
  } else if (input.emergencyFundCoverageMonths >= 3) {
    indicators.push({
      id: "emergency-fund",
      title: "Emergency Fund Coverage",
      description: "Estimated months of essential expenses covered by reserves.",
      valueText: `${input.emergencyFundCoverageMonths} months`,
      status: "HEALTHY",
    });
  } else if (input.emergencyFundCoverageMonths < 1) {
    indicators.push({
      id: "emergency-fund",
      title: "Emergency Fund Coverage",
      description: "Reserves cover under 1 month of essential expenses.",
      valueText: `${input.emergencyFundCoverageMonths} months`,
      status: "ATTENTION",
    });
  } else {
    indicators.push({
      id: "emergency-fund",
      title: "Emergency Fund Coverage",
      description: "Estimated months of essential expenses covered.",
      valueText: `${input.emergencyFundCoverageMonths} months`,
      status: "NEUTRAL",
    });
  }

  // 4. Financial Profile Alignment
  if (input.hasFinancialProfile && input.primaryGoal) {
    indicators.push({
      id: "goal-alignment",
      title: "Primary Priority",
      description: `Horizon: ${input.planningHorizon || "Unspecified"}`,
      valueText: input.primaryGoal.replace(/_/g, " "),
      status: "NEUTRAL",
    });
  }

  return indicators;
}
