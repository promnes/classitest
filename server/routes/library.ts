import type { Express, Request, Response, NextFunction } from "express";
import { storage } from "../storage";
import { z } from "zod";
import { 
  libraries, 
  libraryProducts, 
  libraryReferrals, 
  libraryActivityLogs,
  libraryReferralSettings,
  libraryOrders,
  libraryBalances,
  libraryWithdrawalRequests,
  libraryDailyInvoices,
  parents,
  notifications,
} from "../../shared/schema";
import { eq, desc, and, sql, like, or, lte } from "drizzle-orm";
import jwt from "jsonwebtoken";
import bcrypt from "bcrypt";
import { createPresignedUpload, finalizeUpload } from "../services/uploadService";
import { finalizeUploadSchema } from "../../shared/media";

const db = storage.db;
const JWT_SECRET = process.env["JWT_SECRET"] ?? "";

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
    if (!token) {
      return res.status(401).json({ message: "Unauthorized" });
    }

    const decoded = jwt.verify(token, JWT_SECRET) as unknown as { libraryId: string; type: string; exp?: number };
    
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

function generateDeliveryCode() {
  return Math.floor(100000 + Math.random() * 900000).toString();
}

async function ensureLibraryBalance(libraryId: string) {
  const rows = await db.select().from(libraryBalances).where(eq(libraryBalances.libraryId, libraryId)).limit(1);
  if (rows[0]) return rows[0];
  const created = await db.insert(libraryBalances).values({ libraryId }).returning();
  return created[0];
}

