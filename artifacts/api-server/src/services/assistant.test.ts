import assert from "node:assert/strict";
import { test, describe } from "node:test";
import {
  detectIntent,
  generateDeterministicResponse,
  type AssistantContextData,
} from "./assistant";

describe("AI Financial Planning Assistant Unit Tests (Phase 7)", () => {
  const mockContext: AssistantContextData = {
    financialSummary: {
      totalIncome: 60000,
      totalExpenses: 42000,
      totalSavings: 18000,
      allTimeSavingsRate: 30,
      emergencyFundAmount: 150000,
      primaryGoal: "Emergency Fund",
      currencyCode: "INR",
      asOfDate: "2026-10-10",
    },
    monthlyAnalytics: {
      month: "2026-10",
      currentMonthIncome: 60000,
      currentMonthExpenses: 42000,
      currentMonthSavings: 18000,
      currentMonthSavingsRate: 30,
      previousMonthExpenses: 38000,
      expenseChangeFromPrevMonth: 4000,
    },
    expenseBreakdown: {
      totalExpenses: 42000,
      topCategory: { category: "Housing", amount: 20000, percentage: 47.6 },
      categories: [
        { category: "Housing", amount: 20000, percentage: 47.6 },
        { category: "Food & Dining", amount: 12000, percentage: 28.6 },
        { category: "Utilities", amount: 10000, percentage: 23.8 },
      ],
    },
    goals: [
      {
        id: "goal-1",
        name: "Emergency Fund",
        targetAmount: 200000,
        currentAmount: 50000,
        remainingAmount: 150000,
        monthsRemaining: 9,
        requiredMonthlyContribution: 16666.67,
        progressPercentage: 25,
        needsAdjustment: false,
        statusNote: "On track",
        achievableIn12Months: true,
      },
    ],
    whatIfProjection: {
      additionalMonthlySavings: 3000,
      baselineSurplus: 18000,
      simulatedSurplus: 21000,
      monthlySavingsDifference: 3000,
      monthsSaved: 1,
      summaryText: "This scenario reaches your goal 1 month earlier!",
    },
    questionIntent: "GENERAL_ADVICE",
  };

  test("correctly detects intents for all prompt use cases", () => {
    assert.equal(detectIntent("Why did my savings decrease this month?"), "SAVINGS_ANALYSIS");
    assert.equal(detectIntent("Where am I spending the most?"), "SPENDING_BREAKDOWN");
    assert.equal(detectIntent("Can I reach my goal within 12 months?"), "GOAL_FEASIBILITY");
    assert.equal(detectIntent("What happens if I save ₹3,000 more?"), "WHAT_IF_SCENARIO");
    assert.equal(detectIntent("Which expenses increased this month?"), "EXPENSE_CHANGES");
    assert.equal(detectIntent("Explain my financial health."), "FINANCIAL_HEALTH");
    assert.equal(detectIntent("How is my spending this month?"), "SPENDING_BREAKDOWN");
    assert.equal(detectIntent("What is affecting my savings?"), "SAVINGS_ANALYSIS");
    assert.equal(detectIntent("Explain my active goals."), "GOAL_FEASIBILITY");
    assert.equal(detectIntent("Where can I reduce spending?"), "SPENDING_BREAKDOWN");
  });

  test("generates tailored spending breakdown with verified category data", () => {
    const res = generateDeterministicResponse("SPENDING_BREAKDOWN", mockContext, "Where am I spending the most?");
    assert.ok(res.includes("Housing"));
    assert.ok(res.includes("47.6%"));
    assert.ok(res.includes("42,000.00"));
    assert.ok(res.includes("Food & Dining"));
  });

  test("generates tailored savings analysis explaining cash flow dynamics", () => {
    const res = generateDeterministicResponse("SAVINGS_ANALYSIS", mockContext, "Why did my savings decrease this month?");
    assert.ok(res.includes("18,000.00"));
    assert.ok(res.includes("30%"));
    assert.ok(res.includes("Housing"));
  });

  test("generates 12-month goal feasibility assessment", () => {
    const res = generateDeterministicResponse("GOAL_FEASIBILITY", mockContext, "Can I reach my goal within 12 months?");
    assert.ok(res.includes("Emergency Fund"));
    assert.ok(res.includes("12-Month Required Contribution"));
    assert.ok(res.includes("achievable within 12 months"));
  });

  test("generates what-if scenario projection with exact surplus and timeline differences", () => {
    const res = generateDeterministicResponse("WHAT_IF_SCENARIO", mockContext, "What happens if I save ₹3,000 more?");
    assert.ok(res.includes("21,000.00"));
    assert.ok(res.includes("18,000.00"));
    assert.ok(res.includes("1 month earlier"));
  });

  test("generates verified expense changes analysis", () => {
    const res = generateDeterministicResponse("EXPENSE_CHANGES", mockContext, "Which expenses increased this month?");
    assert.ok(res.includes("42,000.00"));
    assert.ok(res.includes("38,000.00"));
    assert.ok(res.includes("Housing"));
  });

  test("generates financial health overview with disclaimer", () => {
    const res = generateDeterministicResponse("FINANCIAL_HEALTH", mockContext, "Explain my financial health.");
    assert.ok(res.includes("EXCELLENT") || res.includes("MODERATE") || res.includes("Rating"));
    assert.ok(res.includes("Savings Rate"));
    assert.ok(res.includes("Disclaimer"));
  });

  test("ensures distinct questions do NOT return the same generic response", () => {
    const spendingReply = generateDeterministicResponse("SPENDING_BREAKDOWN", mockContext, "Where am I spending the most?");
    const savingsReply = generateDeterministicResponse("SAVINGS_ANALYSIS", mockContext, "Why did my savings decrease this month?");
    const goalsReply = generateDeterministicResponse("GOAL_FEASIBILITY", mockContext, "Can I reach my goal within 12 months?");
    const whatIfReply = generateDeterministicResponse("WHAT_IF_SCENARIO", mockContext, "What happens if I save ₹3,000 more?");

    assert.notEqual(spendingReply, savingsReply);
    assert.notEqual(savingsReply, goalsReply);
    assert.notEqual(goalsReply, whatIfReply);
  });
});
