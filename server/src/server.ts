import express, { type Request, Response, NextFunction } from "express";
import { createServer, type Server } from "http";
import { config } from "./config";
import { createRedisClient } from "./config/redis";
import { logger } from "./utils/logger";
import {
  requestLoggerMiddleware,
  helmetMiddleware,
  corsMiddleware,
  sanitizeMiddleware,
  securityHeadersMiddleware,
  generalRateLimiter,
  errorHandler,
  notFoundHandler,
} from "./middleware";
import { compressionMiddleware } from "./middleware/compression";

export function createApp(): express.Application {
  const app = express();
  
  createRedisClient();

  app.set("trust proxy", 1);

  app.use(helmetMiddleware);
  app.use(corsMiddleware);
  app.use(securityHeadersMiddleware);

  app.use(compressionMiddleware);

  app.use(express.json({ limit: "10mb" }));
  app.use(express.urlencoded({ extended: false, limit: "10mb" }));

  app.use(sanitizeMiddleware);

  app.use(requestLoggerMiddleware);

  app.use("/api", generalRateLimiter);

  app.get("/api/health", (_req: Request, res: Response) => {
    res.json({
      status: "healthy",
      timestamp: new Date().toISOString(),
      uptime: process.uptime(),
      memory: process.memoryUsage(),
      env: config.env,
    });
  });

  app.get("/api/ready", (_req: Request, res: Response) => {
    res.json({ ready: true });
  });

  return app;
}

export function attachErrorHandlers(app: express.Application): void {
  app.use(notFoundHandler);
  app.use(errorHandler);
}

export function startServer(app: express.Application): Server {
  const server = createServer(app);

  server.keepAliveTimeout = 65000;
  server.headersTimeout = 66000;

  server.on("error", (error: NodeJS.ErrnoException) => {
    if (error.syscall !== "listen") {
      throw error;
    }

    const bind = `Port ${config.port}`;

    switch (error.code) {
      case "EACCES":
        logger.fatal({ bind }, "Requires elevated privileges");
        process.exit(1);
        break;
      case "EADDRINUSE":
        logger.fatal({ bind }, "Port is already in use");
        process.exit(1);
        break;
      default:
        throw error;
    }
  });

  server.listen(config.port, "0.0.0.0", () => {
    logger.info({
      port: config.port,
      env: config.env,
      nodeVersion: process.version,
    }, `Server started on port ${config.port}`);
  });

  return server;
}

process.on("uncaughtException", (error: Error) => {
  logger.fatal({ error: error.message, stack: error.stack }, "Uncaught Exception");
  process.exit(1);
});

process.on("unhandledRejection", (reason: any) => {
  logger.fatal({ reason }, "Unhandled Rejection");
  process.exit(1);
});

let isShuttingDown = false;

export function setupGracefulShutdown(server: Server): void {
  const shutdown = (signal: string) => {
    if (isShuttingDown) return;
    isShuttingDown = true;

    logger.info({ signal }, "Received shutdown signal, closing server...");

    server.close((err) => {
      if (err) {
        logger.error({ error: err.message }, "Error during server close");
        process.exit(1);
      }

      logger.info("Server closed successfully");
      process.exit(0);
    });

    setTimeout(() => {
      logger.warn("Could not close connections in time, forcefully shutting down");
      process.exit(1);
    }, 30000);
  };

  process.on("SIGTERM", () => shutdown("SIGTERM"));
  process.on("SIGINT", () => shutdown("SIGINT"));
}
