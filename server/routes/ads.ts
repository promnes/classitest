import { Router } from "express";
import { storage } from "../storage";
import { successResponse, errorResponse, ErrorCode } from "../utils/apiResponse";
import { adminMiddleware, authMiddleware } from "./middleware";
import { 
  childAds, 
  parentAds,
  adWatchHistory,
  children,
  parents
} from "../../shared/schema";
import { eq, and, gte, lte, desc } from "drizzle-orm";
import { applyPointsDelta } from "../services/pointsService";

const router = Router();
const db = storage.db;

// ===== Child Ads APIs =====

// GET: الحصول على قائمة الإعلانات النشطة للأطفال
router.get("/child/ads", authMiddleware, async (req, res) => {
  try {
    const now = new Date();
    
    const ads = await db
      .select()
      .from(childAds)
      .where(
        and(
          eq(childAds.isActive, true),
          // تحقق من المواعيد إن وجدت
        )
      )
      .orderBy(desc(childAds.priority), desc(childAds.createdAt));
    
    // فلترة الإعلانات حسب المواعيد
    const activeAds = ads.filter((ad: any) => {
      if (ad.startDate && now < ad.startDate) return false;
      if (ad.endDate && now > ad.endDate) return false;
      return true;
    });
    
    res.json({
      success: true,
      data: activeAds,
      count: activeAds.length
    });
  } catch (err) {
    console.error("Error fetching child ads:", err);
    res.status(500).json({
      success: false,
      error: "INTERNAL_ERROR",
      message: "Failed to fetch ads"
    });
  }
});

// GET: الحصول على تفاصيل إعلان محدد
router.get("/child/ads/:adId", authMiddleware, async (req, res) => {
  try {
    const { adId } = req.params;
    
    const ad = await db
      .select()
      .from(childAds)
      .where(eq(childAds.id, adId));
    
    if (ad.length === 0) {
      return res.status(404).json({
        success: false,
        error: "NOT_FOUND",
        message: "Ad not found"
      });
    }
    
    res.json({
      success: true,
      data: ad[0]
    });
  } catch (err) {
    console.error("Error fetching ad details:", err);
    res.status(500).json({
      success: false,
      error: "INTERNAL_ERROR",
      message: "Failed to fetch ad"
    });
  }
});

// POST: تسجيل مشاهدة إعلان من الطفل
router.post("/child/ads/:adId/watch", authMiddleware, async (req, res) => {
  try {
    const { adId } = req.params;
    const { watchedDuration } = req.body;
    const childId = (req.user as any).childId;
    
    // الحصول على تفاصيل الإعلان
    const ad = await db
      .select()
      .from(childAds)
      .where(eq(childAds.id, adId));
    
    if (ad.length === 0) {
      return res.status(404).json({
        success: false,
        error: "NOT_FOUND",
        message: "Ad not found"
      });
    }
    
    // التحقق من أن المدة المشاهدة كافية
    const isCompleted = watchedDuration >= ad[0].watchDurationSeconds;
    const pointsEarned = isCompleted ? ad[0].pointsReward : 0;
    
    // تسجيل المشاهدة
    const result = await db.transaction(async (tx: any) => {
      const watchRecord = await tx
        .insert(adWatchHistory)
        .values({
          childId,
          adId,
          adType: "child",
          watchedDuration: watchedDuration || 0,
          pointsEarned,
          isCompleted,
        })
        .returning();

      if (isCompleted && pointsEarned > 0) {
        await applyPointsDelta(tx, {
          childId,
          delta: pointsEarned,
          reason: "AD_WATCH_COMPLETED",
          requestId: watchRecord[0].id,
        });
      }

      return watchRecord;
    });
    
    res.status(201).json({
      success: true,
      data: {
        watchRecord: result[0],
        pointsEarned,
        isCompleted
      },
      message: isCompleted ? "Ad watched successfully, points earned!" : "Ad watch recorded"
    });
  } catch (err) {
    console.error("Error recording ad watch:", err);
    res.status(500).json({
      success: false,
      error: "INTERNAL_ERROR",
      message: "Failed to record watch"
    });
  }
});

