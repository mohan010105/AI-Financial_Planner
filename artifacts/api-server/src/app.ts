import express, { type Express } from "express";
import pinoHttp from "pino-http";
import router from "./routes";
import { logger } from "./lib/logger";
import { loadSession } from "./middleware/session";

const app: Express = express();
app.set("trust proxy", 1);

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
app.use(express.json({ limit: "32kb" }));
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
    request.log.error(
      { errorType: error instanceof Error ? error.name : "UnknownError" },
      "Unhandled API request error",
    );
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
