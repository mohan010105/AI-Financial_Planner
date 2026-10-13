import { Router, type Request, type Response } from "express";
import { z } from "zod/v4";
import { requireAuthentication } from "../middleware/auth";
import {
  activateSubscriptionAfterPayment,
  BILLING_PLANS,
  cancelUserSubscription,
  createCheckoutOrder,
  getOrCreateUserSubscription,
  getPlan,
  getUserPaymentHistory,
  processWebhookEvent,
  verifyPaymentSignature,
  verifyWebhookSignature,
  type BillingCycle,
  type SubscriptionTier,
} from "../services/billing";

const router = Router();

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

const checkoutSchema = z.object({
  tier: z.enum(["PREMIUM", "FAMILY"]).optional(),
  billingCycle: z.enum(["monthly", "annual"]).optional().default("monthly"),
  planId: z.string().optional(),
}).transform((data) => {
  let tier: "PREMIUM" | "FAMILY" = data.tier ?? "PREMIUM";
  let billingCycle: "monthly" | "annual" = data.billingCycle ?? "monthly";

  if (data.planId) {
    if (data.planId.startsWith("FAMILY")) {
      tier = "FAMILY";
    } else {
      tier = "PREMIUM";
    }
    if (data.planId.endsWith("ANNUAL")) {
      billingCycle = "annual";
    } else {
      billingCycle = "monthly";
    }
  }
  return { tier, billingCycle };
});

const verifySchema = z.object({
  orderId: z.string().optional(),
  razorpayOrderId: z.string().optional(),
  razorpay_order_id: z.string().optional(),
  paymentId: z.string().optional(),
  razorpayPaymentId: z.string().optional(),
  razorpay_payment_id: z.string().optional(),
  signature: z.string().optional(),
  razorpaySignature: z.string().optional(),
  razorpay_signature: z.string().optional(),
  tier: z.enum(["PREMIUM", "FAMILY"]).optional(),
  billingCycle: z.enum(["monthly", "annual"]).optional(),
  planId: z.string().optional(),
}).transform((data) => {
  const orderId = data.orderId || data.razorpayOrderId || data.razorpay_order_id || "";
  const paymentId = data.paymentId || data.razorpayPaymentId || data.razorpay_payment_id || "";
  const signature = data.signature || data.razorpaySignature || data.razorpay_signature || "";

  let tier: "PREMIUM" | "FAMILY" = data.tier ?? "PREMIUM";
  let billingCycle: "monthly" | "annual" = data.billingCycle ?? "monthly";

  if (data.planId) {
    if (data.planId.startsWith("FAMILY")) tier = "FAMILY";
    if (data.planId.endsWith("ANNUAL")) billingCycle = "annual";
  }

  return {
    orderId,
    paymentId,
    signature,
    tier,
    billingCycle,
  };
}).refine(
  (data) => Boolean(data.orderId && data.paymentId && data.signature),
  "orderId, paymentId, and signature are required.",
);

// GET /api/billing/plans
router.get("/billing/plans", (_request, response): void => {
  response.setHeader("Cache-Control", "no-store");
  response.json({
    plans: Object.values(BILLING_PLANS),
    currency: "INR",
    keyId: process.env.RAZORPAY_KEY_ID || "",
  });
});

// GET /api/billing/subscription
router.get("/billing/subscription", requireAuthentication, async (request, response): Promise<void> => {
  const userId = getUserId(request, response);
  if (!userId) return;

  try {
    const sub = await getOrCreateUserSubscription(userId);
    const plan = getPlan(sub.tier as SubscriptionTier, sub.billingCycle as BillingCycle);

    response.setHeader("Cache-Control", "no-store");
    response.json({
      subscription: sub,
      plan,
      entitlements: plan.entitlements,
      keyId: process.env.RAZORPAY_KEY_ID || "",
    });
  } catch (error) {
    request.log?.error(error, "Failed to load user subscription");
    sendError(response, 500, "Could not retrieve subscription status.", "SUBSCRIPTION_FETCH_FAILED");
  }
});

// GET /api/billing/payments
router.get("/billing/payments", requireAuthentication, async (request, response): Promise<void> => {
  const userId = getUserId(request, response);
  if (!userId) return;

  try {
    const payments = await getUserPaymentHistory(userId);
    response.setHeader("Cache-Control", "no-store");
    response.json({ payments });
  } catch (error) {
    request.log?.error(error, "Failed to load payment history");
    sendError(response, 500, "Could not retrieve payment history.", "PAYMENTS_FETCH_FAILED");
  }
});

