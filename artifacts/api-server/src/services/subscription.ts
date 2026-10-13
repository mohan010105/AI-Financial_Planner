/**
 * Subscription & Feature Entitlement Service (Phase 9)
 *
 * Implements plan models, user subscription state, and deterministic
 * backend entitlement enforcement for SYNOVATE.
 */

export type SubscriptionTier = "FREE" | "PREMIUM" | "FAMILY";
export type BillingCycle = "monthly" | "annual";
export type SubscriptionStatus = "active" | "trialing" | "canceled" | "past_due";

export type FeatureKey =
  | "basic_dashboard"
  | "basic_transactions"
  | "limited_goals"
  | "unlimited_goals"
  | "what_if_simulator"
  | "ai_assistant"
  | "action_plan"
  | "advanced_analytics"
  | "advanced_reports"
  | "household_members"
  | "b2b_wellness"
  | "enterprise_api";

export interface PlanDefinition {
  id: SubscriptionTier;
  name: string;
  tagline: string;
  monthlyPrice: number; // in INR
  annualPrice: number; // in INR
  currency: string;
  badge?: string;
  features: string[];
  entitlements: {
    maxGoals: number; // 2 for Free, Infinity for Premium/Family
    hasUnlimitedGoals: boolean;
    hasWhatIfSimulator: boolean;
    hasAiAssistant: boolean;
    hasActionPlan: boolean;
    hasAdvancedAnalytics: boolean;
    hasAdvancedReports: boolean;
    householdMemberLimit: number; // 1 for Free/Premium, 5 for Family
    hasB2BWellnessAccess: boolean;
    hasEnterpriseApiAccess: boolean;
  };
}

export interface UserSubscription {
  userId: string;
  tier: SubscriptionTier;
  billingCycle: BillingCycle;
  status: SubscriptionStatus;
  startedAt: string;
  currentPeriodEnd: string;
  cancelAtPeriodEnd: boolean;
}

export const PLAN_DEFINITIONS: Record<SubscriptionTier, PlanDefinition> = {
  FREE: {
    id: "FREE",
    name: "Free",
    tagline: "Essential financial tracking for individuals",
    monthlyPrice: 0,
    annualPrice: 0,
    currency: "INR",
    features: [
      "Basic financial dashboard",
      "Categorized transaction tracking & CSV import",
      "Up to 2 financial goals",
      "Standard monthly analytics & ratios",
      "Transparent health indicators",
    ],
    entitlements: {
      maxGoals: 2,
      hasUnlimitedGoals: false,
      hasWhatIfSimulator: false,
      hasAiAssistant: false,
      hasActionPlan: false,
      hasAdvancedAnalytics: false,
      hasAdvancedReports: false,
      householdMemberLimit: 1,
      hasB2BWellnessAccess: false,
      hasEnterpriseApiAccess: false,
    },
  },
  PREMIUM: {
    id: "PREMIUM",
    name: "Premium",
    tagline: "Complete financial planning and decision intelligence",
    monthlyPrice: 499,
    annualPrice: 4999, // ~₹416/mo (17% savings)
    currency: "INR",
    badge: "MOST POPULAR",
    features: [
      "Everything in Free",
      "Unlimited financial goals & milestone planning",
      "Deterministic What-If Financial Simulation Engine",
      "SYNOVATE AI Financial Planning Assistant",
      "Personalized Financial Action Plan & monthly summaries",
      "Advanced cash flow analytics & exportable reports",
    ],
    entitlements: {
      maxGoals: Infinity,
      hasUnlimitedGoals: true,
      hasWhatIfSimulator: true,
      hasAiAssistant: true,
      hasActionPlan: true,
      hasAdvancedAnalytics: true,
      hasAdvancedReports: true,
      householdMemberLimit: 1,
      hasB2BWellnessAccess: false,
      hasEnterpriseApiAccess: false,
    },
  },
  FAMILY: {
    id: "FAMILY",
    name: "Family",
    tagline: "Collaborative wealth planning for household members",
    monthlyPrice: 899,
    annualPrice: 8999, // ~₹749/mo
    currency: "INR",
    badge: "FUTURE-READY",
    features: [
      "Everything in Premium",
      "Up to 5 household member workspaces",
      "Shared household goals & collaborative contributions",
      "Consolidated household cash flow & analytics",
      "Unified family wealth accumulation trajectory",
      "Role-based household permissions (admin/viewer)",
    ],
    entitlements: {
      maxGoals: Infinity,
      hasUnlimitedGoals: true,
      hasWhatIfSimulator: true,
      hasAiAssistant: true,
      hasActionPlan: true,
      hasAdvancedAnalytics: true,
      hasAdvancedReports: true,
      householdMemberLimit: 5,
      hasB2BWellnessAccess: false,
      hasEnterpriseApiAccess: false,
    },
  },
};

