import { Router } from "express";
import { storage } from "../storage";
import { successResponse, errorResponse, ErrorCode } from "../utils/apiResponse";
import { authMiddleware, adminMiddleware } from "./middleware";
import {
  parentChildLinkingCodes,
  parentParentSync,
  parentChild,
  parents,
  children
} from "../../shared/schema";
import { eq, and } from "drizzle-orm";
// Type declarations for `qrcode` are not present in the repo; silence TypeScript here
// @ts-ignore
import QRCode from "qrcode";
import crypto from "crypto";

const router = Router();
const db = storage.db;

// ===== Parent-Child Linking APIs =====

// POST: إنشاء رمز ربط للأب (لربط الطفل أو الأب الآخر)
router.post("/parent/generate-linking-code", authMiddleware, async (req, res) => {
  try {
    const parentId = (req.user as any).parentId;
    
    // إنشاء رمز عشوائي فريد
    let code = crypto.randomBytes(5).toString("hex").toUpperCase().slice(0, 10);
    
    // التحقق من أن الرمز فريد
    let isUnique = false;
    while (!isUnique) {
      const existing = await db
        .select()
        .from(parentChildLinkingCodes)
        .where(eq(parentChildLinkingCodes.code, code));
      
      if (existing.length === 0) {
        isUnique = true;
      } else {
        code = crypto.randomBytes(5).toString("hex").toUpperCase().slice(0, 10);
      }
    }
    
    // إنشاء QR code
    const deepLink = `${process.env.APP_URL || "https://classify.app"}/link?code=${code}`;
    const qrCodeUrl = await QRCode.toDataURL(deepLink);
    
    // حفظ الرمز في قاعدة البيانات (ينتهي بعد 24 ساعة)
    const expiresAt = new Date();
    expiresAt.setHours(expiresAt.getHours() + 24);
    
    const linkingCode = await db
      .insert(parentChildLinkingCodes)
      .values({
        parentId,
        code,
        qrCodeUrl,
        expiresAt
      })
      .returning();
    
    res.status(201).json({
      success: true,
      data: {
        code: linkingCode[0].code,
        qrCodeUrl: linkingCode[0].qrCodeUrl,
        expiresAt: linkingCode[0].expiresAt
      },
      message: "Linking code generated successfully"
    });
  } catch (err) {
    console.error("Error generating linking code:", err);
    res.status(500).json({
      success: false,
      error: "INTERNAL_ERROR",
      message: "Failed to generate linking code"
    });
  }
});

// GET: الحصول على رموز الربط السارية للأب
router.get("/parent/linking-codes", authMiddleware, async (req, res) => {
  try {
    const parentId = (req.user as any).parentId;
    
    const codes = await db
      .select()
      .from(parentChildLinkingCodes)
      .where(
        and(
          eq(parentChildLinkingCodes.parentId, parentId),
          eq(parentChildLinkingCodes.isUsed, false)
        )
      );
    
    // فلترة الرموز غير المنتهية
    const activeCodes = codes.filter((c: any) => c.expiresAt && new Date() < c.expiresAt);
    
    res.json({
      success: true,
      data: activeCodes,
      count: activeCodes.length
    });
  } catch (err) {
    console.error("Error fetching linking codes:", err);
    res.status(500).json({
      success: false,
      error: "INTERNAL_ERROR",
      message: "Failed to fetch linking codes"
    });
  }
});

// POST: ربط طفل باستخدام الرمز (من قبل الأب)
router.post("/parent/link-child", authMiddleware, async (req, res) => {
  try {
    const { childId, code } = req.body;
    const parentId = (req.user as any).parentId;
    
    if (!childId || !code) {
      return res.status(400).json({
        success: false,
        error: "INVALID_INPUT",
        message: "childId and code are required"
      });
    }
    
    // التحقق من أن الطفل موجود
    const child = await db
      .select()
      .from(children)
      .where(eq(children.id, childId));
    
    if (child.length === 0) {
      return res.status(404).json({
        success: false,
        error: "NOT_FOUND",
        message: "Child not found"
      });
    }
    
    // التحقق من الربط الموجود
    const existingLink = await db
      .select()
      .from(parentChild)
      .where(
        and(
          eq(parentChild.parentId, parentId),
          eq(parentChild.childId, childId)
        )
      );
    
    if (existingLink.length > 0) {
      return res.status(400).json({
        success: false,
        error: "ALREADY_LINKED",
        message: "Child is already linked to this parent"
      });
    }
    
    // إضافة الربط
    const newLink = await db
      .insert(parentChild)
      .values({
        parentId,
        childId
      })
      .returning();
    
    res.status(201).json({
      success: true,
      data: newLink[0],
      message: "Child linked successfully"
    });
  } catch (err) {
    console.error("Error linking child:", err);
    res.status(500).json({
      success: false,
      error: "INTERNAL_ERROR",
      message: "Failed to link child"
    });
  }
});

// ===== Parent-Parent Sync APIs (لربط الأب والأم) =====

