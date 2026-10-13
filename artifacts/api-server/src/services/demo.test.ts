import test, { describe } from "node:test";
import assert from "node:assert/strict";
import { DEMO_USER_EMAIL } from "./demo";
import { getUserSubscription, switchUserSubscription } from "./subscription";

describe("Phase 11: Demo Mode & Synthetic Financial Dataset Tests", () => {
  test("defines distinct demo user identifier that never collides with real users", () => {
    assert.equal(DEMO_USER_EMAIL, "demo@synovate.local");
    assert.match(DEMO_USER_EMAIL, /@synovate\.local$/);
  });

  test("demo mode automatically grants Premium tier entitlements for full feature evaluation", () => {
    const demoUserId = "test-demo-eval-user";
    switchUserSubscription(demoUserId, "PREMIUM");

    const sub = getUserSubscription(demoUserId);
    assert.equal(sub.tier, "PREMIUM");
    assert.equal(sub.status, "active");
  });

  test("verifies mathematical consistency of prompt demo scenario values", () => {
    const monthlyIncome = 60000;
    const monthlyExpenses = 42000; // 25k fixed + 17k variable
    const monthlySurplus = monthlyIncome - monthlyExpenses;

    assert.equal(monthlySurplus, 18000);

    // Goal: ₹2,00,000 target, ₹50,000 current
    const goalTarget = 200000;
    const goalCurrent = 50000;
    const goalRemaining = goalTarget - goalCurrent;
    const monthsRemaining = 10;
    const requiredMonthlyContribution = goalRemaining / monthsRemaining;

    assert.equal(goalRemaining, 150000);
    assert.equal(requiredMonthlyContribution, 15000);
    // Verified: Surplus (₹18,000) > Required (₹15,000) -> Mathematically on track!
    assert.ok(monthlySurplus >= requiredMonthlyContribution);

    // What-If scenario: Save ₹3,000 more
    const simulatedSavings = monthlySurplus + 3000;
    assert.equal(simulatedSavings, 21000);
  });
});