// POST /api/billing/subscriptions (Create Razorpay checkout order)
router.post("/billing/subscriptions", requireAuthentication, async (request, response): Promise<void> => {
  const userId = getUserId(request, response);
  if (!userId) return;

  const parsed = checkoutSchema.safeParse(request.body);
  if (!parsed.success) {
    sendError(response, 400, "Invalid plan or billing cycle selection.", "INVALID_CHECKOUT_INPUT");
    return;
  }

  const { tier, billingCycle } = parsed.data;

  try {
    const checkoutData = await createCheckoutOrder(userId, tier, billingCycle);
    response.setHeader("Cache-Control", "no-store");
    response.json(checkoutData);
  } catch (error: any) {
    request.log?.error(error, "Failed to create checkout order");
    sendError(
      response,
      500,
      error?.message || "Failed to initialize checkout.",
      "CHECKOUT_CREATION_FAILED",
    );
  }
});

// POST /api/billing/verify (Verify Razorpay signature & activate entitlement)
router.post("/billing/verify", requireAuthentication, async (request, response): Promise<void> => {
  const userId = getUserId(request, response);
  if (!userId) return;

  const parsed = verifySchema.safeParse(request.body);
  if (!parsed.success) {
    sendError(response, 400, "Missing payment verification parameters.", "INVALID_VERIFICATION_INPUT");
    return;
  }

  const { orderId, paymentId, signature, tier, billingCycle } = parsed.data;

  // Cryptographic signature check
  const isValid = verifyPaymentSignature({ orderId, paymentId, signature });
  if (!isValid) {
    request.log?.warn({ userId, orderId, paymentId }, "Payment signature verification failed");
    sendError(
      response,
      400,
      "Payment signature verification failed. Untrusted payment response.",
      "INVALID_PAYMENT_SIGNATURE",
    );
    return;
  }

  try {
    const plan = getPlan(tier, billingCycle);
    const updatedSub = await activateSubscriptionAfterPayment({
      userId,
      paymentId,
      orderId,
      tier,
      billingCycle,
      amount: plan.price,
    });

    response.setHeader("Cache-Control", "no-store");
    response.json({
      success: true,
      message: `Payment verified. Upgraded to ${plan.name}!`,
      subscription: updatedSub,
      plan,
      entitlements: plan.entitlements,
    });
  } catch (error) {
    request.log?.error(error, "Failed to activate subscription after payment verification");
    sendError(response, 500, "Could not activate subscription.", "ACTIVATION_FAILED");
  }
});

// POST /api/billing/cancel
router.post("/billing/cancel", requireAuthentication, async (request, response): Promise<void> => {
  const userId = getUserId(request, response);
  if (!userId) return;

  try {
    const cancelled = await cancelUserSubscription(userId);
    response.setHeader("Cache-Control", "no-store");
    response.json({
      success: true,
      message: "Subscription scheduled to cancel at end of current period.",
      subscription: cancelled,
    });
  } catch (error) {
    request.log?.error(error, "Failed to cancel subscription");
    sendError(response, 500, "Could not cancel subscription.", "CANCELLATION_FAILED");
  }
});

// POST /api/billing/webhook (Razorpay Webhook Endpoint with Raw Body Signature Verification)
router.post("/billing/webhook", async (request, response): Promise<void> => {
  const webhookSignature = request.headers["x-razorpay-signature"] as string | undefined;

  if (!webhookSignature) {
    sendError(response, 400, "Missing webhook signature.", "MISSING_WEBHOOK_SIGNATURE");
    return;
  }

  const rawBody = request.rawBody;
  if (!rawBody) {
    sendError(response, 400, "Raw body not available for signature verification.", "RAW_BODY_MISSING");
    return;
  }

  const isValid = verifyWebhookSignature(rawBody, webhookSignature);
  if (!isValid) {
    request.log?.warn("Webhook signature verification failed");
    sendError(response, 400, "Invalid webhook signature.", "INVALID_WEBHOOK_SIGNATURE");
    return;
  }

  const eventPayload = request.body;
  const eventId =
    (request.headers["x-razorpay-event-id"] as string) ||
    eventPayload?.id ||
    `evt_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
  const eventType = eventPayload?.event || "unknown";

  try {
    const result = await processWebhookEvent(eventId, eventType, eventPayload);
    response.json({ received: true, ...result });
  } catch (error) {
    request.log?.error(error, "Failed processing webhook event");
    sendError(response, 500, "Webhook processing error.", "WEBHOOK_PROCESSING_FAILED");
  }
});

export default router;
