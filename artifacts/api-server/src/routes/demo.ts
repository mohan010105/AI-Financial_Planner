import { eq } from "drizzle-orm";
import { Router, type Request, type Response } from "express";
import { db, financialProfilesTable, usersTable } from "@workspace/db";
import { requireAuthentication, requireSameOrigin } from "../middleware/auth";
import { createSession } from "../middleware/session";
import { getOrCreateDemoUser, seedDemoDataForUser, DEMO_USER_EMAIL } from "../services/demo";

const router = Router();

function sendError(response: Response, status: number, error: string, code: string): void {
  response.status(status).json({ error, code });
}

// GET /api/demo/status
router.get("/demo/status", async (request, response): Promise<void> => {
  response.setHeader("Cache-Control", "no-store");
  const userId = request.authUserId;

  if (!userId) {
    response.json({
      isDemoUser: false,
      hasDemoData: false,
      message: "No active session",
    });
    return;
  }

  const [user] = await db
    .select({ email: usersTable.email })
    .from(usersTable)
    .where(eq(usersTable.id, userId))
    .limit(1);

  const [profile] = await db
    .select({ name: financialProfilesTable.name })
    .from(financialProfilesTable)
    .where(eq(financialProfilesTable.userId, userId))
    .limit(1);

  const isDemoEmail = user?.email === DEMO_USER_EMAIL;
  const isDemoProfile = Boolean(profile?.name?.includes("(Demo)"));

  response.json({
    isDemoUser: isDemoEmail,
    hasDemoData: isDemoEmail || isDemoProfile,
    syntheticDisclaimer: "This workspace uses fictional synthetic data generated for evaluation and demo purposes.",
  });
});

// POST /api/demo/load (loads synthetic data into current session)
router.post("/demo/load", requireSameOrigin, requireAuthentication, async (request, response): Promise<void> => {
  response.setHeader("Cache-Control", "no-store");
  const userId = request.authUserId;
  if (!userId) {
    sendError(response, 401, "Sign in to load demo data.", "UNAUTHENTICATED");
    return;
  }

  try {
    const result = await seedDemoDataForUser(userId);
    response.json({
      success: true,
      message: "Synthetic demo financial dataset loaded successfully.",
      details: {
        transactionsCreated: result.transactionCount,
        goalsCreated: result.goalCount,
        syntheticProfile: "Aarav Sharma (₹60,000 income, ₹42,000 expenses, ₹18,000 surplus)",
      },
      disclaimer: "All loaded records are synthetic and isolated to your account session.",
    });
  } catch (error) {
    request.log.error(error, "Failed to seed demo data");
    sendError(response, 500, "Could not load demo data.", "DEMO_SEED_FAILED");
  }
});

// POST /api/demo/quick-login (1-click judge evaluator sign-in)
router.post("/demo/quick-login", requireSameOrigin, async (request, response): Promise<void> => {
  response.setHeader("Cache-Control", "no-store");
  try {
    const demoUser = await getOrCreateDemoUser();
    await seedDemoDataForUser(demoUser.id);
    await createSession(request, response, demoUser.id);

    response.json({
      success: true,
      authenticated: true,
      user: {
        id: demoUser.id,
        email: demoUser.email,
        displayName: "Aarav Sharma (Demo)",
        hasFinancialProfile: true,
      },
      message: "Demo session initialized with pre-populated synthetic dataset.",
    });
  } catch (error) {
    request.log.error(error, "Failed to quick-login demo user");
    sendError(response, 500, "Could not launch demo session.", "DEMO_LOGIN_FAILED");
  }
});

export default router;
