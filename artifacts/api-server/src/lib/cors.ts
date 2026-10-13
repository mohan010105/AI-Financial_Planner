import cors from "cors";
import type { RequestHandler } from "express";

/**
 * Parses and returns the list of allowed origins from environment variables and dev defaults.
 */
export function getAllowedOrigins(): Set<string> {
  const origins = new Set<string>();

  // Standard development origins
  origins.add("http://localhost:5173");
  origins.add("http://localhost:5174");
  origins.add("http://localhost:3000");
  origins.add("http://localhost:5000");
  origins.add("http://127.0.0.1:5173");
  origins.add("http://127.0.0.1:5174");
  origins.add("http://127.0.0.1:3000");
  origins.add("http://127.0.0.1:5000");

  // Configured origins from environment variables
  const envSources = [
    process.env.ALLOWED_ORIGINS,
    process.env.FRONTEND_URL,
    process.env.CORS_ORIGIN,
    process.env.CLIENT_ORIGIN,
  ];

  for (const source of envSources) {
    if (!source) continue;
    for (const item of source.split(",")) {
      const trimmed = item.trim();
      if (trimmed) {
        try {
          const parsed = new URL(trimmed);
          origins.add(parsed.origin.toLowerCase());
        } catch {
          origins.add(trimmed.toLowerCase());
        }
      }
    }
  }

  return origins;
}

/**
 * Checks whether an incoming request origin is allowed.
 */
export function isAllowedOrigin(origin?: string | null): boolean {
  if (!origin) return true; // Direct, server-to-server, or same-origin requests without Origin header

  try {
    const url = new URL(origin);
    const normalizedOrigin = url.origin.toLowerCase();
    const allowed = getAllowedOrigins();

    // Direct match against configured origins
    if (allowed.has(normalizedOrigin)) {
      return true;
    }

    // In development mode, permit localhost on any port, private network IPs, and Replit/cloud domains
    if (process.env.NODE_ENV !== "production") {
      const hostname = url.hostname.toLowerCase();

      // Localhost or loopback on any port
      if (hostname === "localhost" || hostname === "127.0.0.1") {
        return true;
      }

      // Local private subnet IPs (e.g. LAN dev testing)
      if (
        hostname.startsWith("10.") ||
        hostname.startsWith("192.168.") ||
        /^172\.(1[6-9]|2[0-9]|3[0-1])\./.test(hostname)
      ) {
        return true;
      }

      // Replit or Antigravity preview hosts
      if (
        hostname.endsWith(".replit.dev") ||
        hostname.endsWith(".repl.co") ||
        hostname.endsWith(".replit.app")
      ) {
        return true;
      }
    }

    return false;
  } catch {
    return false;
  }
}

/**
 * Production-ready CORS middleware with explicit origin checking,
 * credentials support, and preflight handling.
 */
export const corsMiddleware: RequestHandler = cors({
  origin: (requestOrigin, callback) => {
    // Requests with no origin (e.g. mobile apps, curl, same-origin) are allowed
    if (!requestOrigin) {
      callback(null, true);
      return;
    }

    if (isAllowedOrigin(requestOrigin)) {
      // Reflect the exact allowed origin (never wildcard '*' when credentials: true)
      callback(null, requestOrigin);
    } else {
      callback(new Error(`CORS error: Origin ${requestOrigin} is not allowed.`));
    }
  },
  credentials: true,
  methods: ["GET", "POST", "PUT", "DELETE", "PATCH", "OPTIONS"],
  allowedHeaders: [
    "Content-Type",
    "Authorization",
    "Cookie",
    "X-Requested-With",
    "Accept",
    "Origin",
  ],
  exposedHeaders: ["Set-Cookie"],
  maxAge: 86400, // 24 hours
});
