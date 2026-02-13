import type { Express } from "express";
import { z } from "zod";
import { storage } from "../storage";
import { successResponse, errorResponse, ErrorCode } from "../utils/apiResponse";
import { ensureWallet } from "../utils/walletHelper";
import { trackOtpEvent } from "../utils/otpMonitoring";
import {
  parents,
  otpCodes,
  children,
  parentChild,
  tasks,
  taskResults,
  products,
  orders,
  parentWallet,
  paymentMethods,
  deposits,
  notifications,
  childGifts,
  childEvents,
  subjects,
  templateTasks,
  seoSettings,
  supportSettings,
} from "../../shared/schema";
import {
  parentPurchases,
  parentPurchaseItems,
  parentOwnedProducts,
  childAssignedProducts,
  shippingRequests,
  priceTiers,
  storeOrders,
  orderItems,
  wallets,
  entitlements,
  gifts,
  activityLog,
  scheduledTasks,
  profitTransactions,
  parentNotifications,
  childPurchaseRequests,
  childLoginRequests,
  libraryProducts,
  libraries,
  libraryDailySales,
  libraryActivityLogs,
  libraryReferralSettings,
  flashGames,
  childGameAssignments,
  gamePlayHistory,
  childGrowthTrees,
} from "../../shared/schema";
import jwt from "jsonwebtoken";
import { JWT_SECRET } from "./middleware";
import { createNotification } from "../notifications";
import { emitGiftEvent } from "../giftEvents";
import { eq, and, sql, isNull, inArray, or, desc } from "drizzle-orm";
import bcrypt from "bcrypt";
import { authMiddleware } from "./middleware";
import { v4 as uuidv4 } from "uuid";
import Stripe from "stripe";
import { applyPointsDelta } from "../services/pointsService";
import {
  compareOTP,
  validateExpiry,
  incrementAttemptsAtomic,
  blockOTP,
  MAX_ATTEMPTS,
  markVerifiedAtomic,
} from "../services/otpService";

const db = storage.db;
const stripeSecret = process.env.STRIPE_SECRET_KEY;
const stripe = stripeSecret ? new Stripe(stripeSecret, { apiVersion: "2023-10-16" }) : null;

// Helper function to normalize answers - ensures each answer has an id
function normalizeAnswersForStorage(answers: any, correctAnswerIndex: number = 0): any[] {
  if (!answers || !Array.isArray(answers)) return [];
  
  return answers.map((answer: any, index: number) => {
    const id = `answer-${Date.now()}-${index}-${Math.random().toString(36).substr(2, 9)}`;
    
    // If answer is a string, convert to object
    if (typeof answer === 'string') {
      return {
        id,
        text: answer,
        isCorrect: index === correctAnswerIndex
      };
    }
    // If answer is an object, ensure it has an id
    if (typeof answer === 'object' && answer !== null) {
      return {
        id: answer.id || id,
        text: answer.text || String(answer),
        isCorrect: answer.isCorrect !== undefined ? answer.isCorrect : index === correctAnswerIndex
      };
    }
    return { id, text: String(answer), isCorrect: index === correctAnswerIndex };
  });
}