// POST: الأب الثاني يوافق على مشاركة البيانات باستخدام الرمز
router.post("/parent/sync-with-code", authMiddleware, async (req, res) => {
  try {
    const { code } = req.body;
    const secondaryParentId = (req.user as any).parentId;
    
    if (!code) {
      return res.status(400).json({
        success: false,
        error: "INVALID_INPUT",
        message: "code is required"
      });
    }
    
    // البحث عن الرمز
    const linkingCode = await db
      .select()
      .from(parentChildLinkingCodes)
      .where(eq(parentChildLinkingCodes.code, code));
    
    if (linkingCode.length === 0 || linkingCode[0].isUsed) {
      return res.status(404).json({
        success: false,
        error: "INVALID_CODE",
        message: "Code not found or already used"
      });
    }
    
    // التحقق من انتهاء الرمز
    if (linkingCode[0].expiresAt && new Date() > linkingCode[0].expiresAt) {
      return res.status(400).json({
        success: false,
        error: "CODE_EXPIRED",
        message: "Code has expired"
      });
    }
    
    const primaryParentId = linkingCode[0].parentId;
    
    // التحقق من أن الأبوين ليسا نفس الشخص
    if (primaryParentId === secondaryParentId) {
      return res.status(400).json({
        success: false,
        error: "SAME_PARENT",
        message: "Cannot sync with yourself"
      });
    }
    
    // الحصول على جميع أطفال الأب الأول
    const sharedChildren = await db
      .select()
      .from(parentChild)
      .where(eq(parentChild.parentId, primaryParentId));
    
    const childrenIds = sharedChildren.map((pc: any) => pc.childId);
    
    // إنشاء سجل المزامنة
    const syncRecord = await db
      .insert(parentParentSync)
      .values({
        primaryParentId,
        secondaryParentId,
        sharedChildren: childrenIds,
        syncStatus: "active"
      })
      .returning();
    
    // ربط جميع أطفال الأب الأول بالأب الثاني
    for (const childId of childrenIds) {
      const existingLink = await db
        .select()
        .from(parentChild)
        .where(
          and(
            eq(parentChild.parentId, secondaryParentId),
            eq(parentChild.childId, childId)
          )
        );
      
      if (existingLink.length === 0) {
        await db
          .insert(parentChild)
          .values({
            parentId: secondaryParentId,
            childId
          });
      }
    }
    
    // تحديث رمز الربط ليشير إلى أنه تم استخدامه
    await db
      .update(parentChildLinkingCodes)
      .set({
        isUsed: true,
        usedByParentId: secondaryParentId,
        usedAt: new Date()
      })
      .where(eq(parentChildLinkingCodes.id, linkingCode[0].id));
    
    res.status(201).json({
      success: true,
      data: {
        syncRecord: syncRecord[0],
        sharedChildrenCount: childrenIds.length
      },
      message: "Parents synced successfully, all children data shared"
    });
  } catch (err) {
    console.error("Error syncing parents:", err);
    res.status(500).json({
      success: false,
      error: "INTERNAL_ERROR",
      message: "Failed to sync parents"
    });
  }
});

// GET: الحصول على حالة المزامنة للأب
router.get("/parent/sync-status", authMiddleware, async (req, res) => {
  try {
    const parentId = (req.user as any).parentId;
    
    const syncRecords = await db
      .select()
      .from(parentParentSync)
      .where(
        eq(parentParentSync.primaryParentId, parentId)
      );
    
    // الحصول على البيانات الإضافية
    const syncData = await Promise.all(
      syncRecords.map(async (record: any) => {
        const secondaryParent = await db
          .select()
          .from(parents)
          .where(eq(parents.id, record.secondaryParentId));
        
        return {
          ...record,
          secondaryParentName: secondaryParent[0]?.name || "Unknown"
        };
      })
    );
    
    res.json({
      success: true,
      data: syncData,
      count: syncData.length
    });
  } catch (err) {
    console.error("Error fetching sync status:", err);
    res.status(500).json({
      success: false,
      error: "INTERNAL_ERROR",
      message: "Failed to fetch sync status"
    });
  }
});

// PUT: إلغاء المزامنة بين أبوين
router.put("/parent/sync/:syncId/revoke", authMiddleware, async (req, res) => {
  try {
    const { syncId } = req.params;
    const parentId = (req.user as any).parentId;
    
    // التحقق من أن الأب هو صاحب السجل
    const sync = await db
      .select()
      .from(parentParentSync)
      .where(eq(parentParentSync.id, syncId));
    
    if (sync.length === 0) {
      return res.status(404).json({
        success: false,
        error: "NOT_FOUND",
        message: "Sync record not found"
      });
    }
    
    if (sync[0].primaryParentId !== parentId) {
      return res.status(403).json({
        success: false,
        error: "FORBIDDEN",
        message: "Only the primary parent can revoke sync"
      });
    }
    
    // تحديث حالة المزامنة
    const updated = await db
      .update(parentParentSync)
      .set({ syncStatus: "revoked" })
      .where(eq(parentParentSync.id, syncId))
      .returning();
    
    res.json({
      success: true,
      data: updated[0],
      message: "Sync revoked successfully"
    });
  } catch (err) {
    console.error("Error revoking sync:", err);
    res.status(500).json({
      success: false,
      error: "INTERNAL_ERROR",
      message: "Failed to revoke sync"
    });
  }
});

export default router;
