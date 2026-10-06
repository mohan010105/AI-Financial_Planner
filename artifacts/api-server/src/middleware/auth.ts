import { type RequestHandler } from "express";

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
  const origin = request.get("origin");
  const referer = request.get("referer");
  const source = origin ?? referer;

  if (source) {
    try {
      if (new URL(source).host !== request.get("host")) {
        response.status(403).json(errorResponse("Cross-origin requests are not allowed.", "ORIGIN_NOT_ALLOWED"));
        return;
      }
    } catch {
      response.status(403).json(errorResponse("Cross-origin requests are not allowed.", "ORIGIN_NOT_ALLOWED"));
      return;
    }
  }

  next();
};
