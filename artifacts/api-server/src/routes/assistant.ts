import { Router, type Request, type Response } from "express";
import { z } from "zod/v4";
import { requireAuthentication } from "../middleware/auth";
import { askAssistant, type ChatMessage } from "../services/assistant";
import { checkFeatureEntitlement } from "../services/subscription";

const router = Router();

const chatMessageSchema = z.object({
  role: z.enum(["user", "assistant", "system"]),
  content: z.string().min(1).max(2000),
});

const chatInputSchema = z.object({
  message: z.string().trim().min(1, "Message cannot be empty.").max(1000),
  history: z.array(chatMessageSchema).optional().default([]),
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

// GET /api/assistant/status
router.get("/assistant/status", requireAuthentication, async (_request, response): Promise<void> => {
  response.setHeader("Cache-Control", "no-store");
  response.json({
    phase: 7,
    status: "active",
    module: "assistant",
    hasOpenAiKey: Boolean(process.env.OPENAI_API_KEY && process.env.OPENAI_API_KEY !== "placeholder"),
  });
});

// POST /api/assistant/chat
router.post("/assistant/chat", requireAuthentication, async (request, response): Promise<void> => {
  const userId = getUserId(request, response);
  if (!userId) return;

  const entitlement = checkFeatureEntitlement(userId, "ai_assistant");
  if (!entitlement.allowed) {
    sendError(
      response,
      403,
      entitlement.reason || "SYNOVATE AI Planning Assistant requires a Premium subscription.",
      "UPGRADE_REQUIRED",
    );
    return;
  }

  const parsed = chatInputSchema.safeParse(request.body);
  if (!parsed.success) {
    sendError(response, 400, "Chat message is invalid.", "INVALID_CHAT_INPUT");
    return;
  }

  try {
    const reply = await askAssistant(userId, parsed.data.message, parsed.data.history as ChatMessage[]);

    response.setHeader("Cache-Control", "no-store");
    response.json({
      reply,
      timestamp: new Date().toISOString(),
    });
  } catch {
    sendError(response, 500, "Assistant response could not be generated.", "ASSISTANT_FAILED");
  }
});

export default router;