// ===== Parent Ads APIs =====

// GET: الحصول على قائمة الإعلانات النشطة للآباء
router.get("/parent/ads", authMiddleware, async (req, res) => {
  try {
    const now = new Date();
    
    const ads = await db
      .select()
      .from(parentAds)
      .where(eq(parentAds.isActive, true))
      .orderBy(desc(parentAds.priority), desc(parentAds.createdAt));
    
    // فلترة حسب المواعيد
    const activeAds = ads.filter((ad: any) => {
      if (ad.startDate && now < ad.startDate) return false;
      if (ad.endDate && now > ad.endDate) return false;
      return true;
    });
    
    res.json({
      success: true,
      data: activeAds,
      count: activeAds.length
    });
  } catch (err) {
    console.error("Error fetching parent ads:", err);
    res.status(500).json({
      success: false,
      error: "INTERNAL_ERROR",
      message: "Failed to fetch ads"
    });
  }
});

// GET: الحصول على تفاصيل إعلان محدد للآباء
router.get("/parent/ads/:adId", authMiddleware, async (req, res) => {
  try {
    const { adId } = req.params;
    
    const ad = await db
      .select()
      .from(parentAds)
      .where(eq(parentAds.id, adId));
    
    if (ad.length === 0) {
      return res.status(404).json({
        success: false,
        error: "NOT_FOUND",
        message: "Ad not found"
      });
    }
    
    res.json({
      success: true,
      data: ad[0]
    });
  } catch (err) {
    console.error("Error fetching parent ad:", err);
    res.status(500).json({
      success: false,
      error: "INTERNAL_ERROR",
      message: "Failed to fetch ad"
    });
  }
});

// POST: تسجيل مشاهدة إعلان من الأب
router.post("/parent/ads/:adId/watch", authMiddleware, async (req, res) => {
  try {
    const { adId } = req.params;
    const parentId = (req.user as any).parentId;
    
    // تسجيل المشاهدة (للآباء لا يوجد نقاط عادة)
    const watchRecord = await db
      .insert(adWatchHistory)
      .values({
        parentId,
        adId,
        adType: "parent",
        watchedDuration: 0,
        pointsEarned: 0,
        isCompleted: true
      })
      .returning();
    
    res.status(201).json({
      success: true,
      data: watchRecord[0],
      message: "Ad view recorded"
    });
  } catch (err) {
    console.error("Error recording parent ad watch:", err);
    res.status(500).json({
      success: false,
      error: "INTERNAL_ERROR",
      message: "Failed to record view"
    });
  }
});

// ===== Admin Ads Management APIs =====

// POST: إضافة إعلان جديد للأطفال (Admin only)
router.post("/admin/ads/child", adminMiddleware, async (req, res) => {
  try {
    const {
      title,
      description,
      content,
      contentType,
      mediaUrl,
      linkUrl,
      htmlCode,
      pointsReward,
      watchDurationSeconds,
      priority,
      startDate,
      endDate
    } = req.body;
    
    if (!title || !content || !contentType) {
      return res.status(400).json({
        success: false,
        error: "INVALID_INPUT",
        message: "title, content, and contentType are required"
      });
    }
    
    const newAd = await db
      .insert(childAds)
      .values({
        title,
        description,
        content,
        contentType,
        mediaUrl,
        linkUrl,
        htmlCode,
        pointsReward: pointsReward || 10,
        watchDurationSeconds: watchDurationSeconds || 30,
        priority: priority || 0,
        startDate: startDate ? new Date(startDate) : null,
        endDate: endDate ? new Date(endDate) : null,
        isActive: true
      })
      .returning();
    
    res.status(201).json({
      success: true,
      data: newAd[0],
      message: "Child ad created successfully"
    });
  } catch (err) {
    console.error("Error creating child ad:", err);
    res.status(500).json({
      success: false,
      error: "INTERNAL_ERROR",
      message: "Failed to create ad"
    });
  }
});

