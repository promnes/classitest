import type { Express, Request, Response, NextFunction } from "express";
import { storage } from "../storage";
import { z } from "zod";
import { 
  libraries, 
  libraryProducts, 
  libraryReferrals, 
  libraryActivityLogs,
  libraryReferralSettings,
} from "../../shared/schema";
import { eq, desc, and, sql, like, or } from "drizzle-orm";
import jwt from "jsonwebtoken";
import bcrypt from "bcrypt";
import { createPresignedUpload, finalizeUpload } from "../services/uploadService";
import { finalizeUploadSchema } from "../../shared/media";

const db = storage.db;
const JWT_SECRET = process.env.JWT_SECRET ?? "";

if (!JWT_SECRET) {
  throw new Error("CRITICAL: JWT_SECRET environment variable is required. Library authentication cannot start without it.");
}

interface LibraryRequest extends Request {
  library?: { libraryId: string };
}

const libraryMiddleware = async (req: LibraryRequest, res: Response, next: NextFunction) => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      return res.status(401).json({ message: "Unauthorized" });
    }
    
    const token = authHeader.split(" ")[1];
    const decoded = jwt.verify(token, JWT_SECRET) as { libraryId: string; type: string; exp?: number };
    
    if (decoded.type !== "library") {
      return res.status(401).json({ message: "Invalid token type" });
    }
    
    if (decoded.exp && decoded.exp < Date.now() / 1000) {
      return res.status(401).json({ message: "Token expired" });
    }
    
    const library = await db.select().from(libraries).where(eq(libraries.id, decoded.libraryId));
    if (!library[0] || !library[0].isActive) {
      return res.status(401).json({ message: "Library account is deactivated" });
    }
    
    req.library = { libraryId: decoded.libraryId };
    next();
  } catch (error) {
    return res.status(401).json({ message: "Invalid token" });
  }
};

async function logActivity(libraryId: string, action: string, points: number, metadata?: Record<string, any>) {
  await db.insert(libraryActivityLogs).values({
    libraryId,
    action,
    points,
    metadata: metadata || null,
  });
  
  await db.update(libraries)
    .set({
      activityScore: sql`${libraries.activityScore} + ${points}`,
      updatedAt: new Date(),
    })
    .where(eq(libraries.id, libraryId));
}

