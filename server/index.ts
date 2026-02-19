import "dotenv/config";

import express, { type Request, Response, NextFunction } from "express";
import cluster from "node:cluster";
import os from "node:os";
import { registerRoutes } from "./routes/index";
import { serveStatic, log } from "./static";
import { initializeGiftNotificationHandlers } from "./notificationHandlers";
import { startMediaWorker } from "./services/mediaWorker";
import { startTaskNotificationWorker } from "./services/taskNotificationWorker";
import compression from "compression";
import helmet from "helmet";
import { errorResponse, ErrorCode } from "./utils/apiResponse";

// ✅ تحسين التشخيص - 2025-12-08
// عرض حالة البيئة والإعدادات المهمة عند بدء الخادم
console.log("\n╔════════════════════════════════════════════╗");
console.log("║  🚀 Classify Server Initialization        ║");
console.log("╚════════════════════════════════════════════╝\n");

console.log("📋 Environment Configuration:");
console.log(`  NODE_ENV: ${process.env.NODE_ENV || "NOT SET"}`);
console.log(`  PORT: ${process.env.PORT || "5000"}`);
console.log(`  DATABASE_URL: ${process.env.DATABASE_URL ? "✅ SET" : "❌ NOT SET"}`);
console.log(`  JWT_SECRET: ${process.env.JWT_SECRET ? "✅ SET" : "❌ NOT SET"}`);
console.log("");

const redactDatabaseUrl = (value?: string): string => {
  if (!value) return "NOT SET";
  try {
    const url = new URL(value);
    const user = url.username ? `${url.username}:***` : "";
    const auth = user ? `${user}@` : "";
    const host = url.hostname || "unknown-host";
    const port = url.port ? `:${url.port}` : "";
    return `${url.protocol}//${auth}${host}${port}${url.pathname}`;
  } catch {
    return "INVALID_URL";
  }
};

console.log(`ACTIVE_DATABASE_URL: ${redactDatabaseUrl(process.env.DATABASE_URL)}`);

const requiredEnvVars = [
  "JWT_SECRET",
  "SESSION_SECRET",
  "ADMIN_EMAIL",
  "ADMIN_PASSWORD",
  "DATABASE_URL",
];

const missingEnv = requiredEnvVars.filter((key) => !process.env[key]);
if (missingEnv.length > 0) {
  console.error("❌ Missing required environment variables:", missingEnv.join(", "));
  process.exit(1);
}

const app = express();

const REDACT_KEYS = ["password", "otp", "token", "jwt", "authorization", "cookie", "set-cookie"];

function redactObject(value: any) {
  if (!value || typeof value !== "object") return value;
  const clone: Record<string, any> = Array.isArray(value) ? [...value] : { ...value };
  for (const key of Object.keys(clone)) {
    if (REDACT_KEYS.some((k) => key.toLowerCase().includes(k))) {
      clone[key] = "[REDACTED]";
    }
  }
  return clone;
}

// Trust proxy for correct protocol/IP behind Nginx
app.set("trust proxy", 1);

// Basic production hardening with CSP configuration
app.use(helmet({
  frameguard: false,
  contentSecurityPolicy: {
    useDefaults: false,
    directives: {
      defaultSrc: ["'self'"],
      scriptSrc: [
        "'self'",
        "'unsafe-inline'",  // For theme initialization script in index.html
      ],
      styleSrc: [
        "'self'",
        "'unsafe-inline'",  // For dynamic styles and Tailwind
        "https://fonts.googleapis.com",
      ],
      fontSrc: [
        "'self'",
        "https://fonts.gstatic.com",
        "data:",
      ],
      imgSrc: [
        "'self'",
        "data:",
        "blob:",
        "https://storage.googleapis.com",
      ],
      connectSrc: [
        "'self'",
        "https://fonts.googleapis.com",
        "https://storage.googleapis.com",
      ],
      frameSrc: ["'self'"],
      objectSrc: ["'none'"],
      // Note: upgradeInsecureRequests removed - causes ERR_SSL_PROTOCOL_ERROR when serving over HTTP
      // Re-enable when HTTPS/SSL is configured
    },
  },
  crossOriginResourcePolicy: { policy: "cross-origin" },
  // Disable COOP/COEP — Helmet v8 defaults (same-origin / require-corp)
  // block pages from loading inside sandboxed iframes, causing
  // ERR_BLOCKED_BY_RESPONSE ("refused to connect") in game previews.
  crossOriginOpenerPolicy: false,
  crossOriginEmbedderPolicy: false,
}));
app.use(compression());

