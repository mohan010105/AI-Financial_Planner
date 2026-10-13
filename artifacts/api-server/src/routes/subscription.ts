import { Router, type Request, type Response } from "express";
import { z } from "zod/v4";
import { requireAuthentication } from "../middleware/auth";
import {
  checkFeatureEntitlement,
  FUTURE_ENTERPRISE_TRACKS,
  getUserSubscription,
  PLAN_DEFINITIONS,
  switchUserSubscription,
  type BillingCycle,
  type FeatureKey,
  type SubscriptionTier,
} from "../services/subscription";

const router = Router();

const switchPlanSchema = z.object({
  tier: z.enum(["FREE", "PREMIUM", "FAMILY"]),
  billingCycle: z.enum(["monthly", "annual"]).optional().default("monthly"),
});

function sendError(response: Response, status: number, error: string, code: string): void {
  response.status(status).json({ error, code });
}

function getUserId(request: Request, response: Response): string | undefined {
  if (!request.authUserId) {
    sendError(response, 401, "Sign in to continue.", "UNAUTHENTICATED");
    return undefined;
  }
  return request.authUserId;
}

// GET /api/subscription/status
router.get("/subscription/status", requireAuthentication, async (_request, response): Promise<void> => {
  response.setHeader("Cache-Control", "no-store");
  response.json({
    phase: 9,
    status: "active",
    module: "subscription",
  });
});

// GET /api/subscription
router.get("/subscription", requireAuthentication, async (request, response): Promise<void> => {
  const userId = getUserId(request, response);
  if (!userId) return;

  const subscription = getUserSubscription(userId);
  const plan = PLAN_DEFINITIONS[subscription.tier];

  response.setHeader("Cache-Control", "no-store");
  response.json({
    subscription,
    plan,
    entitlements: plan.entitlements,
    availablePlans: Object.values(PLAN_DEFINITIONS),
    futureTracks: FUTURE_ENTERPRISE_TRACKS,
  });
});

// POST /api/subscription/switch (Simulated instant plan switch for evaluation)
router.post("/subscription/switch", requireAuthentication, async (request, response): Promise<void> => {
  const userId = getUserId(request, response);
  if (!userId) return;

  const parsed = switchPlanSchema.safeParse(request.body);
  if (!parsed.success) {
    sendError(response, 400, "Invalid plan selection.", "INVALID_PLAN_PAYLOAD");
    return;
  }

  const { tier, billingCycle } = parsed.data;
  const updated = switchUserSubscription(userId, tier as SubscriptionTier, billingCycle as BillingCycle);
  const plan = PLAN_DEFINITIONS[updated.tier];

  response.setHeader("Cache-Control", "no-store");
  response.json({
    message: `Plan successfully switched to ${plan.name}.`,
    subscription: updated,
    plan,
    entitlements: plan.entitlements,
  });
});

// GET /api/subscription/check/:feature
router.get("/subscription/check/:feature", requireAuthentication, async (request, response): Promise<void> => {
  const userId = getUserId(request, response);
  if (!userId) return;

  const rawFeature = request.params.feature;
  const featureKey = (Array.isArray(rawFeature) ? rawFeature[0] : rawFeature) as FeatureKey;

  const result = checkFeatureEntitlement(userId, featureKey);
  response.setHeader("Cache-Control", "no-store");
  response.json(result);
});

export default router;
