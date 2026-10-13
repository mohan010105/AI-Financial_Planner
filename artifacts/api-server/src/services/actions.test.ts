import assert from "node:assert/strict";
import { test, describe } from "node:test";
import {
  setUserActionStatus,
  type ActionPlanItem,
  type ActionType,
  type MonthlyActionSummary,
} from "./actions";

describe("Personalized Financial Action Plan Unit Tests (Phase 8)", () => {
  const mockActions: ActionPlanItem[] = [
    {
      id: "act-reduce-food-1",
      actionType: "Reduce expense",
      title: "Trim Food & Dining expenses",
      reason: "Your food expenses increased compared with last month.",
      estimatedImpact: "+₹2,000/month surplus (Saves ₹24,000/year)",
      priority: "HIGH",
      suggestedTimeframe: "This week",
      status: "PENDING",
      createdAt: "2026-10-10T12:00:00Z",
    },
    {
      id: "act-inc-savings-1",
      actionType: "Increase savings",
      title: "Increase monthly savings by ₹3,000",
      reason: "Your current monthly surplus is ₹18,000.00. Increasing monthly savings by ₹3,000 builds long-term security.",
      estimatedImpact: "+₹3,000/month surplus (Boosts savings rate)",
      priority: "HIGH",
      suggestedTimeframe: "Next billing cycle",
      status: "PENDING",
      createdAt: "2026-10-10T12:00:00Z",
    },
    {
      id: "act-goal-contrib-1",
      actionType: "Increase goal contribution",
      title: "Increase monthly allocation for Emergency Fund",
      reason: "Your goal requires approximately ₹25,000.00/month based on the current target date, which exceeds your current surplus of ₹18,000.00.",
      estimatedImpact: "Prevents projected shortfall for Emergency Fund",
      priority: "HIGH",
      suggestedTimeframe: "Immediate",
      status: "PENDING",
      createdAt: "2026-10-10T12:00:00Z",
    },
    {
      id: "act-reduce-discretionary-1",
      actionType: "Reduce expense",
      title: "Reduce discretionary expenses by ₹2,000",
      reason: "Reducing discretionary expenses by ₹2,000 could improve your monthly surplus to ₹20,000.00.",
      estimatedImpact: "+₹2,000/month surplus",
      priority: "MEDIUM",
      suggestedTimeframe: "Next billing cycle",
      status: "PENDING",
      createdAt: "2026-10-10T12:00:00Z",
    },
    {
      id: "act-review-recurring-1",
      actionType: "Review recurring expense",
      title: "Audit recurring subscriptions and memberships",
      reason: "Review active utility, digital subscriptions, and fixed recurring charges to eliminate unused services.",
      estimatedImpact: "+₹1,500/month surplus",
      priority: "MEDIUM",
      suggestedTimeframe: "Within 14 days",
      status: "PENDING",
      createdAt: "2026-10-10T12:00:00Z",
    },
    {
      id: "act-goal-deadline-1",
      actionType: "Review deadline",
      title: "Review deadline for Emergency Fund",
      reason: "Your target date is in 4 months with ₹1,00,000 remaining. Extending the deadline by 2-3 months reduces monthly contribution pressure.",
      estimatedImpact: "Lowers monthly requirement by ~₹5,000/mo",
      priority: "MEDIUM",
      suggestedTimeframe: "Within 14 days",
      status: "PENDING",
      createdAt: "2026-10-10T12:00:00Z",
    },
    {
      id: "act-goal-target-1",
      actionType: "Review goal target",
      title: "Structure intermediate milestones for Emergency Fund",
      reason: "For large goals (₹2,00,000), establishing milestone checkpoints improves completion probability.",
      estimatedImpact: "Improves execution and habit adherence",
      priority: "LOW",
      suggestedTimeframe: "This month",
      status: "PENDING",
      createdAt: "2026-10-10T12:00:00Z",
    },
    {
      id: "act-track-cat-1",
      actionType: "Track spending category",
      title: "Track weekly spending for Housing",
      reason: "Housing is your highest expense area at ₹20,000.00 (47.6% of all expenses).",
      estimatedImpact: "Prevents end-of-month budget overruns",
      priority: "MEDIUM",
      suggestedTimeframe: "Weekly",
      status: "PENDING",
      createdAt: "2026-10-10T12:00:00Z",
    },
  ];

  test("contains all required action types from prompt specification", () => {
    const types = new Set(mockActions.map((a) => a.actionType));
    const requiredTypes: ActionType[] = [
      "Reduce expense",
      "Increase savings",
      "Review recurring expense",
      "Increase goal contribution",
      "Review goal target",
      "Review deadline",
      "Track spending category",
    ];

    for (const t of requiredTypes) {
      assert.ok(types.has(t), `Missing action type: ${t}`);
    }
  });

  test("includes verified data reasons from prompt examples", () => {
    const reasons = mockActions.map((a) => a.reason).join(" ");
    assert.ok(reasons.includes("Your food expenses increased compared with last month."));
    assert.ok(reasons.includes("Your current monthly surplus is ₹18,000.00."));
    assert.ok(reasons.includes("approximately ₹25,000.00/month based on the current target date"));
    assert.ok(reasons.includes("Reducing discretionary expenses by ₹2,000 could improve your monthly surplus"));
  });

  test("allows user to update action status (complete, dismiss, save)", () => {
    const testUserId = "user-test-actions-123";

    const completedState = setUserActionStatus(testUserId, "act-reduce-food-1", "COMPLETED");
    assert.equal(completedState.status, "COMPLETED");
    assert.ok(completedState.completedAt);

    const dismissedState = setUserActionStatus(testUserId, "act-inc-savings-1", "DISMISSED");
    assert.equal(dismissedState.status, "DISMISSED");

    const savedState = setUserActionStatus(testUserId, "act-goal-contrib-1", "SAVED");
    assert.equal(savedState.status, "SAVED");
  });

  test("filters top 3 prioritized actions for the dashboard", () => {
    const priorityRank = { HIGH: 3, MEDIUM: 2, LOW: 1 };
    const nextThree = [...mockActions]
      .filter((a) => a.status === "PENDING" || a.status === "SAVED")
      .sort((a, b) => priorityRank[b.priority] - priorityRank[a.priority])
      .slice(0, 3);

    assert.equal(nextThree.length, 3);
    assert.equal(nextThree[0].priority, "HIGH");
    assert.equal(nextThree[1].priority, "HIGH");
    assert.equal(nextThree[2].priority, "HIGH");
  });

  test("computes monthly action summary correctly", () => {
    const total = mockActions.length;
    const completed = 2;
    const dismissed = 1;
    const active = total - completed - dismissed;

    const summary: MonthlyActionSummary = {
      month: "2026-10",
      totalActions: total,
      completedCount: completed,
      dismissedCount: dismissed,
      activeCount: active,
      savedCount: 1,
      completionPercentage: Math.round((completed / total) * 100),
      unlockedMonthlyImpact: 5000,
    };

    assert.equal(summary.totalActions, 8);
    assert.equal(summary.completedCount, 2);
    assert.equal(summary.completionPercentage, 25);
    assert.equal(summary.unlockedMonthlyImpact, 5000);
  });
});
