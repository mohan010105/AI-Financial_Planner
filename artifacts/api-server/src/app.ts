import express, { type Express } from "express";
import cors from "cors";
import pinoHttp from "pino-http";
import router from "./routes";
import { logger } from "./lib/logger";
import { loadSession } from "./middleware/session";

import { corsMiddleware } from "./lib/cors";

const app: Express = express();
app.set("trust proxy", 1);

// Apply CORS before any route handlers or middleware that could reject requests
app.use(corsMiddleware);

app.use(
  pinoHttp({
    logger,
    serializers: {
      req(req) {
        return {
          id: req.id,
          method: req.method,
          url: req.url?.split("?")[0],
        };
      },
      res(res) {
        return {
          statusCode: res.statusCode,
        };
      },
    },
  }),
);
declare global {
  namespace Express {
    interface Request {
      rawBody?: Buffer;
    }
  }
}

app.use(
  express.json({
    limit: "1.2mb",
    verify: (req: any, _res, buf) => {
      req.rawBody = buf;
    },
  }),
);
app.use((request, response, next) => {
  response.set("Cache-Control", "no-store, private");
  next();
});
app.use(loadSession);

app.use("/api", router);

app.use((error: unknown, request: express.Request, response: express.Response, next: express.NextFunction) => {
  if (response.headersSent) {
    next(error);
    return;
  }

  const parsedError = typeof error === "object" && error !== null ? error : {};
  const errorType = "type" in parsedError ? parsedError.type : undefined;
  const errorStatus = "status" in parsedError ? parsedError.status : undefined;
  const status = errorType === "entity.parse.failed"
    ? 400
    : errorType === "entity.too.large"
      ? 413
      : typeof errorStatus === "number" && errorStatus >= 400 && errorStatus < 500
        ? errorStatus
        : 500;

  if (status >= 500) {
    if (request.log && typeof request.log.error === "function") {
      request.log.error(
        { errorType: error instanceof Error ? error.name : "UnknownError" },
        "Unhandled API request error",
      );
    } else {
      console.error("Unhandled API request error:", error);
    }
  }

  const errorMessage = status === 400
    ? "Request body must be valid JSON."
    : status === 413
      ? "Request body is too large."
      : status === 404
        ? "API endpoint not found."
        : "An unexpected server error occurred.";
  response.status(status).json({
    error: errorMessage,
    code: status === 400 ? "INVALID_JSON" : status === 413 ? "PAYLOAD_TOO_LARGE" : status >= 500 ? "INTERNAL_ERROR" : "REQUEST_ERROR",
  });
});

export default app;
