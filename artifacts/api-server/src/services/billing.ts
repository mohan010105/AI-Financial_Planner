import crypto from "node:crypto";
import Razorpay from "razorpay";
import { and, desc, eq } from "drizzle-orm";
import {
  db,
  paymentTransactionsTable,
  userSubscriptionsTable,
  webhookEventsTable,
  usersTable,
} from "@workspace/db";

export type SubscriptionTier = "FREE" | "PREMIUM" | "FAMILY";
export type BillingCycle = "monthly" | "annual";
export type SubscriptionStatus =
  | "active"
  | "trialing"
  | "past_due"
  | "canceled"
  | "halted"
  | "expired";

export interface PlanEntitlements {
  maxGoals: number;
  hasUnlimitedGoals: boolean;
  hasWhatIfSimulator: boolean;
  hasAiAssistant: boolean;
  hasActionPlan: boolean;
  hasAdvancedAnalytics: boolean;
  hasAdvancedReports: boolean;
  householdMemberLimit: number;
  hasB2BWellnessAccess: boolean;
  hasEnterpriseApiAccess: boolean;
}

export interface BillingPlan {
  id: string;
  tier: SubscriptionTier;
  name: string;
  tagline: string;
  billingCycle: BillingCycle;
  price: number; // in INR
  currency: string;
  badge?: string;
  features: string[];
  entitlements: PlanEntitlements;
}

