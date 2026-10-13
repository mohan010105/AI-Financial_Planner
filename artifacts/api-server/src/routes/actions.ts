import { Router, type Request, type Response } from "express";
import { z } from "zod/v4";
import { requireAuthentication } from "../middleware/auth";
import {
  generateActionPlan,
  setUserActionStatus,
  type ActionStatus,
} from "../services/actions";

const router = Router();

const updateActionSchema = z.object({
  status: z.enum(["PENDING", "COMPLETED", "DISMISSED", "SAVED"]),
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

// GET /api/actions/status
router.get("/actions/status", requireAuthentication, async (_request, response): Promise<void> => {
  response.setHeader("Cache-Control", "no-store");
  response.json({
    phase: 8,
    status: "active",
    module: "action_plan",
  });
});

// GET /api/actions
router.get("/actions", requireAuthentication, async (request, response): Promise<void> => {
  const userId = getUserId(request, response);
  if (!userId) return;

  try {
    const plan = await generateActionPlan(userId);
    response.setHeader("Cache-Control", "no-store");
    response.json(plan);
  } catch {
    sendError(response, 500, "Failed to load financial action plan.", "ACTION_PLAN_FAILED");
  }
});

// PATCH /api/actions/:id
router.patch("/actions/:id", requireAuthentication, async (request, response): Promise<void> => {
  const userId = getUserId(request, response);
  if (!userId) return;

  const rawId = request.params.id;
  const actionId = Array.isArray(rawId) ? rawId[0] : rawId;
  if (!actionId || typeof actionId !== "string") {
    sendError(response, 400, "Action ID is required.", "MISSING_ACTION_ID");
    return;
  }

  const parsed = updateActionSchema.safeParse(request.body);
  if (!parsed.success) {
    sendError(response, 400, "Invalid action status.", "INVALID_ACTION_STATUS");
    return;
  }

  try {
    const updated = setUserActionStatus(userId, actionId, parsed.data.status as ActionStatus);
    response.setHeader("Cache-Control", "no-store");
    response.json({
      id: actionId,
      ...updated,
    });
  } catch {
    sendError(response, 500, "Failed to update action status.", "UPDATE_ACTION_FAILED");
  }
});

export default router;
