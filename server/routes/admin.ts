import type { Express } from "express";
import { storage } from "../storage";
import { successResponse, errorResponse, ErrorCode } from "../utils/apiResponse";
import {
  admins,
  products,
  productCategories,
  parents,
  children,
  orders,
  deposits,
  parentWallet,
  paymentMethods,
  parentPurchases,
  parentPurchaseItems,
  parentOwnedProducts,
  childAssignedProducts,
  shippingRequests,
  sessions,
  loginHistory,
  activityLog,
  storeOrders,
  webhookEvents,
  entitlements,
  walletTransfers,
  gifts,
  flashGames,
  subjects,
  templateTasks,
  tasks,
  appSettings,
  symbols,
  notifications,
  referrals,
  parentReferralCodes,
  referralSettings,
  ads,
  adClicks,
  adShares,
  parentChild,
  scheduledTasks,
  profitTransactions,
  parentNotifications,
  libraries,
  libraryProducts,
  libraryReferrals,
  libraryActivityLogs,
  libraryReferralSettings,
  libraryOrders,
  libraryBalances,
  libraryWithdrawalRequests,
  libraryDailyInvoices,
  schools,
  schoolTeachers,
  schoolPosts,
  schoolReviews,
  teacherReviews,
  teacherTasks,
  teacherTaskOrders,
  teacherBalances,
  teacherWithdrawalRequests,
  schoolActivityLogs,
  schoolReferralSettings,
  childSchoolAssignment,
  childTeacherAssignment,
  teacherHiring,
  teacherTransfers,
  pointAdjustments,
  socialLoginProviders,
  parentSocialIdentities,
  otpProviders,
  siteSettings,
  childGameAssignments,
  gamePlayHistory,
  tasksSettings,
  growthTreeSettings,
  childWateringLog,
  childGrowthTrees,
  childGrowthEvents,
  orderItems,
  transactions,
  childPurchases,
} from "../../shared/schema";
import { createNotification } from "../notifications";
import { emitGiftEvent } from "../giftEvents";
import { eq, sum, and, isNull, not, or, sql, desc, inArray, count } from "drizzle-orm";
import jwt from "jsonwebtoken";
import bcrypt from "bcrypt";
import { JWT_SECRET, adminMiddleware } from "./middleware";
import { applyPointsDelta } from "../services/pointsService";
import { NOTIFICATION_TYPES, NOTIFICATION_STYLES, NOTIFICATION_PRIORITIES, type NotificationType } from "../../shared/notificationTypes";

const db = storage.db;

