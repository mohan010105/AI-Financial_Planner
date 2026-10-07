import { eq, sql } from "drizzle-orm";
import { Router, type IRouter, type Response } from "express";
import {
  GetAuthSessionResponse,
  LoginUserBody,
  RegisterUserBody,
} from "@workspace/api-zod";
import { db, financialProfilesTable, usersTable } from "@workspace/db";
import { requireSameOrigin } from "../middleware/auth";
import { createSession, destroySession } from "../middleware/session";
import { hashPassword, verifyPasswordOrDummy } from "../lib/password";

const router: IRouter = Router();

function sendError(
  response: Response,
  status: number,
  message: string,
  code: string,
): void {
  response.status(status).json({ error: message, code });
}

function getDatabaseErrorCode(error: unknown): string | undefined {
  let current: unknown = error;
  const visited = new Set<object>();
  while (typeof current === "object" && current !== null && !visited.has(current)) {
    visited.add(current);
    const candidate = current as { code?: unknown; cause?: unknown };
    if (typeof candidate.code === "string") return candidate.code;
    current = candidate.cause;
  }
  return undefined;
}

async function authSession(userId: string) {
  const [user] = await db
    .select({
      id: usersTable.id,
      email: usersTable.email,
      displayName: financialProfilesTable.name,
      hasFinancialProfile: sql<boolean>`${financialProfilesTable.userId} IS NOT NULL`,
    })
    .from(usersTable)
    .leftJoin(financialProfilesTable, eq(financialProfilesTable.userId, usersTable.id))
    .where(eq(usersTable.id, userId))
    .limit(1);

  if (!user) {
    return GetAuthSessionResponse.parse({ authenticated: false, user: null });
  }

  return GetAuthSessionResponse.parse({ authenticated: true, user });
}

router.get("/auth/session", async (request, response): Promise<void> => {
  response.set("Cache-Control", "no-store, private");
  if (!request.authUserId) {
    response.json(GetAuthSessionResponse.parse({ authenticated: false, user: null }));
    return;
  }

  response.json(await authSession(request.authUserId));
});

router.post("/auth/register", requireSameOrigin, async (request, response): Promise<void> => {
  response.set("Cache-Control", "no-store, private");
  const parsed = RegisterUserBody.safeParse(request.body);
  if (!parsed.success) {
    request.log.warn("Rejected invalid account registration fields");
    sendError(response, 400, "Enter a valid email and a password of at least 12 characters.", "INVALID_INPUT");
    return;
  }

  const email = parsed.data.email.trim().toLowerCase();
  const passwordHash = await hashPassword(parsed.data.password);
  let userId: string;
  try {
    const [user] = await db
      .insert(usersTable)
      .values({
        authProvider: "local",
        authSubject: email,
        email,
        passwordHash,
      })
      .returning({ id: usersTable.id });
    userId = user.id;
  } catch (error) {
    if (getDatabaseErrorCode(error) === "23505") {
      sendError(response, 409, "An account could not be created with those details.", "ACCOUNT_UNAVAILABLE");
      return;
    }
    throw error;
  }

  await createSession(request, response, userId);
  response.status(201).json(await authSession(userId));
});

router.post("/auth/login", requireSameOrigin, async (request, response): Promise<void> => {
  response.set("Cache-Control", "no-store, private");
  const parsed = LoginUserBody.safeParse(request.body);
  if (!parsed.success) {
    request.log.warn("Rejected invalid login fields");
    sendError(response, 400, "Enter a valid email and password.", "INVALID_INPUT");
    return;
  }

  const email = parsed.data.email.trim().toLowerCase();
  const [user] = await db
    .select({ id: usersTable.id, passwordHash: usersTable.passwordHash })
    .from(usersTable)
    .where(eq(usersTable.email, email))
    .limit(1);

  const validPassword = await verifyPasswordOrDummy(parsed.data.password, user?.passwordHash);
  if (!user || !validPassword) {
    sendError(response, 401, "Email or password is incorrect.", "INVALID_CREDENTIALS");
    return;
  }

  await createSession(request, response, user.id);
  response.json(await authSession(user.id));
});

router.post("/auth/logout", requireSameOrigin, async (request, response): Promise<void> => {
  response.set("Cache-Control", "no-store, private");
  await destroySession(request, response);
  response.sendStatus(204);
});

export default router;
