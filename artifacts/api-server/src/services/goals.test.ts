import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { calculateGoalMetrics } from "./goals";

describe("Financial Goals Calculation Engine Unit Tests", () => {
  it("calculates exact prompt example correctly (Target 200k, Current 50k, 10 months -> 15k/mo)", () => {
    const fixedNow = new Date("2026-01-01T12:00:00.000Z");
    const result = calculateGoalMetrics({
      targetAmount: 200000,
      currentAmount: 50000,
      targetDate: "2026-11-01",
      currentDate: fixedNow,
    });

    assert.equal(result.remainingAmount, 150000);
    assert.equal(result.monthsRemaining, 10);
    assert.equal(result.requiredMonthlyContribution, 15000);
    assert.equal(result.progressPercentage, 25);
    assert.equal(result.isCompleted, false);
    assert.equal(result.needsAdjustment, false);
  });

  it("flags 'Goal may require adjustment' when required contribution exceeds monthly surplus", () => {
    const fixedNow = new Date("2026-01-01T12:00:00.000Z");
    const result = calculateGoalMetrics({
      targetAmount: 200000,
      currentAmount: 50000,
      targetDate: "2026-11-01",
      currentDate: fixedNow,
      availableMonthlySurplus: 10000, // Available surplus (10k) < Required contribution (15k)
    });

    assert.equal(result.needsAdjustment, true);
    assert.ok(result.statusNote.includes("Goal may require adjustment"));
  });

  it("flags 'Goal may require adjustment' when surplus is zero or negative and balance remains", () => {
    const fixedNow = new Date("2026-01-01T12:00:00.000Z");
    const resultZero = calculateGoalMetrics({
      targetAmount: 100000,
      currentAmount: 20000,
      targetDate: "2026-11-01",
      currentDate: fixedNow,
      availableMonthlySurplus: 0,
    });
    assert.equal(resultZero.needsAdjustment, true);
    assert.ok(resultZero.statusNote.includes("Goal may require adjustment"));

    const resultNegative = calculateGoalMetrics({
      targetAmount: 100000,
      currentAmount: 20000,
      targetDate: "2026-11-01",
      currentDate: fixedNow,
      availableMonthlySurplus: -5000,
    });
    assert.equal(resultNegative.needsAdjustment, true);
    assert.ok(resultNegative.statusNote.includes("Goal may require adjustment"));
  });

  it("handles past target dates safely and flags adjustment required", () => {
    const fixedNow = new Date("2026-06-01T12:00:00.000Z");
    const result = calculateGoalMetrics({
      targetAmount: 50000,
      currentAmount: 10000,
      targetDate: "2026-01-01", // Past target date
      currentDate: fixedNow,
    });

    assert.equal(result.monthsRemaining, 0);
    assert.equal(result.isPastTargetDate, true);
    assert.equal(result.needsAdjustment, true);
    assert.ok(result.statusNote.includes("Goal may require adjustment"));
    assert.equal(result.requiredMonthlyContribution, 40000);
  });

  it("handles zero months remaining (target date is in current month)", () => {
    const fixedNow = new Date("2026-05-10T12:00:00.000Z");
    const result = calculateGoalMetrics({
      targetAmount: 50000,
      currentAmount: 30000,
      targetDate: "2026-05-30",
      currentDate: fixedNow,
      availableMonthlySurplus: 10000, // surplus (10k) < remaining (20k)
    });

    assert.equal(result.monthsRemaining, 0);
    assert.equal(result.isPastTargetDate, false);
    assert.equal(result.remainingAmount, 20000);
    assert.equal(result.requiredMonthlyContribution, 20000);
    assert.equal(result.needsAdjustment, true);
    assert.ok(result.statusNote.includes("Goal may require adjustment"));
  });

  it("handles already completed goals (Current >= Target)", () => {
    const fixedNow = new Date("2026-01-01T12:00:00.000Z");
    const result = calculateGoalMetrics({
      targetAmount: 100000,
      currentAmount: 120000,
      targetDate: "2026-12-01",
      currentDate: fixedNow,
    });

    assert.equal(result.remainingAmount, 0);
    assert.equal(result.progressPercentage, 100);
    assert.equal(result.requiredMonthlyContribution, 0);
    assert.equal(result.isCompleted, true);
    assert.equal(result.needsAdjustment, false);
    assert.equal(result.statusNote, "Goal completed");
  });

  it("handles zero remaining amount and decimal amounts accurately", () => {
    const fixedNow = new Date("2026-01-01T12:00:00.000Z");
    const result = calculateGoalMetrics({
      targetAmount: 1234.56,
      currentAmount: 1234.56,
      targetDate: "2026-05-01",
      currentDate: fixedNow,
    });

    assert.equal(result.remainingAmount, 0);
    assert.equal(result.progressPercentage, 100);
    assert.equal(result.isCompleted, true);
  });

  it("handles missing financial data (availableMonthlySurplus undefined) gracefully", () => {
    const fixedNow = new Date("2026-01-01T12:00:00.000Z");
    const result = calculateGoalMetrics({
      targetAmount: 200000,
      currentAmount: 50000,
      targetDate: "2026-11-01",
      currentDate: fixedNow,
      availableMonthlySurplus: undefined, // Missing data
    });

    assert.equal(result.remainingAmount, 150000);
    assert.equal(result.monthsRemaining, 10);
    assert.equal(result.requiredMonthlyContribution, 15000);
    assert.equal(result.needsAdjustment, false);
    assert.ok(result.statusNote.includes("Surplus data unavailable"));
    // Ensure we do not tell the user they will definitely achieve the goal
    assert.ok(!result.statusNote.toLowerCase().includes("will achieve"));
    assert.ok(!result.statusNote.toLowerCase().includes("guaranteed"));
  });

  it("calculates projected completion date based on current monthly contribution rate", () => {
    const fixedNow = new Date("2026-01-01T12:00:00.000Z");
    // Remaining is 150,000. At 15,000/month, projected completion takes 10 months -> 2026-11-01
    const result = calculateGoalMetrics({
      targetAmount: 200000,
      currentAmount: 50000,
      targetDate: "2026-11-01",
      currentDate: fixedNow,
      averageMonthlyContribution: 15000,
    });

    assert.ok(result.projectedCompletionDate !== null);
    assert.equal(result.projectedCompletionDate?.slice(0, 7), "2026-11");
  });

  it("leaves projected completion date null when no contribution rate is established", () => {
    const fixedNow = new Date("2026-01-01T12:00:00.000Z");
    const result = calculateGoalMetrics({
      targetAmount: 200000,
      currentAmount: 50000,
      targetDate: "2026-11-01",
      currentDate: fixedNow,
      averageMonthlyContribution: 0,
    });

    // Should NOT assume completion on target date without contributions
    assert.equal(result.projectedCompletionDate, null);
  });

  it("flags adjustment if projected completion at current rate is after target date", () => {
    const fixedNow = new Date("2026-01-01T12:00:00.000Z");
    // Remaining: 150,000. Target: 2026-11-01 (10 months). At 5,000/mo, it takes 30 months -> 2028-07
    const result = calculateGoalMetrics({
      targetAmount: 200000,
      currentAmount: 50000,
      targetDate: "2026-11-01",
      currentDate: fixedNow,
      averageMonthlyContribution: 5000,
    });

    assert.equal(result.needsAdjustment, true);
    assert.ok(result.statusNote.includes("Goal may require adjustment"));
    assert.ok(result.statusNote.includes("after target date"));
  });
});