export async function registerAdminRoutes(app: Express) {
  // Admin Login — username + password only (email hidden)
  app.post("/api/admin/login", async (req, res) => {
    try {
      const { username, password } = req.body;
      if (!username || !password) {
        return res
          .status(400)
          .json(errorResponse(ErrorCode.BAD_REQUEST, "Username and password are required"));
      }

      const result = await db.select().from(admins).where(eq(admins.username, username));
      if (!result[0]) {
        return res
          .status(401)
          .json(errorResponse(ErrorCode.UNAUTHORIZED, "Invalid credentials"));
      }

      const passwordMatch = await bcrypt.compare(password, result[0].password);
      if (!passwordMatch) {
        return res
          .status(401)
          .json(errorResponse(ErrorCode.UNAUTHORIZED, "Invalid credentials"));
      }

      const token = jwt.sign(
        { adminId: result[0].id, type: "admin", role: result[0].role },
        JWT_SECRET,
        { expiresIn: "7d" }
      );
      res.json(successResponse({ token, adminId: result[0].id, role: result[0].role }));
    } catch (error: any) {
      console.error("Admin login error:", error);
      res
        .status(500)
        .json(errorResponse(ErrorCode.INTERNAL_SERVER_ERROR, "Login failed"));
    }
  });

  // Admin Register - Protected with secret key
  app.post("/api/admin/register", async (req, res) => {
    try {
      const { username, email, password, adminSecret } = req.body;
      
      // SEC-001 FIX: Require admin creation secret
      const ADMIN_CREATION_SECRET = process.env['ADMIN_CREATION_SECRET'];
      if (!ADMIN_CREATION_SECRET || adminSecret !== ADMIN_CREATION_SECRET) {
        return res
          .status(403)
          .json(errorResponse(ErrorCode.UNAUTHORIZED, "Admin registration not allowed"));
      }
      
      if (!username || !password) {
        return res
          .status(400)
          .json(errorResponse(ErrorCode.BAD_REQUEST, "Username and password are required"));
      }

      if (username.length < 3 || username.length > 50) {
        return res
          .status(400)
          .json(errorResponse(ErrorCode.BAD_REQUEST, "Username must be 3-50 characters"));
      }

      if (!/^[a-zA-Z0-9_]+$/.test(username)) {
        return res
          .status(400)
          .json(errorResponse(ErrorCode.BAD_REQUEST, "Username can only contain letters, numbers, and underscores"));
      }

      if (password.length < 8) {
        return res
          .status(400)
          .json(errorResponse(ErrorCode.BAD_REQUEST, "Password must be at least 8 characters"));
      }

      const existingUsername = await db.select().from(admins).where(eq(admins.username, username));
      if (existingUsername[0]) {
        return res
          .status(400)
          .json(errorResponse(ErrorCode.BAD_REQUEST, "Username already taken"));
      }

      if (email) {
        const existingEmail = await db.select().from(admins).where(eq(admins.email, email));
        if (existingEmail[0]) {
          return res
            .status(400)
            .json(errorResponse(ErrorCode.BAD_REQUEST, "Email already in use"));
        }
      }

      const hashedPassword = await bcrypt.hash(password, 10);
      const result = await db.insert(admins).values({
        username,
        email: email || `${username}@admin.local`,
        password: hashedPassword,
      }).returning();

      const token = jwt.sign(
        { adminId: result[0].id, type: "admin", role: result[0].role },
        JWT_SECRET,
        { expiresIn: "7d" }
      );
      res.json(successResponse({ token, adminId: result[0].id, role: result[0].role }));
    } catch (error: any) {
      console.error("Admin register error:", error);
      res
        .status(500)
        .json(errorResponse(ErrorCode.INTERNAL_SERVER_ERROR, "Registration failed"));
    }
  });

  // Admin Profile - update recovery email (hidden from public)
  app.put("/api/admin/profile", adminMiddleware, async (req: any, res) => {
    try {
      const { email } = req.body;
      if (!email || !email.includes("@")) {
        return res
          .status(400)
          .json(errorResponse(ErrorCode.BAD_REQUEST, "Valid email is required"));
      }

      const existing = await db.select().from(admins).where(eq(admins.email, email));
      if (existing[0] && existing[0].id !== req.admin.adminId) {
        return res
          .status(400)
          .json(errorResponse(ErrorCode.BAD_REQUEST, "Email already in use"));
      }

      await db.update(admins).set({ email }).where(eq(admins.id, req.admin.adminId));
      res.json(successResponse(undefined, "Recovery email updated"));
    } catch (error: any) {
      console.error("Profile update error:", error);
      res
        .status(500)
        .json(errorResponse(ErrorCode.INTERNAL_SERVER_ERROR, "Profile update failed"));
    }
  });

  // Admin Get Profile (returns username only, email masked for security)
  app.get("/api/admin/profile", adminMiddleware, async (req: any, res) => {
    try {
      const admin = await db.select().from(admins).where(eq(admins.id, req.admin.adminId));
      if (!admin[0]) {
        return res.status(404).json(errorResponse(ErrorCode.NOT_FOUND, "Admin not found"));
      }
      // Mask email: show first 2 chars + *** + domain
      const emailParts = admin[0].email.split("@");
      const maskedEmail = emailParts[0].substring(0, 2) + "***@" + emailParts[1];
      res.json(successResponse({
        username: admin[0].username,
        maskedEmail,
        role: admin[0].role,
        createdAt: admin[0].createdAt,
      }));
    } catch (error: any) {
      console.error("Get profile error:", error);
      res.status(500).json(errorResponse(ErrorCode.INTERNAL_SERVER_ERROR, "Failed to get profile"));
    }
  });

  // Admin Forgot Password - accepts username, sends reset to hidden email
  app.post("/api/admin/forgot-password", async (req, res) => {
    try {
      const { username } = req.body;
      if (!username) {
        return res
          .status(400)
          .json(errorResponse(ErrorCode.BAD_REQUEST, "Username is required"));
      }

      const admin = await db.select().from(admins).where(eq(admins.username, username));
      // Always return success to prevent username enumeration
      if (!admin[0] || !admin[0].email || admin[0].email.endsWith("@admin.local")) {
        return res.json(successResponse(undefined, "If an account exists with a recovery email, a reset link has been sent"));
      }

      // Generate a temporary password reset token (valid 1 hour)
      const resetToken = jwt.sign(
        { adminId: admin[0].id, type: "admin-reset" },
        JWT_SECRET,
        { expiresIn: "1h" }
      );

      // Mask email for response hint
      const emailParts = admin[0].email.split("@");
      const maskedEmail = emailParts[0].substring(0, 2) + "***@" + emailParts[1];

      // In production, send email with resetToken. For now, log it.
      console.log(`[ADMIN RESET] Token for ${admin[0].username}: ${resetToken}`);

      res.json(successResponse(
        { maskedEmail },
        "If an account exists with a recovery email, a reset link has been sent"
      ));
    } catch (error: any) {
      console.error("Forgot password error:", error);
      res.status(500).json(errorResponse(ErrorCode.INTERNAL_SERVER_ERROR, "Request failed"));
    }
  });

  // Admin Reset Password - uses reset token
  app.post("/api/admin/reset-password", async (req, res) => {
    try {
      const { resetToken, newPassword } = req.body;
      if (!resetToken || !newPassword) {
        return res
          .status(400)
          .json(errorResponse(ErrorCode.BAD_REQUEST, "Reset token and new password are required"));
      }

      if (newPassword.length < 8) {
        return res
          .status(400)
          .json(errorResponse(ErrorCode.BAD_REQUEST, "Password must be at least 8 characters"));
      }

      let payload: any;
      try {
        payload = jwt.verify(resetToken, JWT_SECRET);
      } catch {
        return res.status(401).json(errorResponse(ErrorCode.UNAUTHORIZED, "Invalid or expired reset token"));
      }

      if (payload.type !== "admin-reset") {
        return res.status(401).json(errorResponse(ErrorCode.UNAUTHORIZED, "Invalid reset token type"));
      }

      const hashedPassword = await bcrypt.hash(newPassword, 10);
      await db.update(admins).set({ password: hashedPassword }).where(eq(admins.id, payload.adminId));

      res.json(successResponse(undefined, "Password has been reset successfully"));
    } catch (error: any) {
      console.error("Reset password error:", error);
      res.status(500).json(errorResponse(ErrorCode.INTERNAL_SERVER_ERROR, "Password reset failed"));
    }
  });

  // Admin Change Password
  app.post("/api/admin/change-password", adminMiddleware, async (req: any, res) => {
    try {
      const { currentPassword, newPassword } = req.body;
      if (!currentPassword || !newPassword) {
        return res
          .status(400)
          .json(errorResponse(ErrorCode.BAD_REQUEST, "Current and new password are required"));
      }

      if (newPassword.length < 8) {
        return res
          .status(400)
          .json(errorResponse(ErrorCode.BAD_REQUEST, "New password must be at least 8 characters"));
      }

      const admin = await db.select().from(admins).where(eq(admins.id, req.admin.adminId));
      if (!admin[0]) {
        return res
          .status(404)
          .json(errorResponse(ErrorCode.NOT_FOUND, "Admin not found"));
      }

      const passwordMatch = await bcrypt.compare(currentPassword, admin[0].password);
      if (!passwordMatch) {
        return res
          .status(401)
          .json(errorResponse(ErrorCode.UNAUTHORIZED, "Current password is incorrect"));
      }

      const hashedPassword = await bcrypt.hash(newPassword, 10);
      await db.update(admins).set({ password: hashedPassword }).where(eq(admins.id, req.admin.adminId));

      res.json(successResponse(undefined, "Password changed successfully"));
    } catch (error: any) {
      console.error("Password change error:", error);
      res
        .status(500)
        .json(errorResponse(ErrorCode.INTERNAL_SERVER_ERROR, "Password change failed"));
    }
  });

  // Get Admin Stats
  app.get("/api/admin/stats", adminMiddleware, async (req: any, res) => {
    try {
      const [parentsCount] = await db.select({ count: sql<number>`count(*)::int` }).from(parents);
      const [childrenCount] = await db.select({ count: sql<number>`count(*)::int` }).from(children);
      const [productsCount] = await db.select({ count: sql<number>`count(*)::int` }).from(products);
      const [ordersCount] = await db.select({ count: sql<number>`count(*)::int` }).from(orders);
      const [depositsCount] = await db.select({ count: sql<number>`count(*)::int` }).from(deposits);

      const [pointsSum] = await db.select({ total: sql<number>`COALESCE(sum(${children.totalPoints}), 0)::int` }).from(children);
      const [walletSum] = await db.select({ total: sql<number>`COALESCE(sum(${parentWallet.balance}), 0)` }).from(parentWallet);
      const [depositSum] = await db.select({ total: sql<number>`COALESCE(sum(${deposits.amount}), 0)` }).from(deposits);
      const [ordersSum] = await db.select({ total: sql<number>`COALESCE(sum(${orders.pointsPrice}), 0)::int` }).from(orders);

      res.json(successResponse({
        parents: parentsCount?.count || 0,
        children: childrenCount?.count || 0,
        products: productsCount?.count || 0,
        orders: ordersCount?.count || 0,
        deposits: depositsCount?.count || 0,
        totalPoints: pointsSum?.total || 0,
        totalWalletBalance: Number(walletSum?.total || 0),
        totalDepositsAmount: Number(depositSum?.total || 0),
        totalOrdersAmount: ordersSum?.total || 0,
      }));
    } catch (error: any) {
      console.error("Stats error:", error);
      res
        .status(500)
        .json(errorResponse(ErrorCode.INTERNAL_SERVER_ERROR, "Failed to fetch stats"));
    }
  });

  // Get Admin Products
  app.get("/api/admin/products", adminMiddleware, async (req: any, res) => {
    try {
      const result = await db.select().from(products).orderBy(desc(products.createdAt));
      res.json(successResponse(result));
    } catch (error: any) {
      console.error("Fetch products error:", error);
      res
        .status(500)
        .json(errorResponse(ErrorCode.INTERNAL_SERVER_ERROR, "Failed to fetch products"));
    }
  });

  // Create Product (Admin)
  app.post("/api/admin/products", adminMiddleware, async (req: any, res) => {
    try {
      const { parentId, name, nameAr, description, descriptionAr, price, originalPrice, pointsPrice, stock, image, images, categoryId, productType, brand, isFeatured, isActive } = req.body;

      if (!name || price === undefined || pointsPrice === undefined) {
        return res
          .status(400)
          .json(errorResponse(ErrorCode.BAD_REQUEST, "name, price and pointsPrice are required"));
      }

      const inserted = await db.insert(products).values({
        parentId: parentId || null,
        name,
        nameAr: nameAr || null,
        description,
        descriptionAr: descriptionAr || null,
        price: price.toString(),
        originalPrice: originalPrice ? originalPrice.toString() : null,
        pointsPrice: parseInt(pointsPrice),
        stock: stock !== undefined ? parseInt(stock) : 999,
        image,
        images: images || [],
        categoryId: categoryId || null,
        productType: productType || "digital",
        brand: brand || null,
        isFeatured: isFeatured === true,
        isActive: isActive !== false,
      }).returning();

      const created = inserted[0];
      if (!created) {
        return res
          .status(500)
          .json(errorResponse(ErrorCode.INTERNAL_SERVER_ERROR, "Failed to create product"));
      }
      res.status(201).json(successResponse(created, "Product created"));
    } catch (error: any) {
      console.error("Create product error:", error);
      res
        .status(500)
        .json(errorResponse(ErrorCode.INTERNAL_SERVER_ERROR, "Failed to create product"));
    }
  });

  // Update Product (Admin)
  app.put("/api/admin/products/:id", adminMiddleware, async (req: any, res) => {
    try {
      const { id } = req.params;
      const { name, nameAr, description, descriptionAr, price, originalPrice, pointsPrice, stock, image, images, categoryId, productType, brand, isFeatured, isActive, parentId } = req.body;
      const setData: Record<string, any> = {};
      if (name !== undefined) setData['name'] = name;
      if (nameAr !== undefined) setData['nameAr'] = nameAr;
      if (description !== undefined) setData['description'] = description;
      if (descriptionAr !== undefined) setData['descriptionAr'] = descriptionAr;
      if (price !== undefined) setData['price'] = price.toString();
      if (originalPrice !== undefined) setData['originalPrice'] = originalPrice ? originalPrice.toString() : null;
      if (pointsPrice !== undefined) setData['pointsPrice'] = parseInt(pointsPrice);
      if (stock !== undefined) setData['stock'] = parseInt(stock);
      if (image !== undefined) setData['image'] = image;
      if (images !== undefined) setData['images'] = images;
      if (categoryId !== undefined) setData['categoryId'] = categoryId || null;
      if (productType !== undefined) setData['productType'] = productType;
      if (brand !== undefined) setData['brand'] = brand || null;
      if (isFeatured !== undefined) setData['isFeatured'] = isFeatured;
      if (isActive !== undefined) setData['isActive'] = isActive;
      if (parentId !== undefined) setData['parentId'] = parentId || null;

      const updated = await db
        .update(products)
        .set(setData)
        .where(eq(products.id, id))
        .returning();
      if (!updated || updated.length === 0) {
        return res
          .status(404)
          .json(errorResponse(ErrorCode.NOT_FOUND, "Product not found"));
      }
      res.json(successResponse(updated[0], "Product updated"));
    } catch (error: any) {
      console.error("Update product error:", error);
      res
        .status(500)
        .json(errorResponse(ErrorCode.INTERNAL_SERVER_ERROR, "Failed to update product"));
    }
  });

  // Delete Product (Admin)
  app.delete("/api/admin/products/:id", adminMiddleware, async (req: any, res) => {
    try {
      const { id } = req.params;

      // Check if product has related orders or purchases
      const relatedOrders = await db.select({ id: orders.id }).from(orders).where(eq(orders.productId, id)).limit(1);
      if (relatedOrders.length > 0) {
        return res.status(400).json(errorResponse(ErrorCode.BAD_REQUEST, "لا يمكن حذف المنتج لوجود طلبات مرتبطة به. يمكنك إيقافه بدلاً من ذلك."));
      }

      await db.delete(products).where(eq(products.id, id));
      res.json(successResponse(undefined, "Product deleted"));
    } catch (error: any) {
      console.error("Delete product error:", error);
      if (error?.code === "23503") {
        return res.status(400).json(errorResponse(ErrorCode.BAD_REQUEST, "لا يمكن حذف المنتج لوجود بيانات مرتبطة به"));
      }
      res
        .status(500)
        .json(errorResponse(ErrorCode.INTERNAL_SERVER_ERROR, "Failed to delete product"));
    }
  });

  // Upload product images (multiple files)
  app.post("/api/admin/products/upload-images", adminMiddleware, async (req: any, res) => {
    try {
      const multer = await import("multer");
      const path = await import("path");
      const fs = await import("fs");

      const uploadDir = path.join(process.cwd(), "uploads", "product-images");
      if (!fs.existsSync(uploadDir)) {
        fs.mkdirSync(uploadDir, { recursive: true });
      }

      const imgStorage = multer.default.diskStorage({
        destination: (_req: any, _file: any, cb: any) => {
          cb(null, uploadDir);
        },
        filename: (_req: any, file: any, cb: any) => {
          const ext = path.extname(file.originalname).toLowerCase();
          const uniqueSuffix = Date.now().toString(36) + "-" + Math.random().toString(36).substring(2, 8);
          cb(null, `product-${uniqueSuffix}${ext}`);
        },
      });

      const fileFilter = (_req: any, file: any, cb: any) => {
        const allowed = ["image/jpeg", "image/png", "image/webp", "image/gif"];
        if (allowed.includes(file.mimetype)) {
          cb(null, true);
        } else {
          cb(new Error("Only image files (JPEG, PNG, WebP, GIF) are allowed"));
        }
      };

      const upload = multer.default({
        storage: imgStorage,
        limits: { fileSize: 5 * 1024 * 1024 }, // 5MB per image
        fileFilter,
      }).array("images", 10); // max 10 images

      upload(req, res, async (err: any) => {
        if (err) {
          console.error("Product image upload error:", err);
          return res.status(400).json(errorResponse(ErrorCode.BAD_REQUEST, `Upload failed: ${err.message}`));
        }

        if (!req.files || req.files.length === 0) {
          return res.status(400).json(errorResponse(ErrorCode.BAD_REQUEST, "No files uploaded"));
        }

        const urls = (req.files as any[]).map((f: any) => `/uploads/product-images/${f.filename}`);
        res.json(successResponse({ urls }, `${urls.length} image(s) uploaded`));
      });
    } catch (error: any) {
      console.error("Product image upload error:", error);
      res.status(500).json(errorResponse(ErrorCode.INTERNAL_SERVER_ERROR, "Failed to upload product images"));
    }
  });

  // Delete a product image file
  app.delete("/api/admin/products/delete-image", adminMiddleware, async (req: any, res) => {
    try {
      const { url } = req.body;
      if (!url || !url.startsWith("/uploads/product-images/")) {
        return res.status(400).json(errorResponse(ErrorCode.BAD_REQUEST, "Invalid image URL"));
      }
      const path = await import("path");
      const fs = await import("fs");
      const filePath = path.join(process.cwd(), url);
      if (fs.existsSync(filePath)) {
        fs.unlinkSync(filePath);
      }
      res.json(successResponse(undefined, "Image deleted"));
    } catch (error: any) {
      console.error("Delete product image error:", error);
      res.status(500).json(errorResponse(ErrorCode.INTERNAL_SERVER_ERROR, "Failed to delete image"));
    }
  });

  // ===== STORE CATEGORIES MANAGEMENT =====

  // Get all categories
  app.get("/api/admin/categories", adminMiddleware, async (req: any, res) => {
    try {
      const result = await db.select().from(productCategories);
      res.json(successResponse(result));
    } catch (error: any) {
      console.error("Fetch categories error:", error);
      res
        .status(500)
        .json(errorResponse(ErrorCode.INTERNAL_SERVER_ERROR, "Failed to fetch categories"));
    }
  });

  // Create category
  app.post("/api/admin/categories", adminMiddleware, async (req: any, res) => {
    try {
      const { name, nameAr, icon, color, sortOrder } = req.body;
      if (!name || !nameAr) {
        return res
          .status(400)
          .json(errorResponse(ErrorCode.BAD_REQUEST, "name and nameAr are required"));
      }
      const result = await db.insert(productCategories).values({
        name,
        nameAr,
        icon: icon || "Package",
        color: color || "#667eea",
        sortOrder: sortOrder || 0,
      }).returning();
      res.status(201).json(successResponse(result[0], "Category created"));
    } catch (error: any) {
      console.error("Create category error:", error);
      res
        .status(500)
        .json(errorResponse(ErrorCode.INTERNAL_SERVER_ERROR, "Failed to create category"));
    }
  });

  // Update category
  app.put("/api/admin/categories/:id", adminMiddleware, async (req: any, res) => {
    try {
      const { id } = req.params;
      const { name, nameAr, icon, color, sortOrder, isActive } = req.body;
      const setData: Record<string, any> = {};
      if (name !== undefined) setData['name'] = name;
      if (nameAr !== undefined) setData['nameAr'] = nameAr;
      if (icon !== undefined) setData['icon'] = icon;
      if (color !== undefined) setData['color'] = color;
      if (sortOrder !== undefined) setData['sortOrder'] = sortOrder;
      if (isActive !== undefined) setData['isActive'] = isActive;

      const result = await db.update(productCategories)
        .set(setData)
        .where(eq(productCategories.id, id))
        .returning();
      if (!result[0]) {
        return res
          .status(404)
          .json(errorResponse(ErrorCode.NOT_FOUND, "Category not found"));
      }
      res.json(successResponse(result[0], "Category updated"));
    } catch (error: any) {
      console.error("Update category error:", error);
      res
        .status(500)
        .json(errorResponse(ErrorCode.INTERNAL_SERVER_ERROR, "Failed to update category"));
    }
  });

  // Delete category
  app.delete("/api/admin/categories/:id", adminMiddleware, async (req: any, res) => {
    try {
      const { id } = req.params;
      await db.delete(productCategories).where(eq(productCategories.id, id));
      res.json(successResponse(undefined, "Category deleted"));
    } catch (error: any) {
      console.error("Delete category error:", error);
      res
        .status(500)
        .json(errorResponse(ErrorCode.INTERNAL_SERVER_ERROR, "Failed to delete category"));
    }
  });

  // ===== APP SETTINGS MANAGEMENT =====

  // Public mobile app settings (icon + PWA branding)
  app.get("/api/public/mobile-app-settings", async (_req, res) => {
    try {
      const settings = await db
        .select()
        .from(appSettings)
        .where(eq(appSettings.key, "mobileApp"));

      let mobileApp: Record<string, any> = {};
      if (settings[0]?.value) {
        try {
          mobileApp = JSON.parse(settings[0].value);
        } catch {
          mobileApp = {};
        }
      }

      res.json(successResponse({ mobileApp }));
    } catch (error: any) {
      console.error("Fetch public mobile app settings error:", error);
      res
        .status(500)
        .json(errorResponse(ErrorCode.INTERNAL_SERVER_ERROR, "Failed to fetch mobile app settings"));
    }
  });

  // Public library store settings (theme toggle, notifications visibility)
  app.get("/api/public/library-store-settings", async (_req, res) => {
    try {
      const settings = await db
        .select()
        .from(appSettings)
        .where(eq(appSettings.key, "libraryStore"));

      let libraryStore: Record<string, any> = { showThemeToggle: true, showNotifications: true };
      if (settings[0]?.value) {
        try {
          libraryStore = JSON.parse(settings[0].value);
        } catch {
          // keep defaults
        }
      }

      res.json(successResponse(libraryStore));
    } catch (error: any) {
      console.error("Fetch public library store settings error:", error);
      res
        .status(500)
        .json(errorResponse(ErrorCode.INTERNAL_SERVER_ERROR, "Failed to fetch library store settings"));
    }
  });

  // Get app settings
  app.get("/api/admin/app-settings", adminMiddleware, async (req: any, res) => {
    try {
      const settings = await db.select().from(appSettings);
      const result: Record<string, any> = {};
      for (const setting of settings) {
        try {
          result[setting.key] = JSON.parse(setting.value);
        } catch {
          result[setting.key] = setting.value;
        }
      }
      res.json(successResponse(result));
    } catch (error: any) {
      console.error("Fetch app settings error:", error);
      res
        .status(500)
        .json(errorResponse(ErrorCode.INTERNAL_SERVER_ERROR, "Failed to fetch app settings"));
    }
  });

  // Update app settings
  app.put("/api/admin/app-settings", adminMiddleware, async (req: any, res) => {
    try {
      const updates = req.body;
      for (const [key, value] of Object.entries(updates)) {
        const stringValue = typeof value === "string" ? value : JSON.stringify(value);
        const existing = await db.select().from(appSettings).where(eq(appSettings.key, key));
        if (existing[0]) {
          await db.update(appSettings)
            .set({ value: stringValue, updatedAt: new Date() })
            .where(eq(appSettings.key, key));
        } else {
          await db.insert(appSettings).values({ key, value: stringValue });
        }
      }
      res.json(successResponse(undefined, "Settings updated"));
    } catch (error: any) {
      console.error("Update app settings error:", error);
      res
        .status(500)
        .json(errorResponse(ErrorCode.INTERNAL_SERVER_ERROR, "Failed to update app settings"));
    }
  });

  // ===== SYMBOLS LIBRARY MANAGEMENT =====

  // Get all symbols
  app.get("/api/admin/symbols", adminMiddleware, async (req: any, res) => {
    try {
      const result = await db.select().from(symbols);
      res.json(successResponse(result));
    } catch (error: any) {
      console.error("Fetch symbols error:", error);
      res
        .status(500)
        .json(errorResponse(ErrorCode.INTERNAL_SERVER_ERROR, "Failed to fetch symbols"));
    }
  });

  // Create symbol
  app.post("/api/admin/symbols", adminMiddleware, async (req: any, res) => {
    try {
      const { name, nameAr, emoji, imageUrl, category, sortOrder, isActive } = req.body;
      if (!name) {
        return res
          .status(400)
          .json(errorResponse(ErrorCode.BAD_REQUEST, "name is required"));
      }
      const result = await db.insert(symbols).values({
        name,
        nameAr,
        emoji,
        imageUrl,
        category: category || "general",
        sortOrder: sortOrder || 0,
        isActive: isActive !== false,
      }).returning();
      res.status(201).json(successResponse(result[0], "Symbol created"));
    } catch (error: any) {
      console.error("Create symbol error:", error);
      res
        .status(500)
        .json(errorResponse(ErrorCode.INTERNAL_SERVER_ERROR, "Failed to create symbol"));
    }
  });

  // Update symbol
  app.put("/api/admin/symbols/:id", adminMiddleware, async (req: any, res) => {
    try {
      const { id } = req.params;
      const { name, nameAr, emoji, imageUrl, category, sortOrder, isActive } = req.body;
      const result = await db.update(symbols)
        .set({ name, nameAr, emoji, imageUrl, category, sortOrder, isActive })
        .where(eq(symbols.id, id))
        .returning();
      if (!result[0]) {
        return res
          .status(404)
          .json(errorResponse(ErrorCode.NOT_FOUND, "Symbol not found"));
      }
      res.json(successResponse(result[0], "Symbol updated"));
    } catch (error: any) {
      console.error("Update symbol error:", error);
      res
        .status(500)
        .json(errorResponse(ErrorCode.INTERNAL_SERVER_ERROR, "Failed to update symbol"));
    }
  });

  // Delete symbol
  app.delete("/api/admin/symbols/:id", adminMiddleware, async (req: any, res) => {
    try {
      const { id } = req.params;
      await db.delete(symbols).where(eq(symbols.id, id));
      res.json(successResponse(undefined, "Symbol deleted"));
    } catch (error: any) {
      console.error("Delete symbol error:", error);
      res
        .status(500)
        .json(errorResponse(ErrorCode.INTERNAL_SERVER_ERROR, "Failed to delete symbol"));
    }
  });

  // Get Purchases (Admin) - with optional ?status=
  app.get("/api/admin/purchases", adminMiddleware, async (req: any, res) => {
    try {
      const { status } = req.query;
      let query = db.select().from(parentPurchases);
      if (status) query = query.where(eq(parentPurchases.paymentStatus, status));

      const purchases = await query;

      // Enrich with parent info and items
      const enriched = await Promise.all(
        purchases.map(async (p: any) => {
          const parent = await db.select().from(parents).where(eq(parents.id, p.parentId));
          const items = await db.select().from(parentPurchaseItems).where(eq(parentPurchaseItems.purchaseId, p.id));
          return { ...p, parent: parent[0] || null, items };
        })
      );

      res.json(successResponse(enriched));
    } catch (error: any) {
      console.error("Fetch purchases error:", error);
      res
        .status(500)
        .json(errorResponse(ErrorCode.INTERNAL_SERVER_ERROR, "Failed to fetch purchases"));
    }
  });

  // Get Purchase by ID
  app.get("/api/admin/purchases/:id", adminMiddleware, async (req: any, res) => {
    try {
      const { id } = req.params;
      const purchase = await db.select().from(parentPurchases).where(eq(parentPurchases.id, id));
      if (!purchase[0]) {
        return res
          .status(404)
          .json(errorResponse(ErrorCode.NOT_FOUND, "Purchase not found"));
      }
      const items = await db.select().from(parentPurchaseItems).where(eq(parentPurchaseItems.purchaseId, id));
      const parent = await db.select().from(parents).where(eq(parents.id, purchase[0].parentId));
      res.json(successResponse({ ...purchase[0], items, parent: parent[0] || null }));
    } catch (error: any) {
      console.error("Fetch purchase error:", error);
      res
        .status(500)
        .json(errorResponse(ErrorCode.INTERNAL_SERVER_ERROR, "Failed to fetch purchase"));
    }
  });

  // Update Purchase Status (approve/reject)
  app.patch("/api/admin/purchases/:id/status", adminMiddleware, async (req: any, res) => {
    try {
      const { id } = req.params;
      const { status, rejectionReason } = req.body;
      if (!status || !["approved", "rejected"].includes(status)) {
        return res
          .status(400)
          .json(errorResponse(ErrorCode.BAD_REQUEST, "Invalid status"));
      }

      const purchase = await db.select().from(parentPurchases).where(eq(parentPurchases.id, id));
      if (!purchase[0]) {
        return res
          .status(404)
          .json(errorResponse(ErrorCode.NOT_FOUND, "Purchase not found"));
      }

      // If approving, activate existing parent_owned_products (or create if missing)
      if (status === "approved") {
        const items = await db.select().from(parentPurchaseItems).where(eq(parentPurchaseItems.purchaseId, id));
        const activated: any[] = [];
        for (const it of items) {
          // Check if parentOwnedProducts already exists (created at checkout/confirm)
          const existing = await db.select().from(parentOwnedProducts).where(
            and(
              eq(parentOwnedProducts.parentId, purchase[0].parentId),
              eq(parentOwnedProducts.productId, it.productId),
              eq(parentOwnedProducts.sourcePurchaseId, id)
            )
          );
          if (existing[0]) {
            // Update existing to active
            await db.update(parentOwnedProducts)
              .set({ status: "active", updatedAt: new Date() })
              .where(eq(parentOwnedProducts.id, existing[0].id));
            activated.push({ ...existing[0], status: "active" });
          } else {
            // Fallback: create if not found (legacy orders)
            const owned = await db
              .insert(parentOwnedProducts)
              .values({ parentId: purchase[0].parentId, productId: it.productId, sourcePurchaseId: id, status: "active" })
              .returning();
            activated.push(owned[0]);
          }
        }

        await db.update(parentPurchases).set({ paymentStatus: "paid" }).where(eq(parentPurchases.id, id));

        // Notify parent
        await createNotification({ parentId: purchase[0].parentId, type: NOTIFICATION_TYPES.PURCHASE_APPROVED, title: "✅ تمت الموافقة على طلبك", message: `تمت الموافقة على طلب الشراء الخاص بك وتم تفعيل المنتجات`, relatedId: id });

        return res.json(successResponse({ activated }));
      }

      // If rejected
      if (status === "rejected") {
        await db.update(parentPurchases).set({ paymentStatus: "rejected" }).where(eq(parentPurchases.id, id));
        await createNotification({ parentId: purchase[0].parentId, type: NOTIFICATION_TYPES.PURCHASE_REJECTED, title: "❌ تم رفض طلب الشراء", message: rejectionReason ? `تم رفض طلب الشراء. السبب: ${rejectionReason}` : `تم رفض طلب الشراء. يرجى التواصل مع الدعم`, relatedId: id });
        return res.json(successResponse());
      }
    } catch (error: any) {
      console.error("Update purchase status error:", error);
      res
        .status(500)
        .json(errorResponse(ErrorCode.INTERNAL_SERVER_ERROR, "Failed to update purchase status"));
    }
  });

  // Shipping requests (admin)
  app.get("/api/admin/shipping-requests", adminMiddleware, async (req: any, res) => {
    try {
      const requests = await db.select().from(shippingRequests);
      const enriched = await Promise.all(requests.map(async (r: any) => {
        const parent = await db.select().from(parents).where(eq(parents.id, r.parentId));
        const child = await db.select().from(children).where(eq(children.id, r.childId));
        return { ...r, parent: parent[0] || null, child: child[0] || null };
      }));
      res.json(successResponse(enriched));
    } catch (error: any) {
      console.error("Fetch shipping requests error:", error);
      res
        .status(500)
        .json(errorResponse(ErrorCode.INTERNAL_SERVER_ERROR, "Failed to fetch shipping requests"));
    }
  });

  app.patch("/api/admin/shipping-requests/:id/status", adminMiddleware, async (req: any, res) => {
    try {
      const { id } = req.params;
      const { status, adminNote } = req.body;
      if (!status) {
        return res
          .status(400)
          .json(errorResponse(ErrorCode.BAD_REQUEST, "Status required"));
      }

      const reqRow = await db.select().from(shippingRequests).where(eq(shippingRequests.id, id));
      if (!reqRow[0]) {
        return res
          .status(404)
          .json(errorResponse(ErrorCode.NOT_FOUND, "Shipping request not found"));
      }

      await db.update(shippingRequests).set({ status, adminNote, updatedAt: new Date() }).where(eq(shippingRequests.id, id));

      // Update child_assigned_products status if shipped or approved
      if (status === "approved") {
        await db.update(childAssignedProducts).set({ status: "shipment_requested" }).where(eq(childAssignedProducts.id, reqRow[0].assignedProductId));
      }
      if (status === "shipped") {
        await db.update(childAssignedProducts).set({ status: "shipped", shippedAt: new Date() }).where(eq(childAssignedProducts.id, reqRow[0].assignedProductId));
      }

      // Notify parent and child (with child name)
      const shippingChild = await db.select({ name: children.name }).from(children).where(eq(children.id, reqRow[0].childId));
      const shippingChildName = shippingChild[0]?.name || "طفلك";
      const statusAr: Record<string, string> = { requested: "مطلوب", approved: "تمت الموافقة", shipped: "تم الشحن", delivered: "تم التوصيل", cancelled: "ملغي" };
      await createNotification({ parentId: reqRow[0].parentId, childId: reqRow[0].childId, type: NOTIFICATION_TYPES.SHIPPING_UPDATE, title: `تحديث شحن لـ ${shippingChildName}`, message: `تم تحديث حالة شحن طلب ${shippingChildName} إلى: ${statusAr[status] || status}`, relatedId: id, metadata: { childName: shippingChildName, status } });

      res.json(successResponse());
    } catch (error: any) {
      console.error("Update shipping request status error:", error);
      res
        .status(500)
        .json(errorResponse(ErrorCode.INTERNAL_SERVER_ERROR, "Failed to update shipping request"));
    }
  });


  // Update parent details (admin)
  app.patch("/api/admin/parents/:id", adminMiddleware, async (req: any, res) => {
    try {
      const { id } = req.params;
      const { name, email, phoneNumber } = req.body;

      const parent = await db.select().from(parents).where(eq(parents.id, id));
      if (!parent[0]) {
        return res
          .status(404)
          .json(errorResponse(ErrorCode.NOT_FOUND, "Parent not found"));
      }

      const updateData: any = {};
      if (name) updateData.name = name;
      if (email) updateData.email = email;
      if (phoneNumber !== undefined) updateData.phoneNumber = phoneNumber;

      await db.update(parents).set(updateData).where(eq(parents.id, id));
      res.json(successResponse(undefined, "Parent updated"));
    } catch (error: any) {
      console.error("Update parent error:", error);
      res
        .status(500)
        .json(errorResponse(ErrorCode.INTERNAL_SERVER_ERROR, "Failed to update parent"));
    }
  });

  // List all children (admin)
  app.get("/api/admin/children", adminMiddleware, async (_req: any, res) => {
    try {
      const allChildren = await db.select().from(children).orderBy(desc(children.createdAt));

      const childrenWithDetails = await Promise.all(
        allChildren.map(async (child: typeof children.$inferSelect) => {
          const parentLinks = await db
            .select({
              parentId: parentChild.parentId,
              parentName: parents.name,
              parentEmail: parents.email,
            })
            .from(parentChild)
            .innerJoin(parents, eq(parentChild.parentId, parents.id))
            .where(eq(parentChild.childId, child.id));

          const childTasks = await db.select().from(tasks).where(eq(tasks.childId, child.id));

          return {
            ...child,
            parents: parentLinks,
            tasksCount: childTasks.length,
          };
        })
      );

      res.json(successResponse(childrenWithDetails));
    } catch (error: any) {
      console.error("Get children error:", error);
      res
        .status(500)
        .json(errorResponse(ErrorCode.INTERNAL_SERVER_ERROR, "Failed to fetch children"));
    }
  });

  // Get single child details
  app.get("/api/admin/children/:id", adminMiddleware, async (req: any, res) => {
    try {
      const { id } = req.params;
      const child = await db.select().from(children).where(eq(children.id, id));
      if (!child[0]) {
        return res.status(404).json(errorResponse(ErrorCode.NOT_FOUND, "Child not found"));
      }

      // Get parent
      const parentLink = await db.select({
        parent: parents,
      })
        .from(parentChild)
        .innerJoin(parents, eq(parentChild.parentId, parents.id))
        .where(eq(parentChild.childId, id));

      res.json(successResponse({
        ...child[0],
        parents: parentLink.map((pl: any) => ({
          id: pl.parent.id,
          name: pl.parent.name,
          email: pl.parent.email,
        })),
      }));
    } catch (error: any) {
      console.error("Fetch child details error:", error);
      res
        .status(500)
        .json(errorResponse(ErrorCode.INTERNAL_SERVER_ERROR, "Failed to fetch child details"));
    }
  });

  // Update child details (admin)
  app.patch("/api/admin/children/:id", adminMiddleware, async (req: any, res) => {
    try {
      const { id } = req.params;
      const { name, shippingAddress } = req.body;

      const child = await db.select().from(children).where(eq(children.id, id));
      if (!child[0]) {
        return res
          .status(404)
          .json(errorResponse(ErrorCode.NOT_FOUND, "Child not found"));
      }

      const updateData: any = {};
      if (name) updateData.name = name;
      if (shippingAddress !== undefined) updateData.shippingAddress = shippingAddress;

      await db.update(children).set(updateData).where(eq(children.id, id));
      res.json(successResponse(undefined, "Child updated"));
    } catch (error: any) {
      console.error("Update child error:", error);
      res
        .status(500)
        .json(errorResponse(ErrorCode.INTERNAL_SERVER_ERROR, "Failed to update child"));
    }
  });

  // ============ GROWTH TREE SETTINGS (ADMIN) ============

  // Get growth tree settings
  app.get("/api/admin/growth-tree-settings", adminMiddleware, async (req: any, res) => {
    try {
      const settings = await db.select().from(growthTreeSettings);
      
      if (!settings[0]) {
        // Create default settings
        const defaultSettings = await db.insert(growthTreeSettings).values({
          wateringEnabled: true,
          wateringCostPoints: 10,
          wateringGrowthPoints: 15,
          maxWateringsPerDay: 5,
        }).returning();
        return res.json(successResponse(defaultSettings[0]));
      }

      res.json(successResponse(settings[0]));
    } catch (error: any) {
      console.error("Get growth tree settings error:", error);
      res.status(500).json(errorResponse(ErrorCode.INTERNAL_SERVER_ERROR, "Failed to get growth tree settings"));
    }
  });

  // Update growth tree settings
  app.put("/api/admin/growth-tree-settings", adminMiddleware, async (req: any, res) => {
    try {
      const { wateringEnabled, wateringCostPoints, wateringGrowthPoints, maxWateringsPerDay, stageIcons, stageRequirements } = req.body;

      let settings = await db.select().from(growthTreeSettings);
      
      if (!settings[0]) {
        // Create if not exists
        const created = await db.insert(growthTreeSettings).values({
          wateringEnabled: wateringEnabled ?? true,
          wateringCostPoints: wateringCostPoints ?? 10,
          wateringGrowthPoints: wateringGrowthPoints ?? 15,
          maxWateringsPerDay: maxWateringsPerDay ?? 5,
          ...(stageIcons ? { stageIcons } : {}),
          ...(stageRequirements ? { stageRequirements } : {}),
        }).returning();
        return res.json(successResponse(created[0], "Growth tree settings created"));
      }

      const updateData: Record<string, any> = { updatedAt: new Date() };
      if (wateringEnabled !== undefined) updateData.wateringEnabled = wateringEnabled;
      if (wateringCostPoints !== undefined) updateData.wateringCostPoints = wateringCostPoints;
      if (wateringGrowthPoints !== undefined) updateData.wateringGrowthPoints = wateringGrowthPoints;
      if (maxWateringsPerDay !== undefined) updateData.maxWateringsPerDay = maxWateringsPerDay;
      if (stageIcons !== undefined) updateData.stageIcons = stageIcons;
      if (stageRequirements !== undefined) updateData.stageRequirements = stageRequirements;

      const updated = await db.update(growthTreeSettings)
        .set(updateData)
        .where(eq(growthTreeSettings.id, settings[0].id))
        .returning();

      res.json(successResponse(updated[0], "Growth tree settings updated"));
    } catch (error: any) {
      console.error("Update growth tree settings error:", error);
      res.status(500).json(errorResponse(ErrorCode.INTERNAL_SERVER_ERROR, "Failed to update growth tree settings"));
    }
  });

  // Get watering statistics (admin)
  app.get("/api/admin/watering-stats", adminMiddleware, async (req: any, res) => {
    try {
      const totalWaterings = await db.select({ count: count() }).from(childWateringLog);
      const totalPointsSpent = await db.select({ total: sum(childWateringLog.pointsSpent) }).from(childWateringLog);
      const totalGrowthPoints = await db.select({ total: sum(childWateringLog.growthPointsEarned) }).from(childWateringLog);

      res.json(successResponse({
        totalWaterings: totalWaterings[0]?.count || 0,
        totalPointsSpent: totalPointsSpent[0]?.total || 0,
        totalGrowthPointsEarned: totalGrowthPoints[0]?.total || 0,
      }));
    } catch (error: any) {
      console.error("Get watering stats error:", error);
      res.status(500).json(errorResponse(ErrorCode.INTERNAL_SERVER_ERROR, "Failed to get watering stats"));
    }
  });

  // Upload a custom icon for a specific growth tree stage
  app.post("/api/admin/growth-tree-stage-icon", adminMiddleware, async (req: any, res) => {
    try {
      const multer = await import("multer");
      const path = await import("path");
      const fs = await import("fs");

      const uploadDir = path.join(process.cwd(), "uploads", "growth-tree-icons");
      if (!fs.existsSync(uploadDir)) {
        fs.mkdirSync(uploadDir, { recursive: true });
      }

      const iconStorage = multer.default.diskStorage({
        destination: (_req: any, _file: any, cb: any) => {
          cb(null, uploadDir);
        },
        filename: (_req: any, file: any, cb: any) => {
          const ext = path.extname(file.originalname).toLowerCase();
          const uniqueSuffix = Date.now().toString(36) + "-" + Math.random().toString(36).substring(2, 6);
          cb(null, `stage-icon-${uniqueSuffix}${ext}`);
        },
      });

      const fileFilter = (_req: any, file: any, cb: any) => {
        const allowed = ["image/jpeg", "image/png", "image/webp", "image/svg+xml", "image/gif"];
        if (allowed.includes(file.mimetype)) {
          cb(null, true);
        } else {
          cb(new Error("Only image files (JPEG, PNG, WebP, SVG, GIF) are allowed"));
        }
      };

      const upload = multer.default({
        storage: iconStorage,
        limits: { fileSize: 2 * 1024 * 1024 }, // 2MB per icon
        fileFilter,
      }).single("file");

      upload(req, res, async (err: any) => {
        if (err) {
          console.error("Stage icon upload error:", err);
          return res.status(400).json(errorResponse(ErrorCode.BAD_REQUEST, `Upload failed: ${err.message}`));
        }

        if (!req.file) {
          return res.status(400).json(errorResponse(ErrorCode.BAD_REQUEST, "No file uploaded"));
        }

        const stageIndex = parseInt(req.body?.stageIndex);
        if (isNaN(stageIndex) || stageIndex < 0 || stageIndex > 19) {
          // Delete the uploaded file since stage index is invalid
          fs.unlinkSync(path.join(uploadDir, req.file.filename));
          return res.status(400).json(errorResponse(ErrorCode.BAD_REQUEST, "stageIndex must be 0-19"));
        }

        const iconUrl = `/uploads/growth-tree-icons/${req.file.filename}`;

        // Update the stageIcons array in settings
        let settings = await db.select().from(growthTreeSettings);
        if (!settings[0]) {
          const defaultIcons = ["seed","sprout","sapling","youngPlant","bush","smallTree","growingTree","mediumTree","tallTree","strongTree","largeTree","matureTree","fruitTree","grandTree","ancientTree","goldenTree","crystalTree","diamondTree","legendaryTree","cosmicTree"];
          defaultIcons[stageIndex] = iconUrl;
          const created = await db.insert(growthTreeSettings).values({
            stageIcons: defaultIcons,
          }).returning();
          return res.json(successResponse({
            url: iconUrl,
            stageIndex,
            settings: created[0],
          }));
        }

        const currentIcons = (settings[0].stageIcons as string[]) || [];
        // Ensure array has 20 entries
        const icons = Array.from({ length: 20 }, (_, i) => currentIcons[i] || ["seed","sprout","sapling","youngPlant","bush","smallTree","growingTree","mediumTree","tallTree","strongTree","largeTree","matureTree","fruitTree","grandTree","ancientTree","goldenTree","crystalTree","diamondTree","legendaryTree","cosmicTree"][i]);

        // Delete old custom icon file if it was a custom upload
        const oldIcon = icons[stageIndex];
        if (oldIcon && oldIcon.startsWith("/uploads/")) {
          const oldPath = path.join(process.cwd(), oldIcon);
          if (fs.existsSync(oldPath)) {
            try { fs.unlinkSync(oldPath); } catch (e) { /* ignore */ }
          }
        }

        icons[stageIndex] = iconUrl;

        const updated = await db.update(growthTreeSettings)
          .set({ stageIcons: icons, updatedAt: new Date() })
          .where(eq(growthTreeSettings.id, settings[0].id))
          .returning();

        res.json(successResponse({
          url: iconUrl,
          stageIndex,
          settings: updated[0],
        }));
      });
    } catch (error: any) {
      console.error("Stage icon upload error:", error);
      res.status(500).json(errorResponse(ErrorCode.INTERNAL_SERVER_ERROR, "Failed to upload stage icon"));
    }
  });

  // Reset a stage icon back to default SVG
  app.post("/api/admin/growth-tree-stage-icon-reset", adminMiddleware, async (req: any, res) => {
    try {
      const { stageIndex } = req.body;
      const idx = parseInt(stageIndex);
      if (isNaN(idx) || idx < 0 || idx > 19) {
        return res.status(400).json(errorResponse(ErrorCode.BAD_REQUEST, "stageIndex must be 0-19"));
      }

      const defaultNames = ["seed","sprout","sapling","youngPlant","bush","smallTree","growingTree","mediumTree","tallTree","strongTree","largeTree","matureTree","fruitTree","grandTree","ancientTree","goldenTree","crystalTree","diamondTree","legendaryTree","cosmicTree"];

      let settings = await db.select().from(growthTreeSettings);
      if (!settings[0]) {
        return res.json(successResponse({ stageIndex: idx, icon: defaultNames[idx] }));
      }

      const currentIcons = (settings[0].stageIcons as string[]) || defaultNames;
      const icons = Array.from({ length: 20 }, (_, i) => currentIcons[i] || defaultNames[i]);

      // Delete custom file if exists
      const oldIcon = icons[idx];
      if (oldIcon && oldIcon.startsWith("/uploads/")) {
        const path = await import("path");
        const fs = await import("fs");
        const oldPath = path.join(process.cwd(), oldIcon);
        if (fs.existsSync(oldPath)) {
          try { fs.unlinkSync(oldPath); } catch (e) { /* ignore */ }
        }
      }

      icons[idx] = defaultNames[idx];

      const updated = await db.update(growthTreeSettings)
        .set({ stageIcons: icons, updatedAt: new Date() })
        .where(eq(growthTreeSettings.id, settings[0].id))
        .returning();

      res.json(successResponse({
        stageIndex: idx,
        icon: defaultNames[idx],
        settings: updated[0],
      }));
    } catch (error: any) {
      console.error("Reset stage icon error:", error);
      res.status(500).json(errorResponse(ErrorCode.INTERNAL_SERVER_ERROR, "Failed to reset stage icon"));
    }
  });

  // Get children growth tree leaderboard (admin)
  app.get("/api/admin/growth-tree-leaderboard", adminMiddleware, async (req: any, res) => {
    try {
      // Get all growth trees with child info
      const trees = await db
        .select({
          childId: childGrowthTrees.childId,
          childName: children.name,
          childAvatar: children.avatarUrl,
          currentStage: childGrowthTrees.currentStage,
          totalGrowthPoints: childGrowthTrees.totalGrowthPoints,
          tasksCompleted: childGrowthTrees.tasksCompleted,
          gamesPlayed: childGrowthTrees.gamesPlayed,
          wateringsCount: childGrowthTrees.wateringsCount,
          rewardsEarned: childGrowthTrees.rewardsEarned,
          treeCreatedAt: childGrowthTrees.createdAt,
          lastGrowthAt: childGrowthTrees.lastGrowthAt,
        })
        .from(childGrowthTrees)
        .innerJoin(children, eq(children.id, childGrowthTrees.childId))
        .orderBy(desc(childGrowthTrees.currentStage), desc(childGrowthTrees.totalGrowthPoints));

      // Calculate speed: growth points per day since tree creation
      const leaderboard = trees.map((t: typeof trees[number], index: number) => {
        const createdAt = new Date(t.treeCreatedAt);
        const now = new Date();
        const daysSinceCreation = Math.max(1, Math.floor((now.getTime() - createdAt.getTime()) / (1000 * 60 * 60 * 24)));
        const growthSpeed = parseFloat((t.totalGrowthPoints / daysSinceCreation).toFixed(1));

        return {
          rank: index + 1,
          childId: t.childId,
          childName: t.childName,
          childAvatar: t.childAvatar,
          currentStage: t.currentStage,
          totalGrowthPoints: t.totalGrowthPoints,
          tasksCompleted: t.tasksCompleted,
          gamesPlayed: t.gamesPlayed,
          wateringsCount: t.wateringsCount,
          rewardsEarned: t.rewardsEarned,
          daysSinceCreation,
          growthSpeed, // points per day
          lastGrowthAt: t.lastGrowthAt,
        };
      });

      // Get per-child watering points spent
      const wateringStats = await db
        .select({
          childId: childWateringLog.childId,
          totalSpent: sum(childWateringLog.pointsSpent),
        })
        .from(childWateringLog)
        .groupBy(childWateringLog.childId);

      const wateringMap = new Map(wateringStats.map((w: typeof wateringStats[number]) => [w.childId, Number(w.totalSpent) || 0]));

      const enrichedLeaderboard = leaderboard.map((entry: typeof leaderboard[number]) => ({
        ...entry,
        pointsSpentOnWatering: wateringMap.get(entry.childId) || 0,
      }));

      res.json(successResponse({
        leaderboard: enrichedLeaderboard,
        totalChildren: enrichedLeaderboard.length,
      }));
    } catch (error: any) {
      console.error("Get growth tree leaderboard error:", error);
      res.status(500).json(errorResponse(ErrorCode.INTERNAL_SERVER_ERROR, "Failed to get growth tree leaderboard"));
    }
  });

  // Adjust points for parent or child (admin)
  app.post("/api/admin/adjust-points", adminMiddleware, async (req: any, res) => {
    try {
      const { targetType, targetId, delta, reason } = req.body;
      const adminId = req.admin.adminId;

      if (!targetType || !targetId || delta === undefined || !reason) {
        return res.status(400).json(errorResponse(ErrorCode.BAD_REQUEST, "targetType, targetId, delta, and reason are required"));
      }

      if (!["parent", "child"].includes(targetType)) {
        return res.status(400).json(errorResponse(ErrorCode.BAD_REQUEST, "targetType must be 'parent' or 'child'"));
      }

      if (typeof delta !== "number" || delta === 0) {
        return res.status(400).json(errorResponse(ErrorCode.BAD_REQUEST, "delta must be a non-zero number"));
      }

      let adjustmentId: string | null = null;
      if (targetType === "child") {
        const child = await db.select().from(children).where(eq(children.id, targetId));
        if (!child[0]) {
          return res.status(404).json(errorResponse(ErrorCode.NOT_FOUND, "Child not found"));
        }

        await db.transaction(async (tx: any) => {
          const inserted = await tx.insert(pointAdjustments).values({
            targetType,
            targetId,
            adminId,
            delta,
            reason,
          }).returning();
          adjustmentId = inserted[0]?.id || null;

          await applyPointsDelta(tx, {
            childId: targetId,
            delta,
            reason: "ADMIN_ADJUSTMENT",
            requestId: adjustmentId,
            minBalance: 0,
            clampToMinBalance: true,
          });
        });

        // Send notification to parent
        const parentLink = await db.select().from(parentChild).where(eq(parentChild.childId, targetId));
        if (parentLink[0]) {
          await createNotification({
            parentId: parentLink[0].parentId,
            childId: targetId,
            type: NOTIFICATION_TYPES.POINTS_ADJUSTMENT,
            title: delta > 0 ? "تم إضافة نقاط" : "تم خصم نقاط",
            message: `${delta > 0 ? "تم إضافة" : "تم خصم"} ${Math.abs(delta)} نقطة ${delta > 0 ? "إلى" : "من"} حساب ${child[0].name}. السبب: ${reason}`,
            metadata: { delta, reason, childName: child[0].name },
          });
        }
      } else if (targetType === "parent") {
        await db.insert(pointAdjustments).values({
          targetType,
          targetId,
          adminId,
          delta,
          reason,
        });

        const parent = await db.select().from(parents).where(eq(parents.id, targetId));
        if (!parent[0]) {
          return res.status(404).json(errorResponse(ErrorCode.NOT_FOUND, "Parent not found"));
        }

        // Update parent wallet balance
        const existingWallet = await db.select().from(parentWallet).where(eq(parentWallet.parentId, targetId));
        if (existingWallet[0]) {
          await db.update(parentWallet)
            .set({ balance: sql`GREATEST(0, COALESCE(${parentWallet.balance}, 0) + ${delta})` })
            .where(eq(parentWallet.parentId, targetId));
        } else {
          await db.insert(parentWallet).values({
            parentId: targetId,
            balance: Math.max(0, delta).toString(),
          });
        }

        // Send notification to parent
        await createNotification({
          parentId: targetId,
          type: NOTIFICATION_TYPES.POINTS_ADJUSTMENT,
          title: delta > 0 ? "تم إضافة رصيد" : "تم خصم رصيد",
          message: `${delta > 0 ? "تم إضافة" : "تم خصم"} ${Math.abs(delta)} ر.س ${delta > 0 ? "إلى" : "من"} حسابك. السبب: ${reason}`,
          metadata: { delta, reason },
        });
      }

      res.json(successResponse(undefined, "Points adjusted successfully"));
    } catch (error: any) {
      console.error("Adjust points error:", error);
      res
        .status(500)
        .json(errorResponse(ErrorCode.INTERNAL_SERVER_ERROR, "Failed to adjust points"));
    }
  });

  // Get point adjustments history
  app.get("/api/admin/point-adjustments", adminMiddleware, async (req: any, res) => {
    try {
      const { targetType, targetId } = req.query;

      let query = db.select().from(pointAdjustments);
      
      if (targetType && targetId) {
        query = query.where(and(
          eq(pointAdjustments.targetType, targetType),
          eq(pointAdjustments.targetId, targetId)
        )) as any;
      } else if (targetType) {
        query = query.where(eq(pointAdjustments.targetType, targetType)) as any;
      }

      const adjustments = await query;
      res.json(successResponse(adjustments));
    } catch (error: any) {
      console.error("Get point adjustments error:", error);
      res
        .status(500)
        .json(errorResponse(ErrorCode.INTERNAL_SERVER_ERROR, "Failed to get point adjustments"));
    }
  });

  // Get Admin Orders
  app.get("/api/admin/orders", adminMiddleware, async (req: any, res) => {
    try {
      const result = await db.select().from(orders);
      res.json(successResponse(result));
    } catch (error: any) {
      console.error("Fetch orders error:", error);
      res
        .status(500)
        .json(errorResponse(ErrorCode.INTERNAL_SERVER_ERROR, "Failed to fetch orders"));
    }
  });

  // Get Admin Deposits (with parent info and payment method info) + filtering & pagination
  app.get("/api/admin/deposits", adminMiddleware, async (req: any, res) => {
    try {
      const { status, q, page = "1", limit = "50" } = req.query;
      const pageNum = Math.max(1, parseInt(page as string) || 1);
      const limitNum = Math.min(200, Math.max(1, parseInt(limit as string) || 50));
      const offset = (pageNum - 1) * limitNum;

      const conditions: any[] = [];
      if (status && ["pending", "completed", "cancelled"].includes(status as string)) {
        conditions.push(eq(deposits.status, status as string));
      }

      const searchQuery = typeof q === "string" ? q.trim() : "";
      if (searchQuery) {
        const searchPattern = `%${searchQuery.toLowerCase()}%`;
        conditions.push(
          or(
            sql`LOWER(COALESCE(${parents.name}, '')) LIKE ${searchPattern}`,
            sql`LOWER(COALESCE(${parents.email}, '')) LIKE ${searchPattern}`,
            sql`LOWER(COALESCE(${deposits.transactionId}, '')) LIKE ${searchPattern}`,
            sql`LOWER(COALESCE(${paymentMethods.accountNumber}, '')) LIKE ${searchPattern}`,
            sql`LOWER(COALESCE(${paymentMethods.bankName}, '')) LIKE ${searchPattern}`
          )
        );
      }

      const whereClause = conditions.length > 0 ? and(...conditions) : undefined;

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
          parentName: parents.name,
          parentEmail: parents.email,
          methodType: paymentMethods.type,
          methodBank: paymentMethods.bankName,
          methodAccount: paymentMethods.accountNumber,
        })
        .from(deposits)
        .leftJoin(parents, eq(deposits.parentId, parents.id))
        .leftJoin(paymentMethods, eq(deposits.paymentMethodId, paymentMethods.id))
        .where(whereClause)
        .orderBy(desc(deposits.createdAt))
        .limit(limitNum)
        .offset(offset);

      res.json(successResponse(result));
    } catch (error: any) {
      console.error("Fetch deposits error:", error);
      res
        .status(500)
        .json(errorResponse(ErrorCode.INTERNAL_SERVER_ERROR, "Failed to fetch deposits"));
    }
  });

  // Update Order Status (Admin)
  app.put("/api/admin/orders/:id", adminMiddleware, async (req: any, res) => {
    try {
      const { id } = req.params;
      const { status } = req.body;

      if (!["pending", "completed", "cancelled"].includes(status)) {
        return res
          .status(400)
          .json(errorResponse(ErrorCode.BAD_REQUEST, "Invalid status"));
      }

      await db.update(orders).set({ status }).where(eq(orders.id, id));
      res.json(successResponse(undefined, "Order updated"));
    } catch (error: any) {
      console.error("Update order error:", error);
      res
        .status(500)
        .json(errorResponse(ErrorCode.INTERNAL_SERVER_ERROR, "Failed to update order"));
    }
  });

  // Update Deposit Status (Admin) — approve adds balance, reject notifies parent
  app.put("/api/admin/deposits/:id", adminMiddleware, async (req: any, res) => {
    try {
      const { id } = req.params;
      const { status, adminNotes } = req.body;

      if (!["pending", "completed", "cancelled"].includes(status)) {
        return res
          .status(400)
          .json(errorResponse(ErrorCode.BAD_REQUEST, "Invalid status"));
      }

      // Get the deposit first
      const [deposit] = await db.select().from(deposits).where(eq(deposits.id, id));
      if (!deposit) {
        return res.status(404).json(errorResponse(ErrorCode.NOT_FOUND, "Deposit not found"));
      }

      // Don't re-process already completed deposits
      if (deposit.status === "completed" && status === "completed") {
        return res.status(400).json(errorResponse(ErrorCode.BAD_REQUEST, "Deposit already completed"));
      }

      const updateData: any = { 
        status,
        reviewedAt: new Date(),
      };
      if (adminNotes) updateData.adminNotes = adminNotes;
      if (status === "completed") updateData.completedAt = new Date();

      await db.update(deposits).set(updateData).where(eq(deposits.id, id));

      // If approved → add balance to parent wallet
      if (status === "completed" && deposit.status !== "completed") {
        const depositAmount = parseFloat(deposit.amount as string);

        // Check if wallet exists
        const [existingWallet] = await db.select().from(parentWallet).where(eq(parentWallet.parentId, deposit.parentId));
        
        if (existingWallet) {
          await db.update(parentWallet).set({
            balance: sql`${parentWallet.balance} + ${depositAmount}`,
            totalDeposited: sql`${parentWallet.totalDeposited} + ${depositAmount}`,
            updatedAt: new Date(),
          }).where(eq(parentWallet.parentId, deposit.parentId));
        } else {
          await db.insert(parentWallet).values({
            parentId: deposit.parentId,
            balance: depositAmount.toString(),
            totalDeposited: depositAmount.toString(),
          });
        }

        // Notify parent — deposit approved
        await createNotification({
          parentId: deposit.parentId,
          type: NOTIFICATION_TYPES.DEPOSIT_APPROVED,
          title: "✅ تم قبول الإيداع",
          message: `تم قبول طلب الإيداع الخاص بك بمبلغ ${depositAmount.toFixed(2)} وتم إضافته لرصيدك`,
          style: NOTIFICATION_STYLES.MODAL,
          priority: NOTIFICATION_PRIORITIES.NORMAL,
          soundAlert: true,
          metadata: { depositId: deposit.id, amount: depositAmount },
        });
      }

      // If rejected → notify parent
      if (status === "cancelled" && deposit.status !== "cancelled") {
        const depositAmount = parseFloat(deposit.amount as string);
        await createNotification({
          parentId: deposit.parentId,
          type: NOTIFICATION_TYPES.DEPOSIT_REJECTED,
          title: "❌ تم رفض الإيداع",
          message: adminNotes 
            ? `تم رفض طلب الإيداع بمبلغ ${depositAmount.toFixed(2)}. السبب: ${adminNotes}`
            : `تم رفض طلب الإيداع بمبلغ ${depositAmount.toFixed(2)}. يرجى التواصل مع الدعم`,
          style: NOTIFICATION_STYLES.MODAL,
          priority: NOTIFICATION_PRIORITIES.WARNING,
          soundAlert: true,
          metadata: { depositId: deposit.id, amount: depositAmount },
        });
      }

      res.json(successResponse(undefined, `Deposit ${status === "completed" ? "approved" : status === "cancelled" ? "rejected" : "updated"}`));
    } catch (error: any) {
      console.error("Update deposit error:", error);
      res
        .status(500)
        .json(errorResponse(ErrorCode.INTERNAL_SERVER_ERROR, "Failed to update deposit"));
    }
  });

  // ===== WALLET MANAGEMENT ROUTES =====

  // Get all wallets with parent info (optimized with parallel queries)
  app.get("/api/admin/wallets", adminMiddleware, async (req: any, res) => {
    try {
      const [walletsData, parentsData] = await Promise.all([
        db.select().from(parentWallet),
        db.select({ id: parents.id, email: parents.email, name: parents.name }).from(parents),
      ]);
      const parentsMap: Map<string, any> = new Map(parentsData.map((p: any) => [p.id, p]));

      const result = walletsData.map((wallet: any) => {
        const parent = parentsMap.get(wallet.parentId) as any;
        return {
          id: wallet.id,
          parentId: wallet.parentId,
          parentEmail: parent?.email,
          parentName: parent?.name,
          balance: parseFloat(wallet.balance),
          totalDeposited: parseFloat(wallet.totalDeposited),
          totalSpent: parseFloat(wallet.totalSpent),
          updatedAt: wallet.updatedAt,
        };
      });

      res.json(successResponse(result));
    } catch (error: any) {
      console.error("Fetch wallets error:", error);
      res
        .status(500)
        .json(errorResponse(ErrorCode.INTERNAL_SERVER_ERROR, "Failed to fetch wallets"));
    }
  });

  // Get wallet details for a specific parent
  app.get("/api/admin/wallets/:parentId", adminMiddleware, async (req: any, res) => {
    try {
      const { parentId } = req.params;

      const wallet = await db.select().from(parentWallet).where(eq(parentWallet.parentId, parentId));
      if (!wallet[0]) {
        return res.status(404).json(errorResponse(ErrorCode.NOT_FOUND, "Wallet not found"));
      }

      const depositsList = await db.select().from(deposits).where(eq(deposits.parentId, parentId));
      const ordersList = await db.select().from(orders).where(eq(orders.parentId, parentId));

      res.json(successResponse({
        wallet: {
          id: wallet[0].id,
          balance: parseFloat(wallet[0].balance),
          totalDeposited: parseFloat(wallet[0].totalDeposited),
          totalSpent: parseFloat(wallet[0].totalSpent),
          updatedAt: wallet[0].updatedAt,
        },
        deposits: depositsList.map((d: any) => ({
          id: d.id,
          amount: parseFloat(d.amount),
          status: d.status,
          createdAt: d.createdAt,
          completedAt: d.completedAt,
        })),
        orders: ordersList.map((o: any) => ({
          id: o.id,
          pointsPrice: o.pointsPrice,
          status: o.status,
          createdAt: o.createdAt,
        })),
      }));
    } catch (error: any) {
      console.error("Fetch wallet details error:", error);
      res
        .status(500)
        .json(errorResponse(ErrorCode.INTERNAL_SERVER_ERROR, "Failed to fetch wallet details"));
    }
  });

  // Add manual deposit to a parent's wallet (Admin action)
  app.post("/api/admin/wallets/:parentId/deposit", adminMiddleware, async (req: any, res) => {
    try {
      const { parentId } = req.params;
      const { amount, note } = req.body;

      if (!amount || amount <= 0) {
        return res
          .status(400)
          .json(errorResponse(ErrorCode.BAD_REQUEST, "Valid amount is required"));
      }

      // Check parent exists
      const parent = await db.select().from(parents).where(eq(parents.id, parentId));
      if (!parent[0]) {
        return res
          .status(404)
          .json(errorResponse(ErrorCode.NOT_FOUND, "Parent not found"));
      }

      // Get or create wallet
      const wallet = await db.select().from(parentWallet).where(eq(parentWallet.parentId, parentId));
      if (!wallet[0]) {
        await db.insert(parentWallet).values({
          parentId,
          balance: amount.toString(),
          totalDeposited: amount.toString(),
        });
      } else {
        const newBalance = parseFloat(wallet[0].balance) + amount;
        const newDeposited = parseFloat(wallet[0].totalDeposited) + amount;
        await db
          .update(parentWallet)
          .set({
            balance: newBalance.toString(),
            totalDeposited: newDeposited.toString(),
            updatedAt: new Date(),
          })
          .where(eq(parentWallet.parentId, parentId));
      }

      res.json(successResponse(undefined, "Deposit added successfully"));
    } catch (error: any) {
      console.error("Add deposit error:", error);
      res
        .status(500)
        .json(errorResponse(ErrorCode.INTERNAL_SERVER_ERROR, "Failed to add deposit"));
    }
  });

  // ===== PAYMENT METHODS MANAGEMENT =====

  // Get all payment methods
  app.get("/api/admin/payment-methods", adminMiddleware, async (req: any, res) => {
    try {
      const methods = await db.select().from(paymentMethods);
      res.json(successResponse(methods));
    } catch (error: any) {
      console.error("Fetch payment methods error:", error);
      res
        .status(500)
        .json(errorResponse(ErrorCode.INTERNAL_SERVER_ERROR, "Failed to fetch payment methods"));
    }
  });

  // Add new payment method (admin-created, no parentId needed)
  app.post("/api/admin/payment-methods", adminMiddleware, async (req: any, res) => {
    try {
      const { type, accountNumber, accountName, bankName, phoneNumber, isDefault, isActive } = req.body;

      const VALID_PAYMENT_TYPES = [
        "bank_transfer", "vodafone_cash", "orange_money", "etisalat_cash",
        "we_pay", "instapay", "fawry", "mobile_wallet", "credit_card", "other"
      ];

      if (!type || !accountNumber) {
        return res
          .status(400)
          .json(errorResponse(ErrorCode.BAD_REQUEST, "type and accountNumber are required"));
      }

      if (!VALID_PAYMENT_TYPES.includes(type)) {
        return res
          .status(400)
          .json(errorResponse(ErrorCode.BAD_REQUEST, `Invalid payment type. Allowed: ${VALID_PAYMENT_TYPES.join(", ")}`));
      }

      // If setting as default, unset all other defaults first
      if (isDefault) {
        await db.update(paymentMethods).set({ isDefault: false }).where(eq(paymentMethods.isDefault, true));
      }

      const result = await db
        .insert(paymentMethods)
        .values({
          parentId: null,
          type,
          accountNumber,
          accountName,
          bankName,
          phoneNumber,
          isDefault: isDefault ?? false,
          isActive: isActive ?? true,
        })
        .returning();

      res.json(successResponse(result[0], "Payment method added"));
    } catch (error: any) {
      console.error("Add payment method error:", error);
      res
        .status(500)
        .json(errorResponse(ErrorCode.INTERNAL_SERVER_ERROR, "Failed to add payment method"));
    }
  });

  // Update payment method
  app.put("/api/admin/payment-methods/:id", adminMiddleware, async (req: any, res) => {
    try {
      const { id } = req.params;
      const { type, accountNumber, accountName, bankName, phoneNumber, isDefault, isActive } = req.body;

      // Verify record exists
      const [existing] = await db.select({ id: paymentMethods.id }).from(paymentMethods).where(eq(paymentMethods.id, id));
      if (!existing) {
        return res.status(404).json(errorResponse(ErrorCode.NOT_FOUND, "Payment method not found"));
      }

      const VALID_PAYMENT_TYPES = [
        "bank_transfer", "vodafone_cash", "orange_money", "etisalat_cash",
        "we_pay", "instapay", "fawry", "mobile_wallet", "credit_card", "other"
      ];

      if (!type || !accountNumber) {
        return res
          .status(400)
          .json(errorResponse(ErrorCode.BAD_REQUEST, "type and accountNumber are required"));
      }

      if (!VALID_PAYMENT_TYPES.includes(type)) {
        return res
          .status(400)
          .json(errorResponse(ErrorCode.BAD_REQUEST, `Invalid payment type. Allowed: ${VALID_PAYMENT_TYPES.join(", ")}`));
      }

      // If setting as default, unset all other defaults first
      if (isDefault) {
        await db.update(paymentMethods).set({ isDefault: false }).where(eq(paymentMethods.isDefault, true));
      }

      const result = await db
        .update(paymentMethods)
        .set({
          type,
          accountNumber,
          accountName,
          bankName,
          phoneNumber,
          isDefault,
          isActive,
          updatedAt: new Date(),
        })
        .where(eq(paymentMethods.id, id))
        .returning();

      res.json(successResponse(result[0], "Payment method updated"));
    } catch (error: any) {
      console.error("Update payment method error:", error);
      res
        .status(500)
        .json(errorResponse(ErrorCode.INTERNAL_SERVER_ERROR, "Failed to update payment method"));
    }
  });

  // Delete payment method (with FK safety check)
  app.delete("/api/admin/payment-methods/:id", adminMiddleware, async (req: any, res) => {
    try {
      const { id } = req.params;

      // Verify record exists
      const [existing] = await db.select({ id: paymentMethods.id }).from(paymentMethods).where(eq(paymentMethods.id, id));
      if (!existing) {
        return res.status(404).json(errorResponse(ErrorCode.NOT_FOUND, "Payment method not found"));
      }

      // Check if any deposits reference this payment method
      const linkedDeposits = await db
        .select({ id: deposits.id })
        .from(deposits)
        .where(eq(deposits.paymentMethodId, id))
        .limit(1);

      if (linkedDeposits.length > 0) {
        // Soft-delete: deactivate instead of deleting
        await db.update(paymentMethods).set({ isActive: false, updatedAt: new Date() }).where(eq(paymentMethods.id, id));
        return res.json(successResponse(undefined, "Payment method deactivated (has linked deposits)"));
      }

      await db.delete(paymentMethods).where(eq(paymentMethods.id, id));
      res.json(successResponse(undefined, "Payment method deleted"));
    } catch (error: any) {
      console.error("Delete payment method error:", error);
      res
        .status(500)
        .json(errorResponse(ErrorCode.INTERNAL_SERVER_ERROR, "Failed to delete payment method"));
    }
  });

  // Get Contact Info (Admin)
  app.get("/api/admin/contact", adminMiddleware, async (req: any, res) => {
    try {
      // LOGIC-003 FIX: Read from DB first, fallback to env
      const settings = await db.select().from(siteSettings).where(
        or(
          eq(siteSettings.key, 'contact_phone'),
          eq(siteSettings.key, 'contact_email'),
          eq(siteSettings.key, 'contact_address'),
          eq(siteSettings.key, 'contact_whatsapp'),
          eq(siteSettings.key, 'contact_telegram')
        )
      );
      const getValue = (key: string, envKey: string) => {
        const setting = settings.find((s: any) => s.key === key);
        return setting?.value || process.env[envKey] || "";
      };
      res.json(successResponse({
        phone: getValue('contact_phone', 'CONTACT_PHONE'),
        email: getValue('contact_email', 'CONTACT_EMAIL'),
        address: getValue('contact_address', 'CONTACT_ADDRESS'),
        whatsapp: getValue('contact_whatsapp', 'CONTACT_WHATSAPP'),
        telegram: getValue('contact_telegram', 'CONTACT_TELEGRAM'),
      }));
    } catch (error: any) {
      console.error("Fetch contact error:", error);
      res
        .status(500)
        .json(errorResponse(ErrorCode.INTERNAL_SERVER_ERROR, "Failed to fetch contact info"));
    }
  });

  // Save Contact Info (Admin)
  app.post("/api/admin/contact", adminMiddleware, async (req: any, res) => {
    try {
      // LOGIC-003 FIX: Actually save to siteSettings table
      const { phone, email, address, whatsapp, telegram } = req.body;
      const entries = [
        { key: 'contact_phone', value: phone || '' },
        { key: 'contact_email', value: email || '' },
        { key: 'contact_address', value: address || '' },
        { key: 'contact_whatsapp', value: whatsapp || '' },
        { key: 'contact_telegram', value: telegram || '' },
      ];
      for (const entry of entries) {
        await db.insert(siteSettings)
          .values(entry)
          .onConflictDoUpdate({
            target: siteSettings.key,
            set: { value: entry.value, updatedAt: new Date() }
          });
      }
      res.json(successResponse(undefined, "Contact info saved"));
    } catch (error: any) {
      console.error("Save contact error:", error);
      res
        .status(500)
        .json(errorResponse(ErrorCode.INTERNAL_SERVER_ERROR, "Failed to save contact info"));
    }
  });

  // Get SEO Settings (Admin)
  app.get("/api/admin/seo", adminMiddleware, async (req: any, res) => {
    try {
      // LOGIC-003 FIX: Read from DB first, fallback to env
      const settings = await db.select().from(siteSettings).where(
        or(
          eq(siteSettings.key, 'seo_title'),
          eq(siteSettings.key, 'seo_description'),
          eq(siteSettings.key, 'seo_keywords'),
          eq(siteSettings.key, 'seo_og_image')
        )
      );
      const getValue = (key: string, envKey: string) => {
        const setting = settings.find((s: any) => s.key === key);
        return setting?.value || process.env[envKey] || "";
      };
      res.json(successResponse({
        siteTitle: getValue('seo_title', 'SEO_TITLE'),
        siteDescription: getValue('seo_description', 'SEO_DESCRIPTION'),
        keywords: getValue('seo_keywords', 'SEO_KEYWORDS'),
        ogImage: getValue('seo_og_image', 'SEO_OG_IMAGE'),
      }));
    } catch (error: any) {
      console.error("Fetch SEO error:", error);
      res
        .status(500)
        .json(errorResponse(ErrorCode.INTERNAL_SERVER_ERROR, "Failed to fetch SEO settings"));
    }
  });

  // Save SEO Settings (Admin)
  app.post("/api/admin/seo", adminMiddleware, async (req: any, res) => {
    try {
      // LOGIC-003 FIX: Actually save to siteSettings table
      const { siteTitle, siteDescription, keywords, ogImage } = req.body;
      const entries = [
        { key: 'seo_title', value: siteTitle || '' },
        { key: 'seo_description', value: siteDescription || '' },
        { key: 'seo_keywords', value: keywords || '' },
        { key: 'seo_og_image', value: ogImage || '' },
      ];
      for (const entry of entries) {
        await db.insert(siteSettings)
          .values(entry)
          .onConflictDoUpdate({
            target: siteSettings.key,
            set: { value: entry.value, updatedAt: new Date() }
          });
      }
      res.json(successResponse(undefined, "SEO settings saved"));
    } catch (error: any) {
      console.error("Save SEO error:", error);
      res
        .status(500)
        .json(errorResponse(ErrorCode.INTERNAL_SERVER_ERROR, "Failed to save SEO settings"));
    }
  });

  // ===== Phase 1: Admin Session Management =====

  // Get all active sessions for a parent
  app.get("/api/admin/parents/:parentId/sessions", adminMiddleware, async (req: any, res) => {
    try {
      const { parentId } = req.params;

      const parentSessions = await db
        .select()
        .from(sessions)
        .where(and(eq(sessions.parentId, parentId), eq(sessions.isActive, true)));

      res.json(successResponse(
        parentSessions.map((s: typeof sessions.$inferSelect) => ({
          id: s.id,
          deviceId: s.deviceId,
          ipAddress: s.ipAddress,
          userAgent: s.userAgent,
          createdAt: s.createdAt,
          expiresAt: s.expiresAt,
        }))
      ));
    } catch (error: any) {
      console.error("Get parent sessions error:", error);
      res
        .status(500)
        .json(errorResponse(ErrorCode.INTERNAL_SERVER_ERROR, "Failed to fetch sessions"));
    }
  });

  // Revoke a specific session
  app.post("/api/admin/sessions/:sessionId/revoke", adminMiddleware, async (req: any, res) => {
    try {
      const { sessionId } = req.params;
      const { reason } = req.body;

      const session = await db
        .select()
        .from(sessions)
        .where(eq(sessions.id, sessionId));

      if (!session[0]) {
        return res
          .status(404)
          .json(errorResponse(ErrorCode.NOT_FOUND, "Session not found"));
      }

      // Revoke session
      await db
        .update(sessions)
        .set({ isActive: false })
        .where(eq(sessions.id, sessionId));

      // Log admin action
      await db.insert(activityLog).values({
        adminId: req.admin.adminId,
        action: "REVOKE_SESSION",
        entity: "session",
        entityId: sessionId,
        meta: { parentId: session[0].parentId, reason: reason || "admin_action" },
      });

      res.json(successResponse(undefined, "Session revoked"));
    } catch (error: any) {
      console.error("Revoke session error:", error);
      res
        .status(500)
        .json(errorResponse(ErrorCode.INTERNAL_SERVER_ERROR, "Failed to revoke session"));
    }
  });

  // Revoke all sessions for a parent (Force OTP on next login)
  app.post("/api/admin/parents/:parentId/force-otp", adminMiddleware, async (req: any, res) => {
    try {
      const { parentId } = req.params;
      const { reason } = req.body;

      // Verify parent exists
      const parent = await db.select().from(parents).where(eq(parents.id, parentId));
      if (!parent[0]) {
        return res
          .status(404)
          .json(errorResponse(ErrorCode.NOT_FOUND, "Parent not found"));
      }

      // Revoke all active sessions
      await db
        .update(sessions)
        .set({ isActive: false })
        .where(and(eq(sessions.parentId, parentId), eq(sessions.isActive, true)));

      // Log admin action
      await db.insert(activityLog).values({
        adminId: req.admin.adminId,
        action: "FORCE_OTP",
        entity: "parent",
        entityId: parentId,
        meta: { reason: reason || "admin_action", revoked_session_count: 0 },
      });

      // Create notification
      await createNotification({
        parentId,
        type: NOTIFICATION_TYPES.SECURITY_ALERT,
        title: "🔒 تنبيه أمني",
        message: "تم تسجيل الخروج من جميع أجهزتك. يرجى تسجيل الدخول مرة أخرى.",
        style: NOTIFICATION_STYLES.MODAL,
        priority: NOTIFICATION_PRIORITIES.URGENT,
        relatedId: parentId,
      });

      res.json(successResponse(undefined, "All sessions revoked. Parent will need to log in again."));
    } catch (error: any) {
      console.error("Force OTP error:", error);
      res
        .status(500)
        .json(errorResponse(ErrorCode.INTERNAL_SERVER_ERROR, "Failed to force OTP"));
    }
  });

  // Get login history for a parent
  app.get("/api/admin/parents/:parentId/login-history", adminMiddleware, async (req: any, res) => {
    try {
      const { parentId } = req.params;
      const { limit = 20, offset = 0 } = req.query;

      const history = await db
        .select()
        .from(loginHistory)
        .where(eq(loginHistory.parentId, parentId))
        .orderBy(loginHistory.createdAt)
        .limit(parseInt(limit))
        .offset(parseInt(offset));

      res.json(successResponse(
        history.map((h: typeof loginHistory.$inferSelect) => ({
          id: h.id,
          deviceId: h.deviceId,
          success: h.success,
          ipAddress: h.ipAddress,
          failureReason: h.failureReason,
          suspiciousActivity: h.suspiciousActivity,
          createdAt: h.createdAt,
        }))
      ));
    } catch (error: any) {
      console.error("Get login history error:", error);
      res
        .status(500)
        .json(errorResponse(ErrorCode.INTERNAL_SERVER_ERROR, "Failed to fetch login history"));
    }
  });

  // Flag suspicious activity (admin review)
  app.post("/api/admin/login-history/:historyId/flag", adminMiddleware, async (req: any, res) => {
    try {
      const { historyId } = req.params;
      const { reason } = req.body;

      const record = await db
        .select()
        .from(loginHistory)
        .where(eq(loginHistory.id, historyId));

      if (!record[0]) {
        return res
          .status(404)
          .json(errorResponse(ErrorCode.NOT_FOUND, "Login history record not found"));
      }

      // Log admin action
      await db.insert(activityLog).values({
        adminId: req.admin.adminId,
        action: "FLAG_SUSPICIOUS_LOGIN",
        entity: "login_history",
        entityId: historyId,
        meta: { parentId: record[0].parentId, reason },
      });

      res.json(successResponse(undefined, "Login flagged for review"));
    } catch (error: any) {
      console.error("Flag suspicious login error:", error);
      res
        .status(500)
        .json(errorResponse(ErrorCode.INTERNAL_SERVER_ERROR, "Failed to flag login"));
    }
  });

  // Failed webhooks (Stripe)
  app.get("/api/admin/webhooks/failed", adminMiddleware, async (_req: any, res) => {
    try {
      const failed = await db
        .select()
        .from(webhookEvents)
        .where(or(isNull(webhookEvents.processedAt), not(isNull(webhookEvents.errorMessage))));
      res.json(successResponse(failed));
    } catch (error: any) {
      console.error("List failed webhooks error:", error);
      res
        .status(500)
        .json(errorResponse(ErrorCode.INTERNAL_SERVER_ERROR, "Failed to fetch webhooks"));
    }
  });

  // Paid but unfulfilled orders
  app.get("/api/admin/orders/paid-unfulfilled", adminMiddleware, async (_req: any, res) => {
    try {
      const paidOrders = await db.select().from(storeOrders).where(eq(storeOrders.status, "PAID"));
      const result: any[] = [];
      for (const o of paidOrders) {
        const ent = await db.select().from(entitlements).where(eq(entitlements.orderId, o.id));
        const wt = await db
          .select()
          .from(walletTransfers)
          .where(and(eq(walletTransfers.relatedOrderId, o.id), eq(walletTransfers.type, "DEPOSIT")));
        if (ent.length === 0 && wt.length === 0) {
          result.push(o);
        }
      }
      res.json(successResponse(result));
    } catch (error: any) {
      console.error("List paid unfulfilled error:", error);
      res
        .status(500)
        .json(errorResponse(ErrorCode.INTERNAL_SERVER_ERROR, "Failed to fetch paid unfulfilled"));
    }
  });

  // ===== Phase 1.3: Admin - Force Unlock Gift =====
  app.post("/api/admin/gifts/:id/force-unlock", adminMiddleware, async (req: any, res) => {
    try {
      const { id } = req.params;
      const { reason } = req.body;

      const gift = await db.select().from(gifts).where(eq(gifts.id, id));
      if (!gift[0]) {
        return res
          .status(404)
          .json(errorResponse(ErrorCode.NOT_FOUND, "Gift not found"));
      }
      if (gift[0].status !== "SENT") {
        return res
          .status(400)
          .json(errorResponse(ErrorCode.BAD_REQUEST, "Gift is not in SENT status"));
      }

      // Update to UNLOCKED
      await db
        .update(gifts)
        .set({ status: "UNLOCKED", unlockedAt: new Date() })
        .where(and(eq(gifts.id, id), eq(gifts.status, "SENT")));

      // Activity log
      await db.insert(activityLog).values({
        adminId: req.admin.adminId,
        action: "ADMIN_FORCE_UNLOCK_GIFT",
        entity: "gift",
        entityId: id,
        meta: { reason: reason || "admin_action", childId: gift[0].childId },
      });

      // Emit stub event
      emitGiftEvent({
        type: "gift.unlocked",
        giftId: id,
        parentId: gift[0].parentId,
        childId: gift[0].childId,
        productId: gift[0].productId,
        timestamp: new Date(),
        metadata: { forcedByAdmin: true, reason },
      });

      res.json(successResponse(undefined, "Gift force-unlocked"));
    } catch (error: any) {
      console.error("Force unlock gift error:", error);
      res
        .status(500)
        .json(errorResponse(ErrorCode.INTERNAL_SERVER_ERROR, "Failed to force unlock gift"));
    }
  });

  // ===== Phase 1.3: Admin - Force Activate Gift =====
  app.post("/api/admin/gifts/:id/force-activate", adminMiddleware, async (req: any, res) => {
    try {
      const { id } = req.params;
      const { reason } = req.body;

      const gift = await db.select().from(gifts).where(eq(gifts.id, id));
      if (!gift[0]) {
        return res
          .status(404)
          .json(errorResponse(ErrorCode.NOT_FOUND, "Gift not found"));
      }
      if (gift[0].status === "ACTIVATED") {
        return res.json(successResponse(undefined, "Gift already activated"));
      }
      if (gift[0].status === "REVOKED") {
        return res
          .status(400)
          .json(errorResponse(ErrorCode.BAD_REQUEST, "Cannot activate revoked gift"));
      }

      // Update entitlement to ACTIVE (childId already set from send)
      const ent = await db
        .select()
        .from(entitlements)
        .where(
          and(
            eq(entitlements.productId, gift[0].productId),
            eq(entitlements.parentId, gift[0].parentId),
            eq(entitlements.childId, gift[0].childId)
          )
        );
      if (ent[0]) {
        await db
          .update(entitlements)
          .set({
            status: "ACTIVE",
            metadata: { ...ent[0].metadata, giftId: id, activatedAt: new Date().toISOString(), forcedByAdmin: true },
            updatedAt: new Date(),
          })
          .where(eq(entitlements.id, ent[0].id));
      }

      // Update gift to ACTIVATED
      await db
        .update(gifts)
        .set({ status: "ACTIVATED", activatedAt: new Date() })
        .where(eq(gifts.id, id));

      // Activity log
      await db.insert(activityLog).values({
        adminId: req.admin.adminId,
        action: "ADMIN_FORCE_ACTIVATE_GIFT",
        entity: "gift",
        entityId: id,
        meta: { reason: reason || "admin_action", childId: gift[0].childId },
      });

      // Emit stub event
      emitGiftEvent({
        type: "gift.activated",
        giftId: id,
        parentId: gift[0].parentId,
        childId: gift[0].childId,
        productId: gift[0].productId,
        timestamp: new Date(),
        metadata: { forcedByAdmin: true, reason },
      });

      res.json(successResponse(undefined, "Gift force-activated"));
    } catch (error: any) {
      console.error("Force activate gift error:", error);
      res
        .status(500)
        .json(errorResponse(ErrorCode.INTERNAL_SERVER_ERROR, "Failed to force activate gift"));
    }
  });

  // ===== Phase 1.3: Admin - Revoke Gift =====
  app.post("/api/admin/gifts/:id/revoke", adminMiddleware, async (req: any, res) => {
    try {
      const { id } = req.params;
      const { reason } = req.body;

      const gift = await db.select().from(gifts).where(eq(gifts.id, id));
      if (!gift[0]) {
        return res
          .status(404)
          .json(errorResponse(ErrorCode.NOT_FOUND, "Gift not found"));
      }
      if (gift[0].status === "ACTIVATED") {
        return res
          .status(400)
          .json(errorResponse(ErrorCode.BAD_REQUEST, "Cannot revoke activated gift"));
      }
      if (gift[0].status === "REVOKED") {
        return res.json(successResponse(undefined, "Gift already revoked"));
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
            eq(entitlements.parentId, gift[0].parentId),
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
        adminId: req.admin.adminId,
        action: "ADMIN_REVOKE_GIFT",
        entity: "gift",
        entityId: id,
        meta: { reason: reason || "admin_action", childId: gift[0].childId },
      });

      // Emit stub event
      emitGiftEvent({
        type: "gift.revoked",
        giftId: id,
        parentId: gift[0].parentId,
        childId: gift[0].childId,
        productId: gift[0].productId,
        timestamp: new Date(),
        metadata: { revokedByAdmin: true, reason },
      });

      res.json(successResponse(undefined, "Gift revoked by admin"));
    } catch (error: any) {
      console.error("Admin revoke gift error:", error);
      res
        .status(500)
        .json(errorResponse(ErrorCode.INTERNAL_SERVER_ERROR, "Failed to revoke gift"));
    }
  });

  // ================= GAMES MANAGEMENT =================
  
  // Get all games (admin)
  app.get("/api/admin/games", adminMiddleware, async (req: any, res) => {
    try {
      const games = await db.select().from(flashGames);
      res.json(successResponse(games));
    } catch (error: any) {
      console.error("Get admin games error:", error);
      res
        .status(500)
        .json(errorResponse(ErrorCode.INTERNAL_SERVER_ERROR, "Failed to get games"));
    }
  });

  // Create a new game
  app.post("/api/admin/games", adminMiddleware, async (req: any, res) => {
    try {
      const { title, description, embedUrl, thumbnailUrl, pointsPerPlay, category, minAge, maxAge, maxPlaysPerDay } = req.body;
      
      if (!title || !embedUrl) {
        return res
          .status(400)
          .json(errorResponse(ErrorCode.BAD_REQUEST, "Title and embed URL are required"));
      }

      // Prevent duplicate games with the same embed URL
      const [existingGame] = await db.select({ id: flashGames.id })
        .from(flashGames)
        .where(eq(flashGames.embedUrl, embedUrl))
        .limit(1);
      if (existingGame) {
        return res
          .status(409)
          .json(errorResponse(ErrorCode.BAD_REQUEST, "A game with this URL already exists"));
      }

      const [game] = await db.insert(flashGames).values({
        title,
        description: description || null,
        embedUrl,
        thumbnailUrl: thumbnailUrl || null,
        pointsPerPlay: pointsPerPlay || 5,
        category: category || "general",
        minAge: minAge || null,
        maxAge: maxAge || null,
        maxPlaysPerDay: maxPlaysPerDay || 0,
        isActive: true,
      }).returning();

      await db.insert(activityLog).values({
        adminId: req.admin.adminId,
        action: "CREATE_GAME",
        entity: "game",
        entityId: game.id,
        meta: { title },
      });

      res.json(successResponse(game, "Game created successfully"));
    } catch (error: any) {
      console.error("Create game error:", error);
      res
        .status(500)
        .json(errorResponse(ErrorCode.INTERNAL_SERVER_ERROR, "Failed to create game"));
    }
  });

  // Update a game
  app.put("/api/admin/games/:id", adminMiddleware, async (req: any, res) => {
    try {
      const { id } = req.params;
      const { title, description, embedUrl, thumbnailUrl, pointsPerPlay, isActive, category, minAge, maxAge, maxPlaysPerDay } = req.body;

      const updateData: Record<string, any> = {};
      if (title !== undefined) updateData['title'] = title;
      if (description !== undefined) updateData['description'] = description;
      if (embedUrl !== undefined) updateData['embedUrl'] = embedUrl;
      if (thumbnailUrl !== undefined) updateData['thumbnailUrl'] = thumbnailUrl;
      if (pointsPerPlay !== undefined) updateData['pointsPerPlay'] = pointsPerPlay;
      if (isActive !== undefined) updateData['isActive'] = isActive;
      if (category !== undefined) updateData['category'] = category;
      if (minAge !== undefined) updateData['minAge'] = minAge;
      if (maxAge !== undefined) updateData['maxAge'] = maxAge;
      if (maxPlaysPerDay !== undefined) updateData['maxPlaysPerDay'] = maxPlaysPerDay;

      const [game] = await db.update(flashGames)
        .set(updateData)
        .where(eq(flashGames.id, id))
        .returning();

      await db.insert(activityLog).values({
        adminId: req.admin.adminId,
        action: "UPDATE_GAME",
        entity: "game",
        entityId: id,
        meta: { title, isActive },
      });

      res.json(successResponse(game, "Game updated successfully"));
    } catch (error: any) {
      console.error("Update game error:", error);
      res
        .status(500)
        .json(errorResponse(ErrorCode.INTERNAL_SERVER_ERROR, "Failed to update game"));
    }
  });

  // Delete a game
  app.delete("/api/admin/games/:id", adminMiddleware, async (req: any, res) => {
    try {
      const { id } = req.params;
      
      const game = await db.select().from(flashGames).where(eq(flashGames.id, id));
      if (!game[0]) {
        return res
          .status(404)
          .json(errorResponse(ErrorCode.NOT_FOUND, "Game not found"));
      }

      await db.delete(flashGames).where(eq(flashGames.id, id));

      await db.insert(activityLog).values({
        adminId: req.admin.adminId,
        action: "DELETE_GAME",
        entity: "game",
        entityId: id,
        meta: { title: game[0].title },
      });

      res.json(successResponse(undefined, "Game deleted successfully"));
    } catch (error: any) {
      console.error("Delete game error:", error);
      res
        .status(500)
        .json(errorResponse(ErrorCode.INTERNAL_SERVER_ERROR, "Failed to delete game"));
    }
  });

  // Toggle game active status
  app.patch("/api/admin/games/:id/toggle", adminMiddleware, async (req: any, res) => {
    try {
      const { id } = req.params;
      
      const game = await db.select().from(flashGames).where(eq(flashGames.id, id));
      if (!game[0]) {
        return res
          .status(404)
          .json(errorResponse(ErrorCode.NOT_FOUND, "Game not found"));
      }

      const [updated] = await db.update(flashGames)
        .set({ isActive: !game[0].isActive })
        .where(eq(flashGames.id, id))
        .returning();

      res.json(successResponse(updated, `Game ${updated.isActive ? "activated" : "deactivated"}`));
    } catch (error: any) {
      console.error("Toggle game error:", error);
      res
        .status(500)
        .json(errorResponse(ErrorCode.INTERNAL_SERVER_ERROR, "Failed to toggle game"));
    }
  });

  // ===== UPLOAD GAME FILE =====
  app.post("/api/admin/games/upload", adminMiddleware, async (req: any, res) => {
    try {
      const multer = await import("multer");
      const pathMod = await import("path");
      const fs = await import("fs");

      const uploadDir = pathMod.join(process.cwd(), "uploads", "games");
      if (!fs.existsSync(uploadDir)) {
        fs.mkdirSync(uploadDir, { recursive: true });
      }

      const storage = multer.default.diskStorage({
        destination: (_req: any, _file: any, cb: any) => {
          cb(null, uploadDir);
        },
        filename: (_req: any, file: any, cb: any) => {
          // Sanitize filename: replace spaces, keep extension
          const safeName = file.originalname
            .replace(/\s+/g, "-")
            .replace(/[^a-zA-Z0-9._\-]/g, "");
          const uniqueSuffix = Date.now() + "-" + Math.round(Math.random() * 1e9);
          const ext = pathMod.extname(safeName) || ".html";
          const baseName = pathMod.basename(safeName, ext);
          cb(null, `${baseName}-${uniqueSuffix}${ext}`);
        },
      });

      const fileFilter = (_req: any, file: any, cb: any) => {
        const allowed = [".html", ".htm"];
        const ext = pathMod.extname(file.originalname).toLowerCase();
        if (allowed.includes(ext)) {
          cb(null, true);
        } else {
          cb(new Error(`File type ${ext} not allowed. Only .html and .htm files are accepted.`));
        }
      };

      const upload = multer.default({
        storage,
        limits: { fileSize: 10 * 1024 * 1024 }, // 10MB max
        fileFilter,
      }).single("gameFile");

      upload(req, res, async (err: any) => {
        if (err) {
          console.error("Game upload error:", err);
          return res
            .status(400)
            .json(errorResponse(ErrorCode.BAD_REQUEST, `Upload failed: ${err.message}`));
        }

        if (!req.file) {
          return res
            .status(400)
            .json(errorResponse(ErrorCode.BAD_REQUEST, "No file uploaded"));
        }

        const gameUrl = `/uploads/games/${req.file.filename}`;
        res.json(successResponse({
          url: gameUrl,
          filename: req.file.filename,
          originalName: req.file.originalname,
          size: req.file.size,
        }, "Game file uploaded successfully"));
      });
    } catch (error: any) {
      console.error("Upload game file error:", error);
      res
        .status(500)
        .json(errorResponse(ErrorCode.INTERNAL_SERVER_ERROR, "Failed to upload game file"));
    }
  });

  // ===== BULK TOGGLE GAMES =====
  app.patch("/api/admin/games/bulk-toggle", adminMiddleware, async (req: any, res) => {
    try {
      const { ids, isActive } = req.body;
      if (!ids || !Array.isArray(ids) || ids.length === 0) {
        return res.status(400).json(errorResponse(ErrorCode.BAD_REQUEST, "No game IDs provided"));
      }

      for (const id of ids) {
        await db.update(flashGames).set({ isActive }).where(eq(flashGames.id, id));
      }

      await db.insert(activityLog).values({
        adminId: req.admin.adminId,
        action: isActive ? "BULK_ACTIVATE_GAMES" : "BULK_DEACTIVATE_GAMES",
        entity: "game",
        entityId: ids[0],
        meta: { count: ids.length, ids },
      });

      res.json(successResponse({ updated: ids.length }, `${ids.length} games ${isActive ? "activated" : "deactivated"}`));
    } catch (error: any) {
      console.error("Bulk toggle games error:", error);
      res
        .status(500)
        .json(errorResponse(ErrorCode.INTERNAL_SERVER_ERROR, "Failed to bulk toggle games"));
    }
  });

  // ===== BULK DELETE GAMES =====
  app.delete("/api/admin/games/bulk-delete", adminMiddleware, async (req: any, res) => {
    try {
      const { ids } = req.body;
      if (!ids || !Array.isArray(ids) || ids.length === 0) {
        return res.status(400).json(errorResponse(ErrorCode.BAD_REQUEST, "No game IDs provided"));
      }

      const games = await db.select().from(flashGames).where(inArray(flashGames.id, ids));

      for (const id of ids) {
        await db.delete(flashGames).where(eq(flashGames.id, id));
      }

      await db.insert(activityLog).values({
        adminId: req.admin.adminId,
        action: "BULK_DELETE_GAMES",
        entity: "game",
        entityId: ids[0],
        meta: { count: ids.length, titles: games.map((g: any) => g.title) },
      });

      res.json(successResponse({ deleted: ids.length }, `${ids.length} games deleted`));
    } catch (error: any) {
      console.error("Bulk delete games error:", error);
      res
        .status(500)
        .json(errorResponse(ErrorCode.INTERNAL_SERVER_ERROR, "Failed to bulk delete games"));
    }
  });

  // ================= CHILD-GAME ASSIGNMENTS =================

  // Get games assigned to a specific child
  app.get("/api/admin/children/:childId/games", adminMiddleware, async (req: any, res) => {
    try {
      const { childId } = req.params;
      const child = await db.select().from(children).where(eq(children.id, childId));
      if (!child[0]) {
        return res.status(404).json(errorResponse(ErrorCode.NOT_FOUND, "Child not found"));
      }

      const assignments = await db.select({
        id: childGameAssignments.id,
        childId: childGameAssignments.childId,
        gameId: childGameAssignments.gameId,
        maxPlaysPerDay: childGameAssignments.maxPlaysPerDay,
        isActive: childGameAssignments.isActive,
        assignedBy: childGameAssignments.assignedBy,
        createdAt: childGameAssignments.createdAt,
        gameTitle: flashGames.title,
        gameThumbnail: flashGames.thumbnailUrl,
        gameCategory: flashGames.category,
        gamePointsPerPlay: flashGames.pointsPerPlay,
        gameIsActive: flashGames.isActive,
      })
        .from(childGameAssignments)
        .innerJoin(flashGames, eq(childGameAssignments.gameId, flashGames.id))
        .where(eq(childGameAssignments.childId, childId));

      res.json(successResponse(assignments));
    } catch (error: any) {
      console.error("Get child games error:", error);
      res.status(500).json(errorResponse(ErrorCode.INTERNAL_SERVER_ERROR, "Failed to fetch child games"));
    }
  });

  // Assign games to a child (bulk — accepts array of gameIds)
  app.post("/api/admin/children/:childId/games", adminMiddleware, async (req: any, res) => {
    try {
      const { childId } = req.params;
      const { gameIds, maxPlaysPerDay } = req.body;
      const adminId = req.admin.adminId;

      if (!gameIds || !Array.isArray(gameIds) || gameIds.length === 0) {
        return res.status(400).json(errorResponse(ErrorCode.BAD_REQUEST, "gameIds array is required"));
      }

      const child = await db.select().from(children).where(eq(children.id, childId));
      if (!child[0]) {
        return res.status(404).json(errorResponse(ErrorCode.NOT_FOUND, "Child not found"));
      }

      // Verify all games exist
      const existingGames = await db.select({ id: flashGames.id }).from(flashGames);
      const existingIds = new Set(existingGames.map((g: any) => g.id));
      const invalidIds = gameIds.filter((id: string) => !existingIds.has(id));
      if (invalidIds.length > 0) {
        return res.status(400).json(errorResponse(ErrorCode.BAD_REQUEST, `Invalid game IDs: ${invalidIds.join(", ")}`));
      }

      // Get existing assignments to avoid duplicates
      const existing = await db.select({ gameId: childGameAssignments.gameId })
        .from(childGameAssignments)
        .where(eq(childGameAssignments.childId, childId));
      const existingSet = new Set(existing.map((e: any) => e.gameId));

      const newGameIds = gameIds.filter((id: string) => !existingSet.has(id));

      if (newGameIds.length > 0) {
        await db.insert(childGameAssignments).values(
          newGameIds.map((gameId: string) => ({
            childId,
            gameId,
            maxPlaysPerDay: maxPlaysPerDay || 0,
            assignedBy: adminId,
          }))
        );
      }

      await db.insert(activityLog).values({
        adminId,
        action: "ASSIGN_GAMES_TO_CHILD",
        entity: "child",
        entityId: childId,
        meta: { gameIds: newGameIds, childName: child[0].name },
      });

      res.json(successResponse({ assigned: newGameIds.length }, `${newGameIds.length} games assigned`));
    } catch (error: any) {
      console.error("Assign games error:", error);
      res.status(500).json(errorResponse(ErrorCode.INTERNAL_SERVER_ERROR, "Failed to assign games"));
    }
  });

  // Remove a game assignment from a child
  app.delete("/api/admin/children/:childId/games/:gameId", adminMiddleware, async (req: any, res) => {
    try {
      const { childId, gameId } = req.params;

      await db.delete(childGameAssignments)
        .where(and(eq(childGameAssignments.childId, childId), eq(childGameAssignments.gameId, gameId)));

      await db.insert(activityLog).values({
        adminId: req.admin.adminId,
        action: "REMOVE_GAME_FROM_CHILD",
        entity: "child",
        entityId: childId,
        meta: { gameId },
      });

      res.json(successResponse(undefined, "Game removed from child"));
    } catch (error: any) {
      console.error("Remove game assignment error:", error);
      res.status(500).json(errorResponse(ErrorCode.INTERNAL_SERVER_ERROR, "Failed to remove game"));
    }
  });

  // Update a child's game assignment (max plays per day)
  app.patch("/api/admin/children/:childId/games/:gameId", adminMiddleware, async (req: any, res) => {
    try {
      const { childId, gameId } = req.params;
      const { maxPlaysPerDay, isActive } = req.body;

      const updateData: Record<string, any> = {};
      if (maxPlaysPerDay !== undefined) updateData['maxPlaysPerDay'] = maxPlaysPerDay;
      if (isActive !== undefined) updateData['isActive'] = isActive;

      const [updated] = await db.update(childGameAssignments)
        .set(updateData)
        .where(and(eq(childGameAssignments.childId, childId), eq(childGameAssignments.gameId, gameId)))
        .returning();

      if (!updated) {
        return res.status(404).json(errorResponse(ErrorCode.NOT_FOUND, "Assignment not found"));
      }

      res.json(successResponse(updated, "Assignment updated"));
    } catch (error: any) {
      console.error("Update game assignment error:", error);
      res.status(500).json(errorResponse(ErrorCode.INTERNAL_SERVER_ERROR, "Failed to update assignment"));
    }
  });

  // Bulk replace all game assignments for a child
  app.put("/api/admin/children/:childId/games", adminMiddleware, async (req: any, res) => {
    try {
      const { childId } = req.params;
      const { gameIds, maxPlaysPerDay } = req.body;
      const adminId = req.admin.adminId;

      if (!Array.isArray(gameIds)) {
        return res.status(400).json(errorResponse(ErrorCode.BAD_REQUEST, "gameIds array is required"));
      }

      const child = await db.select().from(children).where(eq(children.id, childId));
      if (!child[0]) {
        return res.status(404).json(errorResponse(ErrorCode.NOT_FOUND, "Child not found"));
      }

      // Delete all existing and re-insert
      await db.delete(childGameAssignments).where(eq(childGameAssignments.childId, childId));

      if (gameIds.length > 0) {
        await db.insert(childGameAssignments).values(
          gameIds.map((gameId: string) => ({
            childId,
            gameId,
            maxPlaysPerDay: maxPlaysPerDay || 0,
            assignedBy: adminId,
          }))
        );
      }

      await db.insert(activityLog).values({
        adminId,
        action: "REPLACE_CHILD_GAMES",
        entity: "child",
        entityId: childId,
        meta: { gameIds, childName: child[0].name },
      });

      res.json(successResponse({ total: gameIds.length }, `Child now has ${gameIds.length} games assigned`));
    } catch (error: any) {
      console.error("Replace child games error:", error);
      res.status(500).json(errorResponse(ErrorCode.INTERNAL_SERVER_ERROR, "Failed to replace games"));
    }
  });

  // ===== SUBJECTS MANAGEMENT =====

  // Get all subjects
  app.get("/api/admin/subjects", adminMiddleware, async (req: any, res) => {
    try {
      const result = await db.select().from(subjects).orderBy(subjects.name);
      res.json(successResponse(result));
    } catch (error: any) {
      console.error("Fetch subjects error:", error);
      res
        .status(500)
        .json(errorResponse(ErrorCode.INTERNAL_SERVER_ERROR, "Failed to fetch subjects"));
    }
  });

  // Create subject
  app.post("/api/admin/subjects", adminMiddleware, async (req: any, res) => {
    try {
      const { name, emoji, description, color } = req.body;
      if (!name) {
        return res
          .status(400)
          .json(errorResponse(ErrorCode.BAD_REQUEST, "Subject name is required"));
      }

      const [result] = await db.insert(subjects).values({
        name,
        emoji: emoji || "📚",
        description: description || "",
        color: color || "#6B4D9D",
      }).returning();

      await db.insert(activityLog).values({
        adminId: req.admin.adminId,
        action: "CREATE_SUBJECT",
        entity: "subject",
        entityId: result.id,
        meta: { name, emoji },
      });

      res.json(successResponse(result, "Subject created successfully"));
    } catch (error: any) {
      console.error("Create subject error:", error);
      res
        .status(500)
        .json(errorResponse(ErrorCode.INTERNAL_SERVER_ERROR, "Failed to create subject"));
    }
  });

  // Update subject
  app.put("/api/admin/subjects/:id", adminMiddleware, async (req: any, res) => {
    try {
      const { id } = req.params;
      const { name, emoji, description, color, isActive } = req.body;

      const existing = await db.select().from(subjects).where(eq(subjects.id, id));
      if (!existing[0]) {
        return res
          .status(404)
          .json(errorResponse(ErrorCode.NOT_FOUND, "Subject not found"));
      }

      const [result] = await db.update(subjects)
        .set({
          ...(name && { name }),
          ...(emoji && { emoji }),
          ...(description !== undefined && { description }),
          ...(color && { color }),
          ...(isActive !== undefined && { isActive }),
        })
        .where(eq(subjects.id, id))
        .returning();

      await db.insert(activityLog).values({
        adminId: req.admin.adminId,
        action: "UPDATE_SUBJECT",
        entity: "subject",
        entityId: id,
        meta: { name, emoji },
      });

      res.json(successResponse(result, "Subject updated successfully"));
    } catch (error: any) {
      console.error("Update subject error:", error);
      res
        .status(500)
        .json(errorResponse(ErrorCode.INTERNAL_SERVER_ERROR, "Failed to update subject"));
    }
  });

  // Delete subject
  app.delete("/api/admin/subjects/:id", adminMiddleware, async (req: any, res) => {
    try {
      const { id } = req.params;

      const existing = await db.select().from(subjects).where(eq(subjects.id, id));
      if (!existing[0]) {
        return res
          .status(404)
          .json(errorResponse(ErrorCode.NOT_FOUND, "Subject not found"));
      }

      await db.delete(subjects).where(eq(subjects.id, id));

      await db.insert(activityLog).values({
        adminId: req.admin.adminId,
        action: "DELETE_SUBJECT",
        entity: "subject",
        entityId: id,
        meta: { name: existing[0].name },
      });

      res.json(successResponse(undefined, "Subject deleted successfully"));
    } catch (error: any) {
      console.error("Delete subject error:", error);
      res
        .status(500)
        .json(errorResponse(ErrorCode.INTERNAL_SERVER_ERROR, "Failed to delete subject"));
    }
  });

  // ===== TASKS SETTINGS =====

  // Get tasks settings
  app.get("/api/admin/tasks-settings", adminMiddleware, async (req: any, res) => {
    try {
      const rows = await db.select().from(tasksSettings);
      if (rows.length === 0) {
        // Create default settings row
        const [created] = await db.insert(tasksSettings).values({
          maxTasksPerDay: 10,
          allowCustomTasks: true,
        }).returning();
        return res.json(successResponse(created));
      }
      res.json(successResponse(rows[0]));
    } catch (error: any) {
      console.error("Fetch tasks settings error:", error);
      res.status(500).json(errorResponse(ErrorCode.INTERNAL_SERVER_ERROR, "Failed to fetch tasks settings"));
    }
  });

  // Update tasks settings
  app.put("/api/admin/tasks-settings", adminMiddleware, async (req: any, res) => {
    try {
      const { maxTasksPerDay, allowCustomTasks } = req.body;
      const rows = await db.select().from(tasksSettings);
      if (rows.length === 0) {
        const [created] = await db.insert(tasksSettings).values({
          maxTasksPerDay: maxTasksPerDay ?? 10,
          allowCustomTasks: allowCustomTasks ?? true,
        }).returning();
        await db.insert(activityLog).values({
          adminId: req.admin.adminId,
          action: "UPDATE_TASKS_SETTINGS",
          entity: "tasks_settings",
          entityId: created.id,
          meta: { maxTasksPerDay, allowCustomTasks },
        });
        return res.json(successResponse(created, "Tasks settings saved"));
      }
      const updateData: Record<string, any> = { updatedAt: new Date() };
      if (maxTasksPerDay !== undefined) updateData['maxTasksPerDay'] = maxTasksPerDay;
      if (allowCustomTasks !== undefined) updateData['allowCustomTasks'] = allowCustomTasks;

      const [updated] = await db.update(tasksSettings)
        .set(updateData)
        .where(eq(tasksSettings.id, rows[0]!.id))
        .returning();

      await db.insert(activityLog).values({
        adminId: req.admin.adminId,
        action: "UPDATE_TASKS_SETTINGS",
        entity: "tasks_settings",
        entityId: updated.id,
        meta: { maxTasksPerDay, allowCustomTasks },
      });

      res.json(successResponse(updated, "Tasks settings saved"));
    } catch (error: any) {
      console.error("Update tasks settings error:", error);
      res.status(500).json(errorResponse(ErrorCode.INTERNAL_SERVER_ERROR, "Failed to update tasks settings"));
    }
  });

  // ===== TEMPLATE TASKS MANAGEMENT =====

  // Get all template tasks (with optional subject filter)
  app.get("/api/admin/template-tasks", adminMiddleware, async (req: any, res) => {
    try {
      const { subjectId } = req.query;
      let query = db.select().from(templateTasks);
      
      if (subjectId) {
        query = query.where(eq(templateTasks.subjectId, subjectId as string));
      }

      const result = await query;
      res.json(successResponse(result));
    } catch (error: any) {
      console.error("Fetch template tasks error:", error);
      res
        .status(500)
        .json(errorResponse(ErrorCode.INTERNAL_SERVER_ERROR, "Failed to fetch template tasks"));
    }
  });

  // Create template task
  app.post("/api/admin/template-tasks", adminMiddleware, async (req: any, res) => {
    try {
      const { subjectId, title, question, answers, pointsReward, difficulty } = req.body;
      if (!subjectId || !title || !question || !answers) {
        return res
          .status(400)
          .json(errorResponse(ErrorCode.BAD_REQUEST, "Subject, title, question and answers are required"));
      }

      const subjectExists = await db.select().from(subjects).where(eq(subjects.id, subjectId));
      if (!subjectExists[0]) {
        return res
          .status(404)
          .json(errorResponse(ErrorCode.NOT_FOUND, "Subject not found"));
      }

      const [result] = await db.insert(templateTasks).values({
        subjectId,
        title,
        question,
        answers,
        pointsReward: pointsReward || 10,
        difficulty: difficulty || "medium",
      }).returning();

      await db.insert(activityLog).values({
        adminId: req.admin.adminId,
        action: "CREATE_TEMPLATE_TASK",
        entity: "template_task",
        entityId: result.id,
        meta: { title, subjectId },
      });

      res.json(successResponse(result, "Template task created successfully"));
    } catch (error: any) {
      console.error("Create template task error:", error);
      res
        .status(500)
        .json(errorResponse(ErrorCode.INTERNAL_SERVER_ERROR, "Failed to create template task"));
    }
  });

  // Update template task
  app.put("/api/admin/template-tasks/:id", adminMiddleware, async (req: any, res) => {
    try {
      const { id } = req.params;
      const { title, question, answers, pointsReward, difficulty, isActive } = req.body;

      const existing = await db.select().from(templateTasks).where(eq(templateTasks.id, id));
      if (!existing[0]) {
        return res
          .status(404)
          .json(errorResponse(ErrorCode.NOT_FOUND, "Template task not found"));
      }

      const [result] = await db.update(templateTasks)
        .set({
          ...(title && { title }),
          ...(question && { question }),
          ...(answers && { answers }),
          ...(pointsReward && { pointsReward }),
          ...(difficulty && { difficulty }),
          ...(isActive !== undefined && { isActive }),
        })
        .where(eq(templateTasks.id, id))
        .returning();

      res.json(successResponse(result, "Template task updated successfully"));
    } catch (error: any) {
      console.error("Update template task error:", error);
      res
        .status(500)
        .json(errorResponse(ErrorCode.INTERNAL_SERVER_ERROR, "Failed to update template task"));
    }
  });

  // Delete template task
  app.delete("/api/admin/template-tasks/:id", adminMiddleware, async (req: any, res) => {
    try {
      const { id } = req.params;

      const existing = await db.select().from(templateTasks).where(eq(templateTasks.id, id));
      if (!existing[0]) {
        return res
          .status(404)
          .json(errorResponse(ErrorCode.NOT_FOUND, "Template task not found"));
      }

      await db.delete(templateTasks).where(eq(templateTasks.id, id));
      res.json(successResponse(undefined, "Template task deleted successfully"));
    } catch (error: any) {
      console.error("Delete template task error:", error);
      res
        .status(500)
        .json(errorResponse(ErrorCode.INTERNAL_SERVER_ERROR, "Failed to delete template task"));
    }
  });

  // ===== PARENT CREATED TASKS (for admin to view and convert) =====
  app.get("/api/admin/parent-created-tasks", adminMiddleware, async (req: any, res) => {
    try {
      const parentCreatedTasks = await db
        .select({
          id: tasks.id,
          question: tasks.question,
          answers: tasks.answers,
          pointsReward: tasks.pointsReward,
          status: tasks.status,
          createdAt: tasks.createdAt,
          parentId: tasks.parentId,
          childId: tasks.childId,
          parentName: parents.name,
          childName: children.name,
        })
        .from(tasks)
        .leftJoin(parents, eq(tasks.parentId, parents.id))
        .leftJoin(children, eq(tasks.childId, children.id))
        .orderBy(desc(tasks.createdAt))
        .limit(100);

      res.json(successResponse(parentCreatedTasks));
    } catch (error: any) {
      console.error("Get parent created tasks error:", error);
      res
        .status(500)
        .json(errorResponse(ErrorCode.INTERNAL_SERVER_ERROR, "Failed to fetch parent created tasks"));
    }
  });

  // ===== UPLOAD TASK IMAGE =====
  app.post("/api/admin/upload-task-image", adminMiddleware, async (req: any, res) => {
    try {
      const multer = await import("multer");
      const path = await import("path");
      const fs = await import("fs");

      const uploadDir = path.join(process.cwd(), "uploads", "task-images");
      if (!fs.existsSync(uploadDir)) {
        fs.mkdirSync(uploadDir, { recursive: true });
      }

      const storage = multer.default.diskStorage({
        destination: (_req: any, _file: any, cb: any) => {
          cb(null, uploadDir);
        },
        filename: (_req: any, file: any, cb: any) => {
          const uniqueSuffix = Date.now() + "-" + Math.round(Math.random() * 1e9);
          cb(null, uniqueSuffix + path.extname(file.originalname));
        },
      });

      const upload = multer.default({ storage, limits: { fileSize: 5 * 1024 * 1024 } }).single("file");

      upload(req, res, (err: any) => {
        if (err) {
          console.error("Upload error:", err);
          return res
            .status(400)
            .json(errorResponse(ErrorCode.BAD_REQUEST, `Upload failed: ${err.message}`));
        }

        if (!req.file) {
          return res
            .status(400)
            .json(errorResponse(ErrorCode.BAD_REQUEST, "No file uploaded"));
        }

        const fileUrl = `/uploads/task-images/${req.file.filename}`;
        res.json(successResponse({ url: fileUrl }));
      });
    } catch (error: any) {
      console.error("Upload task image error:", error);
      res
        .status(500)
        .json(errorResponse(ErrorCode.INTERNAL_SERVER_ERROR, "Failed to upload image"));
    }
  });

  // ===== UPLOAD PUBLIC IMAGE (SEO / Crawlers compatible) =====
  // Uploads to /uploads/public/ served statically — accessible to search engine crawlers
  app.post("/api/admin/upload-public-image", adminMiddleware, async (req: any, res) => {
    try {
      const multer = await import("multer");
      const path = await import("path");
      const fs = await import("fs");

      const uploadDir = path.join(process.cwd(), "uploads", "public");
      if (!fs.existsSync(uploadDir)) {
        fs.mkdirSync(uploadDir, { recursive: true });
      }

      const storage = multer.default.diskStorage({
        destination: (_req: any, _file: any, cb: any) => {
          cb(null, uploadDir);
        },
        filename: (_req: any, file: any, cb: any) => {
          // Use a readable slug-based name for SEO
          const ext = path.extname(file.originalname).toLowerCase();
          const baseName = path.basename(file.originalname, ext)
            .toLowerCase()
            .replace(/[^a-z0-9]+/g, "-")
            .replace(/^-|-$/g, "")
            .substring(0, 50);
          const uniqueSuffix = Date.now().toString(36);
          cb(null, `${baseName}-${uniqueSuffix}${ext}`);
        },
      });

      const fileFilter = (_req: any, file: any, cb: any) => {
        const allowed = ["image/jpeg", "image/png", "image/webp", "image/svg+xml", "image/gif"];
        if (allowed.includes(file.mimetype)) {
          cb(null, true);
        } else {
          cb(new Error("Only image files (JPEG, PNG, WebP, SVG, GIF) are allowed"));
        }
      };

      const upload = multer.default({
        storage,
        limits: { fileSize: 5 * 1024 * 1024 }, // 5MB
        fileFilter,
      }).single("file");

      upload(req, res, (err: any) => {
        if (err) {
          console.error("Public image upload error:", err);
          return res
            .status(400)
            .json(errorResponse(ErrorCode.BAD_REQUEST, `Upload failed: ${err.message}`));
        }

        if (!req.file) {
          return res
            .status(400)
            .json(errorResponse(ErrorCode.BAD_REQUEST, "No file uploaded"));
        }

        const relativePath = `/uploads/public/${req.file.filename}`;
        // Build full URL for SEO/OG tags (crawlers need absolute URLs)
        const protocol = req.headers["x-forwarded-proto"] || req.protocol || "https";
        const host = req.headers["x-forwarded-host"] || req.headers.host || "classi-fy.com";
        const fullUrl = `${protocol}://${host}${relativePath}`;

        res.json(successResponse({
          url: relativePath,
          fullUrl,
          filename: req.file.filename,
          size: req.file.size,
          mimetype: req.file.mimetype,
        }));
      });
    } catch (error: any) {
      console.error("Upload public image error:", error);
      res
        .status(500)
        .json(errorResponse(ErrorCode.INTERNAL_SERVER_ERROR, "Failed to upload image"));
    }
  });

  // ===== ADMIN NOTIFICATIONS MANAGEMENT =====
  app.get("/api/admin/notifications", adminMiddleware, async (req: any, res) => {
    try {
      const allNotifications = await db
        .select({
          id: notifications.id,
          parentId: notifications.parentId,
          type: notifications.type,
          title: notifications.title,
          message: notifications.message,
          isRead: notifications.isRead,
          createdAt: notifications.createdAt,
          parentName: parents.name,
        })
        .from(notifications)
        .leftJoin(parents, eq(notifications.parentId, parents.id))
        .orderBy(desc(notifications.createdAt))
        .limit(200);

      res.json(successResponse(allNotifications));
    } catch (error: any) {
      console.error("Get admin notifications error:", error);
      res
        .status(500)
        .json(errorResponse(ErrorCode.INTERNAL_SERVER_ERROR, "Failed to fetch notifications"));
    }
  });

  app.post("/api/admin/send-notification", adminMiddleware, async (req: any, res) => {
    try {
      const { type, title, message, targetType, parentId } = req.body;

      if (!title || !message) {
        return res
          .status(400)
          .json(errorResponse(ErrorCode.BAD_REQUEST, "Title and message are required"));
      }

      let targetParents: { id: string }[] = [];

      if (targetType === "all") {
        targetParents = await db.select({ id: parents.id }).from(parents);
      } else if (targetType === "specific" && parentId) {
        targetParents = [{ id: parentId }];
      } else {
        return res
          .status(400)
          .json(errorResponse(ErrorCode.BAD_REQUEST, "Invalid target type"));
      }

      const notificationResults = [];
      const allowedNotificationTypes = new Set<string>(Object.values(NOTIFICATION_TYPES));
      const resolvedType: NotificationType =
        typeof type === "string" && allowedNotificationTypes.has(type)
          ? (type as NotificationType)
          : NOTIFICATION_TYPES.BROADCAST;

      for (const parent of targetParents) {
        const notif = await createNotification({
          parentId: parent.id,
          type: resolvedType,
          title,
          message,
        });
        notificationResults.push(notif);
      }

      await db.insert(activityLog).values({
        adminId: req.admin.adminId,
        action: "SEND_NOTIFICATION",
        entity: "notification",
        entityId: notificationResults[0]?.id || "",
        meta: { type: resolvedType, title, targetType, count: targetParents.length },
      });

      res.json(successResponse(
        notificationResults,
        `تم إرسال الإشعار إلى ${targetParents.length} مستخدم`
      ));
    } catch (error: any) {
      console.error("Send notification error:", error);
      res
        .status(500)
        .json(errorResponse(ErrorCode.INTERNAL_SERVER_ERROR, "Failed to send notification"));
    }
  });

  app.delete("/api/admin/notifications/:id", adminMiddleware, async (req: any, res) => {
    try {
      const { id } = req.params;

      await db.delete(notifications).where(eq(notifications.id, id));

      res.json(successResponse(undefined, "Notification deleted successfully"));
    } catch (error: any) {
      console.error("Delete notification error:", error);
      res
        .status(500)
        .json(errorResponse(ErrorCode.INTERNAL_SERVER_ERROR, "Failed to delete notification"));
    }
  });

  // ===== ADMIN TASK CREATION (assign to all children of a parent) =====
  app.post("/api/admin/create-task", adminMiddleware, async (req: any, res) => {
    try {
      const { parentId, childId, subjectId, question, answers, pointsReward, imageUrl, gifUrl } = req.body;

      if (!parentId || !childId || !question || !answers) {
        return res
          .status(400)
          .json(errorResponse(ErrorCode.BAD_REQUEST, "Parent, child, question and answers are required"));
      }

      const [result] = await db.insert(tasks).values({
        parentId,
        childId,
        subjectId: subjectId || null,
        question,
        answers,
        pointsReward: pointsReward || 10,
        imageUrl: imageUrl || null,
        gifUrl: gifUrl || null,
        status: "pending",
      }).returning();

      await db.insert(activityLog).values({
        adminId: req.admin.adminId,
        action: "CREATE_TASK",
        entity: "task",
        entityId: result.id,
        meta: { parentId, childId, question },
      });

      res.json(successResponse(result, "Task created successfully"));
    } catch (error: any) {
      console.error("Admin create task error:", error);
      res
        .status(500)
        .json(errorResponse(ErrorCode.INTERNAL_SERVER_ERROR, "Failed to create task"));
    }
  });

  // ===== ENHANCED STATISTICS =====
  app.get("/api/admin/statistics/detailed", adminMiddleware, async (req: any, res) => {
    try {
      const [parentsCount] = await db.select({ count: sql<number>`count(*)::int` }).from(parents);
      const [childrenCount] = await db.select({ count: sql<number>`count(*)::int` }).from(children);
      const [productsCount] = await db.select({ count: sql<number>`count(*)::int` }).from(products);
      const [ordersCount] = await db.select({ count: sql<number>`count(*)::int` }).from(orders);
      const [tasksCount] = await db.select({ count: sql<number>`count(*)::int` }).from(tasks);
      const [pendingTasks] = await db.select({ count: sql<number>`count(*)::int` }).from(tasks).where(eq(tasks.status, "pending"));
      const [completedTasks] = await db.select({ count: sql<number>`count(*)::int` }).from(tasks).where(eq(tasks.status, "completed"));
      const [subjectsCount] = await db.select({ count: sql<number>`count(*)::int` }).from(subjects);

      // Tasks by subject
      const tasksBySubject = await db
        .select({
          subjectId: tasks.subjectId,
          subjectName: subjects.name,
          subjectEmoji: subjects.emoji,
          count: sql<number>`count(*)::int`,
        })
        .from(tasks)
        .leftJoin(subjects, eq(tasks.subjectId, subjects.id))
        .groupBy(tasks.subjectId, subjects.name, subjects.emoji);

      res.json(successResponse({
        parents: parentsCount.count,
        children: childrenCount.count,
        products: productsCount.count,
        orders: ordersCount.count,
        tasks: {
          total: tasksCount.count,
          pending: pendingTasks.count,
          completed: completedTasks.count,
        },
        subjects: subjectsCount.count,
        tasksBySubject,
      }));
    } catch (error: any) {
      console.error("Fetch detailed statistics error:", error);
      res
        .status(500)
        .json(errorResponse(ErrorCode.INTERNAL_SERVER_ERROR, "Failed to fetch statistics"));
    }
  });

  // Seed default subjects and tasks
  app.post("/api/admin/seed-subjects", adminMiddleware, async (req: any, res) => {
    try {
      const defaultSubjects = [
        { name: "الرياضيات", emoji: "🔢", description: "مسائل حسابية وأرقام", color: "#3B82F6" },
        { name: "العلوم", emoji: "🔬", description: "اكتشف العالم من حولك", color: "#10B981" },
        { name: "اللغة العربية", emoji: "📝", description: "القراءة والكتابة", color: "#8B5CF6" },
        { name: "اللغة الإنجليزية", emoji: "🌐", description: "Learn English", color: "#F59E0B" },
        { name: "التربية الإسلامية", emoji: "🕌", description: "القرآن والأحاديث", color: "#059669" },
        { name: "الدراسات الاجتماعية", emoji: "🌍", description: "التاريخ والجغرافيا", color: "#EC4899" },
        { name: "الفنون", emoji: "🎨", description: "الرسم والتلوين", color: "#F97316" },
        { name: "التربية البدنية", emoji: "⚽", description: "الرياضة والنشاط", color: "#EF4444" },
      ];

      const createdSubjects: any[] = [];
      for (const subj of defaultSubjects) {
        const existing = await db.select().from(subjects).where(eq(subjects.name, subj.name));
        if (!existing[0]) {
          const [created] = await db.insert(subjects).values(subj).returning();
          createdSubjects.push(created);
        } else {
          createdSubjects.push(existing[0]);
        }
      }

      // Seed template tasks for each subject
      const templateTasksData: { subjectName: string; tasks: any[] }[] = [
        {
          subjectName: "الرياضيات",
          tasks: [
            { title: "جمع الأرقام", question: "ما ناتج 5 + 3؟", answers: [{ id: "1", text: "8", isCorrect: true }, { id: "2", text: "7", isCorrect: false }, { id: "3", text: "9", isCorrect: false }], difficulty: "easy" },
            { title: "الطرح", question: "ما ناتج 10 - 4؟", answers: [{ id: "1", text: "6", isCorrect: true }, { id: "2", text: "5", isCorrect: false }, { id: "3", text: "7", isCorrect: false }], difficulty: "easy" },
            { title: "الضرب", question: "ما ناتج 3 × 4؟", answers: [{ id: "1", text: "12", isCorrect: true }, { id: "2", text: "10", isCorrect: false }, { id: "3", text: "14", isCorrect: false }], difficulty: "medium" },
          ],
        },
        {
          subjectName: "العلوم",
          tasks: [
            { title: "الكواكب", question: "ما هو أقرب كوكب للشمس؟", answers: [{ id: "1", text: "عطارد", isCorrect: true }, { id: "2", text: "الزهرة", isCorrect: false }, { id: "3", text: "الأرض", isCorrect: false }], difficulty: "medium" },
            { title: "الماء", question: "ما هي حالات الماء؟", answers: [{ id: "1", text: "صلبة وسائلة وغازية", isCorrect: true }, { id: "2", text: "صلبة فقط", isCorrect: false }, { id: "3", text: "سائلة فقط", isCorrect: false }], difficulty: "easy" },
          ],
        },
        {
          subjectName: "اللغة العربية",
          tasks: [
            { title: "الحروف", question: "كم عدد حروف اللغة العربية؟", answers: [{ id: "1", text: "28", isCorrect: true }, { id: "2", text: "26", isCorrect: false }, { id: "3", text: "30", isCorrect: false }], difficulty: "easy" },
            { title: "الفعل", question: "ما نوع الفعل 'كتب'؟", answers: [{ id: "1", text: "فعل ماضي", isCorrect: true }, { id: "2", text: "فعل مضارع", isCorrect: false }, { id: "3", text: "فعل أمر", isCorrect: false }], difficulty: "medium" },
          ],
        },
        {
          subjectName: "اللغة الإنجليزية",
          tasks: [
            { title: "Colors", question: "What color is the sky?", answers: [{ id: "1", text: "Blue", isCorrect: true }, { id: "2", text: "Red", isCorrect: false }, { id: "3", text: "Green", isCorrect: false }], difficulty: "easy" },
            { title: "Numbers", question: "What comes after 5?", answers: [{ id: "1", text: "6", isCorrect: true }, { id: "2", text: "4", isCorrect: false }, { id: "3", text: "7", isCorrect: false }], difficulty: "easy" },
          ],
        },
        {
          subjectName: "التربية الإسلامية",
          tasks: [
            { title: "أركان الإسلام", question: "كم عدد أركان الإسلام؟", answers: [{ id: "1", text: "5", isCorrect: true }, { id: "2", text: "4", isCorrect: false }, { id: "3", text: "6", isCorrect: false }], difficulty: "easy" },
            { title: "الصلوات", question: "كم عدد الصلوات المفروضة في اليوم؟", answers: [{ id: "1", text: "5", isCorrect: true }, { id: "2", text: "3", isCorrect: false }, { id: "3", text: "4", isCorrect: false }], difficulty: "easy" },
          ],
        },
      ];

      let tasksCreated = 0;
      for (const subjData of templateTasksData) {
        const subj = createdSubjects.find(s => s.name === subjData.subjectName);
        if (subj) {
          for (const task of subjData.tasks) {
            const existing = await db.select().from(templateTasks)
              .where(and(eq(templateTasks.subjectId, subj.id), eq(templateTasks.title, task.title)));
            if (!existing[0]) {
              await db.insert(templateTasks).values({
                subjectId: subj.id,
                title: task.title,
                question: task.question,
                answers: task.answers,
                pointsReward: 10,
                difficulty: task.difficulty,
              });
              tasksCreated++;
            }
          }
        }
      }

      await db.insert(activityLog).values({
        adminId: req.admin.adminId,
        action: "SEED_SUBJECTS",
        entity: "subjects",
        meta: { subjectsCreated: createdSubjects.length, tasksCreated },
      });

      res.json({
        success: true,
        data: { subjects: createdSubjects, tasksCreated },
        message: `Created ${createdSubjects.length} subjects and ${tasksCreated} template tasks`,
      });
    } catch (error: any) {
      console.error("Seed subjects error:", error);
      res
        .status(500)
        .json(errorResponse(ErrorCode.INTERNAL_SERVER_ERROR, "Failed to seed subjects"));
    }
  });

  // ===== Referrals Management =====
  
  // Get all referrals
  app.get("/api/admin/referrals", adminMiddleware, async (req: any, res) => {
    try {
      const allReferrals = await db.select({
        id: referrals.id,
        referrerId: referrals.referrerId,
        referredId: referrals.referredId,
        referralCode: referrals.referralCode,
        status: referrals.status,
        pointsAwarded: referrals.pointsAwarded,
        referredAt: referrals.referredAt,
        activatedAt: referrals.activatedAt,
        rewardedAt: referrals.rewardedAt,
        referrerName: parents.name,
        referrerEmail: parents.email,
      })
      .from(referrals)
      .leftJoin(parents, eq(referrals.referrerId, parents.id))
      .orderBy(desc(referrals.referredAt));

      // Get referred parent info
      const enrichedReferrals = await Promise.all(allReferrals.map(async (ref: any) => {
        const referred = await db.select({ name: parents.name, email: parents.email })
          .from(parents).where(eq(parents.id, ref.referredId));
        return {
          ...ref,
          referredName: referred[0]?.name || "غير معروف",
          referredEmail: referred[0]?.email || "",
        };
      }));

      res.json(successResponse(enrichedReferrals));
    } catch (error: any) {
      console.error("Get referrals error:", error);
      res
        .status(500)
        .json(errorResponse(ErrorCode.INTERNAL_SERVER_ERROR, "Failed to fetch referrals"));
    }
  });

  // Get referral statistics
  app.get("/api/admin/referrals/stats", adminMiddleware, async (req: any, res) => {
    try {
      const totalReferrals = await db.select({ count: sql<number>`count(*)` }).from(referrals);
      const activeReferrals = await db.select({ count: sql<number>`count(*)` })
        .from(referrals).where(eq(referrals.status, "active"));
      const pendingReferrals = await db.select({ count: sql<number>`count(*)` })
        .from(referrals).where(eq(referrals.status, "pending"));
      const rewardedReferrals = await db.select({ count: sql<number>`count(*)` })
        .from(referrals).where(eq(referrals.status, "rewarded"));
      const totalPointsAwarded = await db.select({ total: sql<number>`COALESCE(sum(points_awarded), 0)` })
        .from(referrals);

      res.json({
        success: true,
        data: {
          total: Number(totalReferrals[0]?.count || 0),
          active: Number(activeReferrals[0]?.count || 0),
          pending: Number(pendingReferrals[0]?.count || 0),
          rewarded: Number(rewardedReferrals[0]?.count || 0),
          totalPointsAwarded: Number(totalPointsAwarded[0]?.total || 0),
        },
      });
    } catch (error: any) {
      console.error("Get referral stats error:", error);
      res
        .status(500)
        .json(errorResponse(ErrorCode.INTERNAL_SERVER_ERROR, "Failed to fetch referral stats"));
    }
  });

  // Get parent referral codes
  app.get("/api/admin/referral-codes", adminMiddleware, async (req: any, res) => {
    try {
      const codes = await db.select({
        id: parentReferralCodes.id,
        parentId: parentReferralCodes.parentId,
        code: parentReferralCodes.code,
        totalReferrals: parentReferralCodes.totalReferrals,
        activeReferrals: parentReferralCodes.activeReferrals,
        totalPointsEarned: parentReferralCodes.totalPointsEarned,
        createdAt: parentReferralCodes.createdAt,
        parentName: parents.name,
        parentEmail: parents.email,
      })
      .from(parentReferralCodes)
      .leftJoin(parents, eq(parentReferralCodes.parentId, parents.id))
      .orderBy(desc(parentReferralCodes.totalReferrals));

      res.json(successResponse(codes));
    } catch (error: any) {
      console.error("Get referral codes error:", error);
      res
        .status(500)
        .json(errorResponse(ErrorCode.INTERNAL_SERVER_ERROR, "Failed to fetch referral codes"));
    }
  });

  // ===== Ads Management =====
  
  // Get all ads
  app.get("/api/admin/ads", adminMiddleware, async (req: any, res) => {
    try {
      const allAds = await db.select().from(ads).orderBy(desc(ads.priority), desc(ads.createdAt));
      res.json(successResponse(allAds));
    } catch (error: any) {
      console.error("Get ads error:", error);
      res
        .status(500)
        .json(errorResponse(ErrorCode.INTERNAL_SERVER_ERROR, "Failed to fetch ads"));
    }
  });

  // Normalize URL: ensure it has a protocol prefix
  const normalizeUrl = (url: string | null | undefined): string | null => {
    if (!url || !url.trim()) return null;
    const trimmed = url.trim();
    if (/^https?:\/\//i.test(trimmed)) return trimmed;
    return `https://${trimmed}`;
  };

  // Create ad
  app.post("/api/admin/ads", adminMiddleware, async (req: any, res) => {
    try {
      const { title, content, imageUrl, linkUrl, targetAudience, priority, isActive, startDate, endDate } = req.body;
      
      if (!title || !content) {
        return res
          .status(400)
          .json(errorResponse(ErrorCode.BAD_REQUEST, "Title and content are required"));
      }

      const newAd = await db.insert(ads).values({
        title,
        content,
        imageUrl: imageUrl || null,
        linkUrl: normalizeUrl(linkUrl),
        targetAudience: targetAudience || "all",
        priority: priority || 0,
        isActive: isActive !== false,
        startDate: startDate ? new Date(startDate) : null,
        endDate: endDate ? new Date(endDate) : null,
      }).returning();

      await db.insert(activityLog).values({
        adminId: req.admin.adminId,
        action: "CREATE_AD",
        entity: "ads",
        entityId: newAd[0].id,
        meta: { title },
      });

      res.json(successResponse(newAd[0]));
    } catch (error: any) {
      console.error("Create ad error:", error);
      res
        .status(500)
        .json(errorResponse(ErrorCode.INTERNAL_SERVER_ERROR, "Failed to create ad"));
    }
  });

  // Update ad
  app.put("/api/admin/ads/:id", adminMiddleware, async (req: any, res) => {
    try {
      const { id } = req.params;
      const { title, content, imageUrl, linkUrl, targetAudience, priority, isActive, startDate, endDate } = req.body;

      const setData: Record<string, any> = { updatedAt: new Date() };
      if (title !== undefined) setData['title'] = title;
      if (content !== undefined) setData['content'] = content;
      if (imageUrl !== undefined) setData['imageUrl'] = imageUrl || null;
      if (linkUrl !== undefined) setData['linkUrl'] = normalizeUrl(linkUrl);
      if (targetAudience !== undefined) setData['targetAudience'] = targetAudience;
      if (priority !== undefined) setData['priority'] = priority;
      if (isActive !== undefined) setData['isActive'] = isActive;
      if (startDate !== undefined) setData['startDate'] = startDate ? new Date(startDate) : null;
      if (endDate !== undefined) setData['endDate'] = endDate ? new Date(endDate) : null;

      const updated = await db.update(ads)
        .set(setData)
        .where(eq(ads.id, id))
        .returning();

      if (!updated[0]) {
        return res
          .status(404)
          .json(errorResponse(ErrorCode.NOT_FOUND, "Ad not found"));
      }

      res.json(successResponse(updated[0]));
    } catch (error: any) {
      console.error("Update ad error:", error);
      res
        .status(500)
        .json(errorResponse(ErrorCode.INTERNAL_SERVER_ERROR, "Failed to update ad"));
    }
  });

  // Delete ad
  app.delete("/api/admin/ads/:id", adminMiddleware, async (req: any, res) => {
    try {
      const { id } = req.params;
      await db.delete(ads).where(eq(ads.id, id));
      res.json(successResponse(undefined, "Ad deleted successfully"));
    } catch (error: any) {
      console.error("Delete ad error:", error);
      res
        .status(500)
        .json(errorResponse(ErrorCode.INTERNAL_SERVER_ERROR, "Failed to delete ad"));
    }
  });

  // Toggle ad status
  app.patch("/api/admin/ads/:id/toggle", adminMiddleware, async (req: any, res) => {
    try {
      const { id } = req.params;
      const ad = await db.select().from(ads).where(eq(ads.id, id));
      if (!ad[0]) {
        return res
          .status(404)
          .json(errorResponse(ErrorCode.NOT_FOUND, "Ad not found"));
      }

      const updated = await db.update(ads)
        .set({ isActive: !ad[0].isActive, updatedAt: new Date() })
        .where(eq(ads.id, id))
        .returning();

      res.json(successResponse(updated[0]));
    } catch (error: any) {
      console.error("Toggle ad error:", error);
      res
        .status(500)
        .json(errorResponse(ErrorCode.INTERNAL_SERVER_ERROR, "Failed to toggle ad"));
    }
  });

  // ===== Public Ads Endpoint (for parents and children) =====
  app.get("/api/ads", async (req, res) => {
    try {
      const { audience } = req.query;
      const now = new Date();

      let query = db.select().from(ads)
        .where(and(
          eq(ads.isActive, true),
          or(isNull(ads.startDate), sql`${ads.startDate} <= ${now}`),
          or(isNull(ads.endDate), sql`${ads.endDate} >= ${now}`)
        ));

      const allAds = await query.orderBy(desc(ads.priority));

      // Filter by audience
      const filteredAds = allAds.filter((ad: any) => 
        ad.targetAudience === "all" || ad.targetAudience === audience
      );

      res.json(successResponse(filteredAds));
    } catch (error: any) {
      console.error("Get public ads error:", error);
      res
        .status(500)
        .json(errorResponse(ErrorCode.INTERNAL_SERVER_ERROR, "Failed to fetch ads"));
    }
  });

  // Track ad view
  app.post("/api/ads/:id/view", async (req, res) => {
    try {
      const { id } = req.params;
      await db.update(ads)
        .set({ viewCount: sql`${ads.viewCount} + 1` })
        .where(eq(ads.id, id));
      res.json(successResponse());
    } catch (error: any) {
      res
        .status(500)
        .json(errorResponse(ErrorCode.INTERNAL_SERVER_ERROR, "Failed to track view"));
    }
  });

  // Track ad click
  app.post("/api/ads/:id/click", async (req: any, res) => {
    try {
      const { id } = req.params;
      await db.update(ads)
        .set({ clickCount: sql`${ads.clickCount} + 1` })
        .where(eq(ads.id, id));

      // Track per-user click if authenticated
      const authHeader = req.headers.authorization;
      if (authHeader) {
        try {
          const token = authHeader.replace("Bearer ", "");
          const decoded: any = jwt.verify(token, JWT_SECRET);
          const parentId = decoded.userId || decoded.parentId;
          if (parentId) {
            await db.insert(adClicks).values({ adId: id, parentId });
          }
        } catch {}
      }

      res.json(successResponse());
    } catch (error: any) {
      res
        .status(500)
        .json(errorResponse(ErrorCode.INTERNAL_SERVER_ERROR, "Failed to track click"));
    }
  });

  // Track ad share + award points
  app.post("/api/ads/:id/share", async (req: any, res) => {
    try {
      const { id } = req.params;
      const { platform, parentId } = req.body;

      if (!parentId || !platform) {
        return res.status(400).json(errorResponse(ErrorCode.BAD_REQUEST, "parentId and platform required"));
      }

      // Get referral settings for points
      const settingsRows = await db.select().from(referralSettings);
      const pointsPerShare = settingsRows[0]?.pointsPerAdShare ?? 10;

      // Record the share
      await db.insert(adShares).values({
        adId: id,
        parentId,
        platform,
        pointsAwarded: pointsPerShare,
      });

      // Award points to parent wallet
      const wallet = await db.select().from(parentWallet).where(eq(parentWallet.parentId, parentId));
      if (wallet[0]) {
        await db.update(parentWallet)
          .set({ balance: sql`${parentWallet.balance} + ${pointsPerShare}`, updatedAt: new Date() })
          .where(eq(parentWallet.parentId, parentId));
      } else {
        await db.insert(parentWallet).values({ parentId, balance: pointsPerShare.toString() });
      }

      res.json(successResponse({ pointsAwarded: pointsPerShare }));
    } catch (error: any) {
      console.error("Track ad share error:", error);
      res
        .status(500)
        .json(errorResponse(ErrorCode.INTERNAL_SERVER_ERROR, "Failed to track share"));
    }
  });

  // Admin: Get detailed click/share tracking for an ad
  app.get("/api/admin/ads/:id/tracking", adminMiddleware, async (req: any, res) => {
    try {
      const { id } = req.params;

      // Get clicks grouped by user
      const clicks = await db.select({
        parentId: adClicks.parentId,
        parentName: parents.name,
        parentEmail: parents.email,
        clickCount: sql<number>`count(*)`,
        lastClick: sql<string>`max(${adClicks.clickedAt})`,
      })
      .from(adClicks)
      .leftJoin(parents, eq(adClicks.parentId, parents.id))
      .where(eq(adClicks.adId, id))
      .groupBy(adClicks.parentId, parents.name, parents.email);

      // Get shares grouped by user
      const shares = await db.select({
        parentId: adShares.parentId,
        parentName: parents.name,
        parentEmail: parents.email,
        shareCount: sql<number>`count(*)`,
        totalPoints: sql<number>`COALESCE(sum(${adShares.pointsAwarded}), 0)`,
        platforms: sql<string>`string_agg(DISTINCT ${adShares.platform}, ', ')`,
        lastShare: sql<string>`max(${adShares.sharedAt})`,
      })
      .from(adShares)
      .leftJoin(parents, eq(adShares.parentId, parents.id))
      .where(eq(adShares.adId, id))
      .groupBy(adShares.parentId, parents.name, parents.email);

      res.json(successResponse({ clicks, shares }));
    } catch (error: any) {
      console.error("Get ad tracking error:", error);
      res
        .status(500)
        .json(errorResponse(ErrorCode.INTERNAL_SERVER_ERROR, "Failed to fetch tracking data"));
    }
  });

  // Admin: Get all user tracking summary across all ads
  app.get("/api/admin/ads/user-tracking", adminMiddleware, async (req: any, res) => {
    try {
      const userClicks = await db.select({
        parentId: adClicks.parentId,
        parentName: parents.name,
        parentEmail: parents.email,
        totalClicks: sql<number>`count(*)`,
        adsClicked: sql<number>`count(DISTINCT ${adClicks.adId})`,
      })
      .from(adClicks)
      .leftJoin(parents, eq(adClicks.parentId, parents.id))
      .groupBy(adClicks.parentId, parents.name, parents.email);

      const userShares = await db.select({
        parentId: adShares.parentId,
        parentName: parents.name,
        parentEmail: parents.email,
        totalShares: sql<number>`count(*)`,
        totalPointsEarned: sql<number>`COALESCE(sum(${adShares.pointsAwarded}), 0)`,
        adsShared: sql<number>`count(DISTINCT ${adShares.adId})`,
      })
      .from(adShares)
      .leftJoin(parents, eq(adShares.parentId, parents.id))
      .groupBy(adShares.parentId, parents.name, parents.email);

      // Merge clicks and shares by parentId
      const userMap: Record<string, any> = {};
      for (const c of userClicks) {
        userMap[c.parentId] = {
          parentId: c.parentId,
          parentName: c.parentName,
          parentEmail: c.parentEmail,
          totalClicks: Number(c.totalClicks),
          adsClicked: Number(c.adsClicked),
          totalShares: 0,
          totalPointsEarned: 0,
          adsShared: 0,
        };
      }
      for (const s of userShares) {
        if (!userMap[s.parentId]) {
          userMap[s.parentId] = {
            parentId: s.parentId,
            parentName: s.parentName,
            parentEmail: s.parentEmail,
            totalClicks: 0,
            adsClicked: 0,
          };
        }
        userMap[s.parentId].totalShares = Number(s.totalShares);
        userMap[s.parentId].totalPointsEarned = Number(s.totalPointsEarned);
        userMap[s.parentId].adsShared = Number(s.adsShared);
      }

      res.json(successResponse(Object.values(userMap)));
    } catch (error: any) {
      console.error("Get user tracking error:", error);
      res
        .status(500)
        .json(errorResponse(ErrorCode.INTERNAL_SERVER_ERROR, "Failed to fetch user tracking"));
    }
  });

  // ===== Referral Settings Management =====
  
  // Get referral settings
  app.get("/api/admin/referral-settings", adminMiddleware, async (req: any, res) => {
    try {
      const settings = await db.select().from(referralSettings);
      if (!settings[0]) {
        // Create default settings if none exist
        const defaultSettings = await db.insert(referralSettings).values({
          pointsPerReferral: 100,
          pointsPerAdShare: 10,
          commissionRate: "10.00",
          minActiveDays: 7,
          isActive: true,
        }).returning();
        return res.json(successResponse(defaultSettings[0]));
      }
      res.json(successResponse(settings[0]));
    } catch (error: any) {
      console.error("Get referral settings error:", error);
      res
        .status(500)
        .json(errorResponse(ErrorCode.INTERNAL_SERVER_ERROR, "Failed to fetch referral settings"));
    }
  });

  // Update referral settings
  app.put("/api/admin/referral-settings", adminMiddleware, async (req: any, res) => {
    try {
      const { pointsPerReferral, pointsPerAdShare, commissionRate, minActiveDays, isActive } = req.body;
      
      const settings = await db.select().from(referralSettings);
      let updated;
      
      if (!settings[0]) {
        updated = await db.insert(referralSettings).values({
          pointsPerReferral: pointsPerReferral || 100,
          pointsPerAdShare: pointsPerAdShare || 10,
          commissionRate: commissionRate || "10.00",
          minActiveDays: minActiveDays || 7,
          isActive: isActive !== undefined ? isActive : true,
        }).returning();
      } else {
        updated = await db.update(referralSettings)
          .set({
            pointsPerReferral: pointsPerReferral !== undefined ? pointsPerReferral : settings[0].pointsPerReferral,
            pointsPerAdShare: pointsPerAdShare !== undefined ? pointsPerAdShare : settings[0].pointsPerAdShare,
            commissionRate: commissionRate !== undefined ? commissionRate : settings[0].commissionRate,
            minActiveDays: minActiveDays !== undefined ? minActiveDays : settings[0].minActiveDays,
            isActive: isActive !== undefined ? isActive : settings[0].isActive,
            updatedAt: new Date(),
          })
          .where(eq(referralSettings.id, settings[0].id))
          .returning();
      }
      
      res.json(successResponse(updated[0]));
    } catch (error: any) {
      console.error("Update referral settings error:", error);
      res
        .status(500)
        .json(errorResponse(ErrorCode.INTERNAL_SERVER_ERROR, "Failed to update referral settings"));
    }
  });

  // Public endpoint to get referral settings (for parents)
  app.get("/api/referral-settings", async (req, res) => {
    try {
      const settings = await db.select().from(referralSettings).where(eq(referralSettings.isActive, true));
      if (!settings[0]) {
        return res.json(successResponse({ pointsPerReferral: 100, pointsPerAdShare: 10, commissionRate: "10.00", minActiveDays: 7, isActive: true }));
      }
      res.json(successResponse(settings[0]));
    } catch (error: any) {
      res
        .status(500)
        .json(errorResponse(ErrorCode.INTERNAL_SERVER_ERROR, "Failed to fetch referral settings"));
    }
  });

  // ===== Parents Management =====
  
  // Get all parents with details
  app.get("/api/admin/parents", adminMiddleware, async (req: any, res) => {
    try {
      const allParents = await db.select().from(parents).orderBy(desc(parents.createdAt));
      
      // Get children count for each parent
      const parentsWithDetails = await Promise.all(allParents.map(async (parent: typeof parents.$inferSelect) => {
        const childrenLinks = await db.select().from(parentChild).where(eq(parentChild.parentId, parent.id));
        const childrenData = await Promise.all(childrenLinks.map(async (link: typeof parentChild.$inferSelect) => {
          const child = await db.select().from(children).where(eq(children.id, link.childId));
          return child[0];
        }));
        
        // Get wallet balance
        const wallet = await db.select().from(parentWallet).where(eq(parentWallet.parentId, parent.id));
        
        // Get tasks count
        const tasksList = await db.select().from(tasks).where(eq(tasks.parentId, parent.id));
        
        // Get template tasks count (public tasks)
        const templateTasksList = await db.select().from(templateTasks).where(eq(templateTasks.parentId, parent.id));
        
        return {
          ...parent,
          password: undefined,
          childrenCount: childrenData.filter(Boolean).length,
          children: childrenData.filter(Boolean),
          walletBalance: wallet[0]?.balance || 0,
          tasksCount: tasksList.length,
          publicTasksCount: templateTasksList.filter((t: typeof templateTasks.$inferSelect) => t.isPublic).length,
        };
      }));
      
      res.json(successResponse(parentsWithDetails));
    } catch (error: any) {
      console.error("Get parents error:", error);
      res
        .status(500)
        .json(errorResponse(ErrorCode.INTERNAL_SERVER_ERROR, "Failed to fetch parents"));
    }
  });

  // Get single parent details
  app.get("/api/admin/parents/:id", adminMiddleware, async (req: any, res) => {
    try {
      const { id } = req.params;
      const parent = await db.select().from(parents).where(eq(parents.id, id));
      
      if (!parent[0]) {
        return res
          .status(404)
          .json(errorResponse(ErrorCode.NOT_FOUND, "Parent not found"));
      }
      
      // Get children
      const childrenLinks = await db.select().from(parentChild).where(eq(parentChild.parentId, id));
      const childrenData = await Promise.all(childrenLinks.map(async (link: typeof parentChild.$inferSelect) => {
        const child = await db.select().from(children).where(eq(children.id, link.childId));
        return child[0];
      }));
      
      // Get wallet
      const wallet = await db.select().from(parentWallet).where(eq(parentWallet.parentId, id));
      
      // Get tasks
      const tasksList = await db.select().from(tasks).where(eq(tasks.parentId, id));
      
      // Get template tasks
      const templateTasksList = await db.select().from(templateTasks).where(eq(templateTasks.parentId, id));
      
      // Get profit transactions (as seller)
      const sellerProfits = await db.select().from(profitTransactions).where(eq(profitTransactions.sellerId, id));
      const totalEarnings = sellerProfits.reduce((sum: number, t: typeof profitTransactions.$inferSelect) => sum + t.sellerEarnings, 0);
      
      // Get referral info
      const referralCode = await db.select().from(parentReferralCodes).where(eq(parentReferralCodes.parentId, id));

      // Get deposits history
      const parentDeposits = await db
        .select()
        .from(deposits)
        .where(eq(deposits.parentId, id))
        .orderBy(desc(deposits.createdAt));

      const depositsWithMethod = await Promise.all(
        parentDeposits.map(async (deposit: typeof deposits.$inferSelect) => {
          const method = await db
            .select()
            .from(paymentMethods)
            .where(eq(paymentMethods.id, deposit.paymentMethodId));

          return {
            ...deposit,
            paymentMethod: method[0]
              ? {
                  id: method[0].id,
                  name: method[0].name,
                  type: method[0].type,
                  bankName: method[0].bankName,
                }
              : null,
          };
        })
      );

      // Get purchases history
      const purchases = await db
        .select()
        .from(parentPurchases)
        .where(eq(parentPurchases.parentId, id))
        .orderBy(desc(parentPurchases.createdAt));

      const purchasesWithItems = await Promise.all(
        purchases.map(async (purchase: typeof parentPurchases.$inferSelect) => {
          const items = await db
            .select()
            .from(parentPurchaseItems)
            .where(eq(parentPurchaseItems.purchaseId, purchase.id));

          const itemsCount = items.reduce(
            (sum: number, item: typeof parentPurchaseItems.$inferSelect) => sum + (item.quantity || 0),
            0
          );

          return {
            ...purchase,
            itemsCount,
          };
        })
      );

      const totalDeposits = depositsWithMethod.reduce(
        (sum: number, deposit) => sum + Number(deposit.amount || 0),
        0
      );

      const completedDeposits = depositsWithMethod.reduce(
        (sum: number, deposit) =>
          deposit.status === "completed" ? sum + Number(deposit.amount || 0) : sum,
        0
      );

      const totalPurchases = purchasesWithItems.reduce(
        (sum: number, purchase) => sum + Number(purchase.totalAmount || 0),
        0
      );

      const paidPurchases = purchasesWithItems.reduce(
        (sum: number, purchase) =>
          purchase.paymentStatus === "paid" ? sum + Number(purchase.totalAmount || 0) : sum,
        0
      );
      
      res.json(successResponse({
        ...parent[0],
        password: undefined,
        children: childrenData.filter(Boolean),
        wallet: wallet[0] || { balance: 0 },
        tasks: tasksList,
        templateTasks: templateTasksList,
        earnings: {
          total: totalEarnings,
          transactions: sellerProfits,
        },
        referral: referralCode[0] || null,
        deposits: depositsWithMethod,
        purchases: purchasesWithItems,
        financeSummary: {
          depositsCount: depositsWithMethod.length,
          purchasesCount: purchasesWithItems.length,
          totalDeposits,
          completedDeposits,
          totalPurchases,
          paidPurchases,
        },
      }));
    } catch (error: any) {
      console.error("Get parent details error:", error);
      res
        .status(500)
        .json(errorResponse(ErrorCode.INTERNAL_SERVER_ERROR, "Failed to fetch parent details"));
    }
  });

  // Send notification to parent
  app.post("/api/admin/parents/:id/notify", adminMiddleware, async (req: any, res) => {
    try {
      const { id } = req.params;
      const { title, message, imageUrl } = req.body;
      const adminId = req.admin.adminId;
      
      if (!title || !message) {
        return res
          .status(400)
          .json(errorResponse(ErrorCode.BAD_REQUEST, "Title and message are required"));
      }
      
      const parent = await db.select().from(parents).where(eq(parents.id, id));
      if (!parent[0]) {
        return res
          .status(404)
          .json(errorResponse(ErrorCode.NOT_FOUND, "Parent not found"));
      }
      
      const notification = await db.insert(parentNotifications).values({
        parentId: id,
        adminId,
        title,
        message,
        imageUrl: imageUrl || null,
      }).returning();
      
      res.json(successResponse(notification[0]));
    } catch (error: any) {
      console.error("Send notification error:", error);
      res
        .status(500)
        .json(errorResponse(ErrorCode.INTERNAL_SERVER_ERROR, "Failed to send notification"));
    }
  });

  // ===== Profit System Management =====
  
  // Get profit summary
  app.get("/api/admin/profits/summary", adminMiddleware, async (req: any, res) => {
    try {
      const allTransactions = await db.select().from(profitTransactions).orderBy(desc(profitTransactions.createdAt));
      
      const totalAppCommission = allTransactions.reduce((sum: number, t: typeof profitTransactions.$inferSelect) => sum + t.appCommission, 0);
      const totalSellerEarnings = allTransactions.reduce((sum: number, t: typeof profitTransactions.$inferSelect) => sum + t.sellerEarnings, 0);
      const totalPoints = allTransactions.reduce((sum: number, t: typeof profitTransactions.$inferSelect) => sum + t.totalPoints, 0);
      
      // Group by seller
      const sellerStats: Record<string, { earnings: number; transactions: number }> = {};
      for (const t of allTransactions) {
        if (!sellerStats[t.sellerId]) {
          sellerStats[t.sellerId] = { earnings: 0, transactions: 0 };
        }
        sellerStats[t.sellerId]!.earnings += t.sellerEarnings;
        sellerStats[t.sellerId]!.transactions += 1;
      }
      
      // Get top sellers
      const topSellers = await Promise.all(
        Object.entries(sellerStats)
          .sort((a, b) => b[1].earnings - a[1].earnings)
          .slice(0, 10)
          .map(async ([sellerId, stats]) => {
            const parent = await db.select().from(parents).where(eq(parents.id, sellerId));
            return {
              id: sellerId,
              name: parent[0]?.name || "Unknown",
              email: parent[0]?.email || "",
              earnings: stats.earnings,
              transactions: stats.transactions,
            };
          })
      );
      
      res.json({ 
        success: true,
        data: {
          totalAppCommission,
          totalSellerEarnings,
          totalPoints,
          transactionsCount: allTransactions.length,
          topSellers,
          recentTransactions: allTransactions.slice(0, 20),
        },
      });
    } catch (error: any) {
      console.error("Get profit summary error:", error);
      res
        .status(500)
        .json(errorResponse(ErrorCode.INTERNAL_SERVER_ERROR, "Failed to fetch profit summary"));
    }
  });

  // Get all profit transactions
  app.get("/api/admin/profits/transactions", adminMiddleware, async (req: any, res) => {
    try {
      const allTransactions = await db.select().from(profitTransactions).orderBy(desc(profitTransactions.createdAt));
      
      const transactionsWithDetails = await Promise.all(allTransactions.map(async (t: typeof profitTransactions.$inferSelect) => {
        const seller = await db.select().from(parents).where(eq(parents.id, t.sellerId));
        const buyer = await db.select().from(parents).where(eq(parents.id, t.buyerId));
        const task = t.templateTaskId ? await db.select().from(templateTasks).where(eq(templateTasks.id, t.templateTaskId)) : [];
        
        return {
          ...t,
          seller: seller[0] ? { id: seller[0].id, name: seller[0].name, email: seller[0].email } : null,
          buyer: buyer[0] ? { id: buyer[0].id, name: buyer[0].name, email: buyer[0].email } : null,
          task: task[0] || null,
        };
      }));
      
      res.json(successResponse(transactionsWithDetails));
    } catch (error: any) {
      console.error("Get profit transactions error:", error);
      res
        .status(500)
        .json(errorResponse(ErrorCode.INTERNAL_SERVER_ERROR, "Failed to fetch transactions"));
    }
  });

  // Get parent notifications sent by admin
  app.get("/api/admin/parent-notifications", adminMiddleware, async (req: any, res) => {
    try {
      const notificationsList = await db.select().from(parentNotifications).orderBy(desc(parentNotifications.createdAt));
      
      const notificationsWithParent = await Promise.all(notificationsList.map(async (n: typeof parentNotifications.$inferSelect) => {
        const parent = await db.select().from(parents).where(eq(parents.id, n.parentId));
        return {
          ...n,
          parentName: parent[0]?.name || "Unknown",
          parentEmail: parent[0]?.email || "",
        };
      }));
      
      res.json(successResponse(notificationsWithParent));
    } catch (error: any) {
      console.error("Get parent notifications error:", error);
      res
        .status(500)
        .json(errorResponse(ErrorCode.INTERNAL_SERVER_ERROR, "Failed to fetch notifications"));
    }
  });

  // ===== Library Merchants Management =====
  
  // Get all libraries
  app.get("/api/admin/libraries", adminMiddleware, async (req: any, res) => {
    try {
      const allLibraries = await db.select().from(libraries).orderBy(desc(libraries.activityScore));
      res.json(successResponse(allLibraries));
    } catch (error: any) {
      console.error("Get libraries error:", error);
      res
        .status(500)
        .json(errorResponse(ErrorCode.INTERNAL_SERVER_ERROR, "Failed to fetch libraries"));
    }
  });

  // Get single library with stats
  app.get("/api/admin/libraries/:id", adminMiddleware, async (req: any, res) => {
    try {
      const { id } = req.params;
      const library = await db.select().from(libraries).where(eq(libraries.id, id));
      if (!library[0]) {
        return res
          .status(404)
          .json(errorResponse(ErrorCode.NOT_FOUND, "Library not found"));
      }
      
      const products = await db.select().from(libraryProducts).where(eq(libraryProducts.libraryId, id));
      const referrals = await db.select().from(libraryReferrals).where(eq(libraryReferrals.libraryId, id));
      const activityLogs = await db.select().from(libraryActivityLogs).where(eq(libraryActivityLogs.libraryId, id)).orderBy(desc(libraryActivityLogs.createdAt)).limit(50);
      const orders = await db.select().from(libraryOrders).where(eq(libraryOrders.libraryId, id)).orderBy(desc(libraryOrders.createdAt)).limit(100);
      const withdrawals = await db.select().from(libraryWithdrawalRequests).where(eq(libraryWithdrawalRequests.libraryId, id)).orderBy(desc(libraryWithdrawalRequests.createdAt)).limit(100);
      const balanceRows = await db.select().from(libraryBalances).where(eq(libraryBalances.libraryId, id)).limit(1);
      const balance = balanceRows[0] || null;
      
      res.json(successResponse({
        ...library[0],
        products,
        referrals,
        activityLogs,
        orders,
        withdrawals,
        balance,
        stats: {
          totalProducts: products.length,
          activeProducts: products.filter((p: typeof libraryProducts.$inferSelect) => p.isActive).length,
          totalReferrals: referrals.length,
          convertedReferrals: referrals.filter((r: typeof libraryReferrals.$inferSelect) => r.status === "purchased").length,
          totalOrders: orders.length,
          pendingOrders: orders.filter((o: typeof libraryOrders.$inferSelect) => o.status === "pending_admin" || o.status === "admin_confirmed" || o.status === "shipped").length,
          pendingWithdrawals: withdrawals.filter((w: typeof libraryWithdrawalRequests.$inferSelect) => w.status === "pending").length,
        },
      }));
    } catch (error: any) {
      console.error("Get library error:", error);
      res
        .status(500)
        .json(errorResponse(ErrorCode.INTERNAL_SERVER_ERROR, "Failed to fetch library"));
    }
  });

  // Create library
  app.post("/api/admin/libraries", adminMiddleware, async (req: any, res) => {
    try {
      const { name, description, location, imageUrl, username, password, commissionRatePct } = req.body;
      
      if (!name || !username || !password) {
        return res
          .status(400)
          .json(errorResponse(ErrorCode.BAD_REQUEST, "Name, username and password are required"));
      }
      
      // Check username unique
      const existing = await db.select().from(libraries).where(eq(libraries.username, username));
      if (existing[0]) {
        return res
          .status(400)
          .json(errorResponse(ErrorCode.CONFLICT, "Username already exists"));
      }
      
      const hashedPassword = await bcrypt.hash(password, 10);
      const referralCode = `LIB${Date.now().toString(36).toUpperCase()}`;
      
      const newLibrary = await db.insert(libraries).values({
        name,
        description: description || null,
        location: location || null,
        imageUrl: imageUrl || null,
        username,
        password: hashedPassword,
        referralCode,
        commissionRatePct: commissionRatePct !== undefined
          ? Number(commissionRatePct).toFixed(2)
          : "10.00",
      }).returning();

      await db.insert(libraryBalances).values({
        libraryId: newLibrary[0].id,
      });

      // Notify all parents about new library
      try {
        const allParents = await db.select({ id: parents.id }).from(parents);
        for (const p of allParents) {
          await db.insert(parentNotifications).values({
            parentId: p.id,
            adminId: req.admin.adminId,
            title: `📚 مكتبة جديدة: ${name}`,
            message: `تم إضافة مكتبة "${name}" للمنصة. تصفح منتجاتها الآن!`,
          });
        }
      } catch (notifErr) {
        console.error("Failed to send new library notifications:", notifErr);
      }
      
      res.json(successResponse(newLibrary[0]));
    } catch (error: any) {
      console.error("Create library error:", error);
      res
        .status(500)
        .json(errorResponse(ErrorCode.INTERNAL_SERVER_ERROR, "Failed to create library"));
    }
  });

  // Update library
  app.put("/api/admin/libraries/:id", adminMiddleware, async (req: any, res) => {
    try {
      const { id } = req.params;
      const { name, description, location, imageUrl, username, password, isActive } = req.body;
      
      const library = await db.select().from(libraries).where(eq(libraries.id, id));
      if (!library[0]) {
        return res
          .status(404)
          .json(errorResponse(ErrorCode.NOT_FOUND, "Library not found"));
      }
      
      // Check username unique if changed
      if (username && username !== library[0].username) {
        const existing = await db.select().from(libraries).where(eq(libraries.username, username));
        if (existing[0]) {
          return res
            .status(400)
            .json(errorResponse(ErrorCode.CONFLICT, "Username already exists"));
        }
      }
      
      const updates: any = { updatedAt: new Date() };
      if (name) updates.name = name;
      if (description !== undefined) updates.description = description;
      if (location !== undefined) updates.location = location;
      if (imageUrl !== undefined) updates.imageUrl = imageUrl;
      if (username) updates.username = username;
      if (password) updates.password = await bcrypt.hash(password, 10);
      if (typeof isActive === "boolean") updates.isActive = isActive;
      
      const updated = await db.update(libraries).set(updates).where(eq(libraries.id, id)).returning();
      res.json(successResponse(updated[0]));
    } catch (error: any) {
      console.error("Update library error:", error);
      res
        .status(500)
        .json(errorResponse(ErrorCode.INTERNAL_SERVER_ERROR, "Failed to update library"));
    }
  });

  // Delete library
  app.delete("/api/admin/libraries/:id", adminMiddleware, async (req: any, res) => {
    try {
      const { id } = req.params;
      await db.delete(libraries).where(eq(libraries.id, id));
      res.json(successResponse(undefined, "Library deleted"));
    } catch (error: any) {
      console.error("Delete library error:", error);
      res
        .status(500)
        .json(errorResponse(ErrorCode.INTERNAL_SERVER_ERROR, "Failed to delete library"));
    }
  });

  // Get library referral settings
  app.get("/api/admin/library-referral-settings", adminMiddleware, async (req: any, res) => {
    try {
      let settings = await db.select().from(libraryReferralSettings);
      if (!settings[0]) {
        const created = await db.insert(libraryReferralSettings).values({}).returning();
        settings = created;
      }
      res.json(successResponse(settings[0]));
    } catch (error: any) {
      console.error("Get library referral settings error:", error);
      res
        .status(500)
        .json(errorResponse(ErrorCode.INTERNAL_SERVER_ERROR, "Failed to fetch settings"));
    }
  });

  // Update library referral settings
  app.put("/api/admin/library-referral-settings", adminMiddleware, async (req: any, res) => {
    try {
      const { pointsPerReferral, pointsPerSale, pointsPerProductAdd, isActive } = req.body;
      
      let settings = await db.select().from(libraryReferralSettings);
      if (!settings[0]) {
        const created = await db.insert(libraryReferralSettings).values({
          pointsPerReferral: pointsPerReferral || 50,
          pointsPerSale: pointsPerSale || 10,
          pointsPerProductAdd: pointsPerProductAdd || 5,
          isActive: isActive !== undefined ? isActive : true,
        }).returning();
        return res.json(successResponse(created[0]));
      }
      
      const updated = await db.update(libraryReferralSettings).set({
        pointsPerReferral: pointsPerReferral ?? settings[0].pointsPerReferral,
        pointsPerSale: pointsPerSale ?? settings[0].pointsPerSale,
        pointsPerProductAdd: pointsPerProductAdd ?? settings[0].pointsPerProductAdd,
        isActive: isActive !== undefined ? isActive : settings[0].isActive,
        updatedAt: new Date(),
      }).where(eq(libraryReferralSettings.id, settings[0].id)).returning();
      
      res.json(successResponse(updated[0]));
    } catch (error: any) {
      console.error("Update library referral settings error:", error);
      res
        .status(500)
        .json(errorResponse(ErrorCode.INTERNAL_SERVER_ERROR, "Failed to update settings"));
    }
  });

  app.get("/api/admin/library-orders", adminMiddleware, async (req: any, res) => {
    try {
      const ordersList = await db
        .select({
          order: libraryOrders,
          libraryName: libraries.name,
          parentName: parents.name,
          parentEmail: parents.email,
          productTitle: libraryProducts.title,
        })
        .from(libraryOrders)
        .leftJoin(libraries, eq(libraryOrders.libraryId, libraries.id))
        .leftJoin(parents, eq(libraryOrders.buyerParentId, parents.id))
        .leftJoin(libraryProducts, eq(libraryOrders.libraryProductId, libraryProducts.id))
        .orderBy(desc(libraryOrders.createdAt));

      const data = ordersList.map((row: any) => ({
        ...row.order,
        libraryName: row.libraryName,
        parentName: row.parentName,
        parentEmail: row.parentEmail,
        productTitle: row.productTitle,
      }));

      res.json(successResponse(data));
    } catch (error: any) {
      console.error("Get admin library orders error:", error);
      res
        .status(500)
        .json(errorResponse(ErrorCode.INTERNAL_SERVER_ERROR, "Failed to fetch library orders"));
    }
  });

  app.put("/api/admin/library-orders/:id/confirm", adminMiddleware, async (req: any, res) => {
    try {
      const { id } = req.params;
      const rows = await db.select().from(libraryOrders).where(eq(libraryOrders.id, id)).limit(1);
      const order = rows[0];
      if (!order) {
        return res.status(404).json(errorResponse(ErrorCode.NOT_FOUND, "Order not found"));
      }
      if (order.status !== "pending_admin") {
        return res.status(400).json(errorResponse(ErrorCode.BAD_REQUEST, "Order is not pending admin confirmation"));
      }

      const updated = await db
        .update(libraryOrders)
        .set({
          status: "admin_confirmed",
          adminConfirmedAt: new Date(),
          updatedAt: new Date(),
        })
        .where(eq(libraryOrders.id, id))
        .returning();

      res.json(successResponse(updated[0], "Order confirmed and sent to library"));
    } catch (error: any) {
      console.error("Confirm library order error:", error);
      res
        .status(500)
        .json(errorResponse(ErrorCode.INTERNAL_SERVER_ERROR, "Failed to confirm order"));
    }
  });

  app.put("/api/admin/library-orders/:id/reject", adminMiddleware, async (req: any, res) => {
    try {
      const { id } = req.params;
      const { note } = req.body || {};
      const rows = await db.select().from(libraryOrders).where(eq(libraryOrders.id, id)).limit(1);
      const order = rows[0];
      if (!order) {
        return res.status(404).json(errorResponse(ErrorCode.NOT_FOUND, "Order not found"));
      }
      if (order.status !== "pending_admin") {
        return res.status(400).json(errorResponse(ErrorCode.BAD_REQUEST, "Only pending admin orders can be rejected"));
      }

      const updated = await db
        .update(libraryOrders)
        .set({
          status: "cancelled",
          updatedAt: new Date(),
        })
        .where(eq(libraryOrders.id, id))
        .returning();

      if (note) {
        await db.insert(libraryActivityLogs).values({
          libraryId: order.libraryId,
          action: "order_rejected_by_admin",
          points: 0,
          metadata: { orderId: order.id, note: String(note) },
        });
      }

      res.json(successResponse(updated[0], "Order rejected"));
    } catch (error: any) {
      console.error("Reject library order error:", error);
      res
        .status(500)
        .json(errorResponse(ErrorCode.INTERNAL_SERVER_ERROR, "Failed to reject order"));
    }
  });

  app.get("/api/admin/library-withdrawals", adminMiddleware, async (req: any, res) => {
    try {
      const rows = await db
        .select({
          request: libraryWithdrawalRequests,
          libraryName: libraries.name,
          availableBalance: libraryBalances.availableBalance,
          pendingBalance: libraryBalances.pendingBalance,
        })
        .from(libraryWithdrawalRequests)
        .leftJoin(libraries, eq(libraryWithdrawalRequests.libraryId, libraries.id))
        .leftJoin(libraryBalances, eq(libraryWithdrawalRequests.libraryId, libraryBalances.libraryId))
        .orderBy(desc(libraryWithdrawalRequests.createdAt));

      const data = rows.map((row: any) => ({
        ...row.request,
        libraryName: row.libraryName,
        availableBalance: row.availableBalance,
        pendingBalance: row.pendingBalance,
      }));

      res.json(successResponse(data));
    } catch (error: any) {
      console.error("Get admin library withdrawals error:", error);
      res
        .status(500)
        .json(errorResponse(ErrorCode.INTERNAL_SERVER_ERROR, "Failed to fetch withdrawals"));
    }
  });

  app.put("/api/admin/library-withdrawals/:id/approve", adminMiddleware, async (req: any, res) => {
    try {
      const { id } = req.params;
      const rows = await db.select().from(libraryWithdrawalRequests).where(eq(libraryWithdrawalRequests.id, id)).limit(1);
      const request = rows[0];
      if (!request) {
        return res.status(404).json(errorResponse(ErrorCode.NOT_FOUND, "Withdrawal request not found"));
      }
      if (request.status !== "pending") {
        return res.status(400).json(errorResponse(ErrorCode.BAD_REQUEST, "Withdrawal request already processed"));
      }

      await db.transaction(async (tx: any) => {
        await tx
          .update(libraryWithdrawalRequests)
          .set({
            status: "approved",
            processedAt: new Date(),
            updatedAt: new Date(),
          })
          .where(eq(libraryWithdrawalRequests.id, id));

        const existingBalance = await tx.select().from(libraryBalances).where(eq(libraryBalances.libraryId, request.libraryId)).limit(1);
        if (existingBalance[0]) {
          await tx
            .update(libraryBalances)
            .set({
              totalWithdrawnAmount: sql`${libraryBalances.totalWithdrawnAmount} + ${request.amount}`,
              updatedAt: new Date(),
            })
            .where(eq(libraryBalances.libraryId, request.libraryId));
        }
      });

      const updatedRows = await db.select().from(libraryWithdrawalRequests).where(eq(libraryWithdrawalRequests.id, id)).limit(1);
      res.json(successResponse(updatedRows[0], "Withdrawal approved"));
    } catch (error: any) {
      console.error("Approve library withdrawal error:", error);
      res
        .status(500)
        .json(errorResponse(ErrorCode.INTERNAL_SERVER_ERROR, "Failed to approve withdrawal"));
    }
  });

  app.put("/api/admin/library-withdrawals/:id/reject", adminMiddleware, async (req: any, res) => {
    try {
      const { id } = req.params;
      const { note } = req.body || {};

      const rows = await db.select().from(libraryWithdrawalRequests).where(eq(libraryWithdrawalRequests.id, id)).limit(1);
      const request = rows[0];
      if (!request) {
        return res.status(404).json(errorResponse(ErrorCode.NOT_FOUND, "Withdrawal request not found"));
      }
      if (request.status !== "pending") {
        return res.status(400).json(errorResponse(ErrorCode.BAD_REQUEST, "Withdrawal request already processed"));
      }

      await db.transaction(async (tx: any) => {
        await tx
          .update(libraryWithdrawalRequests)
          .set({
            status: "rejected",
            adminNote: note ? String(note) : null,
            processedAt: new Date(),
            updatedAt: new Date(),
          })
          .where(eq(libraryWithdrawalRequests.id, id));

        const existingBalance = await tx.select().from(libraryBalances).where(eq(libraryBalances.libraryId, request.libraryId)).limit(1);
        if (!existingBalance[0]) {
          await tx.insert(libraryBalances).values({
            libraryId: request.libraryId,
            availableBalance: request.amount,
          });
        } else {
          await tx
            .update(libraryBalances)
            .set({
              availableBalance: sql`${libraryBalances.availableBalance} + ${request.amount}`,
              updatedAt: new Date(),
            })
            .where(eq(libraryBalances.libraryId, request.libraryId));
        }
      });

      const updatedRows = await db.select().from(libraryWithdrawalRequests).where(eq(libraryWithdrawalRequests.id, id)).limit(1);
      res.json(successResponse(updatedRows[0], "Withdrawal rejected and amount returned"));
    } catch (error: any) {
      console.error("Reject library withdrawal error:", error);
      res
        .status(500)
        .json(errorResponse(ErrorCode.INTERNAL_SERVER_ERROR, "Failed to reject withdrawal"));
    }
  });

  // ===== Schools Management =====

  // Get all schools
  app.get("/api/admin/schools", adminMiddleware, async (req: any, res) => {
    try {
      const allSchools = await db.select().from(schools).orderBy(desc(schools.activityScore));
      res.json(successResponse(allSchools));
    } catch (error: any) {
      console.error("Get schools error:", error);
      res.status(500).json(errorResponse(ErrorCode.INTERNAL_SERVER_ERROR, "Failed to fetch schools"));
    }
  });

  // Get single school with stats
  app.get("/api/admin/schools/:id", adminMiddleware, async (req: any, res) => {
    try {
      const { id } = req.params;
      const school = await db.select().from(schools).where(eq(schools.id, id));
      if (!school[0]) {
        return res.status(404).json(errorResponse(ErrorCode.NOT_FOUND, "School not found"));
      }

      const teachers = await db.select().from(schoolTeachers).where(eq(schoolTeachers.schoolId, id));
      const students = await db.select().from(childSchoolAssignment).where(eq(childSchoolAssignment.schoolId, id));
      const posts = await db.select().from(schoolPosts).where(eq(schoolPosts.schoolId, id)).orderBy(desc(schoolPosts.createdAt)).limit(50);
      const reviews = await db.select().from(schoolReviews).where(eq(schoolReviews.schoolId, id)).orderBy(desc(schoolReviews.createdAt));
      const activityLogs = await db.select().from(schoolActivityLogs).where(eq(schoolActivityLogs.schoolId, id)).orderBy(desc(schoolActivityLogs.createdAt)).limit(50);

      const { password, ...safeSchool } = school[0];

      res.json(successResponse({
        ...safeSchool,
        teachers: teachers.map(({ password: _pw, ...t }: any) => t),
        students,
        posts,
        reviews,
        activityLogs,
        stats: {
          totalTeachers: teachers.length,
          activeTeachers: teachers.filter((t: typeof schoolTeachers.$inferSelect) => t.isActive).length,
          totalStudents: students.length,
          totalPosts: posts.length,
          totalReviews: reviews.length,
        },
      }));
    } catch (error: any) {
      console.error("Get school error:", error);
      res.status(500).json(errorResponse(ErrorCode.INTERNAL_SERVER_ERROR, "Failed to fetch school"));
    }
  });

  // Create school
  app.post("/api/admin/schools", adminMiddleware, async (req: any, res) => {
    try {
      const { name, nameAr, description, address, city, governorate, imageUrl, coverImageUrl, username, password, phoneNumber, email, commissionRatePct, withdrawalCommissionPct } = req.body;

      if (!name || !username || !password) {
        return res.status(400).json(errorResponse(ErrorCode.BAD_REQUEST, "Name, username and password are required"));
      }

      const existing = await db.select().from(schools).where(eq(schools.username, username));
      if (existing[0]) {
        return res.status(400).json(errorResponse(ErrorCode.CONFLICT, "Username already exists"));
      }

      const hashedPassword = await bcrypt.hash(password, 10);
      const referralCode = `SCH${Date.now().toString(36).toUpperCase()}`;

      const newSchool = await db.insert(schools).values({
        name,
        nameAr: nameAr || null,
        description: description || null,
        address: address || null,
        city: city || null,
        governorate: governorate || null,
        imageUrl: imageUrl || null,
        coverImageUrl: coverImageUrl || null,
        username,
        password: hashedPassword,
        referralCode,
        phoneNumber: phoneNumber || null,
        email: email || null,
        commissionRatePct: commissionRatePct !== undefined ? Number(commissionRatePct).toFixed(2) : "10.00",
        withdrawalCommissionPct: withdrawalCommissionPct !== undefined ? Number(withdrawalCommissionPct).toFixed(2) : "0.00",
      }).returning();

      // Notify all parents about new school
      try {
        const allParents = await db.select({ id: parents.id }).from(parents);
        for (const p of allParents) {
          await db.insert(parentNotifications).values({
            parentId: p.id,
            adminId: req.admin.adminId,
            title: `🏫 مدرسة جديدة: ${name}`,
            message: `تم إضافة مدرسة "${name}" للمنصة. يمكنك الآن متابعتها وتسجيل أطفالك بها.`,
          });
        }
      } catch (notifErr) {
        console.error("Failed to send new school notifications:", notifErr);
      }

      res.json(successResponse(newSchool[0]));
    } catch (error: any) {
      console.error("Create school error:", error);
      res.status(500).json(errorResponse(ErrorCode.INTERNAL_SERVER_ERROR, "Failed to create school"));
    }
  });

  // Update school
  app.put("/api/admin/schools/:id", adminMiddleware, async (req: any, res) => {
    try {
      const { id } = req.params;
      const { name, nameAr, description, address, city, governorate, imageUrl, coverImageUrl, username, password, phoneNumber, email, isActive, isVerified, commissionRatePct, withdrawalCommissionPct } = req.body;

      const school = await db.select().from(schools).where(eq(schools.id, id));
      if (!school[0]) {
        return res.status(404).json(errorResponse(ErrorCode.NOT_FOUND, "School not found"));
      }

      if (username && username !== school[0].username) {
        const existing = await db.select().from(schools).where(eq(schools.username, username));
        if (existing[0]) {
          return res.status(400).json(errorResponse(ErrorCode.CONFLICT, "Username already exists"));
        }
      }

      const updates: any = { updatedAt: new Date() };
      if (name) updates.name = name;
      if (nameAr !== undefined) updates.nameAr = nameAr;
      if (description !== undefined) updates.description = description;
      if (address !== undefined) updates.address = address;
      if (city !== undefined) updates.city = city;
      if (governorate !== undefined) updates.governorate = governorate;
      if (imageUrl !== undefined) updates.imageUrl = imageUrl;
      if (coverImageUrl !== undefined) updates.coverImageUrl = coverImageUrl;
      if (username) updates.username = username;
      if (password) updates.password = await bcrypt.hash(password, 10);
      if (phoneNumber !== undefined) updates.phoneNumber = phoneNumber;
      if (email !== undefined) updates.email = email;
      if (typeof isActive === "boolean") updates.isActive = isActive;
      if (typeof isVerified === "boolean") updates.isVerified = isVerified;
      if (commissionRatePct !== undefined) updates.commissionRatePct = Number(commissionRatePct).toFixed(2);
      if (withdrawalCommissionPct !== undefined) updates.withdrawalCommissionPct = Number(withdrawalCommissionPct).toFixed(2);

      const updated = await db.update(schools).set(updates).where(eq(schools.id, id)).returning();
      res.json(successResponse(updated[0]));
    } catch (error: any) {
      console.error("Update school error:", error);
      res.status(500).json(errorResponse(ErrorCode.INTERNAL_SERVER_ERROR, "Failed to update school"));
    }
  });

  // Delete school
  app.delete("/api/admin/schools/:id", adminMiddleware, async (req: any, res) => {
    try {
      const { id } = req.params;
      await db.delete(schools).where(eq(schools.id, id));
      res.json(successResponse(undefined, "School deleted"));
    } catch (error: any) {
      console.error("Delete school error:", error);
      res.status(500).json(errorResponse(ErrorCode.INTERNAL_SERVER_ERROR, "Failed to delete school"));
    }
  });

  // ===== Admin Teacher Management (inside school) =====

  // Get teachers for a specific school
  app.get("/api/admin/schools/:id/teachers", adminMiddleware, async (req: any, res) => {
    try {
      const { id } = req.params;
      const school = await db.select().from(schools).where(eq(schools.id, id));
      if (!school[0]) {
        return res.status(404).json(errorResponse(ErrorCode.NOT_FOUND, "School not found"));
      }

      const teachers = await db.select().from(schoolTeachers)
        .where(eq(schoolTeachers.schoolId, id))
        .orderBy(desc(schoolTeachers.createdAt));

      const safeTeachers = teachers.map(({ password: _pw, ...t }: any) => t);
      res.json(successResponse(safeTeachers));
    } catch (error: any) {
      console.error("Get school teachers error:", error);
      res.status(500).json(errorResponse(ErrorCode.INTERNAL_SERVER_ERROR, "Failed to fetch teachers"));
    }
  });

  // Update teacher (admin full permissions)
  app.put("/api/admin/teachers/:id", adminMiddleware, async (req: any, res) => {
    try {
      const { id } = req.params;
      const { name, avatarUrl, birthday, bio, subject, yearsExperience, username, password, monthlyRate, perTaskRate, pricingModel, socialLinks, isActive, commissionRatePct } = req.body;

      const teacher = await db.select().from(schoolTeachers).where(eq(schoolTeachers.id, id));
      if (!teacher[0]) {
        return res.status(404).json(errorResponse(ErrorCode.NOT_FOUND, "\u0627\u0644\u0645\u0639\u0644\u0645 \u063a\u064a\u0631 \u0645\u0648\u062c\u0648\u062f"));
      }

      // Check username unique if changed
      if (username && username !== teacher[0].username) {
        const existing = await db.select().from(schoolTeachers).where(eq(schoolTeachers.username, username));
        if (existing[0]) {
          return res.status(400).json(errorResponse(ErrorCode.BAD_REQUEST, "\u0627\u0633\u0645 \u0627\u0644\u0645\u0633\u062a\u062e\u062f\u0645 \u0645\u0633\u062a\u062e\u062f\u0645 \u0628\u0627\u0644\u0641\u0639\u0644"));
        }
      }

      const updates: any = { updatedAt: new Date() };
      if (name) updates.name = name;
      if (avatarUrl !== undefined) updates.avatarUrl = avatarUrl;
      if (birthday !== undefined) updates.birthday = birthday;
      if (bio !== undefined) updates.bio = bio;
      if (subject !== undefined) updates.subject = subject;
      if (yearsExperience !== undefined) updates.yearsExperience = yearsExperience;
      if (username) updates.username = username;
      if (password) updates.password = await bcrypt.hash(password, 10);
      if (monthlyRate !== undefined) updates.monthlyRate = monthlyRate ? String(monthlyRate) : null;
      if (perTaskRate !== undefined) updates.perTaskRate = perTaskRate ? String(perTaskRate) : null;
      if (pricingModel !== undefined) updates.pricingModel = pricingModel;
      if (socialLinks !== undefined) updates.socialLinks = socialLinks;
      if (typeof isActive === "boolean") updates.isActive = isActive;
      if (commissionRatePct !== undefined) updates.commissionRatePct = Number(commissionRatePct).toFixed(2);

      const updated = await db.update(schoolTeachers).set(updates)
        .where(eq(schoolTeachers.id, id))
        .returning();

      const { password: _, ...safe } = updated[0];
      res.json(successResponse(safe));
    } catch (error: any) {
      console.error("Admin update teacher error:", error);
      res.status(500).json(errorResponse(ErrorCode.INTERNAL_SERVER_ERROR, "Failed to update teacher"));
    }
  });

  // Delete teacher (admin)
  app.delete("/api/admin/teachers/:id", adminMiddleware, async (req: any, res) => {
    try {
      const { id } = req.params;

      const teacher = await db.select().from(schoolTeachers).where(eq(schoolTeachers.id, id));
      if (!teacher[0]) {
        return res.status(404).json(errorResponse(ErrorCode.NOT_FOUND, "\u0627\u0644\u0645\u0639\u0644\u0645 \u063a\u064a\u0631 \u0645\u0648\u062c\u0648\u062f"));
      }

      const schoolId = teacher[0].schoolId;
      await db.delete(schoolTeachers).where(eq(schoolTeachers.id, id));

      // Decrement totalTeachers
      await db.update(schools).set({
        totalTeachers: sql`GREATEST(0, ${schools.totalTeachers} - 1)`,
        updatedAt: new Date(),
      }).where(eq(schools.id, schoolId));

      res.json(successResponse(undefined, "\u062a\u0645 \u062d\u0630\u0641 \u0627\u0644\u0645\u0639\u0644\u0645"));
    } catch (error: any) {
      console.error("Admin delete teacher error:", error);
      res.status(500).json(errorResponse(ErrorCode.INTERNAL_SERVER_ERROR, "Failed to delete teacher"));
    }
  });

  // Transfer teacher (admin)
  app.post("/api/admin/teachers/:id/transfer", adminMiddleware, async (req: any, res) => {
    try {
      const { id } = req.params;
      const { toSchoolId, performanceRating, performanceComment, reason } = req.body;

      if (!toSchoolId || !performanceRating || !performanceComment) {
        return res.status(400).json(errorResponse(ErrorCode.BAD_REQUEST, "\u0627\u0644\u0645\u062f\u0631\u0633\u0629 \u0627\u0644\u0645\u0633\u062a\u0647\u062f\u0641\u0629 \u0648\u0627\u0644\u062a\u0642\u064a\u064a\u0645 \u0648\u0627\u0644\u062a\u0639\u0644\u064a\u0642 \u0645\u0637\u0644\u0648\u0628\u0648\u0646"));
      }

      if (performanceRating < 1 || performanceRating > 5) {
        return res.status(400).json(errorResponse(ErrorCode.BAD_REQUEST, "\u0627\u0644\u062a\u0642\u064a\u064a\u0645 \u064a\u062c\u0628 \u0623\u0646 \u064a\u0643\u0648\u0646 \u0628\u064a\u0646 1 \u0648 5"));
      }

      const teacher = await db.select().from(schoolTeachers).where(eq(schoolTeachers.id, id));
      if (!teacher[0]) {
        return res.status(404).json(errorResponse(ErrorCode.NOT_FOUND, "\u0627\u0644\u0645\u0639\u0644\u0645 \u063a\u064a\u0631 \u0645\u0648\u062c\u0648\u062f"));
      }

      const fromSchoolId = teacher[0].schoolId;

      if (toSchoolId === fromSchoolId) {
        return res.status(400).json(errorResponse(ErrorCode.BAD_REQUEST, "\u0644\u0627 \u064a\u0645\u0643\u0646 \u0646\u0642\u0644 \u0627\u0644\u0645\u0639\u0644\u0645 \u0644\u0646\u0641\u0633 \u0627\u0644\u0645\u062f\u0631\u0633\u0629"));
      }

      const destSchool = await db.select().from(schools)
        .where(and(eq(schools.id, toSchoolId), eq(schools.isActive, true)));

      if (!destSchool[0]) {
        return res.status(404).json(errorResponse(ErrorCode.NOT_FOUND, "\u0627\u0644\u0645\u062f\u0631\u0633\u0629 \u0627\u0644\u0645\u0633\u062a\u0647\u062f\u0641\u0629 \u063a\u064a\u0631 \u0645\u0648\u062c\u0648\u062f\u0629 \u0623\u0648 \u063a\u064a\u0631 \u0646\u0634\u0637\u0629"));
      }

      // Transfer
      await db.update(schoolTeachers).set({
        schoolId: toSchoolId,
        updatedAt: new Date(),
      }).where(eq(schoolTeachers.id, id));

      // Update counters
      await db.update(schools).set({
        totalTeachers: sql`GREATEST(0, ${schools.totalTeachers} - 1)`,
        updatedAt: new Date(),
      }).where(eq(schools.id, fromSchoolId));

      await db.update(schools).set({
        totalTeachers: sql`${schools.totalTeachers} + 1`,
        updatedAt: new Date(),
      }).where(eq(schools.id, toSchoolId));

      // Record transfer
      await db.insert(teacherTransfers).values({
        teacherId: id,
        fromSchoolId,
        toSchoolId,
        transferredByType: "admin",
        transferredById: req.admin.adminId,
        performanceRating,
        performanceComment,
        reason: reason || null,
      });

      res.json(successResponse(undefined, "\u062a\u0645 \u0646\u0642\u0644 \u0627\u0644\u0645\u0639\u0644\u0645 \u0628\u0646\u062c\u0627\u062d"));
    } catch (error: any) {
      console.error("Admin transfer teacher error:", error);
      res.status(500).json(errorResponse(ErrorCode.INTERNAL_SERVER_ERROR, "Failed to transfer teacher"));
    }
  });

  // Get all schools (for transfer dropdown)
  app.get("/api/admin/all-schools-list", adminMiddleware, async (req: any, res) => {
    try {
      const allSchools = await db.select({
        id: schools.id,
        name: schools.name,
        imageUrl: schools.imageUrl,
        isActive: schools.isActive,
      }).from(schools)
        .where(eq(schools.isActive, true))
        .orderBy(schools.name);

      res.json(successResponse(allSchools));
    } catch (error: any) {
      console.error("Get all schools list error:", error);
      res.status(500).json(errorResponse(ErrorCode.INTERNAL_SERVER_ERROR, "Failed to fetch schools"));
    }
  });

  // Get school referral settings
  app.get("/api/admin/school-referral-settings", adminMiddleware, async (req: any, res) => {
    try {
      let settings = await db.select().from(schoolReferralSettings);
      if (!settings[0]) {
        const created = await db.insert(schoolReferralSettings).values({}).returning();
        settings = created;
      }
      res.json(successResponse(settings[0]));
    } catch (error: any) {
      console.error("Get school referral settings error:", error);
      res.status(500).json(errorResponse(ErrorCode.INTERNAL_SERVER_ERROR, "Failed to fetch settings"));
    }
  });

  // Update school referral settings
  app.put("/api/admin/school-referral-settings", adminMiddleware, async (req: any, res) => {
    try {
      const { pointsPerReferral, pointsPerTeacherAdd, pointsPerStudentJoin, isActive } = req.body;

      let settings = await db.select().from(schoolReferralSettings);
      if (!settings[0]) {
        const created = await db.insert(schoolReferralSettings).values({
          pointsPerReferral: pointsPerReferral || 50,
          pointsPerTeacherAdd: pointsPerTeacherAdd || 20,
          pointsPerStudentJoin: pointsPerStudentJoin || 10,
          isActive: isActive !== undefined ? isActive : true,
        }).returning();
        return res.json(successResponse(created[0]));
      }

      const updated = await db.update(schoolReferralSettings).set({
        pointsPerReferral: pointsPerReferral ?? settings[0].pointsPerReferral,
        pointsPerTeacherAdd: pointsPerTeacherAdd ?? settings[0].pointsPerTeacherAdd,
        pointsPerStudentJoin: pointsPerStudentJoin ?? settings[0].pointsPerStudentJoin,
        isActive: isActive !== undefined ? isActive : settings[0].isActive,
        updatedAt: new Date(),
      }).where(eq(schoolReferralSettings.id, settings[0].id)).returning();

      res.json(successResponse(updated[0]));
    } catch (error: any) {
      console.error("Update school referral settings error:", error);
      res.status(500).json(errorResponse(ErrorCode.INTERNAL_SERVER_ERROR, "Failed to update settings"));
    }
  });

  // Get teacher withdrawal requests (admin)
  app.get("/api/admin/teacher-withdrawals", adminMiddleware, async (req: any, res) => {
    try {
      const rows = await db
        .select({
          request: teacherWithdrawalRequests,
          teacherName: schoolTeachers.name,
          schoolName: schools.name,
          availableBalance: teacherBalances.availableBalance,
          pendingBalance: teacherBalances.pendingBalance,
        })
        .from(teacherWithdrawalRequests)
        .leftJoin(schoolTeachers, eq(teacherWithdrawalRequests.teacherId, schoolTeachers.id))
        .leftJoin(schools, eq(schoolTeachers.schoolId, schools.id))
        .leftJoin(teacherBalances, eq(teacherWithdrawalRequests.teacherId, teacherBalances.teacherId))
        .orderBy(desc(teacherWithdrawalRequests.requestedAt));

      const data = rows.map((row: any) => ({
        ...row.request,
        teacherName: row.teacherName,
        schoolName: row.schoolName,
        availableBalance: row.availableBalance,
        pendingBalance: row.pendingBalance,
      }));

      res.json(successResponse(data));
    } catch (error: any) {
      console.error("Get admin teacher withdrawals error:", error);
      res.status(500).json(errorResponse(ErrorCode.INTERNAL_SERVER_ERROR, "Failed to fetch teacher withdrawals"));
    }
  });

  // Approve teacher withdrawal
  app.put("/api/admin/teacher-withdrawals/:id/approve", adminMiddleware, async (req: any, res) => {
    try {
      const { id } = req.params;
      const rows = await db.select().from(teacherWithdrawalRequests).where(eq(teacherWithdrawalRequests.id, id)).limit(1);
      const request = rows[0];
      if (!request) {
        return res.status(404).json(errorResponse(ErrorCode.NOT_FOUND, "Withdrawal request not found"));
      }
      if (request.status !== "pending") {
        return res.status(400).json(errorResponse(ErrorCode.BAD_REQUEST, "Withdrawal request already processed"));
      }

      await db.transaction(async (tx: any) => {
        await tx.update(teacherWithdrawalRequests).set({
          status: "approved",
          processedAt: new Date(),
        }).where(eq(teacherWithdrawalRequests.id, id));

        const existingBalance = await tx.select().from(teacherBalances).where(eq(teacherBalances.teacherId, request.teacherId)).limit(1);
        if (existingBalance[0]) {
          await tx.update(teacherBalances).set({
            totalWithdrawnAmount: sql`${teacherBalances.totalWithdrawnAmount} + ${request.netAmount}`,
            updatedAt: new Date(),
          }).where(eq(teacherBalances.teacherId, request.teacherId));
        }
      });

      const updatedRows = await db.select().from(teacherWithdrawalRequests).where(eq(teacherWithdrawalRequests.id, id)).limit(1);
      res.json(successResponse(updatedRows[0], "Withdrawal approved"));
    } catch (error: any) {
      console.error("Approve teacher withdrawal error:", error);
      res.status(500).json(errorResponse(ErrorCode.INTERNAL_SERVER_ERROR, "Failed to approve withdrawal"));
    }
  });

  // Reject teacher withdrawal
  app.put("/api/admin/teacher-withdrawals/:id/reject", adminMiddleware, async (req: any, res) => {
    try {
      const { id } = req.params;
      const { note } = req.body || {};

      const rows = await db.select().from(teacherWithdrawalRequests).where(eq(teacherWithdrawalRequests.id, id)).limit(1);
      const request = rows[0];
      if (!request) {
        return res.status(404).json(errorResponse(ErrorCode.NOT_FOUND, "Withdrawal request not found"));
      }
      if (request.status !== "pending") {
        return res.status(400).json(errorResponse(ErrorCode.BAD_REQUEST, "Withdrawal request already processed"));
      }

      await db.transaction(async (tx: any) => {
        await tx.update(teacherWithdrawalRequests).set({
          status: "rejected",
          adminNote: note ? String(note) : null,
          processedAt: new Date(),
        }).where(eq(teacherWithdrawalRequests.id, id));

        const existingBalance = await tx.select().from(teacherBalances).where(eq(teacherBalances.teacherId, request.teacherId)).limit(1);
        if (!existingBalance[0]) {
          await tx.insert(teacherBalances).values({
            teacherId: request.teacherId,
            availableBalance: request.amount,
          });
        } else {
          await tx.update(teacherBalances).set({
            availableBalance: sql`${teacherBalances.availableBalance} + ${request.amount}`,
            updatedAt: new Date(),
          }).where(eq(teacherBalances.teacherId, request.teacherId));
        }
      });

      const updatedRows = await db.select().from(teacherWithdrawalRequests).where(eq(teacherWithdrawalRequests.id, id)).limit(1);
      res.json(successResponse(updatedRows[0], "Withdrawal rejected and amount returned"));
    } catch (error: any) {
      console.error("Reject teacher withdrawal error:", error);
      res.status(500).json(errorResponse(ErrorCode.INTERNAL_SERVER_ERROR, "Failed to reject withdrawal"));
    }
  });

  // ===== Social Login Providers Management =====
  
  // Get all social login providers
  app.get("/api/admin/social-login-providers", adminMiddleware, async (req: any, res) => {
    try {
      const providers = await db.select().from(socialLoginProviders).orderBy(socialLoginProviders.sortOrder);
      
      // Don't return clientSecret to frontend (mask it)
      const safeProviders = providers.map((p: typeof socialLoginProviders.$inferSelect) => ({
        ...p,
        clientSecret: p.clientSecret ? "********" : null,
      }));
      
      res.json(successResponse(safeProviders));
    } catch (error: any) {
      console.error("Get social login providers error:", error);
      res
        .status(500)
        .json(errorResponse(ErrorCode.INTERNAL_SERVER_ERROR, "Failed to fetch providers"));
    }
  });

  // Create social login provider
  app.post("/api/admin/social-login-providers", adminMiddleware, async (req: any, res) => {
    try {
      const { 
        provider, 
        displayName, 
        displayNameAr,
        iconUrl,
        iconName,
        clientId, 
        clientSecret, 
        redirectUri,
        scopes,
        isActive,
        sortOrder,
        settings 
      } = req.body;
      
      if (!provider || !displayName) {
        return res
          .status(400)
          .json(errorResponse(ErrorCode.BAD_REQUEST, "Provider and display name are required"));
      }
      
      // Check if provider already exists
      const existing = await db.select().from(socialLoginProviders).where(eq(socialLoginProviders.provider, provider));
      if (existing[0]) {
        return res
          .status(400)
          .json(errorResponse(ErrorCode.CONFLICT, "Provider already exists"));
      }
      
      const newProvider = await db.insert(socialLoginProviders).values({
        provider,
        displayName,
        displayNameAr: displayNameAr || null,
        iconUrl: iconUrl || null,
        iconName: iconName || null,
        clientId: clientId || null,
        clientSecret: clientSecret || null,
        redirectUri: redirectUri || null,
        scopes: scopes || null,
        isActive: isActive ?? false,
        sortOrder: sortOrder ?? 0,
        settings: settings || null,
      }).returning();
      
      res.json(successResponse({ ...newProvider[0], clientSecret: newProvider[0].clientSecret ? "********" : null }));
    } catch (error: any) {
      console.error("Create social login provider error:", error);
      res
        .status(500)
        .json(errorResponse(ErrorCode.INTERNAL_SERVER_ERROR, "Failed to create provider"));
    }
  });

  // Update social login provider
  app.put("/api/admin/social-login-providers/:id", adminMiddleware, async (req: any, res) => {
    try {
      const { id } = req.params;
      const { 
        displayName, 
        displayNameAr,
        iconUrl,
        iconName,
        clientId, 
        clientSecret, 
        redirectUri,
        scopes,
        isActive,
        sortOrder,
        settings 
      } = req.body;
      
      const existing = await db.select().from(socialLoginProviders).where(eq(socialLoginProviders.id, id));
      if (!existing[0]) {
        return res
          .status(404)
          .json(errorResponse(ErrorCode.NOT_FOUND, "Provider not found"));
      }
      
      const updates: any = { updatedAt: new Date() };
      if (displayName !== undefined) updates.displayName = displayName;
      if (displayNameAr !== undefined) updates.displayNameAr = displayNameAr;
      if (iconUrl !== undefined) updates.iconUrl = iconUrl;
      if (iconName !== undefined) updates.iconName = iconName;
      if (clientId !== undefined) updates.clientId = clientId;
      // Only update clientSecret if a new value is provided (not the masked value)
      if (clientSecret !== undefined && clientSecret !== "********") {
        updates.clientSecret = clientSecret;
      }
      if (redirectUri !== undefined) updates.redirectUri = redirectUri;
      if (scopes !== undefined) updates.scopes = scopes;
      if (typeof isActive === "boolean") updates.isActive = isActive;
      if (sortOrder !== undefined) updates.sortOrder = sortOrder;
      if (settings !== undefined) updates.settings = settings;
      
      const updated = await db.update(socialLoginProviders).set(updates).where(eq(socialLoginProviders.id, id)).returning();
      
      res.json(successResponse({ ...updated[0], clientSecret: updated[0].clientSecret ? "********" : null }));
    } catch (error: any) {
      console.error("Update social login provider error:", error);
      res
        .status(500)
        .json(errorResponse(ErrorCode.INTERNAL_SERVER_ERROR, "Failed to update provider"));
    }
  });

  // Delete social login provider
  app.delete("/api/admin/social-login-providers/:id", adminMiddleware, async (req: any, res) => {
    try {
      const { id } = req.params;
      await db.delete(socialLoginProviders).where(eq(socialLoginProviders.id, id));
      res.json(successResponse(undefined, "Provider deleted"));
    } catch (error: any) {
      console.error("Delete social login provider error:", error);
      res
        .status(500)
        .json(errorResponse(ErrorCode.INTERNAL_SERVER_ERROR, "Failed to delete provider"));
    }
  });

  // Toggle social login provider active status
  app.patch("/api/admin/social-login-providers/:id/toggle", adminMiddleware, async (req: any, res) => {
    try {
      const { id } = req.params;
      
      const existing = await db.select().from(socialLoginProviders).where(eq(socialLoginProviders.id, id));
      if (!existing[0]) {
        return res
          .status(404)
          .json(errorResponse(ErrorCode.NOT_FOUND, "Provider not found"));
      }
      
      const updated = await db.update(socialLoginProviders).set({
        isActive: !existing[0].isActive,
        updatedAt: new Date(),
      }).where(eq(socialLoginProviders.id, id)).returning();
      
      res.json(successResponse({ ...updated[0], clientSecret: updated[0].clientSecret ? "********" : null }));
    } catch (error: any) {
      console.error("Toggle social login provider error:", error);
      res
        .status(500)
        .json(errorResponse(ErrorCode.INTERNAL_SERVER_ERROR, "Failed to toggle provider"));
    }
  });

  // Initialize default social login providers (run once)
  app.post("/api/admin/social-login-providers/initialize", adminMiddleware, async (req: any, res) => {
    try {
      const defaultProviders = [
        { provider: "google", displayName: "Google", displayNameAr: "جوجل", iconName: "Chrome", sortOrder: 1 },
        { provider: "facebook", displayName: "Facebook", displayNameAr: "فيسبوك", iconName: "Facebook", sortOrder: 2 },
        { provider: "apple", displayName: "Apple", displayNameAr: "أبل", iconName: "Apple", sortOrder: 3 },
        { provider: "twitter", displayName: "Twitter / X", displayNameAr: "تويتر / إكس", iconName: "Twitter", sortOrder: 4 },
        { provider: "github", displayName: "GitHub", displayNameAr: "جيت هب", iconName: "Github", sortOrder: 5 },
        { provider: "microsoft", displayName: "Microsoft", displayNameAr: "مايكروسوفت", iconName: "Monitor", sortOrder: 6 },
        { provider: "linkedin", displayName: "LinkedIn", displayNameAr: "لينكد إن", iconName: "Linkedin", sortOrder: 7 },
        { provider: "discord", displayName: "Discord", displayNameAr: "ديسكورد", iconName: "MessageCircle", sortOrder: 8 },
      ];
      
      const created = [];
      for (const prov of defaultProviders) {
        const existing = await db.select().from(socialLoginProviders).where(eq(socialLoginProviders.provider, prov.provider));
        if (!existing[0]) {
          const newProv = await db.insert(socialLoginProviders).values({
            ...prov,
            isActive: false,
          }).returning();
          created.push(newProv[0]);
        }
      }
      
      res.json(successResponse({ created: created.length }, `${created.length} providers initialized`));
    } catch (error: any) {
      console.error("Initialize social login providers error:", error);
      res
        .status(500)
        .json(errorResponse(ErrorCode.INTERNAL_SERVER_ERROR, "Failed to initialize providers"));
    }
  });

  // ===== OTP Providers Management =====
  
  // Get all OTP providers
  app.get("/api/admin/otp-providers", adminMiddleware, async (req: any, res) => {
    try {
      const providers = await db.select().from(otpProviders).orderBy(otpProviders.sortOrder);
      
      // Don't return sensitive settings to frontend (mask API keys)
      const safeProviders = providers.map((p: typeof otpProviders.$inferSelect) => ({
        ...p,
        settings: p.settings ? { ...p.settings, apiKey: (p.settings as any).apiKey ? "********" : undefined } : null,
      }));
      
      res.json(successResponse(safeProviders));
    } catch (error: any) {
      console.error("Get OTP providers error:", error);
      res
        .status(500)
        .json(errorResponse(ErrorCode.INTERNAL_SERVER_ERROR, "Failed to fetch OTP providers"));
    }
  });

  // Update OTP provider
  app.put("/api/admin/otp-providers/:id", adminMiddleware, async (req: any, res) => {
    try {
      const { id } = req.params;
      const { 
        displayName, 
        displayNameAr,
        description,
        descriptionAr,
        iconName,
        isActive,
        sortOrder,
        codeLength,
        expiryMinutes,
        maxAttempts,
        cooldownMinutes,
        settings 
      } = req.body;
      
      const existing = await db.select().from(otpProviders).where(eq(otpProviders.id, id));
      if (!existing[0]) {
        return res
          .status(404)
          .json(errorResponse(ErrorCode.NOT_FOUND, "OTP Provider not found"));
      }
      
      const updates: any = { updatedAt: new Date() };
      if (displayName !== undefined) updates.displayName = displayName;
      if (displayNameAr !== undefined) updates.displayNameAr = displayNameAr;
      if (description !== undefined) updates.description = description;
      if (descriptionAr !== undefined) updates.descriptionAr = descriptionAr;
      if (iconName !== undefined) updates.iconName = iconName;
      if (isActive !== undefined) updates.isActive = isActive;
      if (sortOrder !== undefined) updates.sortOrder = sortOrder;
      if (codeLength !== undefined) updates.codeLength = codeLength;
      if (expiryMinutes !== undefined) updates.expiryMinutes = expiryMinutes;
      if (maxAttempts !== undefined) updates.maxAttempts = maxAttempts;
      if (cooldownMinutes !== undefined) updates.cooldownMinutes = cooldownMinutes;
      if (settings !== undefined) {
        // Merge new settings with existing, preserving sensitive data if not provided
        const existingSettings = existing[0].settings || {};
        updates.settings = { ...existingSettings, ...settings };
      }
      
      const updated = await db.update(otpProviders).set(updates).where(eq(otpProviders.id, id)).returning();
      
      // Mask sensitive data in response
      const safeProvider = {
        ...updated[0],
        settings: updated[0].settings ? { ...updated[0].settings, apiKey: updated[0].settings.apiKey ? "********" : undefined } : null,
      };
      
      res.json(successResponse(safeProvider));
    } catch (error: any) {
      console.error("Update OTP provider error:", error);
      res
        .status(500)
        .json(errorResponse(ErrorCode.INTERNAL_SERVER_ERROR, "Failed to update OTP provider"));
    }
  });

  // Toggle OTP provider active status
  app.put("/api/admin/otp-providers/:id/toggle", adminMiddleware, async (req: any, res) => {
    try {
      const { id } = req.params;
      
      const existing = await db.select().from(otpProviders).where(eq(otpProviders.id, id));
      if (!existing[0]) {
        return res
          .status(404)
          .json(errorResponse(ErrorCode.NOT_FOUND, "OTP Provider not found"));
      }
      
      const updated = await db.update(otpProviders).set({
        isActive: !existing[0].isActive,
        updatedAt: new Date(),
      }).where(eq(otpProviders.id, id)).returning();
      
      // Mask sensitive data in response
      const safeProvider = {
        ...updated[0],
        settings: updated[0].settings ? { ...updated[0].settings, apiKey: updated[0].settings.apiKey ? "********" : undefined } : null,
      };
      
      res.json(successResponse(safeProvider));
    } catch (error: any) {
      console.error("Toggle OTP provider error:", error);
      res
        .status(500)
        .json(errorResponse(ErrorCode.INTERNAL_SERVER_ERROR, "Failed to toggle OTP provider"));
    }
  });

  // Initialize default OTP providers (run once)
  app.post("/api/admin/otp-providers/initialize", adminMiddleware, async (req: any, res) => {
    try {
      const defaultProviders = [
        { 
          provider: "email", 
          displayName: "Email", 
          displayNameAr: "البريد الإلكتروني", 
          description: "Send OTP via email using Resend",
          descriptionAr: "إرسال رمز التحقق عبر البريد الإلكتروني",
          iconName: "Mail", 
          sortOrder: 1,
          codeLength: 6,
          expiryMinutes: 5,
          maxAttempts: 3,
          cooldownMinutes: 1,
          isActive: true, // Email is active by default since Resend is configured
        },
        { 
          provider: "sms", 
          displayName: "SMS", 
          displayNameAr: "رسالة نصية", 
          description: "Send OTP via SMS using Twilio",
          descriptionAr: "إرسال رمز التحقق عبر الرسائل النصية",
          iconName: "Smartphone", 
          sortOrder: 2,
          codeLength: 6,
          expiryMinutes: 5,
          maxAttempts: 3,
          cooldownMinutes: 1,
          isActive: false, // SMS is disabled by default until Twilio is configured
        },
      ];
      
      const created = [];
      for (const prov of defaultProviders) {
        const existing = await db.select().from(otpProviders).where(eq(otpProviders.provider, prov.provider));
        if (!existing[0]) {
          const newProv = await db.insert(otpProviders).values(prov).returning();
          created.push(newProv[0]);
        }
      }
      
      res.json(successResponse({ created: created.length }, `${created.length} OTP providers initialized`));
    } catch (error: any) {
      console.error("Initialize OTP providers error:", error);
      res
        .status(500)
        .json(errorResponse(ErrorCode.INTERNAL_SERVER_ERROR, "Failed to initialize OTP providers"));
    }
  });

  // ===== Legal Pages Management (Privacy & Terms) =====

  // GET /api/admin/legal — Get privacy & terms content (admin)
  app.get("/api/admin/legal", adminMiddleware, async (req: any, res) => {
    try {
      const settings = await db.select().from(siteSettings).where(
        or(
          eq(siteSettings.key, 'legal_privacy'),
          eq(siteSettings.key, 'legal_terms'),
          eq(siteSettings.key, 'legal_privacy_updated_at'),
          eq(siteSettings.key, 'legal_terms_updated_at')
        )
      );
      const getValue = (key: string) => {
        const s = settings.find((s: any) => s.key === key);
        return s?.value || "";
      };
      res.json(successResponse({
        privacy: getValue('legal_privacy'),
        terms: getValue('legal_terms'),
        privacyUpdatedAt: getValue('legal_privacy_updated_at'),
        termsUpdatedAt: getValue('legal_terms_updated_at'),
      }));
    } catch (error: any) {
      console.error("Fetch legal pages error:", error);
      res.status(500).json(errorResponse(ErrorCode.INTERNAL_SERVER_ERROR, "Failed to fetch legal pages"));
    }
  });

  // POST /api/admin/legal — Save privacy or terms + notify all parents
  app.post("/api/admin/legal", adminMiddleware, async (req: any, res) => {
    try {
      const { type, content } = req.body;
      if (!type || !['privacy', 'terms'].includes(type)) {
        return res.status(400).json(errorResponse(ErrorCode.BAD_REQUEST, "type must be 'privacy' or 'terms'"));
      }
      if (!content || typeof content !== 'string' || content.trim().length < 10) {
        return res.status(400).json(errorResponse(ErrorCode.BAD_REQUEST, "Content must be at least 10 characters"));
      }

      const key = type === 'privacy' ? 'legal_privacy' : 'legal_terms';
      const timestampKey = `${key}_updated_at`;
      const now = new Date().toISOString();

      // Upsert content
      await db.insert(siteSettings)
        .values({ key, value: content.trim() })
        .onConflictDoUpdate({ target: siteSettings.key, set: { value: content.trim(), updatedAt: new Date() } });

      // Upsert timestamp
      await db.insert(siteSettings)
        .values({ key: timestampKey, value: now })
        .onConflictDoUpdate({ target: siteSettings.key, set: { value: now, updatedAt: new Date() } });

      // Notify all parents
      const allParentsList = await db.select({ id: parents.id }).from(parents);
      const label = type === 'privacy' ? 'سياسة الخصوصية' : 'شروط الاستخدام';
      const notifTitle = `📋 تحديث ${label}`;
      const notifMessage = `تم تحديث ${label}. يرجى مراجعتها من خلال الإعدادات أو الصفحة الرئيسية.`;

      // Insert notification for each parent
      for (const p of allParentsList) {
        await db.insert(parentNotifications).values({
          parentId: p.id,
          adminId: req.admin.adminId,
          title: notifTitle,
          message: notifMessage,
        });
      }

      res.json(successResponse({
        type,
        updatedAt: now,
        notifiedParents: allParentsList.length,
      }, `تم حفظ ${label} وإشعار ${allParentsList.length} ولي أمر`));
    } catch (error: any) {
      console.error("Save legal page error:", error);
      res.status(500).json(errorResponse(ErrorCode.INTERNAL_SERVER_ERROR, "Failed to save legal page"));
    }
  });

  // GET /api/legal/:type — Public endpoint (no auth) for privacy/terms
  app.get("/api/legal/:type", async (req, res) => {
    try {
      const { type } = req.params;
      if (!['privacy', 'terms'].includes(type)) {
        return res.status(400).json(errorResponse(ErrorCode.BAD_REQUEST, "type must be 'privacy' or 'terms'"));
      }
      const key = type === 'privacy' ? 'legal_privacy' : 'legal_terms';
      const timestampKey = `${key}_updated_at`;

      const settings = await db.select().from(siteSettings).where(
        or(eq(siteSettings.key, key), eq(siteSettings.key, timestampKey))
      );
      const content = settings.find((s: any) => s.key === key)?.value || "";
      const updatedAt = settings.find((s: any) => s.key === timestampKey)?.value || "";

      res.json(successResponse({ type, content, updatedAt }));
    } catch (error: any) {
      console.error("Fetch legal page error:", error);
      res.status(500).json(errorResponse(ErrorCode.INTERNAL_SERVER_ERROR, "Failed to fetch legal page"));
    }
  });

  // ===== Admin Own Notifications (incoming) =====

  app.get("/api/admin/own-notifications", adminMiddleware, async (req: any, res) => {
    try {
      const adminId = req.admin.adminId;
      const limit = Math.min(parseInt(req.query.limit as string) || 20, 50);
      const offset = parseInt(req.query.offset as string) || 0;

      const items = await db.select().from(notifications)
        .where(eq(notifications.adminId, adminId))
        .orderBy(desc(notifications.createdAt))
        .limit(limit).offset(offset);

      const [{ value: total }] = await db.select({ value: count() }).from(notifications)
        .where(eq(notifications.adminId, adminId));

      res.json({ success: true, data: { items, total: Number(total), limit, offset, hasMore: offset + limit < Number(total) } });
    } catch (error: any) {
      console.error("Admin own notifications error:", error);
      res.status(500).json(errorResponse(ErrorCode.INTERNAL_SERVER_ERROR, "Failed to fetch notifications"));
    }
  });

  app.get("/api/admin/own-notifications/unread-count", adminMiddleware, async (req: any, res) => {
    try {
      const adminId = req.admin.adminId;
      const [{ value: unread }] = await db.select({ value: count() }).from(notifications)
        .where(and(eq(notifications.adminId, adminId), eq(notifications.isRead, false)));
      res.json({ success: true, data: { count: Number(unread) } });
    } catch (error: any) {
      res.status(500).json(errorResponse(ErrorCode.INTERNAL_SERVER_ERROR, "Failed to fetch unread count"));
    }
  });

  app.post("/api/admin/own-notifications/read-all", adminMiddleware, async (req: any, res) => {
    try {
      const adminId = req.admin.adminId;
      await db.update(notifications)
        .set({ isRead: true, readAt: new Date() })
        .where(and(eq(notifications.adminId, adminId), eq(notifications.isRead, false)));
      res.json({ success: true, message: "تم تعليم الكل كمقروء" });
    } catch (error: any) {
      res.status(500).json(errorResponse(ErrorCode.INTERNAL_SERVER_ERROR, "Failed to mark all as read"));
    }
  });

  app.post("/api/admin/own-notifications/:id/read", adminMiddleware, async (req: any, res) => {
    try {
      const adminId = req.admin.adminId;
      const { id } = req.params;
      await db.update(notifications)
        .set({ isRead: true, readAt: new Date() })
        .where(and(eq(notifications.id, id), eq(notifications.adminId, adminId)));
      res.json({ success: true });
    } catch (error: any) {
      res.status(500).json(errorResponse(ErrorCode.INTERNAL_SERVER_ERROR, "Failed to mark as read"));
    }
  });

  // ===== Store Analytics Endpoint =====
  app.get("/api/admin/store/analytics", adminMiddleware, async (req: any, res) => {
    try {
      // Time range filter
      const days = parseInt(req.query.days as string) || 30;
      const sinceDate = new Date();
      sinceDate.setDate(sinceDate.getDate() - days);

      // 1. Overview stats
      const [totalProducts] = await db.select({ count: sql<number>`count(*)::int` }).from(products);
      const [activeProducts] = await db.select({ count: sql<number>`count(*)::int` }).from(products).where(eq(products.isActive, true));
      const [featuredProducts] = await db.select({ count: sql<number>`count(*)::int` }).from(products).where(eq(products.isFeatured, true));
      const [outOfStock] = await db.select({ count: sql<number>`count(*)::int` }).from(products).where(eq(products.stock, 0));

      // 2. Revenue from parent purchases
      const [parentRevenue] = await db.select({
        total: sql<number>`COALESCE(sum(${parentPurchases.totalAmount}::numeric), 0)`,
        count: sql<number>`count(*)::int`,
      }).from(parentPurchases).where(
        and(
          eq(parentPurchases.paymentStatus, "paid"),
          sql`${parentPurchases.createdAt} >= ${sinceDate}`
        )
      );

      // 3. Revenue from store orders (Stripe)
      const [storeRevenue] = await db.select({
        total: sql<number>`COALESCE(sum(${storeOrders.totalAmount}::numeric), 0)`,
        count: sql<number>`count(*)::int`,
      }).from(storeOrders).where(
        and(
          eq(storeOrders.status, "PAID"),
          sql`${storeOrders.createdAt} >= ${sinceDate}`
        )
      );

      // 4. Child purchases (points-based)
      const [childPurchaseStats] = await db.select({
        totalPoints: sql<number>`COALESCE(sum(${childPurchases.pointsSpent}), 0)::int`,
        count: sql<number>`count(*)::int`,
      }).from(childPurchases).where(sql`${childPurchases.purchasedAt} >= ${sinceDate}`);

      // 5. Top selling products (by parent purchase items)
      const topProducts = await db.select({
        productId: parentPurchaseItems.productId,
        name: products.name,
        nameAr: products.nameAr,
        image: products.image,
        totalQuantity: sql<number>`COALESCE(sum(${parentPurchaseItems.quantity}), 0)::int`,
        totalRevenue: sql<number>`COALESCE(sum(${parentPurchaseItems.subtotal}::numeric), 0)`,
      })
        .from(parentPurchaseItems)
        .innerJoin(products, eq(parentPurchaseItems.productId, products.id))
        .innerJoin(parentPurchases, eq(parentPurchaseItems.purchaseId, parentPurchases.id))
        .where(sql`${parentPurchaseItems.createdAt} >= ${sinceDate}`)
        .groupBy(parentPurchaseItems.productId, products.name, products.nameAr, products.image)
        .orderBy(sql`sum(${parentPurchaseItems.quantity}) DESC`)
        .limit(10);

      // 6. Category breakdown
      const categoryBreakdown = await db.select({
        categoryId: products.categoryId,
        categoryName: productCategories.name,
        categoryNameAr: productCategories.nameAr,
        productCount: sql<number>`count(DISTINCT ${products.id})::int`,
      })
        .from(products)
        .leftJoin(productCategories, eq(products.categoryId, productCategories.id))
        .where(eq(products.isActive, true))
        .groupBy(products.categoryId, productCategories.name, productCategories.nameAr);

      // 7. Recent orders (last 20)
      const recentOrders = await db.select({
        id: parentPurchases.id,
        parentId: parentPurchases.parentId,
        totalAmount: parentPurchases.totalAmount,
        paymentStatus: parentPurchases.paymentStatus,
        createdAt: parentPurchases.createdAt,
      })
        .from(parentPurchases)
        .orderBy(desc(parentPurchases.createdAt))
        .limit(20);

      // 8. Daily revenue trend (last N days)
      const dailyRevenue = await db.select({
        date: sql<string>`DATE(${parentPurchases.createdAt})`,
        revenue: sql<number>`COALESCE(sum(${parentPurchases.totalAmount}::numeric), 0)`,
        orders: sql<number>`count(*)::int`,
      })
        .from(parentPurchases)
        .where(
          and(
            eq(parentPurchases.paymentStatus, "paid"),
            sql`${parentPurchases.createdAt} >= ${sinceDate}`
          )
        )
        .groupBy(sql`DATE(${parentPurchases.createdAt})`)
        .orderBy(sql`DATE(${parentPurchases.createdAt})`);

      // 9. Gift assignments stats
      const [giftStats] = await db.select({
        totalAssigned: sql<number>`count(*)::int`,
        completed: sql<number>`count(*) FILTER (WHERE ${childAssignedProducts.status} = 'completed')::int`,
        active: sql<number>`count(*) FILTER (WHERE ${childAssignedProducts.status} = 'active')::int`,
      }).from(childAssignedProducts);

      // 10. Active buyers count
      const [activeBuyers] = await db.select({
        count: sql<number>`count(DISTINCT ${parentPurchases.parentId})::int`,
      }).from(parentPurchases).where(sql`${parentPurchases.createdAt} >= ${sinceDate}`);

      // 11. Average order value
      const [avgOrder] = await db.select({
        avg: sql<number>`COALESCE(avg(${parentPurchases.totalAmount}::numeric), 0)`,
      }).from(parentPurchases).where(
        and(
          eq(parentPurchases.paymentStatus, "paid"),
          sql`${parentPurchases.createdAt} >= ${sinceDate}`
        )
      );

      // 12. Low stock products
      const lowStockProducts = await db.select({
        id: products.id,
        name: products.name,
        nameAr: products.nameAr,
        stock: products.stock,
        image: products.image,
      })
        .from(products)
        .where(and(eq(products.isActive, true), sql`${products.stock} <= 5`))
        .orderBy(products.stock)
        .limit(10);

      res.json(successResponse({
        overview: {
          totalProducts: totalProducts?.count || 0,
          activeProducts: activeProducts?.count || 0,
          featuredProducts: featuredProducts?.count || 0,
          outOfStock: outOfStock?.count || 0,
        },
        revenue: {
          parentPurchases: {
            total: Number(parentRevenue?.total || 0),
            count: parentRevenue?.count || 0,
          },
          storeOrders: {
            total: Number(storeRevenue?.total || 0),
            count: storeRevenue?.count || 0,
          },
          totalRevenue: Number(parentRevenue?.total || 0) + Number(storeRevenue?.total || 0),
          totalOrders: (parentRevenue?.count || 0) + (storeRevenue?.count || 0),
          averageOrderValue: Number(Number(avgOrder?.avg || 0).toFixed(2)),
        },
        childPurchases: {
          totalPointsSpent: childPurchaseStats?.totalPoints || 0,
          count: childPurchaseStats?.count || 0,
        },
        topProducts,
        categoryBreakdown,
        recentOrders,
        dailyRevenue,
        gifts: {
          totalAssigned: giftStats?.totalAssigned || 0,
          completed: giftStats?.completed || 0,
          active: giftStats?.active || 0,
        },
        activeBuyers: activeBuyers?.count || 0,
        lowStockProducts,
        period: { days, since: sinceDate.toISOString() },
      }));
    } catch (error: any) {
      console.error("Store analytics error:", error);
      res.status(500).json(errorResponse(ErrorCode.INTERNAL_SERVER_ERROR, "فشل في جلب تحليلات المتجر"));
    }
  });
}