// Serve uploaded files (task images, etc.)
import path from "path";
// Public images (SEO/OG) — long cache, no auth, crawler-friendly
app.use("/uploads/public", express.static(path.join(process.cwd(), "uploads", "public"), {
  maxAge: "30d",
  immutable: true,
  etag: true,
}));
app.use("/uploads", express.static(path.join(process.cwd(), "uploads")));

// Allow Stripe webhook to use raw body for signature verification
const rawBodyPaths = new Set(["/api/payments/stripe/webhook"]);
app.use((req, res, next) => {
  if (rawBodyPaths.has(req.originalUrl)) return next();
  return express.json({ limit: "10mb" })(req, res, next);
});
app.use((req, res, next) => {
  if (rawBodyPaths.has(req.originalUrl)) return next();
  return express.urlencoded({ extended: false, limit: "10mb" })(req, res, next);
});

// Fail fast on malformed JSON bodies to avoid unhandled parser errors
app.use((err: any, _req: Request, res: Response, next: NextFunction) => {
  if (err instanceof SyntaxError && (err as any).body) {
    console.warn("⚠️ Invalid JSON payload rejected", {
      message: err.message,
      timestamp: new Date().toISOString()
    });
    return res
      .status(400)
      .json(errorResponse(ErrorCode.BAD_REQUEST, "INVALID_JSON: Request body must be valid JSON"));
  }
  return next(err);
});

// CORS configuration with allowlist support (comma-separated origins via CORS_ORIGIN)
const allowedOrigins = (process.env.CORS_ORIGIN || "*")
  .split(",")
  .map((o) => o.trim())
  .filter(Boolean);
const allowAnyOrigin = allowedOrigins.includes("*");

app.use((req, res, next) => {
  res.removeHeader("X-Frame-Options");
  const origin = req.headers.origin as string | undefined;
  const isAllowed = allowAnyOrigin || !origin || allowedOrigins.includes(origin);

  if (isAllowed) {
    res.header("Access-Control-Allow-Origin", allowAnyOrigin ? "*" : origin || "*");
  }

  res.header("Vary", "Origin");
  res.header("Access-Control-Allow-Methods", "GET, POST, PUT, DELETE, OPTIONS");
  res.header("Access-Control-Allow-Headers", "Content-Type, Authorization");
  res.header("X-Content-Type-Options", "nosniff");
  res.header("X-Frame-Options", "SAMEORIGIN");
  res.header("X-XSS-Protection", "1; mode=block");

  if (req.method === "OPTIONS") {
    if (!isAllowed) {
      return res
        .status(403)
        .json(errorResponse(ErrorCode.FORBIDDEN, "CORS origin not allowed"));
    }
    return res.sendStatus(200);
  }

  if (!isAllowed && origin) {
    return res
      .status(403)
      .json(errorResponse(ErrorCode.FORBIDDEN, "CORS origin not allowed"));
  }

  next();
});

app.use((req, res, next) => {
  const start = Date.now();
  const path = req.path;
  res.on("finish", () => {
    const duration = Date.now() - start;
    if (path.startsWith("/api")) {
      log(`${req.method} ${path} ${res.statusCode} in ${duration}ms`);
    }
  });

  next();
});

// API response cache headers for stable/semi-stable endpoints
// Reduces server load by allowing browsers to reuse recent responses
const apiCacheRules: Array<{ pattern: RegExp; maxAge: number }> = [
  { pattern: /^\/api\/games$/, maxAge: 60 },                // 1 min (game list)
  { pattern: /^\/api\/subjects$/, maxAge: 300 },           // 5 min
  { pattern: /^\/api\/parent\/ads$/, maxAge: 300 },         // 5 min
  { pattern: /^\/api\/parent\/referral-stats$/, maxAge: 120 }, // 2 min
  { pattern: /^\/api\/parent\/children\/status$/, maxAge: 120 }, // 2 min
  { pattern: /^\/api\/parent\/info$/, maxAge: 60 },         // 1 min
];