async function settleMaturedLibraryOrders(libraryId: string) {
  const now = new Date();
  const maturedOrders = await db.select().from(libraryOrders).where(
    and(
      eq(libraryOrders.libraryId, libraryId),
      eq(libraryOrders.status, "delivered"),
      eq(libraryOrders.isSettled, false),
      lte(libraryOrders.protectionExpiresAt, now),
    )
  );

  if (!maturedOrders.length) {
    return { maturedCount: 0, releasedAmount: 0 };
  }

  const releasedAmount = maturedOrders.reduce((sum: number, row: any) => sum + (parseFloat(String(row.libraryEarningAmount || "0")) || 0), 0);

  await db.transaction(async (tx: any) => {
    await tx
      .update(libraryOrders)
      .set({
        status: "completed",
        completedAt: now,
        isSettled: true,
        settledAt: now,
        updatedAt: now,
      })
      .where(
        and(
          eq(libraryOrders.libraryId, libraryId),
          eq(libraryOrders.status, "delivered"),
          eq(libraryOrders.isSettled, false),
          lte(libraryOrders.protectionExpiresAt, now),
        )
      );

    const existingBalance = await tx.select().from(libraryBalances).where(eq(libraryBalances.libraryId, libraryId)).limit(1);
    if (!existingBalance[0]) {
      await tx.insert(libraryBalances).values({
        libraryId,
        pendingBalance: "0.00",
        availableBalance: releasedAmount.toFixed(2),
      });
    } else {
      await tx
        .update(libraryBalances)
        .set({
          pendingBalance: sql`GREATEST(0, ${libraryBalances.pendingBalance} - ${releasedAmount.toFixed(2)})`,
          availableBalance: sql`${libraryBalances.availableBalance} + ${releasedAmount.toFixed(2)}`,
          updatedAt: now,
        })
        .where(eq(libraryBalances.libraryId, libraryId));
    }
  });

  return { maturedCount: maturedOrders.length, releasedAmount };
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
        String(process.env["MINIO_ENDPOINT"] || "").trim(),
      ].filter(Boolean));

      if (!allowedHosts.has(parsed.hostname)) {
        return res.status(400).json({ success: false, message: "نطاق رابط الرفع غير مسموح" });
      }

      const upstreamRequestInit: any = {
        method: "PUT",
        headers: {
          "Content-Type": String(req.headers["content-type"] || "application/octet-stream"),
          ...(req.headers["content-length"] ? { "Content-Length": String(req.headers["content-length"]) } : {}),
        },
        body: req as any,
        duplex: "half",
      };

      const upstreamRes = await fetch(uploadURL, upstreamRequestInit);

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
      
      const [currentLibrary] = await db.select().from(libraries).where(eq(libraries.id, libraryId));
      await db.update(libraries).set({
        totalProducts: (currentLibrary?.totalProducts ?? 0) + 1,
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

  app.get("/api/library/orders", libraryMiddleware, async (req: LibraryRequest, res) => {
    try {
      const libraryId = req.library!.libraryId;
      const rows = await db
        .select({
          order: libraryOrders,
          productTitle: libraryProducts.title,
          buyerName: parents.name,
          buyerEmail: parents.email,
        })
        .from(libraryOrders)
        .leftJoin(libraryProducts, eq(libraryOrders.libraryProductId, libraryProducts.id))
        .leftJoin(parents, eq(libraryOrders.buyerParentId, parents.id))
        .where(eq(libraryOrders.libraryId, libraryId))
        .orderBy(desc(libraryOrders.createdAt));

      res.json({
        success: true,
        data: rows.map((row: any) => ({
          ...row.order,
          productTitle: row.productTitle,
          buyerName: row.buyerName,
          buyerEmail: row.buyerEmail,
        })),
      });
    } catch (error: any) {
      console.error("Get library orders error:", error);
      res.status(500).json({ success: false, message: "Failed to fetch orders" });
    }
  });

  app.put("/api/library/orders/:id/ship", libraryMiddleware, async (req: LibraryRequest, res) => {
    try {
      const libraryId = req.library!.libraryId;
      const { id } = req.params;

      const rows = await db.select().from(libraryOrders).where(and(eq(libraryOrders.id, id), eq(libraryOrders.libraryId, libraryId))).limit(1);
      const order = rows[0];
      if (!order) {
        return res.status(404).json({ success: false, message: "Order not found" });
      }

      if (order.status !== "admin_confirmed") {
        return res.status(400).json({ success: false, message: "Order must be admin confirmed first" });
      }

      const deliveryCode = generateDeliveryCode();
      const now = new Date();
      const updated = await db
        .update(libraryOrders)
        .set({
          status: "shipped",
          shippedAt: now,
          deliveryCode,
          deliveryCodeSentAt: now,
          updatedAt: now,
        })
        .where(eq(libraryOrders.id, id))
        .returning();

      await db.insert(notifications).values({
        parentId: order.buyerParentId,
        type: "library_order_shipped",
        title: "تم شحن طلبك من المكتبة",
        message: `كود التسليم الخاص بطلبك هو: ${deliveryCode}`,
        relatedId: order.id,
        metadata: {
          orderId: order.id,
          deliveryCode,
        },
      });

      await logActivity(libraryId, "order_shipped", 0, { orderId: order.id });
      res.json({ success: true, data: updated[0], message: "Order marked as shipped and delivery code sent" });
    } catch (error: any) {
      console.error("Ship library order error:", error);
      res.status(500).json({ success: false, message: "Failed to mark order as shipped" });
    }
  });

  app.post("/api/library/orders/:id/verify-delivery", libraryMiddleware, async (req: LibraryRequest, res) => {
    try {
      const libraryId = req.library!.libraryId;
      const { id } = req.params;
      const { code } = req.body || {};

      if (!code || String(code).trim().length < 4) {
        return res.status(400).json({ success: false, message: "Delivery code is required" });
      }

      const rows = await db.select().from(libraryOrders).where(and(eq(libraryOrders.id, id), eq(libraryOrders.libraryId, libraryId))).limit(1);
      const order = rows[0];
      if (!order) {
        return res.status(404).json({ success: false, message: "Order not found" });
      }
      if (order.status !== "shipped") {
        return res.status(400).json({ success: false, message: "Order is not in shipped status" });
      }
      if (!order.deliveryCode || String(order.deliveryCode) !== String(code).trim()) {
        return res.status(400).json({ success: false, message: "Invalid delivery code" });
      }

      const deliveredAt = new Date();
      const protectionExpiresAt = new Date(deliveredAt.getTime() + (Number(order.holdDays || 15) * 24 * 60 * 60 * 1000));

      const updated = await db
        .update(libraryOrders)
        .set({
          status: "delivered",
          deliveredAt,
          deliveryCodeVerifiedAt: deliveredAt,
          protectionExpiresAt,
          updatedAt: deliveredAt,
        })
        .where(eq(libraryOrders.id, id))
        .returning();

      await ensureLibraryBalance(libraryId);
      await db
        .update(libraryBalances)
        .set({
          pendingBalance: sql`${libraryBalances.pendingBalance} + ${order.libraryEarningAmount}`,
          totalSalesAmount: sql`${libraryBalances.totalSalesAmount} + ${order.subtotal}`,
          totalCommissionAmount: sql`${libraryBalances.totalCommissionAmount} + ${order.commissionAmount}`,
          updatedAt: deliveredAt,
        })
        .where(eq(libraryBalances.libraryId, libraryId));

      const dayStart = new Date(deliveredAt);
      dayStart.setHours(0, 0, 0, 0);

      const invoices = await db
        .select()
        .from(libraryDailyInvoices)
        .where(and(eq(libraryDailyInvoices.libraryId, libraryId), eq(libraryDailyInvoices.invoiceDate, dayStart)))
        .limit(1);

      if (!invoices[0]) {
        await db.insert(libraryDailyInvoices).values({
          libraryId,
          invoiceDate: dayStart,
          totalOrders: 1,
          grossSalesAmount: String(order.subtotal || "0.00"),
          totalCommissionAmount: String(order.commissionAmount || "0.00"),
          netAmount: String(order.libraryEarningAmount || "0.00"),
          status: "pending",
        });
      } else {
        await db
          .update(libraryDailyInvoices)
          .set({
            totalOrders: sql`${libraryDailyInvoices.totalOrders} + 1`,
            grossSalesAmount: sql`${libraryDailyInvoices.grossSalesAmount} + ${order.subtotal}`,
            totalCommissionAmount: sql`${libraryDailyInvoices.totalCommissionAmount} + ${order.commissionAmount}`,
            netAmount: sql`${libraryDailyInvoices.netAmount} + ${order.libraryEarningAmount}`,
            updatedAt: deliveredAt,
          })
          .where(eq(libraryDailyInvoices.id, invoices[0].id));
      }

      await logActivity(libraryId, "order_delivered", 0, {
        orderId: order.id,
        holdDays: order.holdDays || 15,
      });

      res.json({ success: true, data: updated[0], message: "Delivery verified successfully" });
    } catch (error: any) {
      console.error("Verify library delivery code error:", error);
      res.status(500).json({ success: false, message: "Failed to verify delivery" });
    }
  });

  app.get("/api/library/balance", libraryMiddleware, async (req: LibraryRequest, res) => {
    try {
      const libraryId = req.library!.libraryId;
      await settleMaturedLibraryOrders(libraryId);

      const balance = await ensureLibraryBalance(libraryId);
      const pendingWithdrawals = await db
        .select()
        .from(libraryWithdrawalRequests)
        .where(and(eq(libraryWithdrawalRequests.libraryId, libraryId), eq(libraryWithdrawalRequests.status, "pending")))
        .orderBy(desc(libraryWithdrawalRequests.createdAt));

      res.json({
        success: true,
        data: {
          ...balance,
          pendingWithdrawals,
        },
      });
    } catch (error: any) {
      console.error("Get library balance error:", error);
      res.status(500).json({ success: false, message: "Failed to fetch balance" });
    }
  });

  app.post("/api/library/withdrawals", libraryMiddleware, async (req: LibraryRequest, res) => {
    try {
      const libraryId = req.library!.libraryId;
      const { amount, paymentMethod, paymentDetails } = req.body || {};

      const requestedAmount = parseFloat(String(amount || 0));
      if (!requestedAmount || requestedAmount <= 0) {
        return res.status(400).json({ success: false, message: "Invalid withdrawal amount" });
      }
      if (!paymentMethod) {
        return res.status(400).json({ success: false, message: "Payment method is required" });
      }

      await settleMaturedLibraryOrders(libraryId);
      const balance = await ensureLibraryBalance(libraryId);
      const available = parseFloat(String(balance.availableBalance || "0")) || 0;
      if (requestedAmount > available) {
        return res.status(400).json({ success: false, message: "Insufficient available balance" });
      }

      const now = new Date();
      const created = await db.transaction(async (tx: any) => {
        await tx
          .update(libraryBalances)
          .set({
            availableBalance: sql`${libraryBalances.availableBalance} - ${requestedAmount.toFixed(2)}`,
            updatedAt: now,
          })
          .where(eq(libraryBalances.libraryId, libraryId));

        const inserted = await tx.insert(libraryWithdrawalRequests).values({
          libraryId,
          amount: requestedAmount.toFixed(2),
          paymentMethod: String(paymentMethod),
          paymentDetails: paymentDetails || null,
          status: "pending",
          requestedAt: now,
        }).returning();

        return inserted[0];
      });

      res.json({ success: true, data: created, message: "Withdrawal request submitted" });
    } catch (error: any) {
      console.error("Create library withdrawal error:", error);
      res.status(500).json({ success: false, message: "Failed to create withdrawal request" });
    }
  });

  app.get("/api/library/withdrawals", libraryMiddleware, async (req: LibraryRequest, res) => {
    try {
      const libraryId = req.library!.libraryId;
      const rows = await db
        .select()
        .from(libraryWithdrawalRequests)
        .where(eq(libraryWithdrawalRequests.libraryId, libraryId))
        .orderBy(desc(libraryWithdrawalRequests.createdAt));
      res.json({ success: true, data: rows });
    } catch (error: any) {
      console.error("Get library withdrawals error:", error);
      res.status(500).json({ success: false, message: "Failed to fetch withdrawals" });
    }
  });

  app.get("/api/library/invoices/daily", libraryMiddleware, async (req: LibraryRequest, res) => {
    try {
      const libraryId = req.library!.libraryId;
      const rows = await db
        .select()
        .from(libraryDailyInvoices)
        .where(eq(libraryDailyInvoices.libraryId, libraryId))
        .orderBy(desc(libraryDailyInvoices.invoiceDate))
        .limit(60);
      res.json({ success: true, data: rows });
    } catch (error: any) {
      console.error("Get library daily invoices error:", error);
      res.status(500).json({ success: false, message: "Failed to fetch invoices" });
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
