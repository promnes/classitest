import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "../storage";
import { flashGames, symbolCategories } from "../../shared/schema";
import { eq, sql } from "drizzle-orm";

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
import { registerSymbolRoutes } from "./symbols";
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

    // Seed Memory Match game
    const existingMemory = await db.select({ id: flashGames.id })
      .from(flashGames)
      .where(eq(flashGames.embedUrl, "/games/memory-match.html"))
      .limit(1);

    if (existingMemory.length === 0) {
      await db.insert(flashGames).values({
        title: "لعبة الذاكرة - Memory Match 🧠",
        description: "لعبة ذاكرة تعليمية مع 20 مستوى! بطاقات متحركة، ضباب، أقنعة، وتحدي الزعيم. نظام ذكاء تكيّفي ومتجر مكافآت!",
        embedUrl: "/games/memory-match.html",
        thumbnailUrl: "",
        category: "puzzle",
        minAge: 4,
        maxAge: 14,
        pointsPerPlay: 10,
        maxPlaysPerDay: 0,
        isActive: true,
      });
      console.log("✅ Seeded default game: Memory Match");
    }
  } catch (err) {
    console.warn("⚠️ Could not seed default games:", (err as Error).message);
  }
}

// Seed symbol categories & symbols if empty
async function seedSymbolCategories() {
  const db = storage.db;
  try {
    const existing = await db.select({ count: sql<number>`count(*)::int` }).from(symbolCategories);
    if ((existing[0]?.count || 0) > 0) return; // Already seeded

    const categories = [
      { slug: "numbers-letters", nameAr: "أرقام وحروف", nameEn: "Numbers & Letters", icon: "🔢", sortOrder: 1 },
      { slug: "emotions-faces", nameAr: "وجوه ومشاعر", nameEn: "Emotions & Faces", icon: "😀", sortOrder: 2 },
      { slug: "animals", nameAr: "حيوانات", nameEn: "Animals", icon: "🐱", sortOrder: 3 },
      { slug: "nature-elements", nameAr: "طبيعة وعناصر", nameEn: "Nature & Elements", icon: "🌿", sortOrder: 4 },
      { slug: "shapes-colors", nameAr: "أشكال وألوان", nameEn: "Shapes & Colors", icon: "🔵", sortOrder: 5 },
      { slug: "educational-tools", nameAr: "أدوات تعليمية", nameEn: "Educational Tools", icon: "📚", sortOrder: 6 },
      { slug: "activities-hobbies", nameAr: "أنشطة وهوايات", nameEn: "Activities & Hobbies", icon: "⚽", sortOrder: 7 },
      { slug: "rewards-achievements", nameAr: "مكافآت وإنجازات", nameEn: "Rewards & Achievements", icon: "🏆", sortOrder: 8 },
      { slug: "project-specific", nameAr: "رموز المنصة", nameEn: "Project Symbols", icon: "✨", sortOrder: 9 },
    ];

    await db.insert(symbolCategories).values(categories);
    console.log("✅ Seeded 9 symbol categories");
  } catch (err) {
    console.warn("⚠️ Could not seed symbol categories:", (err as Error).message);
  }
}

export async function registerRoutes(app: Express): Promise<Server> {
  const db = storage.db;

  await ensureOtpProviders();
  await seedDefaultGames();
  await seedSymbolCategories();

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
  registerSymbolRoutes(app);
  
  // Register new feature routes
  app.use("/api", trustedDevicesRouter);
  app.use("/api", adsRouter);
  app.use("/api", parentLinkingRouter);

  // ✅ Create HTTP server (will be returned)
  const httpServer = createServer(app);
  return httpServer;
}