export async function registerParentRoutes(app: Express) {
  // Get Parent Info
  app.get("/api/parent/info", authMiddleware, async (req: any, res) => {
    try {
      const parent = await db.select().from(parents).where(eq(parents.id, req.user.userId));
      if (!parent[0]) {
        return res.status(404).json(errorResponse(ErrorCode.NOT_FOUND, "Parent not found"));
      }
      const { password, ...safe } = parent[0];
      res.json(successResponse(safe, "Parent info retrieved"));
    } catch (error: any) {
      console.error("Fetch parent info error:", error);
      res.status(500).json(errorResponse(ErrorCode.INTERNAL_SERVER_ERROR, "Failed to fetch parent info"));
    }
  });

  // Get Parent's Children
  app.get("/api/parent/children", authMiddleware, async (req: any, res) => {
    try {
      const result = await db
        .select()
        .from(children)
        .innerJoin(parentChild, and(eq(parentChild.childId, children.id), eq(parentChild.parentId, req.user.userId)));

      res.json(successResponse(result.map((r: any) => r.children), "Children retrieved"));
    } catch (error: any) {
      console.error("Fetch children error:", error);
      res.status(500).json(errorResponse(ErrorCode.INTERNAL_SERVER_ERROR, "Failed to fetch children"));
    }
  });

  // Get Children Status Report (for background polling) - Optimized for 5000+ concurrent users
  app.get("/api/parent/children/status", authMiddleware, async (req: any, res) => {
    try {
      const result = await db
        .select()
        .from(children)
        .innerJoin(parentChild, and(eq(parentChild.childId, children.id), eq(parentChild.parentId, req.user.userId)));

      const childrenList = result.map((r: any) => r.children);
      
      if (childrenList.length === 0) {
        return res.json(successResponse({
          children: [],
          timestamp: new Date().toISOString(),
          refreshInterval: 300000,
        }, "No children found"));
      }

      const childIds = childrenList.map((c: any) => c.id);

      const parentId = req.user.userId;

      // Batch query: Get all task counts in one query (scoped to parent's children AND parent's tasks)
      const taskCounts = await db
        .select({ 
          childId: tasks.childId, 
          count: sql<number>`count(*)` 
        })
        .from(tasks)
        .where(and(
          eq(tasks.parentId, parentId),
          inArray(tasks.childId, childIds),
          eq(tasks.status, "completed")
        ))
        .groupBy(tasks.childId);

      // Batch query: Get all pending gift counts in one query (scoped to parent's children AND parent's gifts)
      const giftCounts = await db
        .select({ 
          childId: childGifts.childId, 
          count: sql<number>`count(*)` 
        })
        .from(childGifts)
        .where(and(
          eq(childGifts.parentId, parentId),
          inArray(childGifts.childId, childIds),
          eq(childGifts.status, "pending")
        ))
        .groupBy(childGifts.childId);

      // Batch query: Get all notification counts in one query (scoped to child AND parent)
      // Include: system notifications (null parentId) OR notifications from this parent
      const notifCounts = await db
        .select({ 
          childId: notifications.childId, 
          count: sql<number>`count(*)` 
        })
        .from(notifications)
        .where(and(
          inArray(notifications.childId, childIds),
          or(isNull(notifications.parentId), eq(notifications.parentId, parentId))
        ))
        .groupBy(notifications.childId);

      // Create lookup maps for O(1) access
      const taskMap = new Map(taskCounts.map((t: any) => [t.childId, Number(t.count)]));
      const giftMap = new Map(giftCounts.map((g: any) => [g.childId, Number(g.count)]));
      const notifMap = new Map(notifCounts.map((n: any) => [n.childId, Number(n.count)]));

      // Batch query: Get games played count from gamePlayHistory
      const gamePlayCounts = await db
        .select({
          childId: gamePlayHistory.childId,
          count: sql<number>`count(*)`,
        })
        .from(gamePlayHistory)
        .where(inArray(gamePlayHistory.childId, childIds))
        .groupBy(gamePlayHistory.childId);

      // Today's game plays
      const todayStart = new Date();
      todayStart.setHours(0, 0, 0, 0);
      const gameTodayCounts = await db
        .select({
          childId: gamePlayHistory.childId,
          count: sql<number>`count(*)`,
        })
        .from(gamePlayHistory)
        .where(and(
          inArray(gamePlayHistory.childId, childIds),
          sql`${gamePlayHistory.playedAt} >= ${todayStart}`
        ))
        .groupBy(gamePlayHistory.childId);

      const gameMap = new Map(gamePlayCounts.map((g: any) => [g.childId, Number(g.count)]));
      const gameTodayMap = new Map(gameTodayCounts.map((g: any) => [g.childId, Number(g.count)]));

      const statusReports = childrenList.map((child: any) => {
        // Calculate days since joined
        const createdAt = new Date(child.createdAt || Date.now());
        const daysSinceJoined = Math.max(1, Math.floor((Date.now() - createdAt.getTime()) / (1000 * 60 * 60 * 24)));
        const points = child.totalPoints || 0;
        const pointsPerDay = Math.round(points / daysSinceJoined);

        // Determine speed level
        let speedLevel = "slow";
        if (pointsPerDay >= 50) speedLevel = "superfast";
        else if (pointsPerDay >= 30) speedLevel = "fast";
        else if (pointsPerDay >= 15) speedLevel = "moderate";

        // Determine status
        let status = "active";
        let statusMessage = "نشط";
        if (pointsPerDay < 5 && daysSinceJoined > 3) {
          status = "needs_attention";
          statusMessage = "يحتاج تشجيع";
        } else if (pointsPerDay >= 30) {
          status = "excellent";
          statusMessage = "ممتاز";
        }

        return {
          id: child.id,
          name: child.name,
          avatar: child.avatar,
          age: child.age,
          points,
          tasksCompleted: taskMap.get(child.id) || 0,
          pendingGifts: giftMap.get(child.id) || 0,
          unreadNotifications: notifMap.get(child.id) || 0,
          gamesPlayed: gameMap.get(child.id) || 0,
          gamesToday: gameTodayMap.get(child.id) || 0,
          speedLevel,
          pointsPerDay,
          daysSinceJoined,
          status,
          statusMessage,
          lastUpdate: new Date().toISOString(),
        };
      });

      res.json(successResponse({
        children: statusReports,
        timestamp: new Date().toISOString(),
        refreshInterval: 300000, // 5 minutes in ms
      }, "Children status retrieved"));
    } catch (error: any) {
      console.error("Fetch children status error:", error);
      res.status(500).json(errorResponse(ErrorCode.INTERNAL_SERVER_ERROR, "Failed to fetch children status"));
    }
  });

  // Update Parent Profile
  app.post("/api/parent/profile/update", authMiddleware, async (req: any, res) => {
    try {
      const { name, phoneNumber } = req.body;
      if (!name && !phoneNumber) {
        return res.status(400).json(errorResponse(ErrorCode.BAD_REQUEST, "At least one field is required"));
      }

      const updates: any = {};
      if (name) updates.name = name;
      if (phoneNumber) updates.phoneNumber = phoneNumber;

      await db.update(parents).set(updates).where(eq(parents.id, req.user.userId));

      res.json(successResponse({ updated: true }, "Profile updated"));
    } catch (error: any) {
      console.error("Update profile error:", error);
      res.status(500).json(errorResponse(ErrorCode.INTERNAL_SERVER_ERROR, "Profile update failed"));
    }
  });

  // Change Parent Password
  app.post("/api/parent/profile/change-password", authMiddleware, async (req: any, res) => {
    try {
      const { oldPassword, newPassword, otpCode, code, otpId } = req.body;
      const finalOtpCode = otpCode || code;
      if (!oldPassword || !newPassword || !finalOtpCode) {
        return res.status(400).json(errorResponse(ErrorCode.BAD_REQUEST, "Old password, new password, and OTP are required"));
      }

      if (newPassword.length < 8) {
        return res.status(400).json(errorResponse(ErrorCode.BAD_REQUEST, "New password must be at least 8 characters"));
      }

      const parent = await db.select().from(parents).where(eq(parents.id, req.user.userId));
      if (!parent[0]) {
        return res.status(404).json(errorResponse(ErrorCode.NOT_FOUND, "Parent not found"));
      }

      const passwordMatch = await bcrypt.compare(oldPassword, parent[0].password);
      if (!passwordMatch) {
        return res.status(401).json(errorResponse(ErrorCode.UNAUTHORIZED, "Old password is incorrect"));
      }

      const otpMethod = req.body.otpMethod || "email";
      if (!new Set(["email", "sms"]).has(otpMethod)) {
        return res.status(400).json(errorResponse(ErrorCode.BAD_REQUEST, "Invalid OTP method"));
      }

      if (otpMethod === "sms" && (!parent[0].phoneNumber || !parent[0].smsEnabled)) {
        return res.status(400).json(errorResponse(ErrorCode.SMS_NOT_ENABLED, "SMS OTP is not enabled for this account"));
      }

      const destination = otpMethod === "sms" ? parent[0].phoneNumber : parent[0].email;
      const methodCondition = otpMethod === "sms" ? eq(otpCodes.method, "sms") : undefined;
      const pendingCondition = or(eq(otpCodes.status, "pending"), isNull(otpCodes.status));
      let record: typeof otpCodes.$inferSelect | undefined;

      if (otpId) {
        const byId = await db
          .select()
          .from(otpCodes)
          .where(and(
            eq(otpCodes.id, otpId),
            eq(otpCodes.parentId, parent[0].id),
            eq(otpCodes.destination, destination),
            eq(otpCodes.purpose, "change_password"),
            ...(methodCondition ? [methodCondition] : []),
            pendingCondition
          ))
          .orderBy(desc(otpCodes.createdAt))
          .limit(1);
        record = byId[0];
      } else {
        const latest = await db
          .select()
          .from(otpCodes)
          .where(and(
            eq(otpCodes.parentId, parent[0].id),
            eq(otpCodes.destination, destination),
            eq(otpCodes.purpose, "change_password"),
            ...(methodCondition ? [methodCondition] : []),
            pendingCondition
          ))
          .orderBy(desc(otpCodes.createdAt))
          .limit(1);
        record = latest[0];
      }

      if (!record || !validateExpiry(record.expiresAt)) {
        if (record) {
          await db.update(otpCodes).set({ status: "expired" }).where(eq(otpCodes.id, record.id));
          trackOtpEvent("verify_failed", {
            purpose: "change_password",
            method: otpMethod,
            destination,
            parentId: parent[0].id,
            reason: "expired",
            otpId: record.id,
          });
        } else {
          trackOtpEvent("verify_failed", {
            purpose: "change_password",
            method: otpMethod,
            destination,
            parentId: parent[0].id,
            reason: "not_found",
            otpId,
          });
        }
        return res.status(400).json(errorResponse(ErrorCode.OTP_EXPIRED, "Invalid or expired OTP"));
      }

      const otpOk = await compareOTP(finalOtpCode, record.code);
      if (!otpOk) {
        const attempts = await incrementAttemptsAtomic(db, record.id);
        if (attempts !== null && attempts >= MAX_ATTEMPTS) {
          await blockOTP(db, record.id);
          trackOtpEvent("blocked", {
            purpose: "change_password",
            method: otpMethod,
            destination,
            parentId: parent[0].id,
            reason: "max_attempts",
            otpId: record.id,
          });
        }
        if (attempts === null) {
          trackOtpEvent("verify_failed", {
            purpose: "change_password",
            method: otpMethod,
            destination,
            parentId: parent[0].id,
            reason: "used",
            otpId: record.id,
          });
          return res.status(400).json(errorResponse(ErrorCode.BAD_REQUEST, "OTP already used"));
        }
        trackOtpEvent("verify_failed", {
          purpose: "change_password",
          method: otpMethod,
          destination,
          parentId: parent[0].id,
          reason: "invalid",
          otpId: record.id,
        });
        return res.status(400).json(errorResponse(ErrorCode.BAD_REQUEST, "Invalid OTP"));
      }

      const hashedPassword = await bcrypt.hash(newPassword, 10);
      await db.update(parents).set({ password: hashedPassword }).where(eq(parents.id, req.user.userId));

      const verifiedId = await markVerifiedAtomic(db, record.id);
      if (!verifiedId) {
        trackOtpEvent("verify_failed", {
          purpose: "change_password",
          method: otpMethod,
          destination,
          parentId: parent[0].id,
          reason: "used",
          otpId: record.id,
        });
        return res.status(400).json(errorResponse(ErrorCode.BAD_REQUEST, "OTP already used"));
      }

      trackOtpEvent("verify_success", {
        purpose: "change_password",
        method: otpMethod,
        destination,
        parentId: parent[0].id,
        otpId: record.id,
        action: "consume",
      });

      res.json(successResponse({ changed: true }, "Password changed successfully"));
    } catch (error: any) {
      console.error("Change password error:", error);
      res.status(500).json(errorResponse(ErrorCode.INTERNAL_SERVER_ERROR, "Password change failed"));
    }
  });

  // Delete Parent Account
  app.post("/api/parent/delete-account", authMiddleware, async (req: any, res) => {
    try {
      const { confirmPassword } = req.body;
      if (!confirmPassword) {
        return res.status(400).json(errorResponse(ErrorCode.BAD_REQUEST, "Password is required"));
      }

      const parent = await db.select().from(parents).where(eq(parents.id, req.user.userId));
      if (!parent[0]) {
        return res.status(404).json(errorResponse(ErrorCode.NOT_FOUND, "Parent not found"));
      }

      const passwordMatch = await bcrypt.compare(confirmPassword, parent[0].password);
      if (!passwordMatch) {
        return res.status(401).json(errorResponse(ErrorCode.UNAUTHORIZED, "Password is incorrect"));
      }

      await db.update(seoSettings).set({ updatedBy: null }).where(eq(seoSettings.updatedBy, req.user.userId));
      await db.update(supportSettings).set({ updatedBy: null }).where(eq(supportSettings.updatedBy, req.user.userId));

      await db.delete(parents).where(eq(parents.id, req.user.userId));

      res.json(successResponse({ deleted: true }, "Account deleted"));
    } catch (error: any) {
      console.error("Delete account error:", error);
      res.status(500).json(errorResponse(ErrorCode.INTERNAL_SERVER_ERROR, "Account deletion failed"));
    }
  });

  // ===== Store Core: List Products with Price Tiers =====
  app.get("/api/parent/store/products", authMiddleware, async (_req: any, res) => {
    try {
      const productList = await db.select().from(products);
      const tierList = await db.select().from(priceTiers);

      const tiersByProduct: Record<string, (typeof priceTiers.$inferSelect)[]> = {};
      tierList.forEach((tier: typeof priceTiers.$inferSelect) => {
        tiersByProduct[tier.productId] = tiersByProduct[tier.productId] || [];
        tiersByProduct[tier.productId].push(tier);
      });

      const data = productList.map((p: typeof products.$inferSelect) => ({
        id: p.id,
        name: p.name,
        description: p.description,
        image: p.image,
        stock: p.stock,
        price: p.price,
        pointsPrice: p.pointsPrice,
        priceTiers: tiersByProduct[p.id] || [],
      }));

      res.json(successResponse(data, "Products retrieved"));
    } catch (error: any) {
      console.error("List products error:", error);
      res.status(500).json(errorResponse(ErrorCode.INTERNAL_SERVER_ERROR, "Failed to list products"));
    }
  });

  // ===== Store Core: Create Checkout Session =====
  app.post("/api/parent/store/checkout", authMiddleware, async (req: any, res) => {
    try {
      const { productId, priceTierId, quantity = 1 } = req.body;
      if (!productId || !priceTierId || quantity <= 0) {
        return res.status(400).json(errorResponse(ErrorCode.BAD_REQUEST, "productId, priceTierId, and quantity are required"));
      }

      const product = await db.select().from(products).where(eq(products.id, productId));
      if (!product[0]) {
        return res.status(404).json(errorResponse(ErrorCode.NOT_FOUND, "Product not found"));
      }

      const tier = await db.select().from(priceTiers).where(eq(priceTiers.id, priceTierId));
      if (!tier[0] || tier[0].productId !== productId) {
        return res.status(400).json({ message: "Invalid price tier" });
      }

      const totalAmount = Number(tier[0].unitAmount) * Number(quantity);
      const idempotencyKey = uuidv4();

      // Ensure wallet exists (for wallet top-ups later)
      await ensureWallet(req.user.userId);

      // Create order (PENDING)
      const order = await db
        .insert(storeOrders)
        .values({
          parentId: req.user.userId,
          status: "PENDING",
          totalAmount,
          idempotencyKey,
        })
        .returning();

      await db.insert(orderItems).values({
        orderId: order[0].id,
        productId,
        priceTierId,
        quantity,
        unitAmount: tier[0].unitAmount,
      });

      if (!stripe || !tier[0].stripePriceId) {
        // Mark as failed because payment provider unavailable
        await db
          .update(storeOrders)
          .set({ status: "FAILED", failureReason: "stripe_unavailable" })
          .where(eq(storeOrders.id, order[0].id));
        return res.status(503).json({ message: "Payment provider unavailable" });
      }

      const appUrl = process.env.APP_URL || "http://localhost:5000";
      const session = await stripe.checkout.sessions.create({
        mode: "payment",
        line_items: [{ price: tier[0].stripePriceId!, quantity }],
        success_url: `${appUrl}/store/success?orderId=${order[0].id}`,
        cancel_url: `${appUrl}/store/cancel?orderId=${order[0].id}`,
        metadata: {
          orderId: order[0].id,
          parentId: req.user.userId,
        },
      });

      // Update order to PAYMENT_INITIATED
      await db
        .update(storeOrders)
        .set({ status: "PAYMENT_INITIATED", stripeSessionId: session.id })
        .where(eq(storeOrders.id, order[0].id));

      res.json({
        success: true,
        checkoutUrl: session.url,
        orderId: order[0].id,
      });
    } catch (error: any) {
      console.error("Create checkout error:", error);
      res.status(500).json({ message: "Failed to create checkout" });
    }
  });

  // Get parent orders
  app.get("/api/parent/store/orders", authMiddleware, async (req: any, res) => {
    try {
      const list = await db.select().from(storeOrders).where(eq(storeOrders.parentId, req.user.userId));
      res.json({ success: true, data: list });
    } catch (error: any) {
      console.error("List orders error:", error);
      res.status(500).json({ message: "Failed to list orders" });
    }
  });

  // Get single order with items
  app.get("/api/parent/store/orders/:orderId", authMiddleware, async (req: any, res) => {
    try {
      const { orderId } = req.params;
      const order = await db.select().from(storeOrders).where(eq(storeOrders.id, orderId));
      if (!order[0] || order[0].parentId !== req.user.userId) {
        return res.status(404).json({ message: "Order not found" });
      }
      const items = await db.select().from(orderItems).where(eq(orderItems.orderId, orderId));
      res.json({ success: true, data: { order: order[0], items } });
    } catch (error: any) {
      console.error("Get order error:", error);
      res.status(500).json({ message: "Failed to fetch order" });
    }
  });

  // Create Task
  app.post("/api/parent/create-task", authMiddleware, async (req: any, res) => {
    try {
      const { childId, subjectId, question, answers, pointsReward, imageUrl, gifUrl } = req.body;

      if (!childId || !question || !answers || !pointsReward) {
        return res.status(400).json(errorResponse(ErrorCode.BAD_REQUEST, "All fields are required"));
      }

      // Verify parent owns this child
      const link = await db
        .select()
        .from(parentChild)
        .where(and(eq(parentChild.parentId, req.user.userId), eq(parentChild.childId, childId)));

      if (!link[0]) {
        return res.status(403).json(errorResponse(ErrorCode.PARENT_CHILD_MISMATCH, "Unauthorized"));
      }

      // Check parent wallet balance
      const wallet = await db.select().from(parentWallet).where(eq(parentWallet.parentId, req.user.userId));
      const currentBalance = Number(wallet[0]?.balance || 0);
      if (currentBalance < pointsReward) {
        return res.status(400).json(errorResponse(ErrorCode.BAD_REQUEST, `رصيدك غير كافي لإرسال هذه المهمة. الرصيد الحالي: ${currentBalance}, المطلوب: ${pointsReward}`));
      }

      const normalizedAnswers = normalizeAnswersForStorage(answers, 0);
      const correctCount = normalizedAnswers.filter((a) => a.isCorrect).length;
      if (correctCount !== 1) {
        return res.status(400).json(errorResponse(ErrorCode.BAD_REQUEST, "Exactly one correct answer is required"));
      }

      // Deduct points from parent wallet and create task in a transaction
      const result = await db.transaction(async (tx) => {
        await tx.update(parentWallet)
          .set({
            balance: sql`${parentWallet.balance} - ${pointsReward}`,
            totalSpent: sql`${parentWallet.totalSpent} + ${pointsReward}`,
            updatedAt: new Date(),
          })
          .where(eq(parentWallet.parentId, req.user.userId));

        const inserted = await tx
          .insert(tasks)
          .values({
            parentId: req.user.userId,
            childId,
            subjectId: subjectId || null,
            question,
            answers: normalizedAnswers,
            pointsReward,
            imageUrl,
            gifUrl: gifUrl || null,
          })
          .returning();

        return inserted;
      });

      await createNotification({
        childId,
        type: "task_assigned",
        title: "مهمة جديدة!",
        message: `لديك مهمة جديدة: ${question.substring(0, 50)}...`,
        relatedId: result[0].id,
        metadata: { taskId: result[0].id, subjectId: subjectId || null },
      });

      res.json(successResponse({ taskId: result[0].id }));
    } catch (error: any) {
      console.error("Create task error:", error);
      res.status(500).json(errorResponse(ErrorCode.INTERNAL_SERVER_ERROR, "Failed to create task"));
    }
  });

  // Get Parent Products
  app.get("/api/parent/products", authMiddleware, async (req: any, res) => {
    try {
      const result = await db.select().from(products).where(eq(products.parentId, req.user.userId));
      res.json(result);
    } catch (error: any) {
      console.error("Fetch products error:", error);
      res.status(500).json({ message: "Failed to fetch products" });
    }
  });

  // Create Product
  app.post("/api/parent/create-product", authMiddleware, async (req: any, res) => {
    try {
      const { name, description, price, pointsPrice, image, stock } = req.body;

      if (!name || !price || !pointsPrice) {
        return res.status(400).json({ message: "Name, price, and pointsPrice are required" });
      }

      const result = await db
        .insert(products)
        .values({
          parentId: req.user.userId,
          name,
          description,
          price,
          pointsPrice,
          image,
          stock: stock || 999,
        })
        .returning();

      res.json({ success: true, productId: result[0].id });
    } catch (error: any) {
      console.error("Create product error:", error);
      res.status(500).json({ message: "Failed to create product" });
    }
  });

  // Update Product
  app.post("/api/parent/products", authMiddleware, async (req: any, res) => {
    try {
      const { id, name, description, price, pointsPrice, image, stock } = req.body;

      const product = await db.select().from(products).where(eq(products.id, id));
      if (!product[0] || product[0].parentId !== req.user.userId) {
        return res.status(403).json({ message: "Unauthorized" });
      }

      await db
        .update(products)
        .set({
          name,
          description,
          price,
          pointsPrice,
          image,
          stock,
        })
        .where(eq(products.id, id));

      res.json({ success: true, message: "Product updated" });
    } catch (error: any) {
      console.error("Update product error:", error);
      res.status(500).json({ message: "Failed to update product" });
    }
  });

  // Delete Product
  app.delete("/api/parent/products/:id", authMiddleware, async (req: any, res) => {
    try {
      const { id } = req.params;

      const product = await db.select().from(products).where(eq(products.id, id));
      if (!product[0] || product[0].parentId !== req.user.userId) {
        return res.status(403).json({ message: "Unauthorized" });
      }

      await db.delete(products).where(eq(products.id, id));
      res.json({ success: true, message: "Product deleted" });
    } catch (error: any) {
      console.error("Delete product error:", error);
      res.status(500).json({ message: "Failed to delete product" });
    }
  });

  // Get Parent Wallet
  app.get("/api/parent/wallet", authMiddleware, async (req: any, res) => {
    try {
      const result = await db.select().from(parentWallet).where(eq(parentWallet.parentId, req.user.userId));
      if (!result[0]) {
        res.json(successResponse({ balance: 0, totalDeposited: 0, totalSpent: 0 }, "Wallet retrieved"));
      } else {
        res.json(successResponse(result[0], "Wallet retrieved"));
      }
    } catch (error: any) {
      console.error("Fetch wallet error:", error);
      res.status(500).json(errorResponse(ErrorCode.INTERNAL_SERVER_ERROR, "Failed to fetch wallet"));
    }
  });

  // Get Payment Methods (admin-created, visible to all parents)
  app.get("/api/parent/payment-methods", authMiddleware, async (req: any, res) => {
    try {
      const result = await db
        .select()
        .from(paymentMethods)
        .where(and(isNull(paymentMethods.parentId), eq(paymentMethods.isActive, true)));
      res.json(successResponse(result, "Payment methods retrieved"));
    } catch (error: any) {
      console.error("Fetch payment methods error:", error);
      res.status(500).json(errorResponse(ErrorCode.INTERNAL_SERVER_ERROR, "Failed to fetch payment methods"));
    }
  });

  // Create Deposit (parent confirms external payment)
  app.post("/api/parent/deposit", authMiddleware, async (req: any, res) => {
    try {
      const { paymentMethodId, amount, notes, transactionId, receiptUrl } = req.body;

      const parsedAmount = parseFloat(amount);
      if (!paymentMethodId || !amount || isNaN(parsedAmount) || parsedAmount <= 0) {
        return res.status(400).json(errorResponse(ErrorCode.BAD_REQUEST, "Payment method and valid amount are required"));
      }

      const normalizedTransactionId = typeof transactionId === "string" ? transactionId.trim() : "";
      const normalizedReceiptUrl = typeof receiptUrl === "string" ? receiptUrl.trim() : "";

      if (!normalizedTransactionId) {
        return res.status(400).json(errorResponse(ErrorCode.BAD_REQUEST, "Transaction ID is required"));
      }

      if (normalizedTransactionId.length < 4 || normalizedTransactionId.length > 120) {
        return res.status(400).json(errorResponse(ErrorCode.BAD_REQUEST, "Transaction ID must be between 4 and 120 characters"));
      }

      if (normalizedReceiptUrl) {
        try {
          const parsedUrl = new URL(normalizedReceiptUrl);
          if (!["http:", "https:"].includes(parsedUrl.protocol)) {
            return res.status(400).json(errorResponse(ErrorCode.BAD_REQUEST, "Receipt URL must start with http:// or https://"));
          }
        } catch {
          return res.status(400).json(errorResponse(ErrorCode.BAD_REQUEST, "Invalid receipt URL"));
        }
      }

      if (parsedAmount > 100000) {
        return res.status(400).json(errorResponse(ErrorCode.BAD_REQUEST, "Maximum deposit amount is 100,000"));
      }

      // Rate limit: max 5 pending deposits per parent
      const pendingDeposits = await db
        .select({ id: deposits.id })
        .from(deposits)
        .where(and(eq(deposits.parentId, req.user.userId), eq(deposits.status, "pending")));
      if (pendingDeposits.length >= 5) {
        return res.status(429).json(errorResponse("RATE_LIMITED" as any, "لديك 5 طلبات إيداع قيد المراجعة بالفعل"));
      }

      // Verify the payment method exists, is admin-created (parentId null), and is active
      const method = await db
        .select()
        .from(paymentMethods)
        .where(and(eq(paymentMethods.id, paymentMethodId), isNull(paymentMethods.parentId), eq(paymentMethods.isActive, true)));

      if (!method[0]) {
        return res.status(400).json(errorResponse(ErrorCode.BAD_REQUEST, "Invalid or inactive payment method"));
      }

      const result = await db
        .insert(deposits)
        .values({
          parentId: req.user.userId,
          paymentMethodId,
          amount: parsedAmount.toString(),
          status: "pending",
          transactionId: normalizedTransactionId,
          receiptUrl: normalizedReceiptUrl || null,
          notes: notes || null,
        })
        .returning();

      // Get parent info for admin notification
      const parent = await db.select({ name: parents.name, email: parents.email }).from(parents).where(eq(parents.id, req.user.userId));
      const parentName = parent[0]?.name || "مستخدم";

      // Notify admin (parentId: null = admin notification)
      await createNotification({
        parentId: null,
        type: "deposit_request",
        title: "طلب إيداع جديد",
        message: `${parentName} طلب إيداع ₪${amount} عبر ${method[0].type} (Ref: ${normalizedTransactionId})${notes ? ` — "${notes}"` : ""}`,
        style: "toast",
        priority: "urgent",
        soundAlert: true,
        relatedId: result[0].id,
        metadata: { depositId: result[0].id, parentId: req.user.userId, amount, transactionId: normalizedTransactionId },
      });

      res.json(successResponse({ depositId: result[0].id }, "Deposit request created"));
    } catch (error: any) {
      console.error("Create deposit error:", error);
      res.status(500).json(errorResponse(ErrorCode.INTERNAL_SERVER_ERROR, "Failed to create deposit"));
    }
  });

  // Get Deposits (ordered: newest first)
  app.get("/api/parent/deposits", authMiddleware, async (req: any, res) => {
    try {
      const result = await db
        .select({
          id: deposits.id,
          parentId: deposits.parentId,
          paymentMethodId: deposits.paymentMethodId,
          amount: deposits.amount,
          status: deposits.status,
          transactionId: deposits.transactionId,
          receiptUrl: deposits.receiptUrl,
          notes: deposits.notes,
          adminNotes: deposits.adminNotes,
          reviewedAt: deposits.reviewedAt,
          createdAt: deposits.createdAt,
          completedAt: deposits.completedAt,
          methodType: paymentMethods.type,
          methodBank: paymentMethods.bankName,
          methodAccount: paymentMethods.accountNumber,
        })
        .from(deposits)
        .leftJoin(paymentMethods, eq(deposits.paymentMethodId, paymentMethods.id))
        .where(eq(deposits.parentId, req.user.userId))
        .orderBy(desc(deposits.createdAt))
        .limit(100);
      res.json(successResponse(result, "Deposits retrieved"));
    } catch (error: any) {
      console.error("Fetch deposits error:", error);
      res.status(500).json(errorResponse(ErrorCode.INTERNAL_SERVER_ERROR, "Failed to fetch deposits"));
    }
  });

  // Get Notifications (ordered: unread first, then newest)
  app.get("/api/parent/notifications", authMiddleware, async (req: any, res) => {
    try {
      const result = await db.select()
        .from(notifications)
        .where(eq(notifications.parentId, req.user.userId))
        .orderBy(sql`${notifications.isRead} ASC, ${notifications.createdAt} DESC`);
      res.json(successResponse(result, "Notifications retrieved"));
    } catch (error: any) {
      console.error("Fetch notifications error:", error);
      res.status(500).json(errorResponse(ErrorCode.INTERNAL_SERVER_ERROR, "Failed to fetch notifications"));
    }
  });

  // Get Notifications (alias)
  app.get("/api/notifications", authMiddleware, async (req: any, res) => {
    try {
      const result = await db.select()
        .from(notifications)
        .where(eq(notifications.parentId, req.user.userId))
        .orderBy(sql`${notifications.isRead} ASC, ${notifications.createdAt} DESC`);
      res.json(successResponse(result, "Notifications retrieved"));
    } catch (error: any) {
      console.error("Fetch notifications error:", error);
      res.status(500).json(errorResponse(ErrorCode.INTERNAL_SERVER_ERROR, "Failed to fetch notifications"));
    }
  });

  // Mark Notification as Read - SEC-003 FIX: Added ownership verification
  app.post("/api/parent/notifications/:id/read", authMiddleware, async (req: any, res) => {
    try {
      const { id } = req.params;
      const parentId = req.user.userId;
      
      // Verify ownership before updating
      const updated = await db
        .update(notifications)
        .set({ isRead: true })
        .where(and(eq(notifications.id, id), eq(notifications.parentId, parentId)))
        .returning();
      
      if (!updated[0]) {
        return res.status(404).json(errorResponse(ErrorCode.NOT_FOUND, "Notification not found or not authorized"));
      }
      
      res.json(successResponse({ marked: true }, "Notification marked as read"));
    } catch (error: any) {
      console.error("Mark notification error:", error);
      res.status(500).json(errorResponse(ErrorCode.INTERNAL_SERVER_ERROR, "Failed to mark notification"));
    }
  });

  // Mark Notification as Read (alias)
  app.put("/api/notifications/:id", authMiddleware, async (req: any, res) => {
    try {
      const { id } = req.params;
      const updated = await db
        .update(notifications)
        .set({ isRead: true })
        .where(and(eq(notifications.id, id), eq(notifications.parentId, req.user.userId)))
        .returning();

      if (!updated[0]) {
        return res.status(404).json(errorResponse(ErrorCode.NOT_FOUND, "Notification not found"));
      }

      res.json(successResponse({ marked: true }, "Notification marked as read"));
    } catch (error: any) {
      console.error("Mark notification error:", error);
      res.status(500).json(errorResponse(ErrorCode.INTERNAL_SERVER_ERROR, "Failed to mark notification"));
    }
  });

  // Delete Notification (alias)
  app.delete("/api/notifications/:id", authMiddleware, async (req: any, res) => {
    try {
      const { id } = req.params;
      const deleted = await db
        .delete(notifications)
        .where(and(eq(notifications.id, id), eq(notifications.parentId, req.user.userId)))
        .returning();

      if (!deleted[0]) {
        return res.status(404).json(errorResponse(ErrorCode.NOT_FOUND, "Notification not found"));
      }

      res.json(successResponse({ deleted: true }, "Notification deleted"));
    } catch (error: any) {
      console.error("Delete notification error:", error);
      res.status(500).json(errorResponse(ErrorCode.INTERNAL_SERVER_ERROR, "Failed to delete notification"));
    }
  });

  // Respond to Child Login Request (approve/reject)
  app.post("/api/parent/notifications/:id/respond-login", authMiddleware, async (req: any, res) => {
    try {
      const { id } = req.params;
      const { action } = req.body;

      if (!action || !["approve", "reject"].includes(action)) {
        return res.status(400).json(errorResponse(ErrorCode.BAD_REQUEST, "Invalid action"));
      }

      const notification = await db.select().from(notifications).where(eq(notifications.id, id));
      if (!notification[0]) {
        return res.status(404).json(errorResponse(ErrorCode.NOT_FOUND, "Notification not found"));
      }

      if (notification[0].parentId !== req.user.userId) {
        return res.status(403).json(errorResponse(ErrorCode.FORBIDDEN, "Not authorized"));
      }

      const metadata = notification[0].metadata as any;
      const childId = metadata?.childId;
      const childName = metadata?.childName;
      const loginRequestId = metadata?.loginRequestId;

      // Check if login request exists and is still valid (not expired)
      if (loginRequestId) {
        const loginRequest = await db.select().from(childLoginRequests).where(eq(childLoginRequests.id, loginRequestId));
        
        if (!loginRequest[0]) {
          return res.status(404).json(errorResponse(ErrorCode.NOT_FOUND, "Login request not found"));
        }

        // Check if already processed (prevent reuse)
        if (loginRequest[0].status !== "pending") {
          return res.status(400).json(errorResponse(ErrorCode.BAD_REQUEST, "هذا الطلب تم معالجته بالفعل"));
        }

        // Check if expired
        if (loginRequest[0].expiresAt < new Date()) {
          await db.update(childLoginRequests)
            .set({ status: "expired" })
            .where(eq(childLoginRequests.id, loginRequestId));
          return res.status(410).json(errorResponse(ErrorCode.BAD_REQUEST, "انتهت صلاحية هذا الطلب. يجب على الطفل إرسال طلب جديد."));
        }
      }

      // Mark notification as read
      await db.update(notifications).set({ isRead: true }).where(eq(notifications.id, id));

      if (action === "approve") {
        // Generate JWT token for the child
        const sessionToken = jwt.sign({ childId, type: "child" }, JWT_SECRET, { expiresIn: "30d" });

        // Update login request with approved status and token
        if (loginRequestId) {
          await db.update(childLoginRequests)
            .set({ 
              status: "approved", 
              sessionToken,
              respondedAt: new Date(),
            })
            .where(eq(childLoginRequests.id, loginRequestId));
        }

        res.json(successResponse({ approved: true, loginRequestId }, "Login request approved"));
      } else {
        // Update login request with rejected status
        if (loginRequestId) {
          await db.update(childLoginRequests)
            .set({ 
              status: "rejected",
              respondedAt: new Date(),
            })
            .where(eq(childLoginRequests.id, loginRequestId));
        }

        // Notify child
        if (childId) {
          await createNotification({
            childId,
            type: "login_rejected",
            title: "تم رفض طلب الدخول",
            message: `${childName}، تم رفض طلب دخولك من قبل والديك.`,
            style: "toast",
            priority: "warning",
          });
        }

        res.json(successResponse({ rejected: true, loginRequestId }, "Login request rejected"));
      }
    } catch (error: any) {
      console.error("Respond to login error:", error);
      res.status(500).json(errorResponse(ErrorCode.INTERNAL_SERVER_ERROR, "Failed to respond to login request"));
    }
  });

  // Get pending purchase requests from children
  app.get("/api/parent/purchase-requests", authMiddleware, async (req: any, res) => {
    try {
      const requests = await db
        .select({
          id: childPurchaseRequests.id,
          childId: childPurchaseRequests.childId,
          productId: childPurchaseRequests.productId,
          libraryProductId: childPurchaseRequests.libraryProductId,
          quantity: childPurchaseRequests.quantity,
          pointsPrice: childPurchaseRequests.pointsPrice,
          status: childPurchaseRequests.status,
          createdAt: childPurchaseRequests.createdAt,
        })
        .from(childPurchaseRequests)
        .where(and(
          eq(childPurchaseRequests.parentId, req.user.userId),
          eq(childPurchaseRequests.status, "pending")
        ))
        .orderBy(sql`${childPurchaseRequests.createdAt} DESC`);

      // Enrich with child and product details
      const enrichedRequests = await Promise.all(requests.map(async (request: typeof requests[number]) => {
        const child = await db.select().from(children).where(eq(children.id, request.childId));
        const product = await db.select().from(products).where(eq(products.id, request.productId));
        return {
          ...request,
          child: child[0] ? { id: child[0].id, name: child[0].name, avatarUrl: child[0].avatarUrl } : null,
          product: product[0] ? {
            id: product[0].id,
            name: product[0].name,
            nameAr: product[0].nameAr,
            image: product[0].image,
            pointsPrice: product[0].pointsPrice,
          } : null
        };
      }));

      res.json(successResponse(enrichedRequests, "Purchase requests retrieved"));
    } catch (error: any) {
      console.error("Get purchase requests error:", error);
      res.status(500).json(errorResponse(ErrorCode.INTERNAL_SERVER_ERROR, "Failed to fetch purchase requests"));
    }
  });

  // Approve or reject a child purchase request
  app.patch("/api/parent/purchase-requests/:id/decision", authMiddleware, async (req: any, res) => {
    try {
      const { id } = req.params;
      const { decision, rejectionReason, shippingAddress } = req.body;

      if (!decision || !["approve", "reject"].includes(decision)) {
        return res.status(400).json(errorResponse(ErrorCode.BAD_REQUEST, "Decision must be 'approve' or 'reject'"));
      }

      // Get the request
      const request = await db.select().from(childPurchaseRequests).where(
        and(eq(childPurchaseRequests.id, id), eq(childPurchaseRequests.parentId, req.user.userId))
      );

      if (!request[0]) {
        return res.status(404).json(errorResponse(ErrorCode.NOT_FOUND, "Purchase request not found"));
      }

      if (request[0].status !== "pending") {
        return res.status(400).json(errorResponse(ErrorCode.BAD_REQUEST, "Request already processed"));
      }

      const child = await db.select().from(children).where(eq(children.id, request[0].childId));
      if (!child[0]) {
        return res.status(404).json(errorResponse(ErrorCode.NOT_FOUND, "Child not found"));
      }

      const product = await db.select().from(products).where(eq(products.id, request[0].productId));
      if (!product[0]) {
        return res.status(404).json(errorResponse(ErrorCode.NOT_FOUND, "Product not found"));
      }

      if (decision === "approve") {
        if (!shippingAddress) {
          return res.status(400).json(errorResponse(ErrorCode.BAD_REQUEST, "Shipping address is required for approval"));
        }

        // Check if child still has enough points
        if (child[0].totalPoints < request[0].pointsPrice) {
          return res.status(400).json(errorResponse(ErrorCode.BAD_REQUEST, "Child no longer has enough points"));
        }

        let orderResult: typeof orders.$inferSelect[] = [];
        try {
          orderResult = await db.transaction(async (tx) => {
            const referralSettingsRows = await tx.select().from(libraryReferralSettings);
            const saleActivityPoints = referralSettingsRows[0]?.pointsPerSale ?? 10;

            await applyPointsDelta(tx, {
              childId: request[0].childId,
              delta: -request[0].pointsPrice,
              reason: "PURCHASE_DEBIT",
              requestId: id,
              minBalance: 0,
              clampToMinBalance: false,
            });

            const createdOrder = await tx
              .insert(orders)
              .values({
                parentId: req.user.userId,
                childId: request[0].childId,
                productId: request[0].productId,
                quantity: request[0].quantity,
                pointsPrice: request[0].pointsPrice,
                status: "processing",
                shippingAddress,
              })
              .returning();

            await tx
              .update(childPurchaseRequests)
              .set({
                status: "approved",
                parentDecision: "approve",
                shippingAddress,
                orderId: createdOrder[0].id,
                decidedAt: new Date(),
              })
              .where(eq(childPurchaseRequests.id, id));

            if (request[0].libraryProductId) {
              const libraryItem = await tx
                .select({
                  id: libraryProducts.id,
                  libraryId: libraryProducts.libraryId,
                  stock: libraryProducts.stock,
                  commissionRatePct: libraries.commissionRatePct,
                })
                .from(libraryProducts)
                .innerJoin(libraries, eq(libraryProducts.libraryId, libraries.id))
                .where(eq(libraryProducts.id, request[0].libraryProductId));

              if (!libraryItem[0] || libraryItem[0].stock < request[0].quantity) {
                throw new Error("LIBRARY_STOCK_UNAVAILABLE");
              }

              await tx
                .update(libraryProducts)
                .set({
                  stock: sql`${libraryProducts.stock} - ${request[0].quantity}`,
                  updatedAt: new Date(),
                })
                .where(eq(libraryProducts.id, request[0].libraryProductId));

              await tx
                .update(libraries)
                .set({
                  totalSales: sql`${libraries.totalSales} + ${request[0].quantity}`,
                  updatedAt: new Date(),
                })
                .where(eq(libraries.id, libraryItem[0].libraryId));

              const dayStart = new Date();
              dayStart.setHours(0, 0, 0, 0);

              const existingDaily = await tx
                .select()
                .from(libraryDailySales)
                .where(
                  and(
                    eq(libraryDailySales.libraryId, libraryItem[0].libraryId),
                    eq(libraryDailySales.saleDate, dayStart)
                  )
                );

              if (existingDaily[0]) {
                await tx
                  .update(libraryDailySales)
                  .set({
                    totalPointsSales: sql`${libraryDailySales.totalPointsSales} + ${request[0].pointsPrice}`,
                    totalOrders: sql`${libraryDailySales.totalOrders} + 1`,
                    updatedAt: new Date(),
                  })
                  .where(eq(libraryDailySales.id, existingDaily[0].id));
              } else {
                await tx.insert(libraryDailySales).values({
                  libraryId: libraryItem[0].libraryId,
                  saleDate: dayStart,
                  totalSalesAmount: "0.00",
                  totalPointsSales: request[0].pointsPrice,
                  totalOrders: 1,
                  commissionRatePct: libraryItem[0].commissionRatePct || "10.00",
                  commissionAmount: "0.00",
                  isPaid: false,
                });
              }

              await tx.insert(libraryActivityLogs).values({
                libraryId: libraryItem[0].libraryId,
                action: "sale",
                points: saleActivityPoints,
                metadata: {
                  orderId: createdOrder[0].id,
                  parentId: req.user.userId,
                  childId: request[0].childId,
                  requestId: id,
                  libraryProductId: request[0].libraryProductId,
                  quantity: request[0].quantity,
                  pointsPrice: request[0].pointsPrice,
                },
              });

              await tx
                .update(libraries)
                .set({
                  activityScore: sql`${libraries.activityScore} + ${saleActivityPoints}`,
                  updatedAt: new Date(),
                })
                .where(eq(libraries.id, libraryItem[0].libraryId));
            }

            return createdOrder;
          });
        } catch (error: any) {
          if (error?.message === "INSUFFICIENT_POINTS") {
            return res.status(400).json(errorResponse(ErrorCode.BAD_REQUEST, "Child no longer has enough points"));
          }
          if (error?.message === "LIBRARY_STOCK_UNAVAILABLE") {
            return res.status(400).json(errorResponse(ErrorCode.BAD_REQUEST, "Library product is out of stock"));
          }
          throw error;
        }

        // Notify child
        await createNotification({
          parentId: req.user.userId,
          childId: request[0].childId,
          type: "purchase_approved",
          title: "تم قبول طلبك!",
          message: `تمت الموافقة على طلب شراء ${product[0].nameAr || product[0].name}`,
          metadata: { 
            requestId: id, 
            productId: request[0].productId,
            orderId: orderResult[0].id
          }
        });

        res.json(successResponse({ 
          requestId: id, 
          orderId: orderResult[0].id,
          status: "approved"
        }, "Purchase request approved"));

      } else {
        // Reject the request - points NOT deducted, so nothing to refund
        await db
          .update(childPurchaseRequests)
          .set({ 
            status: "rejected", 
            parentDecision: "reject",
            rejectionReason: rejectionReason || "Parent declined the purchase",
            decidedAt: new Date()
          })
          .where(eq(childPurchaseRequests.id, id));

        // Notify child
        await createNotification({
          parentId: req.user.userId,
          childId: request[0].childId,
          type: "purchase_rejected",
          title: "تم رفض طلبك",
          message: rejectionReason || `تم رفض طلب شراء ${product[0].nameAr || product[0].name}`,
          metadata: { 
            requestId: id, 
            productId: request[0].productId,
            reason: rejectionReason
          }
        });

        res.json(successResponse({ 
          requestId: id,
          status: "rejected"
        }, "Purchase request rejected"));
      }
    } catch (error: any) {
      console.error("Purchase decision error:", error);
      res.status(500).json(errorResponse(ErrorCode.INTERNAL_SERVER_ERROR, "Failed to process decision"));
    }
  });

  // شراء منتج كهدية للطفل
  app.post("/api/parent/store/purchase", authMiddleware, async (req: any, res) => {
    try {
      const { childId, productId } = req.body;
      const parentId = req.user.userId;

      if (!childId || !productId) {
        return res.status(400).json(errorResponse(ErrorCode.BAD_REQUEST, "childId و productId مطلوبان"));
      }

      // التحقق من ارتباط الطفل بالأب
      const linked = await db
        .select()
        .from(parentChild)
        .where(and(eq(parentChild.parentId, parentId), eq(parentChild.childId, childId)));

      if (!linked[0]) {
        return res.status(403).json(errorResponse(ErrorCode.UNAUTHORIZED, "الطفل غير مرتبط بهذا الحساب"));
      }

      // الحصول على تفاصيل المنتج
      const product = await db.select().from(products).where(eq(products.id, productId));
      if (!product[0]) {
        return res.status(404).json(errorResponse(ErrorCode.NOT_FOUND, "المنتج غير موجود"));
      }

      // الحصول على محفظة الأب
      const wallet = await db.select().from(parentWallet).where(eq(parentWallet.parentId, parentId));
      if (!wallet[0]) {
        return res.status(404).json(errorResponse(ErrorCode.NOT_FOUND, "المحفظة غير موجودة"));
      }

      const balanceNum = parseFloat(wallet[0].balance.toString());
      const productPrice = parseFloat(product[0].price.toString());

      // التحقق من الرصيد
      if (balanceNum < productPrice) {
        return res.status(400).json(errorResponse(ErrorCode.BAD_REQUEST, "رصيد المحفظة غير كافٍ"));
      }

      // تنفيذ العملية داخل transaction لضمان سلامة البيانات
      const { order, gift } = await db.transaction(async (tx) => {
        // إنشاء أمر شراء
        const createdOrder = await tx
          .insert(orders)
          .values({
            parentId,
            childId,
            productId,
            quantity: 1,
            pointsPrice: product[0].pointsPrice,
            status: "completed",
            shippingAddress: null,
          })
          .returning();

        // خصم من محفظة الأب
        const newBalance = (balanceNum - productPrice).toFixed(2);
        const newSpent = parseFloat(wallet[0].totalSpent.toString()) + productPrice;

        await tx
          .update(parentWallet)
          .set({
            balance: newBalance,
            totalSpent: newSpent.toFixed(2),
            updatedAt: new Date(),
          })
          .where(eq(parentWallet.parentId, parentId));

        // إنشاء سجل هدية للطفل
        const createdGift = await tx
          .insert(childGifts)
          .values({
            parentId,
            childId,
            productId,
            productName: product[0].name,
            productImage: product[0].image || null,
            pointsCost: product[0].pointsPrice,
            status: "pending",
          })
          .returning();

        // إنشاء حدث للطفل
        await tx
          .insert(childEvents)
          .values({
            childId,
            eventType: "GIFT_ASSIGNED",
            relatedId: createdGift[0].id,
            meta: {
              productName: product[0].name,
              productImage: product[0].image,
              parentName: null,
            },
          });

        return { order: createdOrder[0], gift: createdGift[0] };
      });

      // إنشاء إشعار للطفل (خارج الـ transaction - غير حرج)
      const productNameAr = product[0].nameAr || product[0].name;
      await db
        .insert(notifications)
        .values({
          childId,
          type: "gift_received",
          message: `حصلت على هدية جديدة: ${productNameAr}! 🎁`,
          relatedId: gift.id,
        });

      res.status(201).json(successResponse({
        orderId: order.id,
        giftId: gift.id,
      }, `تم إرسال الهدية "${productNameAr}" بنجاح`));
    } catch (error: any) {
      console.error("Purchase error:", error);
      res.status(500).json(errorResponse(ErrorCode.INTERNAL_SERVER_ERROR, "فشل في إتمام الشراء"));
    }
  });

  // List store products (global/admin products)
  app.get("/api/parent/store/products", authMiddleware, async (req: any, res) => {
    try {
      // products where parent_id IS NULL (global store items)
      const result = await db.select().from(products).where(sql`parent_id IS NULL`);
      res.json({ success: true, data: result });
    } catch (error: any) {
      console.error("Fetch store products error:", error);
      res.status(500).json({ message: "Failed to fetch store products" });
    }
  });

  // Checkout invoice preview (manual purchase flow)
  app.post("/api/parent/store/checkout/preview", authMiddleware, async (req: any, res) => {
    try {
      const { items } = req.body; // [{ productId, quantity }]
      if (!items || !Array.isArray(items) || items.length === 0) return res.status(400).json({ message: "Items required" });

      const productIds = items.map((i: any) => i.productId);
      const prods = await db.select().from(products).where(sql`id = ANY(${productIds})`);

      let subtotal = 0;
      const lineItems: any[] = [];
      for (const it of items) {
        const p = prods.find((x: any) => x.id === it.productId);
        if (!p) return res.status(404).json({ message: `Product ${it.productId} not found` });
        const qty = parseInt(it.quantity) || 1;
        const unitPrice = parseFloat(p.price.toString());
        const subtotalLine = parseFloat((unitPrice * qty).toFixed(2));
        subtotal += subtotalLine;
        lineItems.push({ productId: p.id, name: p.name, quantity: qty, unitPrice, subtotal: subtotalLine });
      }

      const tax = 0; // placeholder
      const total = parseFloat((subtotal + tax).toFixed(2));
      res.json({ success: true, data: { items: lineItems, subtotal, tax, total, currency: 'USD' } });
    } catch (error: any) {
      console.error("Checkout error:", error);
      res.status(500).json({ message: "Failed to create checkout" });
    }
  });

  // Confirm checkout (after successful payment)
  app.post("/api/parent/store/checkout/confirm", authMiddleware, async (req: any, res) => {
    try {
      const { items, paymentReference } = req.body; // items as in checkout
      if (!items || !Array.isArray(items) || items.length === 0) return res.status(400).json({ message: "Items required" });

      // Calculate totals and create purchase
      let subtotal = 0;
      for (const it of items) {
        const p = await db.select().from(products).where(eq(products.id, it.productId));
        if (!p[0]) return res.status(404).json({ message: `Product ${it.productId} not found` });
        const unitPrice = parseFloat(p[0].price.toString());
        subtotal += unitPrice * (parseInt(it.quantity) || 1);
      }
      const total = parseFloat(subtotal.toFixed(2));

      const createdPurchase = await db.insert(parentPurchases).values({ parentId: req.user.userId, totalAmount: total, currency: 'USD', paymentStatus: 'paid', invoiceNumber: paymentReference || null }).returning();
      const purchaseId = createdPurchase[0].id;

      // Insert items
      for (const it of items) {
        const p = await db.select().from(products).where(eq(products.id, it.productId));
        const unitPrice = parseFloat(p[0].price.toString());
        const qty = parseInt(it.quantity) || 1;
        const subtotalLine = parseFloat((unitPrice * qty).toFixed(2));
        await db.insert(parentPurchaseItems).values({ purchaseId, productId: p[0].id, quantity: qty, unitPrice: unitPrice.toString(), subtotal: subtotalLine.toString() });

        // Create owned product in pending_admin_approval
        await db.insert(parentOwnedProducts).values({ parentId: req.user.userId, productId: p[0].id, sourcePurchaseId: purchaseId, status: 'pending_admin_approval' });
      }

      // Notify admins (create notification for admins via notifications table with no parentId)
      const buyerParent = await db.select({ name: parents.name }).from(parents).where(eq(parents.id, req.user.userId));
      const buyerName = buyerParent[0]?.name || "مستخدم";
      await createNotification({ type: 'purchase_paid', title: "💳 طلب شراء جديد", message: `${buyerName} قام بالدفع لطلب الشراء وينتظر الموافقة`, relatedId: purchaseId, metadata: { parentName: buyerName, purchaseId } });

      res.status(201).json({ success: true, data: { purchaseId, message: 'Purchase recorded and pending admin approval' } });
    } catch (error: any) {
      console.error("Checkout confirm error:", error);
      res.status(500).json({ message: "Failed to confirm checkout" });
    }
  });

  // Parent purchases history
  app.get("/api/parent/purchases", authMiddleware, async (req: any, res) => {
    try {
      const purchases = await db.select().from(parentPurchases).where(eq(parentPurchases.parentId, req.user.userId));
      const enriched = await Promise.all(purchases.map(async (p: any) => {
        const items = await db.select().from(parentPurchaseItems).where(eq(parentPurchaseItems.purchaseId, p.id));
        return { ...p, items };
      }));
      res.json({ success: true, data: enriched });
    } catch (error: any) {
      console.error("Fetch parent purchases error:", error);
      res.status(500).json({ message: "Failed to fetch purchases" });
    }
  });

  // Parent owned products
  app.get("/api/parent/owned-products", authMiddleware, async (req: any, res) => {
    try {
      const owned = await db.select().from(parentOwnedProducts).where(eq(parentOwnedProducts.parentId, req.user.userId));
      const enriched = await Promise.all(owned.map(async (o: any) => {
        const prod = await db.select().from(products).where(eq(products.id, o.productId));
        return { ...o, product: prod[0] || null };
      }));
      res.json({ success: true, data: enriched });
    } catch (error: any) {
      console.error("Fetch owned products error:", error);
      res.status(500).json({ message: "Failed to fetch owned products" });
    }
  });

  // Assign owned product to child
  app.post("/api/parent/owned-products/:id/assign-to-child", authMiddleware, async (req: any, res) => {
    try {
      const { id } = req.params; // parentOwnedProducts id
      const { childId, requiredPoints } = req.body;
      const owned = await db.select().from(parentOwnedProducts).where(eq(parentOwnedProducts.id, id));
      if (!owned[0] || owned[0].parentId !== req.user.userId) return res.status(403).json({ message: "Unauthorized" });
      if (owned[0].status !== 'active') return res.status(400).json({ message: "Product not available for assignment — must be approved and active" });

      // create child assigned product
      const assigned = await db.insert(childAssignedProducts).values({ childId, parentOwnedProductId: id, requiredPoints: parseInt(requiredPoints) }).returning();

      // update parent owned product
      await db.update(parentOwnedProducts).set({ status: 'assigned_to_child', updatedAt: new Date() }).where(eq(parentOwnedProducts.id, id));

      // create notification for child (with product name)
      const assignedProduct = await db.select({ name: products.name, nameAr: products.nameAr }).from(products).where(eq(products.id, owned[0].productId));
      const assignedProductName = assignedProduct[0]?.nameAr || assignedProduct[0]?.name || "منتج";
      await createNotification({ childId, type: 'product_assigned', title: "🎁 هدية جديدة في انتظارك!", message: `أضاف والداك "${assignedProductName}" كهدية! اجمع ${requiredPoints} نقطة للحصول عليها`, relatedId: assigned[0].id, metadata: { productName: assignedProductName, requiredPoints } });

      res.json({ success: true, data: assigned[0] });
    } catch (error: any) {
      console.error("Assign to child error:", error);
      res.status(500).json({ message: "Failed to assign product" });
    }
  });

  // Get parent-assigned products across children
  app.get("/api/parent/child-assigned-products", authMiddleware, async (req: any, res) => {
    try {
      // find parent's owned products
      const owned = await db.select().from(parentOwnedProducts).where(eq(parentOwnedProducts.parentId, req.user.userId));
      const ownedIds = owned.map((o: any) => o.id);
      if (ownedIds.length === 0) return res.json({ success: true, data: [] });
      const assigned = await db.select().from(childAssignedProducts).where(sql`parent_owned_product_id = ANY(${ownedIds})`);
      res.json({ success: true, data: assigned });
    } catch (error: any) {
      console.error("Fetch child assigned products error:", error);
      res.status(500).json({ message: "Failed to fetch assigned products" });
    }
  });

  // Request shipping for an assigned product
  app.post("/api/parent/child-assigned-products/:id/request-shipping", authMiddleware, async (req: any, res) => {
    try {
      const { id } = req.params; // childAssignedProducts id
      const { shippingAddress } = req.body;
      const assigned = await db.select().from(childAssignedProducts).where(eq(childAssignedProducts.id, id));
      if (!assigned[0]) return res.status(404).json({ message: "Assigned product not found" });

      // validate ownership
      const owned = await db.select().from(parentOwnedProducts).where(eq(parentOwnedProducts.id, assigned[0].parentOwnedProductId));
      if (!owned[0] || owned[0].parentId !== req.user.userId) return res.status(403).json({ message: "Unauthorized" });

      // check child's points
      const child = await db.select().from(children).where(eq(children.id, assigned[0].childId));
      if (!child[0]) return res.status(404).json({ message: "Child not found" });
      if ((child[0].totalPoints || 0) < assigned[0].requiredPoints) return res.status(400).json({ message: "Child has insufficient points" });

      // create shipping request
      const sr = await db.insert(shippingRequests).values({ assignedProductId: id, parentId: req.user.userId, childId: assigned[0].childId, shippingAddress, status: 'requested' }).returning();

      // update assigned product status
      await db.update(childAssignedProducts).set({ status: 'shipment_requested', shipmentRequestedAt: new Date() }).where(eq(childAssignedProducts.id, id));

      // notify admin (with child name + product info)
      const shippedChild = await db.select({ name: children.name }).from(children).where(eq(children.id, assigned[0].childId));
      const shippedChildName = shippedChild[0]?.name || "طفل";
      await createNotification({ type: 'shipment_requested', title: "📦 طلب شحن جديد", message: `طلب شحن جديد لـ ${shippedChildName} — المنتج: ${id}`, relatedId: sr[0].id, metadata: { childName: shippedChildName, assignedProductId: id } });

      res.json({ success: true, data: sr[0] });
    } catch (error: any) {
      console.error("Request shipping error:", error);
      res.status(500).json({ message: "Failed to request shipping" });
    }
  });

  // ===== Phase 1.3: Gifts - Send Gift =====
  app.post("/api/parent/gifts/send", authMiddleware, async (req: any, res) => {
    try {
      const { entitlementId, childId, pointsThreshold, message } = req.body;

      if (!entitlementId || !childId || !pointsThreshold) {
        return res.status(400).json({ message: "entitlementId, childId, and pointsThreshold are required" });
      }

      if (pointsThreshold <= 0) {
        return res.status(400).json({ message: "pointsThreshold must be positive" });
      }

      // Verify entitlement belongs to parent, is parent-owned, and ACTIVE
      const ent = await db.select().from(entitlements).where(eq(entitlements.id, entitlementId));
      if (!ent[0]) {
        return res.status(404).json({ message: "Entitlement not found" });
      }
      if (ent[0].parentId !== req.user.userId) {
        return res.status(403).json({ message: "Entitlement does not belong to you" });
      }
      if (ent[0].childId !== null) {
        return res.status(400).json({ message: "Entitlement already assigned" });
      }
      if (ent[0].status !== "ACTIVE") {
        return res.status(400).json({ message: "Entitlement is not active" });
      }

      // Verify child belongs to parent
      const link = await db
        .select()
        .from(parentChild)
        .where(and(eq(parentChild.parentId, req.user.userId), eq(parentChild.childId, childId)));
      if (!link[0]) {
        return res.status(403).json({ message: "Child does not belong to you" });
      }

      // Check for existing gift (idempotency: same entitlement + child)
      const existingGift = await db
        .select()
        .from(gifts)
        .where(
          and(
            eq(gifts.productId, ent[0].productId),
            eq(gifts.parentId, req.user.userId),
            eq(gifts.childId, childId),
            sql`${gifts.status} != 'REVOKED'`
          )
        );
      if (existingGift[0]) {
        return res.json({ success: true, data: existingGift[0], message: "Gift already exists" });
      }

      // Create gift (SENT)
      const gift = await db
        .insert(gifts)
        .values({
          parentId: req.user.userId,
          childId,
          productId: ent[0].productId,
          pointsThreshold,
          status: "SENT",
          message: message || null,
        })
        .returning();

      // Update entitlement: assign to child, mark as ASSIGNED_AS_GIFT
      await db
        .update(entitlements)
        .set({
          childId,
          status: "ASSIGNED_AS_GIFT",
          metadata: { ...ent[0].metadata, giftId: gift[0].id },
          updatedAt: new Date(),
        })
        .where(eq(entitlements.id, entitlementId));

      // Emit stub event
      emitGiftEvent({
        type: "gift.sent",
        giftId: gift[0].id,
        parentId: req.user.userId,
        childId,
        productId: ent[0].productId,
        timestamp: new Date(),
      });

      res.status(201).json({ success: true, data: gift[0] });
    } catch (error: any) {
      console.error("Send gift error:", error);
      res.status(500).json({ message: "Failed to send gift" });
    }
  });

  // ===== Phase 1.3: Gifts - List Gifts =====
  app.get("/api/parent/gifts", authMiddleware, async (req: any, res) => {
    try {
      const { status } = req.query;
      let query = db.select().from(gifts).where(eq(gifts.parentId, req.user.userId));
      if (status) {
        query = query.where(and(eq(gifts.parentId, req.user.userId), eq(gifts.status, status)));
      }
      const list = await query;
      res.json({ success: true, data: list });
    } catch (error: any) {
      console.error("List gifts error:", error);
      res.status(500).json({ message: "Failed to list gifts" });
    }
  });

  // ===== Phase 1.3: Gifts - Revoke Gift =====
  app.post("/api/parent/gifts/:id/revoke", authMiddleware, async (req: any, res) => {
    try {
      const { id } = req.params;
      const { reason } = req.body;

      // Lock gift row
      const gift = await db.select().from(gifts).where(eq(gifts.id, id));
      if (!gift[0]) {
        return res.status(404).json({ message: "Gift not found" });
      }
      if (gift[0].parentId !== req.user.userId) {
        return res.status(403).json({ message: "Gift does not belong to you" });
      }
      if (gift[0].status === "ACTIVATED") {
        return res.status(400).json({ message: "Cannot revoke activated gift" });
      }
      if (gift[0].status === "REVOKED") {
        return res.json({ success: true, message: "Gift already revoked" });
      }

      // Update gift to REVOKED
      await db
        .update(gifts)
        .set({ status: "REVOKED", revokedAt: new Date() })
        .where(and(eq(gifts.id, id), sql`${gifts.status} IN ('SENT', 'UNLOCKED')`));

      // Revert entitlement: childId=NULL, status=ACTIVE
      const ent = await db
        .select()
        .from(entitlements)
        .where(
          and(
            eq(entitlements.productId, gift[0].productId),
            eq(entitlements.parentId, req.user.userId),
            eq(entitlements.childId, gift[0].childId)
          )
        );
      if (ent[0]) {
        await db
          .update(entitlements)
          .set({ childId: null, status: "ACTIVE", updatedAt: new Date() })
          .where(eq(entitlements.id, ent[0].id));
      }

      // Activity log
      await db.insert(activityLog).values({
        adminId: null,
        action: "GIFT_REVOKED",
        entity: "gift",
        entityId: id,
        meta: { parentId: req.user.userId, reason: reason || "parent_action" },
      });

      // Emit stub event
      emitGiftEvent({
        type: "gift.revoked",
        giftId: id,
        parentId: req.user.userId,
        childId: gift[0].childId,
        productId: gift[0].productId,
        timestamp: new Date(),
      });

      res.json({ success: true, message: "Gift revoked" });
    } catch (error: any) {
      console.error("Revoke gift error:", error);
      res.status(500).json({ message: "Failed to revoke gift" });
    }
  });

  // ===== SUBJECTS & TEMPLATE TASKS (Public for Parents) =====

  // Get all active subjects
  app.get("/api/subjects", authMiddleware, async (req: any, res) => {
    try {
      const result = await db.select().from(subjects).where(eq(subjects.isActive, true)).orderBy(subjects.name);
      res.json({ success: true, data: result });
    } catch (error: any) {
      console.error("Fetch subjects error:", error);
      res.status(500).json({ message: "Failed to fetch subjects" });
    }
  });

  // Get template tasks for a subject
  app.get("/api/subjects/:subjectId", authMiddleware, async (req: any, res) => {
    try {
      const { subjectId } = req.params;
      const result = await db.select().from(subjects).where(eq(subjects.id, subjectId));
      if (!result[0]) {
        return res.status(404).json({ message: "Subject not found" });
      }
      res.json({ success: true, data: result[0] });
    } catch (error: any) {
      console.error("Fetch subject error:", error);
      res.status(500).json({ message: "Failed to fetch subject" });
    }
  });

  app.get("/api/subjects/:subjectId/templates", authMiddleware, async (req: any, res) => {
    try {
      const { subjectId } = req.params;
      const result = await db.select().from(templateTasks)
        .where(and(eq(templateTasks.subjectId, subjectId), eq(templateTasks.isActive, true)));
      res.json({ success: true, data: result });
    } catch (error: any) {
      console.error("Fetch template tasks error:", error);
      res.status(500).json({ message: "Failed to fetch template tasks" });
    }
  });

  // Alias endpoint for template-tasks
  app.get("/api/subjects/:subjectId/template-tasks", authMiddleware, async (req: any, res) => {
    try {
      const { subjectId } = req.params;
      // Get only admin-created template tasks (not parent-created)
      const result = await db.select().from(templateTasks)
        .where(and(
          eq(templateTasks.subjectId, subjectId), 
          eq(templateTasks.isActive, true),
          eq(templateTasks.createdByParent, false)
        ));
      res.json({ success: true, data: result });
    } catch (error: any) {
      console.error("Fetch template tasks error:", error);
      res.status(500).json({ message: "Failed to fetch template tasks" });
    }
  });

  // Get parent's tasks with subject info
  app.get("/api/parent/tasks", authMiddleware, async (req: any, res) => {
    try {
      const result = await db
        .select({
          task: tasks,
          subject: subjects,
        })
        .from(tasks)
        .leftJoin(subjects, eq(tasks.subjectId, subjects.id))
        .where(eq(tasks.parentId, req.user.userId))
        .orderBy(sql`${tasks.createdAt} DESC`);

      res.json({ success: true, data: result });
    } catch (error: any) {
      console.error("Fetch parent tasks error:", error);
      res.status(500).json({ message: "Failed to fetch tasks" });
    }
  });

  // Get tasks by subject for parent's children
  app.get("/api/parent/tasks/by-subject", authMiddleware, async (req: any, res) => {
    try {
      const parentTasks = await db
        .select({
          task: tasks,
          subject: subjects,
          child: children,
        })
        .from(tasks)
        .leftJoin(subjects, eq(tasks.subjectId, subjects.id))
        .leftJoin(children, eq(tasks.childId, children.id))
        .where(eq(tasks.parentId, req.user.userId))
        .orderBy(sql`${tasks.createdAt} DESC`);

      // Group by subject
      const bySubject: Record<string, any> = {};
      for (const row of parentTasks) {
        const subjectName = row.subject?.name || "بدون مادة";
        const subjectId = row.subject?.id || "none";
        if (!bySubject[subjectId]) {
          bySubject[subjectId] = {
            subject: row.subject || { id: "none", name: "بدون مادة", emoji: "📋", color: "#999" },
            tasks: [],
          };
        }
        bySubject[subjectId].tasks.push({ ...row.task, child: row.child });
      }

      res.json({ success: true, data: Object.values(bySubject) });
    } catch (error: any) {
      console.error("Fetch tasks by subject error:", error);
      res.status(500).json({ message: "Failed to fetch tasks" });
    }
  });

  // Create task from template
  app.post("/api/parent/create-task-from-template", authMiddleware, async (req: any, res) => {
    try {
      const { childId, templateId, pointsReward } = req.body;

      if (!childId || !templateId) {
        return res.status(400).json({ message: "Child and template are required" });
      }

      // Verify parent owns this child
      const link = await db
        .select()
        .from(parentChild)
        .where(and(eq(parentChild.parentId, req.user.userId), eq(parentChild.childId, childId)));

      if (!link[0]) {
        return res.status(403).json({ message: "Unauthorized" });
      }

      // Get template
      const template = await db.select().from(templateTasks).where(eq(templateTasks.id, templateId));
      if (!template[0]) {
        return res.status(404).json({ message: "Template not found" });
      }

      const finalReward = pointsReward || template[0].pointsReward;

      // Check parent wallet balance
      const wallet = await db.select().from(parentWallet).where(eq(parentWallet.parentId, req.user.userId));
      const currentBalance = Number(wallet[0]?.balance || 0);
      if (currentBalance < finalReward) {
        return res.status(400).json({
          success: false,
          error: "INSUFFICIENT_BALANCE",
          message: `رصيدك غير كافي لإرسال هذه المهمة. الرصيد الحالي: ${currentBalance}, المطلوب: ${finalReward}`,
          currentBalance,
          pointsNeeded: finalReward,
        });
      }

      // Deduct from wallet and create task atomically
      const result = await db.transaction(async (tx) => {
        await tx.update(parentWallet)
          .set({
            balance: sql`${parentWallet.balance} - ${finalReward}`,
            totalSpent: sql`${parentWallet.totalSpent} + ${finalReward}`,
            updatedAt: new Date(),
          })
          .where(eq(parentWallet.parentId, req.user.userId));

        const inserted = await tx
          .insert(tasks)
          .values({
            parentId: req.user.userId,
            childId,
            subjectId: template[0].subjectId,
            question: template[0].question,
            answers: template[0].answers,
            pointsReward: finalReward,
          })
          .returning();

        return inserted;
      });

      // Send notification to child
      await createNotification({
        childId,
        type: "task_assigned",
        title: "مهمة جديدة!",
        message: `لديك مهمة جديدة: ${template[0].question.substring(0, 50)}...`,
        relatedId: result[0].id,
        metadata: { taskId: result[0].id, subjectId: template[0].subjectId }
      });

      res.json({ success: true, taskId: result[0].id, message: "Task created from template" });
    } catch (error: any) {
      console.error("Create task from template error:", error);
      res.status(500).json({ message: "Failed to create task" });
    }
  });

  // Get child reports (daily/weekly/monthly)
  app.get("/api/parent/children/:childId/reports", authMiddleware, async (req: any, res) => {
    try {
      const { childId } = req.params;
      const { period = "weekly" } = req.query;

      // Verify parent owns this child
      const link = await db
        .select()
        .from(parentChild)
        .where(and(eq(parentChild.parentId, req.user.userId), eq(parentChild.childId, childId)));

      if (!link[0]) {
        return res.status(403).json({ message: "Unauthorized" });
      }

      // Get child info
      const child = await db.select().from(children).where(eq(children.id, childId));
      if (!child[0]) {
        return res.status(404).json({ message: "Child not found" });
      }

      // Calculate date ranges
      const now = new Date();
      let startDate: Date;
      if (period === "daily") {
        startDate = new Date(now.getFullYear(), now.getMonth(), now.getDate());
      } else if (period === "monthly") {
        startDate = new Date(now.getFullYear(), now.getMonth(), 1);
      } else {
        // weekly default
        const dayOfWeek = now.getDay();
        startDate = new Date(now);
        startDate.setDate(now.getDate() - dayOfWeek);
        startDate.setHours(0, 0, 0, 0);
      }

      // Get tasks in period
      const childTasks = await db
        .select()
        .from(tasks)
        .where(
          and(
            eq(tasks.childId, childId),
            sql`${tasks.createdAt} >= ${startDate.toISOString()}`
          )
        );

      const totalTasks = childTasks.length;
      const completedTasks = childTasks.filter((t: any) => t.status === "completed").length;
      const pendingTasks = childTasks.filter((t: any) => t.status === "pending").length;
      const pointsEarned = childTasks
        .filter((t: any) => t.status === "completed")
        .reduce((sum: number, t: any) => sum + (t.pointsReward || 0), 0);

      // Calculate completion rate
      const completionRate = totalTasks > 0 ? Math.round((completedTasks / totalTasks) * 100) : 0;

      // Get task breakdown by subject
      const tasksBySubject: Record<string, { total: number; completed: number; name: string }> = {};
      for (const task of childTasks) {
        const subjId = task.subjectId || "none";
        if (!tasksBySubject[subjId]) {
          const subj = await db.select().from(subjects).where(eq(subjects.id, subjId));
          tasksBySubject[subjId] = { 
            total: 0, 
            completed: 0, 
            name: subj[0]?.name || "بدون مادة" 
          };
        }
        tasksBySubject[subjId].total++;
        if (task.status === "completed") {
          tasksBySubject[subjId].completed++;
        }
      }

      res.json({
        success: true,
        data: {
          child: {
            id: child[0].id,
            displayName: child[0].displayName,
            points: child[0].points || 0,
            totalPoints: child[0].totalPoints || 0,
            level: child[0].level || 1,
          },
          period,
          startDate: startDate.toISOString(),
          endDate: now.toISOString(),
          summary: {
            totalTasks,
            completedTasks,
            pendingTasks,
            pointsEarned,
            completionRate,
          },
          bySubject: Object.entries(tasksBySubject).map(([id, data]) => ({
            subjectId: id,
            name: data.name,
            total: data.total,
            completed: data.completed,
            rate: data.total > 0 ? Math.round((data.completed / data.total) * 100) : 0,
          })),
        },
      });
    } catch (error: any) {
      console.error("Fetch child reports error:", error);
      res.status(500).json({ message: "Failed to fetch reports" });
    }
  });

  // Get task history with child performance ratings
  app.get("/api/parent/task-history", authMiddleware, async (req: any, res) => {
    try {
      // Get all children for this parent
      const linkedChildren = await db
        .select()
        .from(parentChild)
        .where(eq(parentChild.parentId, req.user.userId));

      const childIds = linkedChildren.map((lc: any) => lc.childId);

      if (childIds.length === 0) {
        return res.json({ success: true, data: { children: [], tasks: [] } });
      }

      // Get children details
      const childrenData = await db
        .select()
        .from(children)
        .where(inArray(children.id, childIds));

      // Get all tasks for these children
      const allTasks = await db
        .select({
          task: tasks,
          subject: subjects,
        })
        .from(tasks)
        .leftJoin(subjects, eq(tasks.subjectId, subjects.id))
        .where(inArray(tasks.childId, childIds))
        .orderBy(sql`${tasks.createdAt} DESC`);

      const taskIds = allTasks.map((t: any) => t.task.id);
      const attemptsMap = new Map<string, { totalAttempts: number; failedAttempts: number; lastAttemptAt: Date | null }>();

      if (taskIds.length > 0) {
        const attempts = await db
          .select({
            taskId: taskResults.taskId,
            childId: taskResults.childId,
            totalAttempts: sql<number>`COUNT(*)`,
            failedAttempts: sql<number>`SUM(CASE WHEN ${taskResults.isCorrect} = false THEN 1 ELSE 0 END)`,
            lastAttemptAt: sql<Date>`MAX(${taskResults.completedAt})`,
          })
          .from(taskResults)
          .where(inArray(taskResults.taskId, taskIds))
          .groupBy(taskResults.taskId, taskResults.childId);

        for (const row of attempts) {
          attemptsMap.set(`${row.taskId}:${row.childId}`, {
            totalAttempts: row.totalAttempts || 0,
            failedAttempts: row.failedAttempts || 0,
            lastAttemptAt: row.lastAttemptAt || null,
          });
        }
      }

      // Calculate ratings for each child
      const childRatings = childrenData.map((child: any) => {
        const childTasks = allTasks.filter((t: any) => t.task.childId === child.id);
        const completed = childTasks.filter((t: any) => t.task.status === "completed").length;
        const total = childTasks.length;
        const rate = total > 0 ? Math.round((completed / total) * 100) : 0;

        // Simple rating based on completion rate
        let rating = 1;
        if (rate >= 90) rating = 5;
        else if (rate >= 70) rating = 4;
        else if (rate >= 50) rating = 3;
        else if (rate >= 30) rating = 2;

        return {
          id: child.id,
          displayName: child.displayName,
          points: child.points || 0,
          totalTasks: total,
          completedTasks: completed,
          completionRate: rate,
          rating,
        };
      });

      res.json({
        success: true,
        data: {
          children: childRatings,
          tasks: allTasks.slice(0, 50).map((t: any) => {
            const attemptStats = attemptsMap.get(`${t.task.id}:${t.task.childId}`);
            return {
              id: t.task.id,
              question: t.task.question,
              status: t.task.status,
              pointsReward: t.task.pointsReward,
              childId: t.task.childId,
              createdAt: t.task.createdAt,
              subject: t.subject ? { id: t.subject.id, name: t.subject.name, emoji: t.subject.emoji } : null,
              totalAttempts: attemptStats?.totalAttempts || 0,
              failedAttempts: attemptStats?.failedAttempts || 0,
              lastAttemptAt: attemptStats?.lastAttemptAt || null,
            };
          }),
        },
      });
    } catch (error: any) {
      console.error("Fetch task history error:", error);
      res.status(500).json({ message: "Failed to fetch task history" });
    }
  });

  // Get parent's custom tasks (my tasks)
  app.get("/api/parent/my-tasks", authMiddleware, async (req: any, res) => {
    try {
      const { subjectId } = req.query;
      
      let query = db.select().from(templateTasks)
        .where(and(
          eq(templateTasks.createdByParent, true),
          eq(templateTasks.parentId, req.user.userId)
        ));
      
      if (subjectId) {
        query = db.select().from(templateTasks)
          .where(and(
            eq(templateTasks.createdByParent, true),
            eq(templateTasks.parentId, req.user.userId),
            eq(templateTasks.subjectId, subjectId as string)
          ));
      }

      const myTasks = await query;
      res.json({ success: true, data: myTasks });
    } catch (error: any) {
      console.error("Fetch my tasks error:", error);
      res.status(500).json({ message: "Failed to fetch my tasks" });
    }
  });

  // Get public tasks from other parents
  app.get("/api/parent/public-tasks", authMiddleware, async (req: any, res) => {
    try {
      const { subjectId } = req.query;
      const parentId = req.user.userId;
      
      let whereConditions = and(
        eq(templateTasks.createdByParent, true),
        eq(templateTasks.isPublic, true),
        eq(templateTasks.isActive, true),
        sql`${templateTasks.parentId} != ${parentId}`
      );
      
      if (subjectId) {
        whereConditions = and(
          whereConditions,
          eq(templateTasks.subjectId, subjectId as string)
        );
      }

      const publicTasks = await db.select({
        id: templateTasks.id,
        title: templateTasks.title,
        question: templateTasks.question,
        answers: templateTasks.answers,
        pointsReward: templateTasks.pointsReward,
        pointsCost: templateTasks.pointsCost,
        difficulty: templateTasks.difficulty,
        subjectId: templateTasks.subjectId,
        usageCount: templateTasks.usageCount,
        createdAt: templateTasks.createdAt,
        creatorName: parents.name,
      })
      .from(templateTasks)
      .leftJoin(parents, eq(templateTasks.parentId, parents.id))
      .where(whereConditions);

      res.json({ success: true, data: publicTasks });
    } catch (error: any) {
      console.error("Fetch public tasks error:", error);
      res.status(500).json({ message: "Failed to fetch public tasks" });
    }
  });

  // Create custom task
  app.post("/api/parent/create-custom-task", authMiddleware, async (req: any, res) => {
    try {
      const { title, question, answers, pointsReward, subjectId, isPublic, pointsCost } = req.body;

      if (!title || !question || !answers || !subjectId) {
        return res.status(400).json({ message: "Missing required fields" });
      }

      const normalizedAnswers = normalizeAnswersForStorage(answers, 0);
      const correctCount = normalizedAnswers.filter((a) => a.isCorrect).length;
      if (correctCount !== 1) {
        return res.status(400).json({
          message: "Exactly one correct answer is required",
        });
      }

      const newTask = await db.insert(templateTasks).values({
        title,
        question,
        answers: normalizedAnswers,
        pointsReward: pointsReward || 10,
        subjectId,
        difficulty: "medium",
        createdByParent: true,
        parentId: req.user.userId,
        isActive: true,
        isPublic: isPublic || false,
        pointsCost: pointsCost || 5,
      }).returning();

      res.json({ success: true, data: newTask[0] });
    } catch (error: any) {
      console.error("Create custom task error:", error);
      res.status(500).json({ message: "Failed to create custom task" });
    }
  });

  // Create and send task directly to child (with optional template save)
  app.post("/api/parent/create-and-send-task", authMiddleware, async (req: any, res) => {
    try {
      const { 
        title, 
        question, 
        answers, 
        pointsReward, 
        subjectId, 
        difficulty,
        childId, 
        saveAsTemplate,
        taskMedia 
      } = req.body;
      const parentId = req.user.userId;

      // Validation
      if (!childId || !question || !answers || !pointsReward) {
        return res.status(400).json({ 
          success: false,
          error: "BAD_REQUEST",
          message: "الحقول المطلوبة: childId, question, answers, pointsReward" 
        });
      }

      // Security: Verify child belongs to parent via parentChild table
      const link = await db.select().from(parentChild)
        .where(and(
          eq(parentChild.parentId, parentId),
          eq(parentChild.childId, childId)
        ));
      
      if (!link[0]) {
        return res.status(403).json({ 
          success: false,
          error: "PARENT_CHILD_MISMATCH",
          message: "هذا الطفل غير مرتبط بحسابك" 
        });
      }

      let templateTaskId = null;

      // Normalize answers to ensure each has an id and isCorrect flag
      const normalizedAnswers = normalizeAnswersForStorage(answers, 0);
      const correctCount = normalizedAnswers.filter((a) => a.isCorrect).length;
      if (correctCount !== 1) {
        return res.status(400).json({
          success: false,
          error: "BAD_REQUEST",
          message: "Exactly one correct answer is required",
        });
      }

      const finalReward = pointsReward || 10;

      // Check parent wallet balance
      const wallet = await db.select().from(parentWallet).where(eq(parentWallet.parentId, parentId));
      const currentBalance = Number(wallet[0]?.balance || 0);
      if (currentBalance < finalReward) {
        return res.status(400).json({
          success: false,
          error: "INSUFFICIENT_BALANCE",
          message: `رصيدك غير كافي لإرسال هذه المهمة. الرصيد الحالي: ${currentBalance}, المطلوب: ${finalReward}`,
          currentBalance,
          pointsNeeded: finalReward,
        });
      }

      // Optionally save as template for reuse
      if (saveAsTemplate && title && subjectId) {
        const templateResult = await db.insert(templateTasks).values({
          title,
          question,
          answers: normalizedAnswers,
          pointsReward: finalReward,
          subjectId,
          difficulty: difficulty || "medium",
          createdByParent: true,
          parentId,
          isActive: true,
          isPublic: false,
          pointsCost: 5,
        }).returning();
        templateTaskId = templateResult[0]?.id;
      }

      // Deduct from wallet and create task atomically
      const newTask = await db.transaction(async (tx) => {
        await tx.update(parentWallet)
          .set({
            balance: sql`${parentWallet.balance} - ${finalReward}`,
            totalSpent: sql`${parentWallet.totalSpent} + ${finalReward}`,
            updatedAt: new Date(),
          })
          .where(eq(parentWallet.parentId, parentId));

        const inserted = await tx.insert(tasks).values({
          parentId,
          childId,
          subjectId: subjectId || null,
          question,
          answers: normalizedAnswers,
          pointsReward: finalReward,
          status: "pending",
          imageUrl: taskMedia?.url || null,
        }).returning();

        return inserted;
      });

      // Send notification to child
      await createNotification({
        childId,
        type: "task",
        title: "مهمة جديدة!",
        message: `لديك مهمة جديدة${title ? `: ${title}` : ""}`,
        relatedId: newTask[0].id,
        metadata: { taskId: newTask[0].id },
      });

      res.json({ 
        success: true, 
        data: { 
          task: newTask[0], 
          templateTaskId 
        } 
      });
    } catch (error: any) {
      console.error("Create and send task error:", error);
      res.status(500).json({ 
        success: false,
        error: "INTERNAL_SERVER_ERROR",
        message: "فشل في إنشاء وإرسال المهمة" 
      });
    }
  });

  // Send template task to child (with payment for public tasks)
  app.post("/api/parent/send-template-task", authMiddleware, async (req: any, res) => {
    try {
      const { templateTaskId, childId, points } = req.body;
      const buyerParentId = req.user.userId;

      if (!templateTaskId || !childId) {
        return res.status(400).json({ message: "Template task ID and child ID are required" });
      }

      // Verify child belongs to parent
      const link = await db.select().from(parentChild)
        .where(and(eq(parentChild.parentId, buyerParentId), eq(parentChild.childId, childId)));
      
      if (!link[0]) {
        return res.status(403).json({ message: "Child not linked to this parent" });
      }

      // Get template task
      const template = await db.select().from(templateTasks).where(eq(templateTasks.id, templateTaskId));
      if (!template[0]) {
        return res.status(404).json({ message: "Template task not found" });
      }

      // If it's a public task from another parent, handle payment
      if (template[0].isPublic && template[0].parentId && template[0].parentId !== buyerParentId) {
        const pointsCost = template[0].pointsCost || 5;
        const commission = Math.ceil(pointsCost * 0.10);
        const sellerReceives = pointsCost - commission;
        let pointsAvailable = 0;

        try {
          await db.transaction(async (tx) => {
            const childData = await tx.select().from(children).where(eq(children.id, childId));
            pointsAvailable = childData[0]?.totalPoints || 0;

            if (!childData[0] || pointsAvailable < pointsCost) {
              throw new Error("INSUFFICIENT_POINTS");
            }

            await applyPointsDelta(tx, {
              childId,
              delta: -pointsCost,
              reason: "TEMPLATE_TASK_PURCHASE",
              requestId: templateTaskId,
              minBalance: 0,
              clampToMinBalance: false,
            });

            const sellerChildren = await tx.select()
              .from(parentChild)
              .where(eq(parentChild.parentId, template[0].parentId))
              .orderBy(parentChild.linkedAt);

            if (sellerChildren.length > 0 && sellerChildren[0].childId) {
              await applyPointsDelta(tx, {
                childId: sellerChildren[0].childId,
                delta: sellerReceives,
                reason: "TEMPLATE_TASK_SALE",
                requestId: templateTaskId,
              });
            }

            await tx.update(templateTasks)
              .set({ usageCount: sql`${templateTasks.usageCount} + 1` })
              .where(eq(templateTasks.id, templateTaskId));

            await tx.insert(profitTransactions).values({
              sellerId: template[0].parentId,
              buyerId: buyerParentId,
              templateTaskId: templateTaskId,
              totalPoints: pointsCost,
              sellerEarnings: sellerReceives,
              appCommission: commission,
              commissionRate: 10,
            });
          });
        } catch (error: any) {
          if (error?.message === "INSUFFICIENT_POINTS") {
            return res.status(400).json({
              message: "نقاط الطفل غير كافية",
              pointsNeeded: pointsCost,
              pointsAvailable,
            });
          }
          throw error;
        }

        const sellerChildren = await db.select()
          .from(parentChild)
          .where(eq(parentChild.parentId, template[0].parentId))
          .orderBy(parentChild.linkedAt);

        if (sellerChildren.length > 0 && sellerChildren[0].childId) {
          await createNotification({
            childId: sellerChildren[0].childId,
            type: "reward",
            title: "مكافأة!",
            message: `حصلت على ${sellerReceives} نقطة من مشاركة مهمة!`,
            metadata: { points: sellerReceives, taskId: template[0].id },
          });
        }
      }

      const finalReward = points || template[0].pointsReward;

      // Check parent wallet balance before creating task
      const buyerWallet = await db.select().from(parentWallet).where(eq(parentWallet.parentId, buyerParentId));
      const buyerBalance = Number(buyerWallet[0]?.balance || 0);
      if (buyerBalance < finalReward) {
        return res.status(400).json({
          success: false,
          error: "INSUFFICIENT_BALANCE",
          message: `رصيدك غير كافي لإرسال هذه المهمة. الرصيد الحالي: ${buyerBalance}, المطلوب: ${finalReward}`,
          currentBalance: buyerBalance,
          pointsNeeded: finalReward,
        });
      }

      // Deduct from wallet and create task atomically
      const newTask = await db.transaction(async (tx) => {
        await tx.update(parentWallet)
          .set({
            balance: sql`${parentWallet.balance} - ${finalReward}`,
            totalSpent: sql`${parentWallet.totalSpent} + ${finalReward}`,
            updatedAt: new Date(),
          })
          .where(eq(parentWallet.parentId, buyerParentId));

        const inserted = await tx.insert(tasks).values({
          parentId: buyerParentId,
          childId,
          subjectId: template[0].subjectId,
          question: template[0].question,
          answers: template[0].answers,
          pointsReward: finalReward,
          status: "pending",
        }).returning();

        return inserted;
      });

      // Send notification to child
      await createNotification({
        childId,
        type: "task",
        title: "مهمة جديدة!",
        message: `لديك مهمة جديدة: ${template[0].title}`,
        relatedId: newTask[0].id,
        metadata: { taskId: newTask[0].id },
      });

      res.json({ success: true, data: newTask[0] });
    } catch (error: any) {
      console.error("Send template task error:", error);
      res.status(500).json({ message: "Failed to send task" });
    }
  });

  // Update custom task (full edit capability)
  const updateTaskSchema = z.object({
    title: z.string().min(1).optional(),
    question: z.string().min(1).optional(),
    answers: z.array(z.object({
      id: z.string(),
      text: z.string(),
      isCorrect: z.boolean(),
      imageUrl: z.string().url().optional().or(z.literal("")).optional(),
    })).optional(),
    pointsReward: z.number().int().positive().optional(),
    subjectId: z.string().uuid().optional(),
    isPublic: z.boolean().optional(),
    pointsCost: z.number().int().min(0).optional(),
  });

  app.patch("/api/parent/my-tasks/:taskId", authMiddleware, async (req: any, res) => {
    try {
      const { taskId } = req.params;
      
      const validation = updateTaskSchema.safeParse(req.body);
      if (!validation.success) {
        return res.status(400).json({ message: "Invalid request data", errors: validation.error.errors });
      }
      
      const { title, question, answers, pointsReward, subjectId, isPublic, pointsCost } = validation.data;

      // Verify task belongs to parent
      const task = await db.select().from(templateTasks)
        .where(and(eq(templateTasks.id, taskId), eq(templateTasks.parentId, req.user.userId)));
      
      if (!task[0]) {
        return res.status(404).json({ message: "Task not found" });
      }

      const updateData: any = {};
      if (title !== undefined) updateData.title = title;
      if (question !== undefined) updateData.question = question;
      if (answers !== undefined) updateData.answers = answers;
      if (pointsReward !== undefined) updateData.pointsReward = pointsReward;
      if (subjectId !== undefined) updateData.subjectId = subjectId;
      if (isPublic !== undefined) updateData.isPublic = isPublic;
      if (pointsCost !== undefined) updateData.pointsCost = pointsCost;

      const updated = await db.update(templateTasks)
        .set(updateData)
        .where(eq(templateTasks.id, taskId))
        .returning();

      res.json({ success: true, data: updated[0] });
    } catch (error: any) {
      console.error("Update task error:", error);
      res.status(500).json({ message: "Failed to update task" });
    }
  });

  // ===== Scheduled Tasks =====

  // Get scheduled tasks for parent
  app.get("/api/parent/scheduled-tasks", authMiddleware, async (req: any, res) => {
    try {
      const parentId = req.user.userId;
      const scheduled = await db.select().from(scheduledTasks)
        .where(eq(scheduledTasks.parentId, parentId));
      
      // Get child names
      const scheduledWithChildren = await Promise.all(scheduled.map(async (task: any) => {
        const child = await db.select().from(children).where(eq(children.id, task.childId));
        return {
          ...task,
          childName: child[0]?.name || "Unknown",
        };
      }));
      
      res.json({ success: true, data: scheduledWithChildren });
    } catch (error: any) {
      console.error("Get scheduled tasks error:", error);
      res.status(500).json({ message: "Failed to fetch scheduled tasks" });
    }
  });

  // Create scheduled task
  app.post("/api/parent/scheduled-tasks", authMiddleware, async (req: any, res) => {
    try {
      const parentId = req.user.userId;
      const { childId, templateTaskId, question, answers, pointsReward, scheduledAt } = req.body;
      
      if (!childId || !question || !answers || !scheduledAt) {
        return res.status(400).json({ message: "Missing required fields" });
      }
      
      // Verify child belongs to parent
      const childLink = await db.select().from(parentChild)
        .where(and(eq(parentChild.parentId, parentId), eq(parentChild.childId, childId)));
      
      if (!childLink[0]) {
        return res.status(403).json({ message: "Child not linked to parent" });
      }
      
      const scheduled = await db.insert(scheduledTasks).values({
        parentId,
        childId,
        templateTaskId: templateTaskId || null,
        question,
        answers,
        pointsReward: pointsReward || 10,
        scheduledAt: new Date(scheduledAt),
      }).returning();
      
      res.json({ success: true, data: scheduled[0] });
    } catch (error: any) {
      console.error("Create scheduled task error:", error);
      res.status(500).json({ message: "Failed to create scheduled task" });
    }
  });

  // Cancel scheduled task
  app.patch("/api/parent/scheduled-tasks/:id/cancel", authMiddleware, async (req: any, res) => {
    try {
      const { id } = req.params;
      const parentId = req.user.userId;
      
      const scheduled = await db.select().from(scheduledTasks)
        .where(and(eq(scheduledTasks.id, id), eq(scheduledTasks.parentId, parentId)));
      
      if (!scheduled[0]) {
        return res.status(404).json({ message: "Scheduled task not found" });
      }
      
      if (scheduled[0].status !== "pending") {
        return res.status(400).json({ message: "Cannot cancel non-pending task" });
      }
      
      const updated = await db.update(scheduledTasks)
        .set({ status: "cancelled" })
        .where(eq(scheduledTasks.id, id))
        .returning();
      
      res.json({ success: true, data: updated[0] });
    } catch (error: any) {
      console.error("Cancel scheduled task error:", error);
      res.status(500).json({ message: "Failed to cancel scheduled task" });
    }
  });

  // Delete scheduled task
  app.delete("/api/parent/scheduled-tasks/:id", authMiddleware, async (req: any, res) => {
    try {
      const { id } = req.params;
      const parentId = req.user.userId;
      
      const scheduled = await db.select().from(scheduledTasks)
        .where(and(eq(scheduledTasks.id, id), eq(scheduledTasks.parentId, parentId)));
      
      if (!scheduled[0]) {
        return res.status(404).json({ message: "Scheduled task not found" });
      }
      
      await db.delete(scheduledTasks).where(eq(scheduledTasks.id, id));
      
      res.json({ success: true, message: "Scheduled task deleted" });
    } catch (error: any) {
      console.error("Delete scheduled task error:", error);
      res.status(500).json({ message: "Failed to delete scheduled task" });
    }
  });

  // Get parent notifications (from admin)
  app.get("/api/parent/admin-notifications", authMiddleware, async (req: any, res) => {
    try {
      const parentId = req.user.userId;
      const notificationsList = await db.select().from(parentNotifications)
        .where(eq(parentNotifications.parentId, parentId));
      
      res.json({ success: true, data: notificationsList });
    } catch (error: any) {
      console.error("Get admin notifications error:", error);
      res.status(500).json({ message: "Failed to fetch notifications" });
    }
  });

  // Mark notification as read
  app.patch("/api/parent/admin-notifications/:id/read", authMiddleware, async (req: any, res) => {
    try {
      const { id } = req.params;
      const parentId = req.user.userId;
      
      const notification = await db.select().from(parentNotifications)
        .where(and(eq(parentNotifications.id, id), eq(parentNotifications.parentId, parentId)));
      
      if (!notification[0]) {
        return res.status(404).json({ message: "Notification not found" });
      }
      
      const updated = await db.update(parentNotifications)
        .set({ isRead: true })
        .where(eq(parentNotifications.id, id))
        .returning();
      
      res.json({ success: true, data: updated[0] });
    } catch (error: any) {
      console.error("Mark notification read error:", error);
      res.status(500).json({ message: "Failed to mark notification as read" });
    }
  });

  // ================= PARENT GAME CONTROL =================

  // Get all games + child's assignments
  app.get("/api/parent/children/:childId/games", authMiddleware, async (req: any, res) => {
    try {
      const parentId = req.user.userId;
      const { childId } = req.params;

      // Verify parent owns child
      const link = await db.select().from(parentChild)
        .where(and(eq(parentChild.parentId, parentId), eq(parentChild.childId, childId)));
      if (!link[0]) {
        return res.status(403).json(errorResponse(ErrorCode.UNAUTHORIZED, "Not authorized"));
      }

      // Get all active games
      const allGames = await db.select().from(flashGames).where(eq(flashGames.isActive, true));

      // Get child's assignments
      const assignments = await db.select().from(childGameAssignments)
        .where(eq(childGameAssignments.childId, childId));
      const assignmentMap = new Map(assignments.map(a => [a.gameId, a]));

      // Get today's play counts per game
      const todayStart = new Date();
      todayStart.setHours(0, 0, 0, 0);
      const todayPlays = await db.select({
        gameId: gamePlayHistory.gameId,
        count: sql<number>`count(*)`,
        totalPoints: sql<number>`coalesce(sum(${gamePlayHistory.pointsEarned}), 0)`,
      })
        .from(gamePlayHistory)
        .where(and(
          eq(gamePlayHistory.childId, childId),
          sql`${gamePlayHistory.playedAt} >= ${todayStart}`
        ))
        .groupBy(gamePlayHistory.gameId);
      const todayPlayMap = new Map(todayPlays.map(p => [p.gameId, { count: Number(p.count), points: Number(p.totalPoints) }]));

      // Get total play counts per game
      const totalPlays = await db.select({
        gameId: gamePlayHistory.gameId,
        count: sql<number>`count(*)`,
        totalPoints: sql<number>`coalesce(sum(${gamePlayHistory.pointsEarned}), 0)`,
      })
        .from(gamePlayHistory)
        .where(eq(gamePlayHistory.childId, childId))
        .groupBy(gamePlayHistory.gameId);
      const totalPlayMap = new Map(totalPlays.map(p => [p.gameId, { count: Number(p.count), points: Number(p.totalPoints) }]));

      const gamesWithStatus = allGames.map(game => {
        const assignment = assignmentMap.get(game.id);
        const today = todayPlayMap.get(game.id) || { count: 0, points: 0 };
        const total = totalPlayMap.get(game.id) || { count: 0, points: 0 };
        return {
          ...game,
          isAssigned: !!assignment,
          assignmentActive: assignment?.isActive ?? true,
          maxPlaysPerDay: assignment?.maxPlaysPerDay || game.maxPlaysPerDay || 0,
          todayPlays: today.count,
          todayPoints: today.points,
          totalPlays: total.count,
          totalPoints: total.points,
        };
      });

      res.json(successResponse(gamesWithStatus));
    } catch (error: any) {
      console.error("Parent get child games error:", error);
      res.status(500).json(errorResponse(ErrorCode.INTERNAL_SERVER_ERROR, "Failed to fetch games"));
    }
  });

  // Parent: assign/unassign games for child (bulk replace)
  app.put("/api/parent/children/:childId/games", authMiddleware, async (req: any, res) => {
    try {
      const parentId = req.user.userId;
      const { childId } = req.params;
      const { gameIds, maxPlaysPerDay } = req.body;

      // Verify parent owns child
      const link = await db.select().from(parentChild)
        .where(and(eq(parentChild.parentId, parentId), eq(parentChild.childId, childId)));
      if (!link[0]) {
        return res.status(403).json(errorResponse(ErrorCode.UNAUTHORIZED, "Not authorized"));
      }

      if (!Array.isArray(gameIds)) {
        return res.status(400).json(errorResponse(ErrorCode.BAD_REQUEST, "gameIds array is required"));
      }

      // Delete all existing and re-insert
      await db.delete(childGameAssignments).where(eq(childGameAssignments.childId, childId));

      if (gameIds.length > 0) {
        await db.insert(childGameAssignments).values(
          gameIds.map((gameId: string) => ({
            childId,
            gameId,
            maxPlaysPerDay: maxPlaysPerDay || 0,
            assignedBy: parentId,
          }))
        );
      }

      res.json(successResponse({ total: gameIds.length }, `${gameIds.length} games assigned`));
    } catch (error: any) {
      console.error("Parent assign games error:", error);
      res.status(500).json(errorResponse(ErrorCode.INTERNAL_SERVER_ERROR, "Failed to assign games"));
    }
  });

  // Parent: update daily limit for a specific game
  app.patch("/api/parent/children/:childId/games/:gameId", authMiddleware, async (req: any, res) => {
    try {
      const parentId = req.user.userId;
      const { childId, gameId } = req.params;
      const { maxPlaysPerDay, isActive } = req.body;

      // Verify parent owns child
      const link = await db.select().from(parentChild)
        .where(and(eq(parentChild.parentId, parentId), eq(parentChild.childId, childId)));
      if (!link[0]) {
        return res.status(403).json(errorResponse(ErrorCode.UNAUTHORIZED, "Not authorized"));
      }

      // Check if assignment exists
      const existing = await db.select().from(childGameAssignments)
        .where(and(eq(childGameAssignments.childId, childId), eq(childGameAssignments.gameId, gameId)));

      if (!existing[0]) {
        // Create new assignment
        const [created] = await db.insert(childGameAssignments).values({
          childId,
          gameId,
          maxPlaysPerDay: maxPlaysPerDay || 0,
          isActive: isActive !== undefined ? isActive : true,
          assignedBy: parentId,
        }).returning();
        return res.json(successResponse(created, "Assignment created"));
      }

      // Update existing
      const updateData: Record<string, any> = {};
      if (maxPlaysPerDay !== undefined) updateData.maxPlaysPerDay = maxPlaysPerDay;
      if (isActive !== undefined) updateData.isActive = isActive;

      const [updated] = await db.update(childGameAssignments)
        .set(updateData)
        .where(and(eq(childGameAssignments.childId, childId), eq(childGameAssignments.gameId, gameId)))
        .returning();

      res.json(successResponse(updated, "Assignment updated"));
    } catch (error: any) {
      console.error("Parent update game assignment error:", error);
      res.status(500).json(errorResponse(ErrorCode.INTERNAL_SERVER_ERROR, "Failed to update game"));
    }
  });

  // Parent: get child game statistics
  app.get("/api/parent/children/:childId/game-stats", authMiddleware, async (req: any, res) => {
    try {
      const parentId = req.user.userId;
      const { childId } = req.params;

      // Verify parent owns child
      const link = await db.select().from(parentChild)
        .where(and(eq(parentChild.parentId, parentId), eq(parentChild.childId, childId)));
      if (!link[0]) {
        return res.status(403).json(errorResponse(ErrorCode.UNAUTHORIZED, "Not authorized"));
      }

      // Today's stats
      const todayStart = new Date();
      todayStart.setHours(0, 0, 0, 0);
      const todayStats = await db.select({
        count: sql<number>`count(*)`,
        totalPoints: sql<number>`coalesce(sum(${gamePlayHistory.pointsEarned}), 0)`,
      })
        .from(gamePlayHistory)
        .where(and(
          eq(gamePlayHistory.childId, childId),
          sql`${gamePlayHistory.playedAt} >= ${todayStart}`
        ));

      // All-time stats
      const allTimeStats = await db.select({
        count: sql<number>`count(*)`,
        totalPoints: sql<number>`coalesce(sum(${gamePlayHistory.pointsEarned}), 0)`,
      })
        .from(gamePlayHistory)
        .where(eq(gamePlayHistory.childId, childId));

      // Recent plays (last 10)
      const recentPlays = await db.select({
        id: gamePlayHistory.id,
        gameId: gamePlayHistory.gameId,
        pointsEarned: gamePlayHistory.pointsEarned,
        playedAt: gamePlayHistory.playedAt,
        gameTitle: flashGames.title,
        gameThumbnail: flashGames.thumbnailUrl,
      })
        .from(gamePlayHistory)
        .innerJoin(flashGames, eq(gamePlayHistory.gameId, flashGames.id))
        .where(eq(gamePlayHistory.childId, childId))
        .orderBy(desc(gamePlayHistory.playedAt))
        .limit(10);

      // Growth tree data
      const tree = await db.select().from(childGrowthTrees)
        .where(eq(childGrowthTrees.childId, childId));

      // Assigned games count
      const assignedCount = await db.select({ count: sql<number>`count(*)` })
        .from(childGameAssignments)
        .where(and(eq(childGameAssignments.childId, childId), eq(childGameAssignments.isActive, true)));

      res.json(successResponse({
        today: {
          gamesPlayed: Number(todayStats[0]?.count || 0),
          pointsEarned: Number(todayStats[0]?.totalPoints || 0),
        },
        allTime: {
          gamesPlayed: Number(allTimeStats[0]?.count || 0),
          pointsEarned: Number(allTimeStats[0]?.totalPoints || 0),
        },
        assignedGames: Number(assignedCount[0]?.count || 0),
        gamesPlayedInTree: tree[0]?.gamesPlayed || 0,
        recentPlays,
      }));
    } catch (error: any) {
      console.error("Parent get child game stats error:", error);
      res.status(500).json(errorResponse(ErrorCode.INTERNAL_SERVER_ERROR, "Failed to fetch game stats"));
    }
  });
}
