import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "../storage";
import { flashGames } from "../../shared/schema";
import { eq } from "drizzle-orm";

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
import { registerSchoolRoutes } from "./school";
import { registerTeacherRoutes } from "./teacher";
import { registerFollowRoutes } from "./follow";
import { registerMarketplaceRoutes } from "./marketplace";
import { registerObjectStorageRoutes } from "../replit_integrations/object_storage";
import { registerMediaUploadRoutes } from "./media-uploads";
import { ensureOtpProviders } from "../providers/otp/bootstrap";

// Seed built-in games if they don't exist yet
async function seedDefaultGames() {
  const db = storage.db;
  try {
    const existing = await db.select({ id: flashGames.id })
      .from(flashGames)
      .where(eq(flashGames.embedUrl, "/games/math-challenge.html"))
      .limit(1);
    
    if (existing.length === 0) {
      await db.insert(flashGames).values({
        title: "تحدي الرياضيات - Math Challenge",
        description: "لعبة تعليمية ممتعة لتحسين مهارات الحساب. أجب على أكبر عدد من المسائل قبل انتهاء الوقت!",
        embedUrl: "/games/math-challenge.html",
        thumbnailUrl: "",
        category: "math",
        minAge: 5,
        maxAge: 14,
        pointsPerPlay: 10,
        maxPlaysPerDay: 5,
        isActive: true,
      });
      console.log("✅ Seeded default game: Math Challenge");
    }

    // Seed Match 3 Education game
    const existingMatch3 = await db.select({ id: flashGames.id })
      .from(flashGames)
      .where(eq(flashGames.embedUrl, "/games/match3-education.html"))
      .limit(1);

    if (existingMatch3.length === 0) {
      await db.insert(flashGames).values({
        title: "مطابقة ثلاثية تعليمية - Educational Match 3",
        description: "لعبة مطابقة ثلاثية تعليمية! طابق الألوان أو الأشكال أو الحروف أو الأرقام. ثلاث مستويات صعوبة مع مؤثرات صوتية وحركية ممتعة!",
        embedUrl: "/games/match3-education.html",
        thumbnailUrl: "",
        category: "puzzle",
        minAge: 4,
        maxAge: 14,
        pointsPerPlay: 10,
        maxPlaysPerDay: 5,
        isActive: true,
      });
      console.log("✅ Seeded default game: Match 3 Education");
    }
  } catch (err) {
    console.warn("⚠️ Could not seed default games:", (err as Error).message);
  }
}

export async function registerRoutes(app: Express): Promise<Server> {
  const db = storage.db;

  await ensureOtpProviders();
  await seedDefaultGames();

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
  registerSchoolRoutes(app);
  registerTeacherRoutes(app);
  registerFollowRoutes(app);
  registerMarketplaceRoutes(app);
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
