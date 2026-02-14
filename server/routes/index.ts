import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "../storage";

import { registerAuthRoutes } from "./auth";
import { registerAdminRoutes } from "./admin";
import { registerParentRoutes } from "./parent";
import { registerChildRoutes } from "./child";
import { registerAdminSettingsRoutes } from "./admin.settings";
import { registerActivityLogRoutes } from "./admin-activity";
import { registerAnalyticsRoutes } from "./admin-analytics";
import { registerGiftManagementRoutes } from "./admin-gifts";
import { registerNotificationSettingsRoutes } from "./admin-notification-settings";
import { registerAdminTaskNotificationRoutes } from "./admin-task-notification-settings";
import trustedDevicesRouter from "./trusted-devices";
import adsRouter from "./ads";
import parentLinkingRouter from "./parent-linking";
import { registerPaymentRoutes } from "./payments";
import { registerStoreRoutes } from "./store";
import { registerReferralRoutes } from "./referrals";
import { registerLibraryRoutes } from "./library";
import { registerObjectStorageRoutes } from "../replit_integrations/object_storage";
import { registerMediaUploadRoutes } from "./media-uploads";
import { ensureOtpProviders } from "../providers/otp/bootstrap";

export async function registerRoutes(app: Express): Promise<Server> {
  const db = storage.db;

  await ensureOtpProviders();

  // Health Check
  app.get("/api/health", (req, res) => {
    res.json({ status: "ok" });
  });

  // Register all route groups
  registerAuthRoutes(app);
  registerAdminRoutes(app);
  registerAdminSettingsRoutes(app);
  registerActivityLogRoutes(app);
  registerAnalyticsRoutes(app);
  registerGiftManagementRoutes(app);
  registerNotificationSettingsRoutes(app);
  registerAdminTaskNotificationRoutes(app);
  registerParentRoutes(app);
  registerChildRoutes(app);
  registerPaymentRoutes(app);
  registerStoreRoutes(app);
  registerReferralRoutes(app);
  registerLibraryRoutes(app);
  registerObjectStorageRoutes(app);
  registerMediaUploadRoutes(app);
  
  // Register new feature routes
  app.use("/api", trustedDevicesRouter);
  app.use("/api", adsRouter);
  app.use("/api", parentLinkingRouter);

  // ✅ Create HTTP server (will be returned)
  const httpServer = createServer(app);
  return httpServer;
}
