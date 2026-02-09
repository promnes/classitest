import type { Express } from "express";
import { storage } from "../storage";
import {
  appSettings,
  rewardsSettings,
  tasksSettings,
  storeSettings,
  notificationSettings,
  paymentSettings,
  siteSettings,
  themeSettings,
  seoSettings,
  supportSettings,
} from "../../shared/schema";
import { adminMiddleware } from "./middleware";
import { eq } from "drizzle-orm";
import { successResponse, errorResponse, ErrorCode } from "../utils/apiResponse";

const db = storage.db;

function tableForName(name: string) {
  switch (name) {
    case "app_settings":
    case "app":
      return appSettings;
    case "rewards_settings":
    case "rewards":
      return rewardsSettings;
    case "tasks_settings":
    case "tasks":
      return tasksSettings;
    case "store_settings":
    case "store":
      return storeSettings;
    case "notification_settings":
    case "notifications":
      return notificationSettings;
    case "payment_settings":
    case "payment":
      return paymentSettings;
    case "site_settings":
    case "site":
      return siteSettings;
    case "theme_settings":
    case "theme":
      return themeSettings;
    case "seo_settings":
    case "seo":
      return seoSettings;
    case "support_settings":
    case "support":
      return supportSettings;
    default:
      return null;
  }
}

// Default SEO settings for new installations
const DEFAULT_SEO_SETTINGS = {
  siteTitle: "Classify - تطبيق الرقابة الأبوية",
  siteDescription: "تطبيق عربي شامل للرقابة الأبوية يساعد الآباء في إدارة علاقتهم مع أطفالهم من خلال المهام والألعاب والمكافآت",
  keywords: "رقابة أبوية, تطبيق أطفال, مهام, مكافآت, ألعاب تعليمية, تعليم الأطفال",
  ogType: "website",
  twitterCard: "summary_large_image",
  robotsIndex: true,
  robotsFollow: true,
  robotsNoarchive: false,
  allowGPTBot: false,
  allowClaudeBot: false,
  allowGoogleAI: false,
  sitemapEnabled: true,
  sitemapChangefreq: "weekly",
  sitemapPriority: "0.8",
  schemaOrgType: "SoftwareApplication",
  defaultLanguage: "ar",
  themeColor: "#7c3aed",
};

// Default Support settings for new installations
const DEFAULT_SUPPORT_SETTINGS = {
  supportEmail: "support@classify.app",
  workingHoursStart: "09:00",
  workingHoursEnd: "17:00",
  workingDays: "الأحد - الخميس",
  timezone: "Asia/Riyadh",
  maintenanceMode: false,
  maintenanceMessage: "التطبيق تحت الصيانة، نعود قريباً",
  errorPageTitle: "حدث خطأ غير متوقع",
  errorPageMessage: "نأسف على هذا الخطأ. يرجى التواصل مع الدعم الفني.",
  showContactOnError: true,
  companyName: "Classify",
  companyCountry: "المملكة العربية السعودية",
};

