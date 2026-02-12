import type { Express } from "express";
import { storage } from "../storage";
import { successResponse, errorResponse, ErrorCode } from "../utils/apiResponse";
import { childNotificationSettings, children, parentChild, parents } from "../../shared/schema";
import { eq, and } from "drizzle-orm";
import { adminMiddleware } from "./middleware";

const db = storage.db;

export async function registerNotificationSettingsRoutes(app: Express) {
  // Get All Child Notification Settings
  app.get("/api/admin/notification-settings", adminMiddleware, async (req: any, res) => {
    try {
      const { parentId, page = "1", limit = "20" } = req.query;
      const pageNum = parseInt(page);
      const limitNum = parseInt(limit);
      const offset = (pageNum - 1) * limitNum;

      let query = db.select().from(childNotificationSettings);

      // If filtering by parent, get their children first
      if (parentId) {
        const childrenList = await db
          .select({ childId: parentChild.childId })
          .from(parentChild)
          .where(eq(parentChild.parentId, parentId));

        const childIds = childrenList.map((r: any) => r.childId);
        if (childIds.length === 0) {
          return res.json(successResponse({
            items: [],
            pagination: { page: pageNum, limit: limitNum, total: 0, totalPages: 0 },
          }));
        }

        // Would need a better implementation with IN operator
        const settings = await db.select().from(childNotificationSettings);
        const filtered = settings
          .filter((s: any) => childIds.includes(s.childId))
          .slice(offset, offset + limitNum);

        const enriched = await Promise.all(
          filtered.map(async (setting: any) => {
            const child = await db.select().from(children).where(eq(children.id, setting.childId));
            const parentList = await db
              .select()
              .from(parentChild)
              .where(eq(parentChild.childId, setting.childId));

            return {
              ...setting,
              childName: child[0]?.name || "Unknown",
              parentId: parentList[0]?.parentId,
            };
          })
        );

        return res.json({
          success: true,
          data: {
            items: enriched,
            pagination: { page: pageNum, limit: limitNum, total: filtered.length, totalPages: 1 },
          },
        });
      }

      const result = await query.limit(limitNum).offset(offset);
      const countResult = await db.select().from(childNotificationSettings);

      // Enrich with child names
      const enriched = await Promise.all(
        result.map(async (setting: any) => {
          const child = await db.select().from(children).where(eq(children.id, setting.childId));
          return {
            ...setting,
            childName: child[0]?.name || "Unknown",
          };
        })
      );

      res.json(successResponse({
        items: enriched,
        pagination: {
          page: pageNum,
          limit: limitNum,
          total: countResult.length,
          totalPages: Math.ceil(countResult.length / limitNum),
        },
      }));
    } catch (error: any) {
      console.error("Fetch notification settings error:", error);
      res
        .status(500)
        .json(errorResponse(ErrorCode.INTERNAL_SERVER_ERROR, "Failed to fetch settings"));
    }
  });

  // Get Single Child Settings
  app.get("/api/admin/notification-settings/:childId", adminMiddleware, async (req: any, res) => {
    try {
      const { childId } = req.params;

      const setting = await db
        .select()
        .from(childNotificationSettings)
        .where(eq(childNotificationSettings.childId, childId));

      if (!setting[0]) {
        // Return default settings
        return res.json(successResponse({
          childId,
          mode: "popup_soft",
          repeatDelayMinutes: 5,
          requireOverlayPermission: false,
        }));
      }

      const child = await db.select().from(children).where(eq(children.id, childId));

      res.json(successResponse({
        ...setting[0],
        childName: child[0]?.name || "Unknown",
      }));
    } catch (error: any) {
      console.error("Fetch child settings error:", error);
      res
        .status(500)
        .json(errorResponse(ErrorCode.INTERNAL_SERVER_ERROR, "Failed to fetch settings"));
    }
  });

  // Update Notification Settings (Admin)
  app.put("/api/admin/notification-settings/:childId", adminMiddleware, async (req: any, res) => {
    try {
      const { childId } = req.params;
      const { mode, repeatDelayMinutes, requireOverlayPermission } = req.body;

      if (mode && !["popup_strict", "popup_soft", "floating_bubble"].includes(mode)) {
        return res
          .status(400)
          .json(errorResponse(ErrorCode.BAD_REQUEST, "Invalid notification mode"));
      }

      // Verify child exists
      const child = await db.select().from(children).where(eq(children.id, childId));
      if (!child[0]) {
        return res
          .status(404)
          .json(errorResponse(ErrorCode.NOT_FOUND, "Child not found"));
      }

      const existing = await db
        .select()
        .from(childNotificationSettings)
        .where(eq(childNotificationSettings.childId, childId));

      const updateFields: any = {};
      if (mode) updateFields.mode = mode;
      if (repeatDelayMinutes !== undefined) updateFields.repeatDelayMinutes = repeatDelayMinutes;
      if (requireOverlayPermission !== undefined) updateFields.requireOverlayPermission = requireOverlayPermission;
      updateFields.updatedAt = new Date();

      let result;
      if (existing[0]) {
        result = await db
          .update(childNotificationSettings)
          .set(updateFields)
          .where(eq(childNotificationSettings.childId, childId))
          .returning();
      } else {
        result = await db
          .insert(childNotificationSettings)
          .values({
            childId,
            mode: mode || "popup_soft",
            repeatDelayMinutes: repeatDelayMinutes || 5,
            requireOverlayPermission: requireOverlayPermission || false,
          })
          .returning();
      }

      res.json(successResponse(result[0]));
    } catch (error: any) {
      console.error("Update settings error:", error);
      res
        .status(500)
        .json(errorResponse(ErrorCode.INTERNAL_SERVER_ERROR, "Failed to update settings"));
    }
  });

  // Get Notification Settings Statistics
  app.get("/api/admin/notification-settings-stats", adminMiddleware, async (req: any, res) => {
    try {
      const allSettings = await db.select().from(childNotificationSettings);

      const stats = {
        total: allSettings.length,
        byMode: {
          popup_strict: allSettings.filter((s: any) => s.mode === "popup_strict").length,
          popup_soft: allSettings.filter((s: any) => s.mode === "popup_soft").length,
          floating_bubble: allSettings.filter((s: any) => s.mode === "floating_bubble").length,
        },
        withOverlayPermission: allSettings.filter((s: any) => s.requireOverlayPermission === true).length,
        averageRepeatDelay: allSettings.length
          ? Math.round(
              allSettings.reduce((sum: number, s: any) => sum + (s.repeatDelayMinutes || 0), 0) /
                allSettings.length
            )
          : 0,
      };

      res.json(successResponse(stats));
    } catch (error: any) {
      console.error("Fetch stats error:", error);
      res
        .status(500)
        .json(errorResponse(ErrorCode.INTERNAL_SERVER_ERROR, "Failed to fetch stats"));
    }
  });
}