export const BILLING_PLANS: Record<string, BillingPlan> = {
  FREE: {
    id: "FREE",
    tier: "FREE",
    name: "Free",
    tagline: "Essential financial tracking for individuals",
    billingCycle: "monthly",
    price: 0,
    currency: "INR",
    features: [
      "Basic financial dashboard",
      "Categorized transaction tracking & CSV import",
      "Up to 2 financial goals",
      "Standard monthly cash flow totals",
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
  PREMIUM_MONTHLY: {
    id: "PREMIUM_MONTHLY",
    tier: "PREMIUM",
    name: "Premium (Monthly)",
    tagline: "Complete financial decision-support and intelligence",
    billingCycle: "monthly",
    price: 499,
    currency: "INR",
    badge: "MOST POPULAR",
    features: [
      "Everything in Free",
      "Unlimited financial goals & milestone planning",
      "Deterministic What-If Financial Simulation Engine",
      "SYNOVATE AI Financial Planning Copilot",
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
  PREMIUM_ANNUAL: {
    id: "PREMIUM_ANNUAL",
    tier: "PREMIUM",
    name: "Premium (Annual)",
    tagline: "Save 17% with annual wealth planning",
    billingCycle: "annual",
    price: 4999, // ~₹416/mo
    currency: "INR",
    badge: "BEST VALUE",
    features: [
      "Everything in Premium Monthly",
      "Priority customer assistance",
      "Annual wealth accumulation projections",
      "Exportable year-end tax & cash flow summaries",
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
  FAMILY_MONTHLY: {
    id: "FAMILY_MONTHLY",
    tier: "FAMILY",
    name: "Family (Monthly)",
    tagline: "Collaborative wealth planning for household members",
    billingCycle: "monthly",
    price: 899,
    currency: "INR",
    badge: "HOUSEHOLD",
    features: [
      "Everything in Premium",
      "Up to 5 household member workspaces",
      "Shared household goals & collaborative contributions",
      "Consolidated household cash flow & analytics",
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
  FAMILY_ANNUAL: {
    id: "FAMILY_ANNUAL",
    tier: "FAMILY",
    name: "Family (Annual)",
    tagline: "Annual household multi-member workspace",
    billingCycle: "annual",
    price: 8999, // ~₹749/mo
    currency: "INR",
    features: [
      "Everything in Family Monthly",
      "Consolidated multi-year wealth growth trajectory",
      "Annual family portfolio distribution audits",
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

export function getRazorpayClient(): Razorpay {
  const keyId = process.env.RAZORPAY_KEY_ID;
  const keySecret = process.env.RAZORPAY_KEY_SECRET;

  if (!keyId || !keySecret) {
    throw new Error("Razorpay API credentials (RAZORPAY_KEY_ID, RAZORPAY_KEY_SECRET) are not configured.");
  }

  return new Razorpay({
    key_id: keyId,
    key_secret: keySecret,
  });
}

export function getPlan(tier: SubscriptionTier, billingCycle: BillingCycle = "monthly"): BillingPlan {
  if (tier === "FREE") return BILLING_PLANS.FREE;
  const key = `${tier}_${billingCycle.toUpperCase()}`;
  return BILLING_PLANS[key] ?? BILLING_PLANS.FREE;
}

/**
 * Fetch active subscription from DB, initializing FREE record if none exists.
 */
export async function getOrCreateUserSubscription(userId: string) {
  const [existing] = await db
    .select()
    .from(userSubscriptionsTable)
    .where(eq(userSubscriptionsTable.userId, userId))
    .limit(1);

  if (existing) {
    return existing;
  }

  const now = new Date();
  const [created] = await db
    .insert(userSubscriptionsTable)
    .values({
      userId,
      tier: "FREE",
      billingCycle: "monthly",
      status: "active",
      currentPeriodStart: now,
      currentPeriodEnd: null,
      cancelAtPeriodEnd: false,
    })
    .returning();

  return created;
}

/**
 * Creates a server-side verified Razorpay Order for Checkout.
 */
export async function createCheckoutOrder(
  userId: string,
  tier: SubscriptionTier,
  billingCycle: BillingCycle = "monthly",
) {
  if (tier === "FREE") {
    throw new Error("Free tier does not require payment checkout.");
  }

  const plan = getPlan(tier, billingCycle);
  if (!plan || plan.price <= 0) {
    throw new Error("Invalid subscription plan selection.");
  }

  const rzp = getRazorpayClient();
  const amountInPaise = Math.round(plan.price * 100);

  const order = await rzp.orders.create({
    amount: amountInPaise,
    currency: "INR",
    receipt: `synovate_${userId.slice(0, 8)}_${Date.now()}`.slice(0, 40),
    notes: {
      userId,
      tier,
      billingCycle,
      planId: plan.id,
      planName: plan.name,
    },
  });

  return {
    keyId: process.env.RAZORPAY_KEY_ID || "",
    orderId: order.id,
    amount: order.amount,
    currency: order.currency,
    tier,
    billingCycle,
    planName: plan.name,
    price: plan.price,
  };
}

/**
 * Cryptographically verifies Razorpay Checkout payment signature using HMAC SHA256.
 */
export function verifyPaymentSignature(params: {
  orderId: string;
  paymentId: string;
  signature: string;
}): boolean {
  const secret = process.env.RAZORPAY_KEY_SECRET;
  if (!secret) return false;

  const payload = `${params.orderId}|${params.paymentId}`;
  const expectedSignature = crypto
    .createHmac("sha256", secret)
    .update(payload)
    .digest("hex");

  try {
    return crypto.timingSafeEqual(
      Buffer.from(expectedSignature, "utf8"),
      Buffer.from(params.signature, "utf8"),
    );
  } catch {
    return false;
  }
}

/**
 * Cryptographically verifies Razorpay Webhook signature against raw request body.
 */
export function verifyWebhookSignature(rawBody: Buffer | string, signature: string): boolean {
  const secret = process.env.RAZORPAY_WEBHOOK_SECRET;
  if (!secret || !signature) return false;

  const expectedSignature = crypto
    .createHmac("sha256", secret)
    .update(rawBody)
    .digest("hex");

  try {
    return crypto.timingSafeEqual(
      Buffer.from(expectedSignature, "utf8"),
      Buffer.from(signature, "utf8"),
    );
  } catch {
    return false;
  }
}

/**
 * Activates subscription after verified payment and records audit trail.
 */
export async function activateSubscriptionAfterPayment(params: {
  userId: string;
  paymentId: string;
  orderId?: string;
  subscriptionId?: string;
  tier: SubscriptionTier;
  billingCycle: BillingCycle;
  amount: number;
  method?: string;
}) {
  const now = new Date();
  const periodDays = params.billingCycle === "annual" ? 365 : 30;
  const periodEnd = new Date(now.getTime() + periodDays * 24 * 60 * 60 * 1000);

  // 1. Upsert user subscription
  const currentSub = await getOrCreateUserSubscription(params.userId);

  const [updatedSub] = await db
    .update(userSubscriptionsTable)
    .set({
      tier: params.tier,
      billingCycle: params.billingCycle,
      status: "active",
      razorpaySubscriptionId: params.subscriptionId ?? currentSub.razorpaySubscriptionId ?? null,
      currentPeriodStart: now,
      currentPeriodEnd: periodEnd,
      cancelAtPeriodEnd: false,
      cancelledAt: null,
      updatedAt: now,
    })
    .where(eq(userSubscriptionsTable.userId, params.userId))
    .returning();

  // 2. Insert audit payment record (idempotent ignore on duplicate paymentId)
  await db
    .insert(paymentTransactionsTable)
    .values({
      userId: params.userId,
      userSubscriptionId: updatedSub.id,
      razorpayPaymentId: params.paymentId,
      razorpayOrderId: params.orderId ?? null,
      razorpaySubscriptionId: params.subscriptionId ?? null,
      amount: String(params.amount),
      currency: "INR",
      status: "captured",
      method: params.method ?? "online",
      tier: params.tier,
      billingCycle: params.billingCycle,
    })
    .onConflictDoNothing({ target: paymentTransactionsTable.razorpayPaymentId });

  return updatedSub;
}

/**
 * Marks subscription to cancel at period end.
 */
export async function cancelUserSubscription(userId: string) {
  const now = new Date();
  const [updated] = await db
    .update(userSubscriptionsTable)
    .set({
      cancelAtPeriodEnd: true,
      cancelledAt: now,
      updatedAt: now,
    })
    .where(eq(userSubscriptionsTable.userId, userId))
    .returning();

  return updated;
}

/**
 * Retrieves payment history for user.
 */
export async function getUserPaymentHistory(userId: string) {
  return db
    .select()
    .from(paymentTransactionsTable)
    .where(eq(paymentTransactionsTable.userId, userId))
    .orderBy(desc(paymentTransactionsTable.createdAt))
    .limit(50);
}

/**
 * Processes incoming webhook event with idempotency protection.
 */
export async function processWebhookEvent(eventId: string, eventType: string, payload: any) {
  // Idempotency check
  const [existing] = await db
    .select()
    .from(webhookEventsTable)
    .where(eq(webhookEventsTable.id, eventId))
    .limit(1);

  if (existing) {
    return { status: "duplicate", eventId };
  }

  // Record event
  await db.insert(webhookEventsTable).values({
    id: eventId,
    eventType,
    status: "processed",
    payload: JSON.stringify(payload),
  });

  // Handle payment.captured
  if (eventType === "payment.captured") {
    const payment = payload?.payload?.payment?.entity;
    if (payment) {
      const notes = payment.notes || {};
      const userId = notes.userId;
      const tier = notes.tier as SubscriptionTier;
      const billingCycle = (notes.billingCycle as BillingCycle) || "monthly";

      if (userId && tier && (tier === "PREMIUM" || tier === "FAMILY")) {
        const amount = Number(payment.amount) / 100;
        await activateSubscriptionAfterPayment({
          userId,
          paymentId: payment.id,
          orderId: payment.order_id,
          tier,
          billingCycle,
          amount,
          method: payment.method,
        });
      }
    }
  }

  return { status: "processed", eventId };
}