export function registerAdminSettingsRoutes(app: Express) {
  // ===== SEO SETTINGS ENDPOINTS =====
  
  // Public: Get SEO settings (for meta tags in frontend)
  app.get("/api/seo-settings", async (_req, res) => {
    try {
      const result = await db.select().from(seoSettings);
      if (result[0]) {
        return res.json(successResponse(result[0], "SEO settings retrieved"));
      }
      // Return defaults if no settings exist
      return res.json(successResponse(DEFAULT_SEO_SETTINGS, "Default SEO settings"));
    } catch (error: any) {
      console.error("Fetch SEO settings error:", error);
      res.json(successResponse(DEFAULT_SEO_SETTINGS, "Default SEO settings"));
    }
  });

  // Admin: Get full SEO settings
  app.get("/api/admin/seo-settings", adminMiddleware, async (_req: any, res) => {
    try {
      const result = await db.select().from(seoSettings);
      if (result[0]) {
        return res.json(successResponse(result[0], "SEO settings retrieved"));
      }
      // Create default settings if none exist
      const newSettings = await db.insert(seoSettings).values(DEFAULT_SEO_SETTINGS).returning();
      return res.json(successResponse(newSettings[0], "SEO settings initialized"));
    } catch (error: any) {
      console.error("Admin fetch SEO settings error:", error);
      res.status(500).json(errorResponse(ErrorCode.INTERNAL_SERVER_ERROR, "Failed to fetch SEO settings"));
    }
  });

  // Admin: Update SEO settings
  app.put("/api/admin/seo-settings", adminMiddleware, async (req: any, res) => {
    try {
      const existing = await db.select().from(seoSettings);
      
      if (existing[0]) {
        const updated = await db
          .update(seoSettings)
          .set({ ...req.body, updatedAt: new Date(), updatedBy: req.userId })
          .where(eq(seoSettings.id, existing[0].id))
          .returning();
        return res.json(successResponse(updated[0], "SEO settings updated"));
      }
      
      // Create if not exists
      const newSettings = await db
        .insert(seoSettings)
        .values({ ...req.body, updatedBy: req.userId })
        .returning();
      return res.json(successResponse(newSettings[0], "SEO settings created"));
    } catch (error: any) {
      console.error("Update SEO settings error:", error);
      res.status(500).json(errorResponse(ErrorCode.INTERNAL_SERVER_ERROR, "Failed to update SEO settings"));
    }
  });

  // ===== SUPPORT SETTINGS ENDPOINTS =====
  
  // Public: Get support contact info (for error pages and footer)
  app.get("/api/support-settings", async (_req, res) => {
    try {
      const result = await db.select().from(supportSettings);
      if (result[0]) {
        // Return only public-facing fields
        const publicFields = {
          supportEmail: result[0].supportEmail,
          supportPhone: result[0].supportPhone,
          whatsappNumber: result[0].whatsappNumber,
          telegramUsername: result[0].telegramUsername,
          facebookUrl: result[0].facebookUrl,
          twitterUrl: result[0].twitterUrl,
          instagramUrl: result[0].instagramUrl,
          workingHoursStart: result[0].workingHoursStart,
          workingHoursEnd: result[0].workingHoursEnd,
          workingDays: result[0].workingDays,
          timezone: result[0].timezone,
          emergencyMessage: result[0].emergencyMessage,
          maintenanceMode: result[0].maintenanceMode,
          maintenanceMessage: result[0].maintenanceMessage,
          errorPageTitle: result[0].errorPageTitle,
          errorPageMessage: result[0].errorPageMessage,
          showContactOnError: result[0].showContactOnError,
          faqUrl: result[0].faqUrl,
          helpCenterUrl: result[0].helpCenterUrl,
          privacyPolicyUrl: result[0].privacyPolicyUrl,
          termsOfServiceUrl: result[0].termsOfServiceUrl,
          companyName: result[0].companyName,
        };
        return res.json(successResponse(publicFields, "Support settings retrieved"));
      }
      return res.json(successResponse(DEFAULT_SUPPORT_SETTINGS, "Default support settings"));
    } catch (error: any) {
      console.error("Fetch support settings error:", error);
      res.json(successResponse(DEFAULT_SUPPORT_SETTINGS, "Default support settings"));
    }
  });

  // Admin: Get full support settings
  app.get("/api/admin/support-settings", adminMiddleware, async (_req: any, res) => {
    try {
      const result = await db.select().from(supportSettings);
      if (result[0]) {
        return res.json(successResponse(result[0], "Support settings retrieved"));
      }
      // Create default settings if none exist
      const newSettings = await db.insert(supportSettings).values(DEFAULT_SUPPORT_SETTINGS).returning();
      return res.json(successResponse(newSettings[0], "Support settings initialized"));
    } catch (error: any) {
      console.error("Admin fetch support settings error:", error);
      res.status(500).json(errorResponse(ErrorCode.INTERNAL_SERVER_ERROR, "Failed to fetch support settings"));
    }
  });

  // Admin: Update support settings
  app.put("/api/admin/support-settings", adminMiddleware, async (req: any, res) => {
    try {
      const existing = await db.select().from(supportSettings);
      
      if (existing[0]) {
        const updated = await db
          .update(supportSettings)
          .set({ ...req.body, updatedAt: new Date(), updatedBy: req.userId })
          .where(eq(supportSettings.id, existing[0].id))
          .returning();
        return res.json(successResponse(updated[0], "Support settings updated"));
      }
      
      // Create if not exists
      const newSettings = await db
        .insert(supportSettings)
        .values({ ...req.body, updatedBy: req.userId })
        .returning();
      return res.json(successResponse(newSettings[0], "Support settings created"));
    } catch (error: any) {
      console.error("Update support settings error:", error);
      res.status(500).json(errorResponse(ErrorCode.INTERNAL_SERVER_ERROR, "Failed to update support settings"));
    }
  });

  // ===== ROBOTS.TXT ENDPOINT =====
  app.get("/robots.txt", async (_req, res) => {
    try {
      const result = await db.select().from(seoSettings);
      const settings = result[0] || DEFAULT_SEO_SETTINGS;
      
      let robotsTxt = "User-agent: *\n";
      
      if (settings.robotsIndex && settings.robotsFollow) {
        robotsTxt += "Allow: /\n";
      } else if (!settings.robotsIndex) {
        robotsTxt += "Disallow: /\n";
      }
      
      // AI Crawlers control
      if (!settings.allowGPTBot) {
        robotsTxt += "\nUser-agent: GPTBot\nDisallow: /\n";
      }
      if (!settings.allowClaudeBot) {
        robotsTxt += "\nUser-agent: Claude-Web\nUser-agent: ClaudeBot\nDisallow: /\n";
      }
      if (!settings.allowGoogleAI) {
        robotsTxt += "\nUser-agent: Google-Extended\nDisallow: /\n";
      }
      
      // Add sitemap if enabled
      if (settings.sitemapEnabled && settings.canonicalUrl) {
        robotsTxt += `\nSitemap: ${settings.canonicalUrl}/sitemap.xml\n`;
      }
      
      res.type("text/plain").send(robotsTxt);
    } catch (error: any) {
      console.error("Generate robots.txt error:", error);
      res.type("text/plain").send("User-agent: *\nAllow: /\n");
    }
  });

  // Public settings endpoint - returns merged minimal settings
  app.get("/api/settings", async (_req, res) => {
    try {
      const site = await db.select().from(siteSettings);
      const theme = await db.select().from(themeSettings);
      const store = await db.select().from(storeSettings);
      const notification = await db.select().from(notificationSettings);
      const payment = await db.select().from(paymentSettings);

      const response = {
        site: site.reduce((acc: any, row: any) => ({ ...acc, [row.key]: row.value }), {}),
        theme: theme[0] || null,
        store: store[0] || null,
        notification: notification[0] || null,
        payment: payment[0] || null,
      };

      res.json(response);
    } catch (error: any) {
      console.error("Fetch public settings error:", error);
      res.status(500).json({ message: "Failed to fetch settings" });
    }
  });

  // Admin: get all settings
  app.get("/api/admin/settings", adminMiddleware, async (_req: any, res) => {
    try {
      const appS = await db.select().from(appSettings);
      const rewards = await db.select().from(rewardsSettings);
      const tasks = await db.select().from(tasksSettings);
      const store = await db.select().from(storeSettings);
      const notification = await db.select().from(notificationSettings);
      const payment = await db.select().from(paymentSettings);
      const site = await db.select().from(siteSettings);
      const theme = await db.select().from(themeSettings);

      res.json({ app: appS, rewards, tasks, store, notification, payment, site, theme });
    } catch (error: any) {
      console.error("Fetch admin settings error:", error);
      res.status(500).json({ message: "Failed to fetch admin settings" });
    }
  });

  // Admin: create or upsert setting for keyed tables (app/site)
  app.post("/api/admin/settings/:table", adminMiddleware, async (req: any, res) => {
    try {
      const { table } = req.params;
      const tbl = tableForName(table);
      if (!tbl) return res.status(400).json({ message: "Unknown settings table" });

      // special handling for key/value tables
      if (tbl === appSettings || tbl === siteSettings) {
        const { key, value } = req.body;
        if (!key) return res.status(400).json({ message: "Key is required" });

        // try update existing
        const existing = await db.select().from(tbl).where(eq(tbl.key, key));
        if (existing[0]) {
          await db.update(tbl).set({ value }).where(eq(tbl.key, key));
          return res.json({ success: true, message: "Updated" });
        }
        await db.insert(tbl).values({ key, value });
        return res.json({ success: true, message: "Created" });
      }

      // generic: insert a row
      const insertRes = await db.insert(tbl).values(req.body).returning();
      res.json({ success: true, data: insertRes[0] });
    } catch (error: any) {
      console.error("Create setting error:", error);
      res.status(500).json({ message: "Failed to create setting" });
    }
  });

  // Admin: update by id
  app.put("/api/admin/settings/:table/:id", adminMiddleware, async (req: any, res) => {
    try {
      const { table, id } = req.params;
      const tbl = tableForName(table);
      if (!tbl) return res.status(400).json({ message: "Unknown settings table" });

      await db.update(tbl).set(req.body).where(eq(tbl.id, id));
      res.json({ success: true });
    } catch (error: any) {
      console.error("Update setting error:", error);
      res.status(500).json({ message: "Failed to update setting" });
    }
  });

  // Admin: delete by id
  app.delete("/api/admin/settings/:table/:id", adminMiddleware, async (req: any, res) => {
    try {
      const { table, id } = req.params;
      const tbl = tableForName(table);
      if (!tbl) return res.status(400).json({ message: "Unknown settings table" });

      await db.delete(tbl).where(eq(tbl.id, id));
      res.json({ success: true });
    } catch (error: any) {
      console.error("Delete setting error:", error);
      res.status(500).json({ message: "Failed to delete setting" });
    }
  });
}