app.use((req, res, next) => {
  if (req.method === "GET") {
    for (const rule of apiCacheRules) {
      if (rule.pattern.test(req.path)) {
        res.set("Cache-Control", `private, max-age=${rule.maxAge}`);
        break;
      }
    }
  }
  next();
});

const CLUSTER_ENABLED = process.env["NODE_CLUSTER_ENABLED"] === "true";
const DEFAULT_WORKERS = process.env["NODE_ENV"] === "production" ? Math.min(os.cpus().length, 4) : 1;
const WORKER_COUNT = Math.max(1, Number(process.env["WEB_CONCURRENCY"] || String(DEFAULT_WORKERS)));

async function startHttpServer() {
  try {
    const server = await registerRoutes(app);
    
    // Initialize Phase 1.4: Gift event → notification handlers
    await initializeGiftNotificationHandlers();

    // Background worker: media cleanup / purge
    startMediaWorker();
    startTaskNotificationWorker();

    // Explicit API 404 guard to enforce JSON contract for unknown API routes
    app.use("/api", (req, res) => {
      res
        .status(404)
        .json(errorResponse(ErrorCode.NOT_FOUND, "API endpoint not found"));
    });

    // 🔴 GLOBAL ERROR HANDLER (must be AFTER all routes)
    app.use((err: any, req: Request, res: Response, _next: NextFunction) => {
      const status = err.status || err.statusCode || 500;
      const message = err.message || "Internal Server Error";

      console.error("❌ Unhandled Error:", {
        message: err.message,
        code: err.code,
        timestamp: new Date().toISOString(),
        request: {
          method: req.method,
          path: req.originalUrl,
          headers: redactObject(req.headers),
          body: redactObject(req.body),
        },
      });

      res.status(status).json({ 
        success: false,
        error: err.code || "INTERNAL_SERVER_ERROR",
        message: message 
      });
    });

    // Setup static files and SPA fallback
    // Only setup vite in development and after setting up all the other routes
    // so the catch-all route doesn't interfere with the other routes
    if (app.get("env") === "development") {
      // Dynamic import vite only in development to avoid bundling in production
      const { setupVite } = await import("./vite");
      await setupVite(app, server);
    } else {
      try {
        serveStatic(app);
        console.log("✅ Static file serving configured successfully");
      } catch (error: any) {
        console.error("❌ Failed to setup static file serving:", error.message);
        process.exit(1);
      }
    }

    // ALWAYS serve the app on the port specified in the environment variable PORT
    // Other ports are firewalled. Default to 5000 if not specified.
    // this serves both the API and the client.
    // It is the only port that is not firewalled.
    const port = parseInt(process.env.PORT || '5000', 10);
    const host = process.env.HOST || "0.0.0.0";
    
    const reusePort = process.platform !== "win32";
    server.listen({
      port,
      host,
      ...(reusePort ? { reusePort: true } : {}),
    }, () => {
      log(`✓ Server running on http://${host}:${port}`);
      if (app.get("env") === "production") {
        log(`✓ Static assets: dist/public | SPA fallback: index.html`);
      }
    });

    // Graceful shutdown
    process.on("SIGTERM", () => {
      log("📭 SIGTERM received, shutting down gracefully...");
      server.close(() => {
        log("✓ Server closed");
        process.exit(0);
      });
    });

    process.on("SIGINT", () => {
      log("📭 SIGINT received, shutting down gracefully...");
      server.close(() => {
        log("✓ Server closed");
        process.exit(0);
      });
    });

    // Catch unhandled rejections
    process.on("unhandledRejection", (reason: any) => {
      console.error("❌ Unhandled Promise Rejection:", reason);
      process.exit(1);
    });

  } catch (error: any) {
    console.error("❌ Failed to start server:", error.message);
    process.exit(1);
  }
}

if (CLUSTER_ENABLED && cluster.isPrimary) {
  log(`✓ Cluster mode enabled | workers=${WORKER_COUNT}`);

  for (let i = 0; i < WORKER_COUNT; i++) {
    cluster.fork();
  }

  cluster.on("exit", (worker, code, signal) => {
    console.error(`❌ Worker ${worker.process.pid} exited (code=${code}, signal=${signal || "none"}). Restarting...`);
    cluster.fork();
  });
} else {
  startHttpServer();
}
