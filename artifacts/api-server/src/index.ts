import app from "./app";
import { logger } from "./lib/logger";

try {
  process.loadEnvFile();
} catch {
  try {
    process.loadEnvFile("../../.env");
  } catch {
    // .env is optional
  }
}

const rawPort = process.env["PORT"] || "5000";
const port = Number(rawPort);

if (Number.isNaN(port) || port <= 0) {
  throw new Error(`Invalid PORT value: "${rawPort}"`);
}

const server = app.listen(port, () => {
  logger.info({ port }, `Server listening on port ${port}`);
});

server.on("error", (err: NodeJS.ErrnoException) => {
  if (err.code === "EADDRINUSE") {
    logger.error(
      { port, code: err.code },
      `Port ${port} is already in use by another process.\nTo resolve:\n1. Stop the existing process using port ${port} (e.g. netstat -ano | findstr :${port})\n2. Or choose another port by setting PORT=<another_port> in your .env file.`,
    );
  } else {
    logger.error({ err }, "Error listening on port");
  }
  process.exit(1);
});

const handleShutdown = (signal: string) => {
  logger.info({ signal }, "Received shutdown signal, closing server...");
  server.close(() => {
    logger.info("Server closed successfully.");
    process.exit(0);
  });
};

process.on("SIGINT", () => handleShutdown("SIGINT"));
process.on("SIGTERM", () => handleShutdown("SIGTERM"));

