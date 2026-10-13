import { type RequestHandler } from "express";
import { isAllowedOrigin } from "../lib/cors";

function errorResponse(message: string, code: string) {
  return { error: message, code };
}

export const requireAuthentication: RequestHandler = (request, response, next) => {
  if (!request.authUserId) {
    response.status(401).json(errorResponse("Sign in to continue.", "AUTHENTICATION_REQUIRED"));
    return;
  }

  next();
};

export const requireSameOrigin: RequestHandler = (request, response, next) => {
  // Preflight requests should be handled by CORS middleware, never rejected by CSRF/origin check
  if (request.method === "OPTIONS") {
    next();
    return;
  }

  const origin = request.get("origin");
  const referer = request.get("referer");
  const source = origin ?? referer;

  if (source) {
    try {
      const sourceUrl = new URL(source);
      const reqHost = request.get("host");

      // Direct same-host match
      if (sourceUrl.host === reqHost) {
        next();
        return;
      }

      // Check against configured and development allowed origins
      if (isAllowedOrigin(sourceUrl.origin)) {
        next();
        return;
      }

      response.status(403).json(errorResponse("Cross-origin requests are not allowed.", "ORIGIN_NOT_ALLOWED"));
      return;
    } catch {
      response.status(403).json(errorResponse("Cross-origin requests are not allowed.", "ORIGIN_NOT_ALLOWED"));
      return;
    }
  }

  next();
};
