import { describe, it } from "node:test";
import assert from "node:assert/strict";
import {
  calculateSavings,
  calculateSavingsRate,
  calculateExpenseToIncomeRatio,
  calculateCategoryPercentages,
  calculateEmergencyFundCoverage,
  buildHealthIndicators,
} from "./analytics";

describe("Analytics Engine Formula Unit Tests", () => {
  describe("calculateSavings", () => {
    it("handles standard income and expenses", () => {
      assert.equal(calculateSavings(5000, 3000), 2000);
    });

    it("handles zero income", () => {
      assert.equal(calculateSavings(0, 1500), -1500);
    });

    it("handles no transactions (0 income, 0 expenses)", () => {
      assert.equal(calculateSavings(0, 0), 0);
    });

    it("handles only income", () => {
      assert.equal(calculateSavings(7500, 0), 7500);
    });

    it("handles decimal amounts correctly", () => {
      assert.equal(calculateSavings(1234.56, 789.12), 445.44);
    });

    it("handles large values safely", () => {
      assert.equal(calculateSavings(999999999999.99, 100000000000.00), 899999999999.99);
    });

    it("guards against negative or invalid inputs", () => {
      assert.equal(calculateSavings(-500, -100), 0);
      assert.equal(calculateSavings(NaN, 200), -200);
    });
  });

  describe("calculateSavingsRate", () => {
    it("calculates positive savings rate", () => {
      assert.equal(calculateSavingsRate(10000, 4000), 60);
    });

    it("handles zero income safely without division by zero", () => {
      assert.equal(calculateSavingsRate(0, 1500), 0);
    });

    it("handles no transactions", () => {
      assert.equal(calculateSavingsRate(0, 0), 0);
    });

    it("handles 100% savings rate (only income)", () => {
      assert.equal(calculateSavingsRate(5000, 0), 100);
    });

    it("handles negative savings rate when expenses exceed income", () => {
      assert.equal(calculateSavingsRate(2000, 3000), -50);
    });

    it("rounds decimals accurately", () => {
      assert.equal(calculateSavingsRate(3333.33, 1111.11), 66.67);
    });
  });

  describe("calculateExpenseToIncomeRatio", () => {
    it("calculates ratio correctly", () => {
      assert.equal(calculateExpenseToIncomeRatio(5000, 2500), 50);
    });

    it("handles zero income safely", () => {
      assert.equal(calculateExpenseToIncomeRatio(0, 500), 0);
    });

    it("handles 0% ratio when expenses are zero", () => {
      assert.equal(calculateExpenseToIncomeRatio(5000, 0), 0);
    });

    it("rounds decimals accurately", () => {
      assert.equal(calculateExpenseToIncomeRatio(3000, 1000), 33.33);
    });
  });

  describe("calculateCategoryPercentages", () => {
    it("calculates percentage breakdown per category", () => {
      const categories = [
        { category: "Housing", amount: 1000 },
        { category: "Food", amount: 500 },
      ];
      const result = calculateCategoryPercentages(categories, 1500);
      assert.equal(result[0].percentage, 66.67);
      assert.equal(result[1].percentage, 33.33);
    });

    it("handles total expenses === 0 safely", () => {
      const categories = [{ category: "Housing", amount: 0 }];
      const result = calculateCategoryPercentages(categories, 0);
      assert.equal(result[0].percentage, 0);
    });
  });

  describe("calculateEmergencyFundCoverage", () => {
    it("calculates coverage in months", () => {
      assert.equal(calculateEmergencyFundCoverage(15000, 3000), 5);
    });

    it("handles zero monthly essential expenses safely", () => {
      assert.equal(calculateEmergencyFundCoverage(10000, 0), 0);
    });

    it("rounds to 1 decimal place", () => {
      assert.equal(calculateEmergencyFundCoverage(10000, 3000), 3.3);
    });
  });

  describe("buildHealthIndicators", () => {
    it("generates healthy indicators for a strong financial position", () => {
      const indicators = buildHealthIndicators({
        savingsRate: 35,
        expenseToIncomeRatio: 65,
        emergencyFundCoverageMonths: 6,
        emergencyFundAmount: 18000,
        monthlyFixedExpenses: 3000,
        monthlyVariableExpenses: 1000,
        essentialMonthlyExpenses: 3000,
        primaryGoal: "emergency_fund",
        planningHorizon: "1_to_3_years",
        hasFinancialProfile: true,
      });

      assert.equal(indicators.length, 4);
      assert.equal(indicators[0].status, "HEALTHY");
      assert.equal(indicators[1].status, "HEALTHY");
      assert.equal(indicators[2].status, "HEALTHY");
    });

    it("generates incomplete status when financial profile is missing", () => {
      const indicators = buildHealthIndicators({
        savingsRate: 0,
        expenseToIncomeRatio: 0,
        emergencyFundCoverageMonths: 0,
        emergencyFundAmount: 0,
        monthlyFixedExpenses: 0,
        monthlyVariableExpenses: 0,
        essentialMonthlyExpenses: 0,
        primaryGoal: null,
        planningHorizon: null,
        hasFinancialProfile: false,
      });

      assert.equal(indicators.find((i) => i.id === "emergency-fund")?.status, "INCOMPLETE");
    });
  });
});
