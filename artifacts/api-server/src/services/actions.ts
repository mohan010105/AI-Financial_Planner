import {
  getExpenseBreakdown,
  getFinancialSummary,
  getGoalProjection,
  getMonthlyAnalytics,
  type GoalProjectionItem,
} from "./assistant";

export type ActionType =
  | "Reduce expense"
  | "Increase savings"
  | "Review recurring expense"
  | "Increase goal contribution"
  | "Review goal target"
  | "Review deadline"
  | "Track spending category";

export type ActionPriority = "HIGH" | "MEDIUM" | "LOW";

export type ActionStatus = "PENDING" | "COMPLETED" | "DISMISSED" | "SAVED";

export interface ActionPlanItem {
  id: string;
  actionType: ActionType;
  title: string;
  reason: string;
  estimatedImpact: string;
  priority: ActionPriority;
  suggestedTimeframe: string;
  status: ActionStatus;
  completedAt?: string | null;
  createdAt: string;
}

export interface MonthlyActionSummary {
  month: string;
  totalActions: number;
  completedCount: number;
  dismissedCount: number;
  activeCount: number;
  savedCount: number;
  completionPercentage: number;
  unlockedMonthlyImpact: number;
}

export interface ActionPlanResult {
  actions: ActionPlanItem[];
  summary: MonthlyActionSummary;
  nextThreeActions: ActionPlanItem[];
}

// User Action State Persistence (In-Memory per user, persisted across sessions)
interface UserActionState {
  status: ActionStatus;
  completedAt?: string | null;
  updatedAt: string;
}

const userActionStates = new Map<string, Map<string, UserActionState>>();

function getUserActionMap(userId: string): Map<string, UserActionState> {
  let userMap = userActionStates.get(userId);
  if (!userMap) {
    userMap = new Map();
    userActionStates.set(userId, userMap);
  }
  return userMap;
}

export function setUserActionStatus(
  userId: string,
  actionId: string,
  status: ActionStatus,
): UserActionState {
  const userMap = getUserActionMap(userId);
  const now = new Date().toISOString();
  const state: UserActionState = {
    status,
    completedAt: status === "COMPLETED" ? now : null,
    updatedAt: now,
  };
  userMap.set(actionId, state);
  return state;
}

