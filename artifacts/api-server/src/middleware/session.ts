import { createHmac, randomBytes } from "node:crypto";
import { and, eq, gt, lt } from "drizzle-orm";
import type { Request, RequestHandler, Response } from "express";
import { db, sessionsTable } from "@workspace/db";

const SESSION_COOKIE = "synovate.sid";
const SESSION_MAX_AGE_SECONDS = 60 * 60 * 24 * 7;

function getSessionSecret(): string {
  const secret = process.env.SESSION_SECRET;
  if (!secret) {
    throw new Error("SESSION_SECRET must be configured for account sessions.");
  }
  return secret;
}
const sessionSecret = getSessionSecret();

declare global {
  namespace Express {
    interface Request {
      authUserId?: string;
      authSessionId?: string;
    }
  }
}

function hashSessionToken(token: string): string {
  return createHmac("sha256", sessionSecret).update(token).digest("hex");
}

function readSessionToken(cookieHeader: string | undefined): string | null {
  if (!cookieHeader) return null;

  for (const part of cookieHeader.split(";")) {
    const separator = part.indexOf("=");
    if (separator < 0 || part.slice(0, separator).trim() !== SESSION_COOKIE) continue;
    const token = part.slice(separator + 1).trim();
    return /^[A-Za-z0-9_-]{43}$/.test(token) ? token : null;
  }

  return null;
}

function cookieAttributes(): string[] {
  const attributes = ["Path=/", "HttpOnly", "SameSite=Lax"];
  if (process.env.NODE_ENV === "production") attributes.push("Secure");
  return attributes;
}

function appendSessionCookie(response: Response, token: string): void {
  response.append(
    "Set-Cookie",
    [
      `${SESSION_COOKIE}=${token}`,
      ...cookieAttributes(),
      `Max-Age=${SESSION_MAX_AGE_SECONDS}`,
    ].join("; "),
  );
}

export function clearSessionCookie(response: Response): void {
  response.append(
    "Set-Cookie",
    [
      `${SESSION_COOKIE}=`,
      ...cookieAttributes(),
      "Max-Age=0",
      "Expires=Thu, 01 Jan 1970 00:00:00 GMT",
    ].join("; "),
  );
}

export const loadSession: RequestHandler = async (request, response, next): Promise<void> => {
  const token = readSessionToken(request.headers.cookie);
  if (!token) {
    next();
    return;
  }

  const sessionId = hashSessionToken(token);
  try {
    const [session] = await db
      .select({ userId: sessionsTable.userId })
      .from(sessionsTable)
      .where(
        and(
          eq(sessionsTable.sessionId, sessionId),
          gt(sessionsTable.expiresAt, new Date()),
        ),
      )
      .limit(1);

    if (!session) {
      await db.delete(sessionsTable).where(eq(sessionsTable.sessionId, sessionId));
      clearSessionCookie(response);
      next();
      return;
    }

    request.authUserId = session.userId;
    request.authSessionId = sessionId;
    next();
  } catch (error) {
    next(error);
  }
};

export async function createSession(
  request: Request,
  response: Response,
  userId: string,
): Promise<void> {
  if (request.authSessionId) {
    await db.delete(sessionsTable).where(eq(sessionsTable.sessionId, request.authSessionId));
  }

  const token = randomBytes(32).toString("base64url");
  const sessionId = hashSessionToken(token);
  const expiresAt = new Date(Date.now() + SESSION_MAX_AGE_SECONDS * 1000);

  await db.delete(sessionsTable).where(lt(sessionsTable.expiresAt, new Date()));
  await db.insert(sessionsTable).values({ sessionId, userId, expiresAt });

  request.authUserId = userId;
  request.authSessionId = sessionId;
  appendSessionCookie(response, token);
}

export async function destroySession(request: Request, response: Response): Promise<void> {
  if (request.authSessionId) {
    await db.delete(sessionsTable).where(eq(sessionsTable.sessionId, request.authSessionId));
  }

  request.authUserId = undefined;
  request.authSessionId = undefined;
  clearSessionCookie(response);
}
