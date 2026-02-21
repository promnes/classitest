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
    // ── Built-in game definitions ──
    const builtinGames = [
      {
        title: "تحدي الرياضيات - Math Challenge 🔢",
        description: "لعبة تعليمية ممتعة لتحسين مهارات الحساب — 10 عوالم، نظام ذكاء تكيّفي، وتقرير أداء للوالدين!",
        embedUrl: "/games/math-challenge.html",
        category: "math",
        minAge: 5,
        maxAge: 14,
        pointsPerPlay: 10,
        maxPlaysPerDay: 5,
      },
      {
        title: "مملكة الذاكرة - Memory Kingdom 🧠",
        description: "100 مستوى عبر 10 عوالم! 11 نوع لعب، 10 زعماء، 5 قدرات خارقة، متجر سمات، نظام XP وسلسلة يومية، تقرير ذكاء معرفي للوالدين!",
        embedUrl: "/games/memory-match.html",
        category: "puzzle",
        minAge: 4,
        maxAge: 14,
        pointsPerPlay: 10,
        maxPlaysPerDay: 0,
      },
    ];

    for (const game of builtinGames) {
      // Remove duplicates: keep only the first row per embedUrl
      const rows = await db.select({ id: flashGames.id })
        .from(flashGames)
        .where(eq(flashGames.embedUrl, game.embedUrl));

      if (rows.length > 1) {
        // Keep first, delete rest
        const idsToDelete = rows.slice(1).map(r => r.id);
        for (const dupId of idsToDelete) {
          await db.delete(flashGames).where(eq(flashGames.id, dupId));
        }
        console.log(`🧹 Removed ${idsToDelete.length} duplicate(s) for ${game.embedUrl}`);
        // Update the surviving record with latest info
        await db.update(flashGames)
          .set({ title: game.title, description: game.description })
          .where(eq(flashGames.id, rows[0].id));
      } else if (rows.length === 1) {
        // Update title/description to latest
        await db.update(flashGames)
          .set({ title: game.title, description: game.description })
          .where(eq(flashGames.id, rows[0].id));
      } else {
        // Insert new
        await db.insert(flashGames).values({
          ...game,
          thumbnailUrl: "",
          isActive: true,
        });
        console.log(`✅ Seeded default game: ${game.title}`);
      }
    }

    // Remove any legacy duplicates with old embed URLs (e.g. "/memory-match")
    const legacyUrls = ["/memory-match", "/math-challenge"];
    for (const url of legacyUrls) {
      const legacy = await db.select({ id: flashGames.id })
        .from(flashGames)
        .where(eq(flashGames.embedUrl, url));
      if (legacy.length > 0) {
        for (const row of legacy) {
          await db.delete(flashGames).where(eq(flashGames.id, row.id));
        }
        console.log(`🧹 Removed ${legacy.length} legacy game record(s) with URL: ${url}`);
      }
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