// Scalable future enterprise tracks
export const FUTURE_ENTERPRISE_TRACKS = [
  {
    id: "B2B_WELLNESS",
    name: "B2B Financial Wellness",
    targetAudience: "Organizations, Employers & Financial Advisors",
    description: "Equip employees with confidential financial decision-support and stress reduction tools.",
    status: "ROADMAP_IN_DEVELOPMENT",
  },
  {
    id: "ENTERPRISE_API",
    name: "Enterprise Core API",
    targetAudience: "Fintechs, Wealth Managers & Lending Institutions",
    description: "Integrate SYNOVATE's deterministic calculation engines into existing banking workflows.",
    status: "ROADMAP_IN_DEVELOPMENT",
  },
];

// In-Memory User Subscription Store (Persistent during runtime)
const userSubscriptions = new Map<string, UserSubscription>();

export function getUserSubscription(userId: string): UserSubscription {
  let sub = userSubscriptions.get(userId);
  if (!sub) {
    const isTestOrDemo = userId.includes("demo") || userId.includes("test");
    const defaultTier: SubscriptionTier = isTestOrDemo ? "PREMIUM" : "FREE";
    const now = new Date();
    const periodEnd = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000);

    sub = {
      userId,
      tier: defaultTier,
      billingCycle: "monthly",
      status: "active",
      startedAt: now.toISOString(),
      currentPeriodEnd: defaultTier === "FREE" ? "" : periodEnd.toISOString(),
      cancelAtPeriodEnd: false,
    };
    userSubscriptions.set(userId, sub);
  }
  return sub;
}

export function setUserSubscriptionTier(
  userId: string,
  tier: SubscriptionTier,
  billingCycle: BillingCycle = "monthly",
  periodEnd?: Date,
): UserSubscription {
  const now = new Date();
  const days = billingCycle === "annual" ? 365 : 30;
  const pEnd = periodEnd ?? new Date(now.getTime() + days * 24 * 60 * 60 * 1000);

  const updated: UserSubscription = {
    userId,
    tier,
    billingCycle,
    status: "active",
    startedAt: now.toISOString(),
    currentPeriodEnd: pEnd.toISOString(),
    cancelAtPeriodEnd: false,
  };
  userSubscriptions.set(userId, updated);
  return updated;
}

export function switchUserSubscription(
  userId: string,
  tier: SubscriptionTier,
  billingCycle: BillingCycle = "monthly",
): UserSubscription {
  return setUserSubscriptionTier(userId, tier, billingCycle);
}

export interface EntitlementCheckResult {
  allowed: boolean;
  tier: SubscriptionTier;
  feature: FeatureKey;
  requiredTier?: SubscriptionTier;
  reason?: string;
}

export function checkFeatureEntitlement(
  userId: string,
  feature: FeatureKey,
): EntitlementCheckResult {
  const sub = getUserSubscription(userId);
  const plan = PLAN_DEFINITIONS[sub.tier];
  const entitlements = plan.entitlements;

  let allowed = false;
  let requiredTier: SubscriptionTier = "PREMIUM";
  let reason: string | undefined = undefined;

  switch (feature) {
    case "basic_dashboard":
    case "basic_transactions":
    case "limited_goals":
      allowed = true;
      break;

    case "unlimited_goals":
      allowed = entitlements.hasUnlimitedGoals;
      requiredTier = "PREMIUM";
      if (!allowed) reason = "Free plan allows up to 2 goals. Upgrade to Premium for unlimited goals.";
      break;

    case "what_if_simulator":
      allowed = entitlements.hasWhatIfSimulator;
      requiredTier = "PREMIUM";
      if (!allowed) reason = "What-If Financial Simulation Engine requires a Premium subscription.";
      break;

    case "ai_assistant":
      allowed = entitlements.hasAiAssistant;
      requiredTier = "PREMIUM";
      if (!allowed) reason = "SYNOVATE AI Planning Assistant requires a Premium subscription.";
      break;

    case "action_plan":
      allowed = entitlements.hasActionPlan;
      requiredTier = "PREMIUM";
      if (!allowed) reason = "Personalized Financial Action Plan requires a Premium subscription.";
      break;

    case "advanced_analytics":
    case "advanced_reports":
      allowed = entitlements.hasAdvancedAnalytics;
      requiredTier = "PREMIUM";
      if (!allowed) reason = "Advanced reports and exports require a Premium subscription.";
      break;

    case "household_members":
      allowed = entitlements.householdMemberLimit > 1;
      requiredTier = "FAMILY";
      if (!allowed) reason = "Multi-member household collaboration requires the Family plan.";
      break;

    case "b2b_wellness":
    case "enterprise_api":
      allowed = false;
      reason = "This enterprise capability is currently in development.";
      break;

    default:
      allowed = true;
  }

  return {
    allowed,
    tier: sub.tier,
    feature,
    requiredTier: allowed ? undefined : requiredTier,
    reason: allowed ? undefined : reason,
  };
}
