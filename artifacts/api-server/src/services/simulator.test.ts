import assert from "node:assert/strict";
import { test, describe } from "node:test";
import { calculateSimulation } from "./simulator";

describe("What-If Financial Simulation Engine Unit Tests", () => {
  test("calculates prompt example correctly (Income 60k, Expenses 42k, +3k savings)", () => {
    const res = calculateSimulation({
      baselineIncome: 60000,
      baselineExpenses: 42000,
      existingSavings: 50000,
      goalTargetAmount: 200000,
      goalCurrentAmount: 50000,
      additionalMonthlySavings: 3000,
    });

    assert.equal(res.baseline.monthlySavings, 18000);
    assert.equal(res.simulated.effectiveMonthlySavings, 21000);
    assert.equal(res.comparison.monthlySavingsDifference, 3000);
    // Baseline remaining 150,000 / 18,000 = 9 months
    assert.equal(res.baseline.monthsToGoal, 9);
    // Simulated remaining 150,000 / 21,000 = 8 months (7.14 -> 8 months)
    assert.equal(res.simulated.monthsToGoal, 8);
    assert.equal(res.comparison.monthsSaved, 1);
  });

  test("handles 'What if income increases by ₹10,000?' scenario", () => {
    const res = calculateSimulation({
      baselineIncome: 60000,
      baselineExpenses: 40000,
      existingSavings: 0,
      goalTargetAmount: 100000,
      goalCurrentAmount: 0,
      incomeAdjustment: 10000,
    });

    assert.equal(res.baseline.monthlyIncome, 60000);
    assert.equal(res.simulated.monthlyIncome, 70000);
    assert.equal(res.baseline.monthlySavings, 20000);
    assert.equal(res.simulated.effectiveMonthlySavings, 30000);
    assert.equal(res.baseline.monthsToGoal, 5); // 100k / 20k
    assert.equal(res.simulated.monthsToGoal, 4); // 100k / 30k -> 3.33 -> 4 mos
    assert.equal(res.comparison.monthsSaved, 1);
  });

  test("handles 'What if expenses increase by ₹5,000?' scenario", () => {
    const res = calculateSimulation({
      baselineIncome: 50000,
      baselineExpenses: 30000,
      existingSavings: 10000,
      goalTargetAmount: 100000,
      goalCurrentAmount: 10000,
      expenseAdjustment: 5000,
    });

    assert.equal(res.baseline.monthlyExpenses, 30000);
    assert.equal(res.simulated.monthlyExpenses, 35000);
    assert.equal(res.baseline.monthlySavings, 20000);
    assert.equal(res.simulated.effectiveMonthlySavings, 15000);
    assert.equal(res.comparison.monthsSaved, -1);
  });

  test("handles 'What if I reduce expenses by ₹2,000?' scenario", () => {
    const res = calculateSimulation({
      baselineIncome: 50000,
      baselineExpenses: 35000,
      existingSavings: 10000,
      goalTargetAmount: 100000,
      goalCurrentAmount: 10000,
      expenseAdjustment: -2000,
    });

    assert.equal(res.simulated.monthlyExpenses, 33000);
    assert.equal(res.simulated.effectiveMonthlySavings, 17000);
  });

  test("handles one-time expense reducing initial goal balance", () => {
    const res = calculateSimulation({
      baselineIncome: 50000,
      baselineExpenses: 30000,
      existingSavings: 50000,
      goalTargetAmount: 100000,
      goalCurrentAmount: 50000,
      oneTimeExpense: 20000, // starting saved reduced to 30,000
    });

    assert.equal(res.baseline.startingSavings, 50000);
    assert.equal(res.simulated.startingSavings, 30000);
    assert.equal(res.simulated.remainingGoalAmount, 70000);
  });

  test("handles zero or negative surplus safely without division by zero", () => {
    const res = calculateSimulation({
      baselineIncome: 30000,
      baselineExpenses: 35000, // Deficit
      existingSavings: 5000,
      goalTargetAmount: 50000,
      goalCurrentAmount: 5000,
    });

    assert.equal(res.baseline.isUnreachable, true);
    assert.equal(res.baseline.monthsToGoal, null);
    assert.ok(res.baseline.statusNote.includes("unreachable"));
  });

  test("validates negative income/expense inputs boundaries", () => {
    const res = calculateSimulation({
      baselineIncome: -5000, // Invalid, sanitized to 0
      baselineExpenses: -2000, // Invalid, sanitized to 0
      existingSavings: -100,
      goalTargetAmount: -50,
      goalCurrentAmount: 0,
    });

    assert.equal(res.baseline.monthlyIncome, 0);
    assert.equal(res.baseline.monthlyExpenses, 0);
    assert.equal(res.baseline.remainingGoalAmount, 0.01);
  });
});