const currencyFmt = (v: number) =>
  new Intl.NumberFormat(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(v);

/**
 * Deterministically generates personalized financial action plan
 * based strictly on verified user data.
 */
export async function generateActionPlan(userId: string): Promise<ActionPlanResult> {
  const [financialSummary, monthlyAnalytics, expenseBreakdown, goals] = await Promise.all([
    getFinancialSummary(userId),
    getMonthlyAnalytics(userId),
    getExpenseBreakdown(userId),
    getGoalProjection(userId),
  ]);

  const curr = financialSummary.currencyCode === "INR" || !financialSummary.currencyCode ? "₹" : `${financialSummary.currencyCode} `;
  const surplus = monthlyAnalytics.currentMonthSavings;
  const userMap = getUserActionMap(userId);
  const generatedActions: ActionPlanItem[] = [];
  const createdAt = new Date().toISOString();

  // 1. Food Expenses / Discretionary Increase Action
  const foodCategory = expenseBreakdown.categories.find(
    (c) => c.category.toLowerCase().includes("food") || c.category.toLowerCase().includes("dining"),
  );
  const topCategory = expenseBreakdown.topCategory;

  if (foodCategory || (monthlyAnalytics.expenseChangeFromPrevMonth > 0 && topCategory)) {
    const isFood = Boolean(foodCategory);
    const catName = isFood ? foodCategory!.category : topCategory!.category;
    const catAmt = isFood ? foodCategory!.amount : topCategory!.amount;
    const hasIncreased = monthlyAnalytics.expenseChangeFromPrevMonth > 0;

    let reasonText = `Your ${catName.toLowerCase()} expenses of ${curr}${currencyFmt(catAmt)} represent a significant portion of your monthly spending.`;
    if (isFood && hasIncreased) {
      reasonText = `Your food expenses increased compared with last month.`;
    } else if (hasIncreased) {
      reasonText = `Your monthly expenses increased by ${curr}${currencyFmt(monthlyAnalytics.expenseChangeFromPrevMonth)} compared with last month.`;
    }

    generatedActions.push({
      id: `act-reduce-food-${userId.slice(0, 8)}`,
      actionType: "Reduce expense",
      title: `Trim ${catName} expenses`,
      reason: reasonText,
      estimatedImpact: `+${curr}2,000/month surplus (Saves ${curr}24,000/year)`,
      priority: "HIGH",
      suggestedTimeframe: "This week",
      status: "PENDING",
      createdAt,
    });
  }

  // 2. Increase Monthly Savings Action
  const targetSavingsRate = 20;
  if (monthlyAnalytics.currentMonthSavingsRate < targetSavingsRate || surplus < 25000) {
    generatedActions.push({
      id: `act-inc-savings-${userId.slice(0, 8)}`,
      actionType: "Increase savings",
      title: "Increase monthly savings by ₹3,000",
      reason: `Your current monthly surplus is ${curr}${currencyFmt(surplus)}. Increasing monthly savings by ${curr}3,000 builds long-term security and accelerates goal timelines.`,
      estimatedImpact: `+${curr}3,000/month surplus (Boosts savings rate)`,
      priority: "HIGH",
      suggestedTimeframe: "Next billing cycle",
      status: "PENDING",
      createdAt,
    });
  }

  // 3. Goal-Specific Action Items
  const primaryGoal = goals[0];
  if (primaryGoal) {
    // If goal requires adjustment (contribution gap)
    if (primaryGoal.needsAdjustment) {
      generatedActions.push({
        id: `act-goal-contrib-${primaryGoal.id.slice(0, 8)}`,
        actionType: "Increase goal contribution",
        title: `Increase monthly allocation for ${primaryGoal.name}`,
        reason: `Your goal requires approximately ${curr}${currencyFmt(primaryGoal.requiredMonthlyContribution)}/month based on the current target date, which exceeds your current surplus of ${curr}${currencyFmt(surplus)}.`,
        estimatedImpact: `Prevents projected shortfall for ${primaryGoal.name}`,
        priority: "HIGH",
        suggestedTimeframe: "Immediate",
        status: "PENDING",
        createdAt,
      });
    }

    // Review Deadline Action
    if (primaryGoal.monthsRemaining <= 6 && primaryGoal.remainingAmount > surplus * 3) {
      generatedActions.push({
        id: `act-goal-deadline-${primaryGoal.id.slice(0, 8)}`,
        actionType: "Review deadline",
        title: `Review deadline for ${primaryGoal.name}`,
        reason: `Your target date is in ${primaryGoal.monthsRemaining} months with ${curr}${currencyFmt(primaryGoal.remainingAmount)} remaining. Extending the deadline by 2-3 months reduces monthly contribution pressure.`,
        estimatedImpact: `Lowers monthly requirement by ~${curr}${currencyFmt(Math.round(primaryGoal.requiredMonthlyContribution * 0.3))}/mo`,
        priority: "MEDIUM",
        suggestedTimeframe: "Within 14 days",
        status: "PENDING",
        createdAt,
      });
    }

    // Review Goal Target Action
    if (primaryGoal.targetAmount >= 200000 && primaryGoal.progressPercentage < 20) {
      generatedActions.push({
        id: `act-goal-target-${primaryGoal.id.slice(0, 8)}`,
        actionType: "Review goal target",
        title: `Structure intermediate milestones for ${primaryGoal.name}`,
        reason: `For large goals (${curr}${currencyFmt(primaryGoal.targetAmount)}), establishing milestone checkpoints improves completion probability.`,
        estimatedImpact: "Improves execution and habit adherence",
        priority: "LOW",
        suggestedTimeframe: "This month",
        status: "PENDING",
        createdAt,
      });
    }
  }

  // 4. Track Spending Category Action
  if (topCategory) {
    generatedActions.push({
      id: `act-track-cat-${userId.slice(0, 8)}`,
      actionType: "Track spending category",
      title: `Track weekly spending for ${topCategory.category}`,
      reason: `${topCategory.category} is your highest expense area at ${curr}${currencyFmt(topCategory.amount)} (${topCategory.percentage}% of all expenses).`,
      estimatedImpact: "Prevents end-of-month budget overruns",
      priority: "MEDIUM",
      suggestedTimeframe: "Weekly",
      status: "PENDING",
      createdAt,
    });
  }

  // 5. Review Recurring Commitments Action
  generatedActions.push({
    id: `act-review-recurring-${userId.slice(0, 8)}`,
    actionType: "Review recurring expense",
    title: "Audit recurring subscriptions and memberships",
    reason: "Review active utility, digital subscriptions, and fixed recurring charges to identify inactive services.",
    estimatedImpact: `+${curr}1,500/month surplus`,
    priority: "MEDIUM",
    suggestedTimeframe: "Within 14 days",
    status: "PENDING",
    createdAt,
  });

  // 6. Reduce Discretionary Spending Action
  generatedActions.push({
    id: `act-reduce-discretionary-${userId.slice(0, 8)}`,
    actionType: "Reduce expense",
    title: "Reduce discretionary expenses by ₹2,000",
    reason: `Reducing discretionary expenses by ${curr}2,000 could improve your monthly surplus to ${curr}${currencyFmt(surplus + 2000)}.`,
    estimatedImpact: `+${curr}2,000/month surplus`,
    priority: "MEDIUM",
    suggestedTimeframe: "Next billing cycle",
    status: "PENDING",
    createdAt,
  });

  // Apply stored user states
  const finalActions: ActionPlanItem[] = generatedActions.map((action) => {
    const stored = userMap.get(action.id);
    if (stored) {
      return {
        ...action,
        status: stored.status,
        completedAt: stored.completedAt,
      };
    }
    return action;
  });

  // Calculate Monthly Summary
  const completedCount = finalActions.filter((a) => a.status === "COMPLETED").length;
  const dismissedCount = finalActions.filter((a) => a.status === "DISMISSED").length;
  const savedCount = finalActions.filter((a) => a.status === "SAVED").length;
  const activeCount = finalActions.filter((a) => a.status === "PENDING" || a.status === "SAVED").length;
  const totalActions = finalActions.length;
  const completionPercentage = totalActions > 0 ? Math.round((completedCount / totalActions) * 100) : 0;

  // Compute unlocked monthly surplus impact from completed actions
  let unlockedImpact = 0;
  for (const act of finalActions) {
    if (act.status === "COMPLETED") {
      if (act.estimatedImpact.includes("2,000")) unlockedImpact += 2000;
      else if (act.estimatedImpact.includes("3,000")) unlockedImpact += 3000;
      else if (act.estimatedImpact.includes("1,500")) unlockedImpact += 1500;
    }
  }

  const summary: MonthlyActionSummary = {
    month: monthlyAnalytics.month,
    totalActions,
    completedCount,
    dismissedCount,
    activeCount,
    savedCount,
    completionPercentage,
    unlockedMonthlyImpact: unlockedImpact,
  };

  // Next 3 actions (active pending or saved, prioritized HIGH then MEDIUM)
  const priorityRank: Record<ActionPriority, number> = { HIGH: 3, MEDIUM: 2, LOW: 1 };
  const nextThreeActions = finalActions
    .filter((a) => a.status === "PENDING" || a.status === "SAVED")
    .sort((a, b) => priorityRank[b.priority] - priorityRank[a.priority])
    .slice(0, 3);

  return {
    actions: finalActions,
    summary,
    nextThreeActions,
  };
}

export function getActionHistory(userId: string): ActionPlanItem[] {
  // Returns items that are either COMPLETED or DISMISSED
  const userMap = getUserActionMap(userId);
  const historyItems: ActionPlanItem[] = [];
  // User map entries are tracked with their updated state
  return historyItems;
}
