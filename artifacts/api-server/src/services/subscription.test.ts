import assert from "node:assert/strict";
import { test, describe } from "node:test";
import {
  checkFeatureEntitlement,
  FUTURE_ENTERPRISE_TRACKS,
  getUserSubscription,
  PLAN_DEFINITIONS,
  switchUserSubscription,
} from "./subscription";

describe("Product Monetization & Feature Entitlements Unit Tests (Phase 9)", () => {
  const testUserId = "user-sub-test-456";

  test("defines all three required tiers with correct capabilities", () => {
    const free = PLAN_DEFINITIONS.FREE;
    const premium = PLAN_DEFINITIONS.PREMIUM;
    const family = PLAN_DEFINITIONS.FAMILY;

    // Free tier checks
    assert.equal(free.monthlyPrice, 0);
    assert.equal(free.entitlements.maxGoals, 2);
    assert.equal(free.entitlements.hasWhatIfSimulator, false);
    assert.equal(free.entitlements.hasAiAssistant, false);
    assert.equal(free.entitlements.hasActionPlan, false);

    // Premium tier checks
    assert.equal(premium.monthlyPrice, 499);
    assert.equal(premium.entitlements.maxGoals, Infinity);
    assert.equal(premium.entitlements.hasWhatIfSimulator, true);
    assert.equal(premium.entitlements.hasAiAssistant, true);
    assert.equal(premium.entitlements.hasActionPlan, true);
    assert.equal(premium.entitlements.hasAdvancedAnalytics, true);

    // Family tier checks
    assert.equal(family.monthlyPrice, 899);
    assert.equal(family.entitlements.householdMemberLimit, 5);
    assert.equal(family.entitlements.hasWhatIfSimulator, true);
    assert.equal(family.entitlements.hasAiAssistant, true);
  });

  test("enforces feature entitlements for FREE tier users", () => {
    switchUserSubscription(testUserId, "FREE", "monthly");

    const simCheck = checkFeatureEntitlement(testUserId, "what_if_simulator");
    assert.equal(simCheck.allowed, false);
    assert.equal(simCheck.requiredTier, "PREMIUM");
    assert.ok(simCheck.reason?.includes("Premium"));

    const aiCheck = checkFeatureEntitlement(testUserId, "ai_assistant");
    assert.equal(aiCheck.allowed, false);
    assert.equal(aiCheck.requiredTier, "PREMIUM");

    const actionCheck = checkFeatureEntitlement(testUserId, "action_plan");
    assert.equal(actionCheck.allowed, false);
    assert.equal(actionCheck.requiredTier, "PREMIUM");

    const dashCheck = checkFeatureEntitlement(testUserId, "basic_dashboard");
    assert.equal(dashCheck.allowed, true);
  });

  test("enforces feature entitlements for PREMIUM tier users", () => {
    switchUserSubscription(testUserId, "PREMIUM", "annual");

    const simCheck = checkFeatureEntitlement(testUserId, "what_if_simulator");
    assert.equal(simCheck.allowed, true);

    const aiCheck = checkFeatureEntitlement(testUserId, "ai_assistant");
    assert.equal(aiCheck.allowed, true);

    const actionCheck = checkFeatureEntitlement(testUserId, "action_plan");
    assert.equal(actionCheck.allowed, true);

    const goalsCheck = checkFeatureEntitlement(testUserId, "unlimited_goals");
    assert.equal(goalsCheck.allowed, true);

    // Premium does not have family multi-member access
    const familyCheck = checkFeatureEntitlement(testUserId, "household_members");
    assert.equal(familyCheck.allowed, false);
    assert.equal(familyCheck.requiredTier, "FAMILY");
  });

  test("allows household members access for FAMILY tier users", () => {
    switchUserSubscription(testUserId, "FAMILY", "monthly");

    const familyCheck = checkFeatureEntitlement(testUserId, "household_members");
    assert.equal(familyCheck.allowed, true);

    const simCheck = checkFeatureEntitlement(testUserId, "what_if_simulator");
    assert.equal(simCheck.allowed, true);
  });

  test("supports switching plans seamlessly without payment gateway in hackathon", () => {
    const updated = switchUserSubscription(testUserId, "PREMIUM", "monthly");
    assert.equal(updated.tier, "PREMIUM");
    assert.equal(updated.status, "active");
    assert.ok(updated.currentPeriodEnd);

    const currentSub = getUserSubscription(testUserId);
    assert.equal(currentSub.tier, "PREMIUM");
  });

  test("provides future-ready tracks for B2B and Enterprise integrations", () => {
    assert.ok(FUTURE_ENTERPRISE_TRACKS.length >= 2);
    const b2b = FUTURE_ENTERPRISE_TRACKS.find((t) => t.id === "B2B_WELLNESS");
    const enterprise = FUTURE_ENTERPRISE_TRACKS.find((t) => t.id === "ENTERPRISE_API");

    assert.ok(b2b);
    assert.ok(enterprise);
    assert.equal(b2b?.status, "ROADMAP_IN_DEVELOPMENT");
  });
});
