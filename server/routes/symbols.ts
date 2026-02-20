import type { Express } from "express";
import { storage } from "../storage";
import { symbolCategories, librarySymbols } from "../../shared/schema";
import { eq, and, or, ilike, sql, asc, desc, inArray } from "drizzle-orm";
import { authMiddleware } from "./middleware";
import { successResponse, errorResponse, ErrorCode } from "../utils/apiResponse";

export function registerSymbolRoutes(app: Express) {
  const db = storage.db;

  // Get all categories
  app.get("/api/symbols/categories", async (_req, res) => {
    try {
      const cats = await db.select().from(symbolCategories)
        .where(eq(symbolCategories.isActive, true))
        .orderBy(asc(symbolCategories.sortOrder));
      res.json(successResponse(cats));
    } catch (err: any) {
      console.error("Get symbol categories error:", err);
      res.status(500).json(errorResponse(ErrorCode.INTERNAL_SERVER_ERROR, "خطأ في جلب فئات الرموز"));
    }
  });

  // Get symbols by category (with pagination)
  app.get("/api/symbols", async (req, res) => {
    try {
      const { category, q, page = "1", limit = "100" } = req.query;
      const pageNum = Math.max(1, parseInt(page as string) || 1);
      const limitNum = Math.min(200, Math.max(1, parseInt(limit as string) || 100));
      const offset = (pageNum - 1) * limitNum;

      const conditions: any[] = [eq(librarySymbols.isActive, true)];

      if (category && category !== "all") {
        conditions.push(eq(librarySymbols.categoryId, category as string));
      }

      if (q && typeof q === "string" && q.trim().length >= 1) {
        const search = `%${q.trim()}%`;
        conditions.push(
          or(
            ilike(librarySymbols.nameAr, search),
            ilike(librarySymbols.nameEn, search),
            ilike(librarySymbols.char, search),
            sql`EXISTS (SELECT 1 FROM jsonb_array_elements_text(${librarySymbols.tags}::jsonb) t WHERE t ILIKE ${search})`
          )
        );
      }

      const [items, countResult] = await Promise.all([
        db.select().from(librarySymbols)
          .where(and(...conditions))
          .orderBy(asc(librarySymbols.sortOrder), asc(librarySymbols.nameEn))
          .limit(limitNum)
          .offset(offset),
        db.select({ count: sql<number>`count(*)::int` }).from(librarySymbols)
          .where(and(...conditions)),
      ]);

      res.json(successResponse({
        symbols: items,
        total: countResult[0]?.count || 0,
        page: pageNum,
        limit: limitNum,
        hasMore: offset + items.length < (countResult[0]?.count || 0),
      }));
    } catch (err: any) {
      console.error("Get symbols error:", err);
      res.status(500).json(errorResponse(ErrorCode.INTERNAL_SERVER_ERROR, "خطأ في جلب الرموز"));
    }
  });

  // Search symbols (lightweight autocomplete endpoint)
  app.get("/api/symbols/search", async (req, res) => {
    try {
      const { q, limit = "30" } = req.query;
      const limitNum = Math.min(50, Math.max(1, parseInt(limit as string) || 30));

      if (!q || typeof q !== "string" || q.trim().length < 1) {
        return res.json(successResponse([]));
      }

      const search = `%${q.trim()}%`;
      const results = await db.select({
        id: librarySymbols.id,
        char: librarySymbols.char,
        nameAr: librarySymbols.nameAr,
        nameEn: librarySymbols.nameEn,
        categoryId: librarySymbols.categoryId,
        imageUrl: librarySymbols.imageUrl,
        price: librarySymbols.price,
        isPremium: librarySymbols.isPremium,
      }).from(librarySymbols)
        .where(and(
          eq(librarySymbols.isActive, true),
          or(
            ilike(librarySymbols.nameAr, search),
            ilike(librarySymbols.nameEn, search),
            ilike(librarySymbols.char, search),
            sql`EXISTS (SELECT 1 FROM jsonb_array_elements_text(${librarySymbols.tags}::jsonb) t WHERE t ILIKE ${search})`
          )
        ))
        .orderBy(asc(librarySymbols.sortOrder))
        .limit(limitNum);

      res.json(successResponse(results));
    } catch (err: any) {
      console.error("Search symbols error:", err);
      res.status(500).json(errorResponse(ErrorCode.INTERNAL_SERVER_ERROR, "خطأ في البحث"));
    }
  });

  // Admin: Add library symbol
  app.post("/api/admin/library-symbols", authMiddleware, async (req: any, res) => {
    try {
      const { categoryId, char, nameAr, nameEn, tags, imageUrl, price, isPremium } = req.body;
      if (!categoryId || !char || !nameAr || !nameEn) {
        return res.status(400).json(errorResponse(ErrorCode.BAD_REQUEST, "جميع الحقول مطلوبة"));
      }
      const [sym] = await db.insert(librarySymbols).values({
        categoryId, char, nameAr, nameEn,
        tags: tags || [],
        imageUrl: imageUrl || null,
        price: price || 0,
        isPremium: isPremium || false,
      }).returning();
      res.json(successResponse(sym));
    } catch (err: any) {
      console.error("Add library symbol error:", err);
      res.status(500).json(errorResponse(ErrorCode.INTERNAL_SERVER_ERROR, "خطأ في إضافة الرمز"));
    }
  });

  // Admin: Update library symbol
  app.patch("/api/admin/library-symbols/:id", authMiddleware, async (req: any, res) => {
    try {
      const { id } = req.params;
      const updates: any = {};
      const allowed = ["categoryId", "char", "nameAr", "nameEn", "tags", "imageUrl", "price", "isPremium", "isActive", "sortOrder"];
      for (const key of allowed) {
        if (req.body[key] !== undefined) updates[key] = req.body[key];
      }
      const [sym] = await db.update(librarySymbols).set(updates).where(eq(librarySymbols.id, id)).returning();
      if (!sym) return res.status(404).json(errorResponse(ErrorCode.NOT_FOUND, "الرمز غير موجود"));
      res.json(successResponse(sym));
    } catch (err: any) {
      console.error("Update library symbol error:", err);
      res.status(500).json(errorResponse(ErrorCode.INTERNAL_SERVER_ERROR, "خطأ في تحديث الرمز"));
    }
  });

  // Admin: Delete library symbol
  app.delete("/api/admin/library-symbols/:id", authMiddleware, async (req: any, res) => {
    try {
      const { id } = req.params;
      await db.delete(librarySymbols).where(eq(librarySymbols.id, id));
      res.json(successResponse({ deleted: true }));
    } catch (err: any) {
      console.error("Delete library symbol error:", err);
      res.status(500).json(errorResponse(ErrorCode.INTERNAL_SERVER_ERROR, "خطأ في حذف الرمز"));
    }
  });

  // Admin: Bulk import library symbols
  app.post("/api/admin/library-symbols/bulk-import", authMiddleware, async (req: any, res) => {
    try {
      const { symbols: syms } = req.body;
      if (!Array.isArray(syms) || syms.length === 0) {
        return res.status(400).json(errorResponse(ErrorCode.BAD_REQUEST, "لا توجد رموز للاستيراد"));
      }

      const values = syms.map((s: any, i: number) => ({
        categoryId: s.categoryId,
        char: s.char,
        nameAr: s.nameAr || s.char,
        nameEn: s.nameEn || s.char,
        tags: s.tags || [],
        imageUrl: s.imageUrl || null,
        price: s.price || 0,
        isPremium: s.isPremium || false,
        sortOrder: s.sortOrder ?? i,
      }));

      // Batch insert in chunks of 100
      let inserted = 0;
      for (let i = 0; i < values.length; i += 100) {
        const chunk = values.slice(i, i + 100);
        const result = await db.insert(librarySymbols).values(chunk).returning({ id: librarySymbols.id });
        inserted += result.length;
      }

      res.json(successResponse({ imported: inserted }));
    } catch (err: any) {
      console.error("Bulk import library symbols error:", err);
      res.status(500).json(errorResponse(ErrorCode.INTERNAL_SERVER_ERROR, "خطأ في استيراد الرموز"));
    }
  });

  // Admin: Add category  
  app.post("/api/admin/symbol-categories", authMiddleware, async (req: any, res) => {
    try {
      const { slug, nameAr, nameEn, icon, sortOrder } = req.body;
      if (!slug || !nameAr || !nameEn) {
        return res.status(400).json(errorResponse(ErrorCode.BAD_REQUEST, "جميع الحقول مطلوبة"));
      }
      const [cat] = await db.insert(symbolCategories).values({
        slug, nameAr, nameEn,
        icon: icon || null,
        sortOrder: sortOrder || 0,
      }).returning();
      res.json(successResponse(cat));
    } catch (err: any) {
      console.error("Add symbol category error:", err);
      res.status(500).json(errorResponse(ErrorCode.INTERNAL_SERVER_ERROR, "خطأ في إضافة الفئة"));
    }
  });
}