// POST: إضافة إعلان جديد للآباء (Admin only)
router.post("/admin/ads/parent", adminMiddleware, async (req, res) => {
  try {
    const {
      title,
      description,
      content,
      contentType,
      mediaUrl,
      linkUrl,
      htmlCode,
      priority,
      startDate,
      endDate
    } = req.body;
    
    if (!title || !content || !contentType) {
      return res.status(400).json({
        success: false,
        error: "INVALID_INPUT",
        message: "title, content, and contentType are required"
      });
    }
    
    const newAd = await db
      .insert(parentAds)
      .values({
        title,
        description,
        content,
        contentType,
        mediaUrl,
        linkUrl,
        htmlCode,
        priority: priority || 0,
        startDate: startDate ? new Date(startDate) : null,
        endDate: endDate ? new Date(endDate) : null,
        isActive: true
      })
      .returning();
    
    res.status(201).json({
      success: true,
      data: newAd[0],
      message: "Parent ad created successfully"
    });
  } catch (err) {
    console.error("Error creating parent ad:", err);
    res.status(500).json({
      success: false,
      error: "INTERNAL_ERROR",
      message: "Failed to create ad"
    });
  }
});

// PUT: تحديث إعلان (Admin only)
router.put("/admin/ads/:adId", adminMiddleware, async (req, res) => {
  try {
    const { adId } = req.params;
    const { adType, ...updateData } = req.body;
    
    if (!adType || !["child", "parent"].includes(adType)) {
      return res.status(400).json({
        success: false,
        error: "INVALID_INPUT",
        message: "adType must be 'child' or 'parent'"
      });
    }
    
    const table = adType === "child" ? childAds : parentAds;
    
    const updated = await db
      .update(table)
      .set({
        ...updateData,
        updatedAt: new Date()
      })
      .where(eq(table.id, adId))
      .returning();
    
    if (updated.length === 0) {
      return res.status(404).json({
        success: false,
        error: "NOT_FOUND",
        message: "Ad not found"
      });
    }
    
    res.json({
      success: true,
      data: updated[0],
      message: "Ad updated successfully"
    });
  } catch (err) {
    console.error("Error updating ad:", err);
    res.status(500).json({
      success: false,
      error: "INTERNAL_ERROR",
      message: "Failed to update ad"
    });
  }
});

// DELETE: حذف إعلان (Admin only)
router.delete("/admin/ads/:adId", adminMiddleware, async (req, res) => {
  try {
    const { adId } = req.params;
    const { adType } = req.body;
    
    if (!adType || !["child", "parent"].includes(adType)) {
      return res.status(400).json({
        success: false,
        error: "INVALID_INPUT",
        message: "adType must be 'child' or 'parent'"
      });
    }
    
    const table = adType === "child" ? childAds : parentAds;
    
    const deleted = await db
      .delete(table)
      .where(eq(table.id, adId))
      .returning();
    
    if (deleted.length === 0) {
      return res.status(404).json({
        success: false,
        error: "NOT_FOUND",
        message: "Ad not found"
      });
    }
    
    res.json({
      success: true,
      message: "Ad deleted successfully"
    });
  } catch (err) {
    console.error("Error deleting ad:", err);
    res.status(500).json({
      success: false,
      error: "INTERNAL_ERROR",
      message: "Failed to delete ad"
    });
  }
});

// GET: إحصائيات مشاهدة الإعلانات (Admin only)
router.get("/admin/ads/stats", adminMiddleware, async (req, res) => {
  try {
    const watchHistory = await db.select().from(adWatchHistory);
    
    const stats = {
      totalViews: watchHistory.length,
      totalPointsDistributed: watchHistory.reduce((sum: number, h: any) => sum + (h.pointsEarned || 0), 0),
      childAdViews: watchHistory.filter((h: any) => h.adType === "child").length,
      parentAdViews: watchHistory.filter((h: any) => h.adType === "parent").length,
      completedViews: watchHistory.filter((h: any) => h.isCompleted).length,
      incompleteViews: watchHistory.filter((h: any) => !h.isCompleted).length
    };
    
    res.json({
      success: true,
      data: stats
    });
  } catch (err) {
    console.error("Error fetching ad stats:", err);
    res.status(500).json({
      success: false,
      error: "INTERNAL_ERROR",
      message: "Failed to fetch statistics"
    });
  }
});

export default router;