export async function registerLibraryRoutes(app: Express) {
  
  app.post("/api/library/login", async (req, res) => {
    try {
      const { username, password } = req.body;
      
      if (!username || !password) {
        return res.status(400).json({ message: "اسم المستخدم وكلمة المرور مطلوبان" });
      }
      
      const library = await db.select().from(libraries).where(eq(libraries.username, username));
      if (!library[0]) {
        return res.status(401).json({ message: "بيانات الدخول غير صحيحة" });
      }
      
      if (!library[0].isActive) {
        return res.status(401).json({ message: "الحساب غير نشط" });
      }
      
      const passwordMatch = await bcrypt.compare(password, library[0].password);
      if (!passwordMatch) {
        return res.status(401).json({ message: "بيانات الدخول غير صحيحة" });
      }
      
      const token = jwt.sign(
        { libraryId: library[0].id, type: "library" },
        JWT_SECRET,
        { expiresIn: "30d" }
      );
      
      res.json({ 
        success: true,
        token, 
        library: {
          id: library[0].id,
          name: library[0].name,
          imageUrl: library[0].imageUrl,
          referralCode: library[0].referralCode,
        }
      });
    } catch (error: any) {
      console.error("Library login error:", error);
      res.status(500).json({ message: "فشل تسجيل الدخول" });
    }
  });

  app.get("/api/library/profile", libraryMiddleware, async (req: LibraryRequest, res) => {
    try {
      const libraryId = req.library!.libraryId;
      const library = await db.select().from(libraries).where(eq(libraries.id, libraryId));
      
      if (!library[0]) {
        return res.status(404).json({ message: "Library not found" });
      }
      
      const { password, ...safeLibrary } = library[0];
      
      const productsCount = await db.select().from(libraryProducts).where(eq(libraryProducts.libraryId, libraryId));
      const referralsCount = await db.select().from(libraryReferrals).where(eq(libraryReferrals.libraryId, libraryId));
      
      res.json({ 
        success: true, 
        data: {
          ...safeLibrary,
          stats: {
            productsCount: productsCount.length,
            referralsCount: referralsCount.length,
            convertedReferrals: referralsCount.filter((r: typeof libraryReferrals.$inferSelect) => r.status === "purchased").length,
          }
        }
      });
    } catch (error: any) {
      console.error("Get library profile error:", error);
      res.status(500).json({ message: "Failed to fetch profile" });
    }
  });

  app.post("/api/library/uploads/presign", libraryMiddleware, async (req: LibraryRequest, res) => {
    try {
      const body = z
        .object({
          contentType: z.string().min(1),
          size: z.number().int().positive(),
          purpose: z.string().min(1),
          originalName: z.string().min(1),
        })
        .parse(req.body);

      const result = await createPresignedUpload({
        actor: { type: "parent", id: req.library!.libraryId },
        purpose: body.purpose,
        contentType: body.contentType,
        size: body.size,
      });

      res.json({ success: true, data: result });
    } catch (error: any) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ success: false, message: error.message });
      }
      if (error?.message === "POLICY_REJECTED_MIME" || error?.message === "POLICY_REJECTED_SIZE") {
        return res.status(400).json({ success: false, message: error.message });
      }
      console.error("Library upload presign error:", error);
      res.status(500).json({ success: false, message: "فشل إنشاء رابط الرفع" });
    }
  });

  app.post("/api/library/uploads/finalize", libraryMiddleware, async (req: LibraryRequest, res) => {
    try {
      const body = finalizeUploadSchema.parse(req.body);
      const media = await finalizeUpload({
        actor: { type: "parent", id: req.library!.libraryId },
        input: body,
      });

      res.json({ success: true, data: media });
    } catch (error: any) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ success: false, message: error.message });
      }
      if (error?.message === "POLICY_REJECTED_MIME" || error?.message === "POLICY_REJECTED_SIZE") {
        return res.status(400).json({ success: false, message: error.message });
      }
      console.error("Library upload finalize error:", error);
      res.status(500).json({ success: false, message: "فشل تأكيد رفع الملف" });
    }
  });

  app.put("/api/library/uploads/proxy", libraryMiddleware, async (req: LibraryRequest, res) => {
    try {
      const uploadURL = String(req.headers["x-upload-url"] || "").trim();
      if (!uploadURL) {
        return res.status(400).json({ success: false, message: "رابط الرفع مطلوب" });
      }

      let parsed: URL;
      try {
        parsed = new URL(uploadURL);
      } catch {
        return res.status(400).json({ success: false, message: "رابط رفع غير صالح" });
      }

      const allowedHosts = new Set<string>([
        "127.0.0.1",
        "localhost",
        "minio",
        String(process.env.MINIO_ENDPOINT || "").trim(),
      ].filter(Boolean));

      if (!allowedHosts.has(parsed.hostname)) {
        return res.status(400).json({ success: false, message: "نطاق رابط الرفع غير مسموح" });
      }

      const upstreamRes = await fetch(uploadURL, {
        method: "PUT",
        headers: {
          "Content-Type": String(req.headers["content-type"] || "application/octet-stream"),
          ...(req.headers["content-length"] ? { "Content-Length": String(req.headers["content-length"]) } : {}),
        },
        body: req as any,
        duplex: "half" as any,
      });

      if (!upstreamRes.ok) {
        const details = await upstreamRes.text().catch(() => "");
        return res.status(502).json({
          success: false,
          message: "فشل رفع الملف إلى التخزين",
          details: details.slice(0, 500),
        });
      }

      return res.json({ success: true });
    } catch (error: any) {
      console.error("Library upload proxy error:", error);
      return res.status(500).json({ success: false, message: "فشل رفع الملف عبر الخادم" });
    }
  });

  app.get("/api/library/products", libraryMiddleware, async (req: LibraryRequest, res) => {
    try {
      const libraryId = req.library!.libraryId;
      const products = await db.select().from(libraryProducts)
        .where(eq(libraryProducts.libraryId, libraryId))
        .orderBy(desc(libraryProducts.createdAt));
      
      res.json({ success: true, data: products });
    } catch (error: any) {
      console.error("Get library products error:", error);
      res.status(500).json({ message: "Failed to fetch products" });
    }
  });

  app.post("/api/library/products", libraryMiddleware, async (req: LibraryRequest, res) => {
    try {
      const libraryId = req.library!.libraryId;
      const { title, description, imageUrl, price, discountPercent, discountMinQuantity, stock } = req.body;
      
      if (!title || !price) {
        return res.status(400).json({ message: "العنوان والسعر مطلوبان" });
      }
      
      const product = await db.insert(libraryProducts).values({
        libraryId,
        title,
        description: description || null,
        imageUrl: imageUrl || null,
        price: price.toString(),
        discountPercent: discountPercent || 0,
        discountMinQuantity: discountMinQuantity || 1,
        stock: stock || 0,
      }).returning();
      
      await db.update(libraries).set({
        totalProducts: (await db.select().from(libraries).where(eq(libraries.id, libraryId)))[0].totalProducts + 1,
        updatedAt: new Date(),
      }).where(eq(libraries.id, libraryId));
      
      const settings = await db.select().from(libraryReferralSettings);
      const pointsToAdd = settings[0]?.pointsPerProductAdd || 5;
      await logActivity(libraryId, "product_added", pointsToAdd, { productId: product[0].id });
      
      res.json({ success: true, data: product[0] });
    } catch (error: any) {
      console.error("Create library product error:", error);
      res.status(500).json({ message: "Failed to create product" });
    }
  });

  app.put("/api/library/products/:id", libraryMiddleware, async (req: LibraryRequest, res) => {
    try {
      const libraryId = req.library!.libraryId;
      const { id } = req.params;
      const { title, description, imageUrl, price, discountPercent, discountMinQuantity, stock, isActive } = req.body;
      
      const product = await db.select().from(libraryProducts)
        .where(and(eq(libraryProducts.id, id), eq(libraryProducts.libraryId, libraryId)));
      
      if (!product[0]) {
        return res.status(404).json({ message: "المنتج غير موجود" });
      }
      
      const updates: any = { updatedAt: new Date() };
      if (title) updates.title = title;
      if (description !== undefined) updates.description = description;
      if (imageUrl !== undefined) updates.imageUrl = imageUrl;
      if (price) updates.price = price.toString();
      if (discountPercent !== undefined) updates.discountPercent = discountPercent;
      if (discountMinQuantity !== undefined) updates.discountMinQuantity = discountMinQuantity;
      if (stock !== undefined) updates.stock = stock;
      if (typeof isActive === "boolean") updates.isActive = isActive;
      
      const updated = await db.update(libraryProducts).set(updates)
        .where(eq(libraryProducts.id, id))
        .returning();
      
      await logActivity(libraryId, "product_updated", 1, { productId: id });
      
      res.json({ success: true, data: updated[0] });
    } catch (error: any) {
      console.error("Update library product error:", error);
      res.status(500).json({ message: "Failed to update product" });
    }
  });

  app.delete("/api/library/products/:id", libraryMiddleware, async (req: LibraryRequest, res) => {
    try {
      const libraryId = req.library!.libraryId;
      const { id } = req.params;
      
      const product = await db.select().from(libraryProducts)
        .where(and(eq(libraryProducts.id, id), eq(libraryProducts.libraryId, libraryId)));
      
      if (!product[0]) {
        return res.status(404).json({ message: "المنتج غير موجود" });
      }
      
      await db.delete(libraryProducts).where(eq(libraryProducts.id, id));
      
      await db.update(libraries).set({
        totalProducts: Math.max(0, (await db.select().from(libraries).where(eq(libraries.id, libraryId)))[0].totalProducts - 1),
        updatedAt: new Date(),
      }).where(eq(libraries.id, libraryId));
      
      res.json({ success: true, message: "تم حذف المنتج" });
    } catch (error: any) {
      console.error("Delete library product error:", error);
      res.status(500).json({ message: "Failed to delete product" });
    }
  });

  app.get("/api/library/referrals", libraryMiddleware, async (req: LibraryRequest, res) => {
    try {
      const libraryId = req.library!.libraryId;
      const referrals = await db.select().from(libraryReferrals)
        .where(eq(libraryReferrals.libraryId, libraryId))
        .orderBy(desc(libraryReferrals.createdAt));
      
      res.json({ success: true, data: referrals });
    } catch (error: any) {
      console.error("Get library referrals error:", error);
      res.status(500).json({ message: "Failed to fetch referrals" });
    }
  });

  app.get("/api/library/activity", libraryMiddleware, async (req: LibraryRequest, res) => {
    try {
      const libraryId = req.library!.libraryId;
      const logs = await db.select().from(libraryActivityLogs)
        .where(eq(libraryActivityLogs.libraryId, libraryId))
        .orderBy(desc(libraryActivityLogs.createdAt))
        .limit(100);
      
      res.json({ success: true, data: logs });
    } catch (error: any) {
      console.error("Get library activity error:", error);
      res.status(500).json({ message: "Failed to fetch activity" });
    }
  });

  app.get("/api/store/libraries", async (req, res) => {
    try {
      const page = Math.max(1, parseInt(req.query.page as string) || 1);
      const limit = Math.min(50, Math.max(1, parseInt(req.query.limit as string) || 20));
      const offset = (page - 1) * limit;
      
      const activeLibraries = await db.select({
        id: libraries.id,
        name: libraries.name,
        description: libraries.description,
        location: libraries.location,
        imageUrl: libraries.imageUrl,
        referralCode: libraries.referralCode,
        activityScore: libraries.activityScore,
        totalProducts: libraries.totalProducts,
      }).from(libraries)
        .where(eq(libraries.isActive, true))
        .orderBy(desc(libraries.activityScore))
        .limit(limit)
        .offset(offset);
      
      res.json({ success: true, data: activeLibraries, page, limit });
    } catch (error: any) {
      console.error("Get store libraries error:", error);
      res.status(500).json({ message: "Failed to fetch libraries" });
    }
  });

  app.get("/api/store/libraries/by-referral/:code", async (req, res) => {
    try {
      const { code } = req.params;

      if (!code || typeof code !== "string" || code.length > 64) {
        return res.status(400).json({ message: "Invalid referral code" });
      }

      const library = await db.select({
        id: libraries.id,
        name: libraries.name,
        description: libraries.description,
        location: libraries.location,
        imageUrl: libraries.imageUrl,
        referralCode: libraries.referralCode,
        activityScore: libraries.activityScore,
        totalProducts: libraries.totalProducts,
      }).from(libraries)
        .where(and(eq(libraries.referralCode, code.trim().toUpperCase()), eq(libraries.isActive, true)))
        .limit(1);

      if (!library[0]) {
        return res.status(404).json({ message: "Referral library not found" });
      }

      res.json({ success: true, data: library[0] });
    } catch (error: any) {
      console.error("Get library by referral code error:", error);
      res.status(500).json({ message: "Failed to fetch referral library" });
    }
  });

  app.get("/api/store/libraries/:id", async (req, res) => {
    try {
      const { id } = req.params;
      
      if (!id || typeof id !== 'string' || id.length > 50) {
        return res.status(400).json({ message: "Invalid library ID" });
      }
      
      const page = Math.max(1, parseInt(req.query.page as string) || 1);
      const limit = Math.min(50, Math.max(1, parseInt(req.query.limit as string) || 20));
      const offset = (page - 1) * limit;
      
      const library = await db.select({
        id: libraries.id,
        name: libraries.name,
        description: libraries.description,
        location: libraries.location,
        imageUrl: libraries.imageUrl,
        referralCode: libraries.referralCode,
        activityScore: libraries.activityScore,
        totalProducts: libraries.totalProducts,
      }).from(libraries)
        .where(and(eq(libraries.id, id), eq(libraries.isActive, true)));
      
      if (!library[0]) {
        return res.status(404).json({ message: "Library not found" });
      }
      
      const products = await db.select().from(libraryProducts)
        .where(and(eq(libraryProducts.libraryId, id), eq(libraryProducts.isActive, true)))
        .orderBy(desc(libraryProducts.createdAt))
        .limit(limit)
        .offset(offset);
      
      res.json({ 
        success: true, 
        data: {
          ...library[0],
          products,
        },
        page,
        limit
      });
    } catch (error: any) {
      console.error("Get store library error:", error);
      res.status(500).json({ message: "Failed to fetch library" });
    }
  });

  app.post("/api/store/libraries/:id/referral-click", async (req, res) => {
    try {
      const { id } = req.params;
      const { referralCode } = req.body;
      
      const library = await db.select().from(libraries).where(eq(libraries.id, id));
      if (!library[0]) {
        return res.status(404).json({ message: "Library not found" });
      }
      
      await db.insert(libraryReferrals).values({
        libraryId: id,
        referralCode: referralCode || library[0].referralCode,
        status: "clicked",
      });
      
      await logActivity(id, "referral_click", 1);
      
      res.json({ success: true });
    } catch (error: any) {
      console.error("Record referral click error:", error);
      res.status(500).json({ message: "Failed to record click" });
    }
  });
}
