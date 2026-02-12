import type { Express } from "express";
import { storage } from "../storage";
import { 
  products, 
  productCategories, 
  parentPurchases, 
  parentPurchaseItems,
  parentOwnedProducts,
  gifts,
  notifications,
  children,
  parentWallet,
  paymentMethods,
  libraryProducts,
  libraries
} from "../../shared/schema";
import { eq, and, or, desc, asc, sql, isNull } from "drizzle-orm";
import { authMiddleware, adminMiddleware, JWT_SECRET } from "./middleware";
import { createNotification, notifyChildProductAssigned } from "../notifications";
import jwt from "jsonwebtoken";

const db = storage.db;

interface StoreProduct {
  id: string;
  name: string;
  nameAr: string | null;
  description: string | null;
  descriptionAr: string | null;
  price: string;
  originalPrice: string | null;
  pointsPrice: number;
  image: string | null;
  images: string[] | null;
  stock: number;
  productType: string;
  brand: string | null;
  rating: string | null;
  reviewCount: number;
  isFeatured: boolean;
  categoryId: string | null;
  createdAt: Date;
  discountPercent?: number;
  isLibraryProduct?: boolean;
  libraryId?: string | null;
  libraryName?: string | null;
}

export async function registerStoreRoutes(app: Express) {
  // PUBLIC: Get active payment methods visible to ALL users (no auth required)
  // This allows visitors to see available payment methods before registering
  app.get("/api/public/payment-methods", async (_req, res) => {
    try {
      const methods = await db
        .select({
          id: paymentMethods.id,
          type: paymentMethods.type,
          accountName: paymentMethods.accountName,
          bankName: paymentMethods.bankName,
          accountNumber: paymentMethods.accountNumber,
          phoneNumber: paymentMethods.phoneNumber,
          isDefault: paymentMethods.isDefault,
        })
        .from(paymentMethods)
        .where(and(
          isNull(paymentMethods.parentId),
          eq(paymentMethods.isActive, true)
        ));
      
      res.json({ success: true, data: methods });
    } catch (error: any) {
      console.error("Get public payment methods error:", error);
      res.status(500).json({ success: false, error: "INTERNAL_SERVER_ERROR", message: "Failed to get payment methods" });
    }
  });

  // Get active payment methods for store checkout (admin-configured only, safe fields)
  app.get("/api/store/payment-methods", authMiddleware, async (req: any, res) => {
    try {
      const methods = await db
        .select({
          id: paymentMethods.id,
          type: paymentMethods.type,
          accountName: paymentMethods.accountName,
          bankName: paymentMethods.bankName,
          accountNumber: paymentMethods.accountNumber,
          phoneNumber: paymentMethods.phoneNumber,
        })
        .from(paymentMethods)
        .where(and(
          isNull(paymentMethods.parentId),
          eq(paymentMethods.isActive, true)
        ));
      
      res.json({ success: true, data: methods });
    } catch (error: any) {
      console.error("Get store payment methods error:", error);
      res.status(500).json({ success: false, error: "INTERNAL_SERVER_ERROR", message: "Failed to get payment methods" });
    }
  });

  app.get("/api/store/categories", authMiddleware, async (req: any, res) => {
    try {
      const categories = await db
        .select()
        .from(productCategories)
        .where(eq(productCategories.isActive, true))
        .orderBy(asc(productCategories.sortOrder));
      
      res.json({ success: true, data: categories });
    } catch (error: any) {
      console.error("Get categories error:", error);
      res.status(500).json({ message: "Failed to get categories" });
    }
  });

  app.get("/api/store/products", authMiddleware, async (req: any, res) => {
    try {
      const { categoryId, search, sort = "featured" } = req.query;
      const parentId = req.user?.parentId || req.user?.userId;
      
      // Fetch regular products
      const regularProducts = await db
        .select({
          id: products.id,
          name: products.name,
          nameAr: products.nameAr,
          description: products.description,
          descriptionAr: products.descriptionAr,
          price: products.price,
          originalPrice: products.originalPrice,
          pointsPrice: products.pointsPrice,
          image: products.image,
          images: products.images,
          stock: products.stock,
          productType: products.productType,
          brand: products.brand,
          rating: products.rating,
          reviewCount: products.reviewCount,
          isFeatured: products.isFeatured,
          categoryId: products.categoryId,
          createdAt: products.createdAt,
        })
        .from(products)
        .where(eq(products.isActive, true));
      
      // Map regular products to StoreProduct format with discount info
      const mappedRegularProducts: StoreProduct[] = regularProducts.map((p: typeof regularProducts[number]) => ({
        ...p,
        discountPercent: p.originalPrice && parseFloat(p.originalPrice) > parseFloat(p.price) 
          ? Math.round((1 - parseFloat(p.price) / parseFloat(p.originalPrice)) * 100)
          : 0,
        isLibraryProduct: false,
        libraryId: null,
        libraryName: null,
      }));
      
      // Fetch library products with library info
      const libProducts = await db
        .select({
          id: libraryProducts.id,
          title: libraryProducts.title,
          description: libraryProducts.description,
          imageUrl: libraryProducts.imageUrl,
          price: libraryProducts.price,
          discountPercent: libraryProducts.discountPercent,
          stock: libraryProducts.stock,
          libraryId: libraryProducts.libraryId,
          createdAt: libraryProducts.createdAt,
          libraryName: libraries.name,
        })
        .from(libraryProducts)
        .leftJoin(libraries, eq(libraryProducts.libraryId, libraries.id))
        .where(and(
          eq(libraryProducts.isActive, true),
          eq(libraries.isActive, true)
        ));
      
      // Map library products to StoreProduct format
      const mappedLibProducts: StoreProduct[] = libProducts.map((lp: typeof libProducts[number]) => {
        const originalPrice = lp.price;
        const discountedPrice = lp.discountPercent > 0 
          ? (parseFloat(lp.price) * (1 - lp.discountPercent / 100)).toFixed(2)
          : lp.price;
        const pointsPrice = Math.round(parseFloat(discountedPrice) * 10); // 10 points per currency unit
        
        return {
          id: lp.id,
          name: lp.title,
          nameAr: lp.title,
          description: lp.description,
          descriptionAr: lp.description,
          price: discountedPrice,
          originalPrice: lp.discountPercent > 0 ? originalPrice : null,
          pointsPrice,
          image: lp.imageUrl,
          images: lp.imageUrl ? [lp.imageUrl] : null,
          stock: lp.stock,
          productType: "library",
          brand: lp.libraryName,
          rating: null,
          reviewCount: 0,
          isFeatured: false,
          categoryId: null,
          createdAt: lp.createdAt,
          discountPercent: lp.discountPercent,
          isLibraryProduct: true,
          libraryId: lp.libraryId,
          libraryName: lp.libraryName,
        };
      });
      
      // Combine all products
      let allProducts: StoreProduct[] = [...mappedRegularProducts, ...mappedLibProducts];
      
      // Filter by stock
      let filteredProducts = allProducts.filter(p => p.stock > 0);
      
      if (categoryId) {
        filteredProducts = filteredProducts.filter((p: StoreProduct) => p.categoryId === categoryId);
      }
      
      if (search) {
        const searchLower = (search as string).toLowerCase();
        filteredProducts = filteredProducts.filter((p: StoreProduct) => 
          p.name.toLowerCase().includes(searchLower) ||
          (p.nameAr && p.nameAr.toLowerCase().includes(searchLower)) ||
          (p.description && p.description.toLowerCase().includes(searchLower)) ||
          (p.brand && p.brand.toLowerCase().includes(searchLower)) ||
          (p.libraryName && p.libraryName.toLowerCase().includes(searchLower))
        );
      }
      
      switch (sort) {
        case "price_asc":
          filteredProducts.sort((a: StoreProduct, b: StoreProduct) => parseFloat(a.price) - parseFloat(b.price));
          break;
        case "price_desc":
          filteredProducts.sort((a: StoreProduct, b: StoreProduct) => parseFloat(b.price) - parseFloat(a.price));
          break;
        case "newest":
          filteredProducts.sort((a: StoreProduct, b: StoreProduct) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
          break;
        case "rating":
          filteredProducts.sort((a: StoreProduct, b: StoreProduct) => parseFloat(b.rating || "0") - parseFloat(a.rating || "0"));
          break;
        case "featured":
        default:
          // Featured first, then discounted products, then rest
          filteredProducts.sort((a: StoreProduct, b: StoreProduct) => {
            if (a.isFeatured !== b.isFeatured) return b.isFeatured ? 1 : -1;
            if ((a.discountPercent || 0) !== (b.discountPercent || 0)) return (b.discountPercent || 0) - (a.discountPercent || 0);
            return 0;
          });
          break;
      }
      
      res.json({ success: true, data: filteredProducts });
    } catch (error: any) {
      console.error("Get products error:", error);
      res.status(500).json({ message: "Failed to get products" });
    }
  });

  app.post("/api/store/checkout", authMiddleware, async (req: any, res) => {
    try {
      const { items, paymentMethodId, shippingAddress, totalAmount } = req.body;
      const parentId = req.user?.parentId || req.user?.userId;

      if (!items || items.length === 0) {
        return res.status(400).json({ message: "No items in cart" });
      }

      if (paymentMethodId === "wallet") {
        const wallet = await db.select().from(parentWallet).where(eq(parentWallet.parentId, parentId));
        if (!wallet[0] || parseFloat(wallet[0].balance) < totalAmount) {
          return res.status(400).json({ message: "Insufficient wallet balance" });
        }
        
        await db.update(parentWallet)
          .set({ 
            balance: sql`${parentWallet.balance} - ${totalAmount}`,
            totalSpent: sql`${parentWallet.totalSpent} + ${totalAmount}`,
            updatedAt: new Date()
          })
          .where(eq(parentWallet.parentId, parentId));
      }

      const [purchase] = await db.insert(parentPurchases).values({
        parentId,
        totalAmount: totalAmount.toString(),
        currency: "EGP",
        paymentStatus: paymentMethodId === "wallet" ? "paid" : "pending",
        invoiceNumber: `INV-${Date.now()}`,
      }).returning();

      for (const item of items) {
        const product = await db.select().from(products).where(eq(products.id, item.productId));
        if (!product[0]) continue;

        await db.insert(parentPurchaseItems).values({
          purchaseId: purchase.id,
          productId: item.productId,
          quantity: item.quantity || 1,
          unitPrice: product[0].price,
          subtotal: (parseFloat(product[0].price) * (item.quantity || 1)).toString(),
        });

        await db.insert(parentOwnedProducts).values({
          parentId,
          productId: item.productId,
          sourcePurchaseId: purchase.id,
          status: paymentMethodId === "wallet" ? "active" : "pending_admin_approval",
        });

        await db.update(products)
          .set({ stock: sql`${products.stock} - ${item.quantity || 1}` })
          .where(eq(products.id, item.productId));
      }

      res.json({ 
        success: true, 
        message: "Purchase completed successfully",
        purchaseId: purchase.id 
      });
    } catch (error: any) {
      console.error("Checkout error:", error);
      res.status(500).json({ message: "Checkout failed" });
    }
  });

  app.post("/api/parent/assign-product", authMiddleware, async (req: any, res) => {
    try {
      const { productId, childId, requiredPoints } = req.body;
      const parentId = req.user?.parentId || req.user?.userId;

      if (!productId || !childId || !requiredPoints) {
        return res.status(400).json({ message: "Missing required fields" });
      }

      const product = await db.select().from(products).where(eq(products.id, productId));
      if (!product[0]) {
        return res.status(404).json({ message: "Product not found" });
      }

      const child = await db.select().from(children).where(eq(children.id, childId));
      if (!child[0]) {
        return res.status(404).json({ message: "Child not found" });
      }

      const [gift] = await db.insert(gifts).values({
        parentId,
        childId,
        productId,
        pointsThreshold: requiredPoints,
        status: "SENT",
        message: `هدية جديدة: ${product[0].nameAr || product[0].name}! اجمع ${requiredPoints} نقطة للحصول عليها!`,
      }).returning();

      await notifyChildProductAssigned(childId, productId, requiredPoints);

      res.json({ 
        success: true, 
        message: "Product assigned successfully",
        giftId: gift.id 
      });
    } catch (error: any) {
      console.error("Assign product error:", error);
      res.status(500).json({ message: "Assignment failed" });
    }
  });

  app.get("/api/parent/owned-products", authMiddleware, async (req: any, res) => {
    try {
      const parentId = req.user?.parentId || req.user?.userId;
      
      const owned = await db
        .select({
          id: parentOwnedProducts.id,
          status: parentOwnedProducts.status,
          createdAt: parentOwnedProducts.createdAt,
          product: {
            id: products.id,
            name: products.name,
            nameAr: products.nameAr,
            price: products.price,
            image: products.image,
            pointsPrice: products.pointsPrice,
          }
        })
        .from(parentOwnedProducts)
        .innerJoin(products, eq(parentOwnedProducts.productId, products.id))
        .where(eq(parentOwnedProducts.parentId, parentId));

      res.json({ success: true, data: owned });
    } catch (error: any) {
      console.error("Get owned products error:", error);
      res.status(500).json({ message: "Failed to get owned products" });
    }
  });

  // LOGIC-001 FIX: Changed from /api/child/gifts to avoid conflict with child.ts:1022
  // This route fetches parent-sent product gifts (from gifts table)
  // While child.ts:/api/child/gifts fetches point-rewards history (from childGifts table)
  app.get("/api/child/store-gifts", async (req: any, res) => {
    try {
      const token = req.headers.authorization?.split(" ")[1];
      if (!token) {
        return res.status(401).json({ message: "Unauthorized" });
      }

      const decoded = jwt.verify(token, JWT_SECRET) as any;
      const childId = decoded.childId;

      const childGifts = await db
        .select({
          id: gifts.id,
          pointsThreshold: gifts.pointsThreshold,
          status: gifts.status,
          message: gifts.message,
          createdAt: gifts.createdAt,
          product: {
            id: products.id,
            name: products.name,
            nameAr: products.nameAr,
            image: products.image,
            description: products.description,
          }
        })
        .from(gifts)
        .innerJoin(products, eq(gifts.productId, products.id))
        .where(eq(gifts.childId, childId))
        .orderBy(desc(gifts.createdAt));

      const child = await db.select().from(children).where(eq(children.id, childId));
      const currentPoints = child[0]?.totalPoints || 0;

      const enrichedGifts = childGifts.map((gift: any) => ({
        ...gift,
        currentPoints,
        progress: Math.min(100, Math.round((currentPoints / gift.pointsThreshold) * 100)),
        isUnlocked: currentPoints >= gift.pointsThreshold,
      }));

      res.json({ success: true, data: enrichedGifts });
    } catch (error: any) {
      console.error("Get child gifts error:", error);
      res.status(500).json({ message: "Failed to get gifts" });
    }
  });

  app.get("/api/admin/categories", adminMiddleware, async (req: any, res) => {
    try {
      const categories = await db.select().from(productCategories).orderBy(asc(productCategories.sortOrder));
      res.json({ success: true, data: categories });
    } catch (error: any) {
      console.error("Get admin categories error:", error);
      res.status(500).json({ message: "Failed to get categories" });
    }
  });

  app.post("/api/admin/categories", adminMiddleware, async (req: any, res) => {
    try {
      const { name, nameAr, icon, color, sortOrder } = req.body;
      const [category] = await db.insert(productCategories).values({
        name,
        nameAr,
        icon: icon || "Package",
        color: color || "#667eea",
        sortOrder: sortOrder || 0,
      }).returning();
      res.json({ success: true, data: category });
    } catch (error: any) {
      console.error("Create category error:", error);
      res.status(500).json({ message: "Failed to create category" });
    }
  });

  app.put("/api/admin/categories/:id", adminMiddleware, async (req: any, res) => {
    try {
      const { id } = req.params;
      const { name, nameAr, icon, color, sortOrder, isActive } = req.body;
      const [category] = await db.update(productCategories)
        .set({ name, nameAr, icon, color, sortOrder, isActive })
        .where(eq(productCategories.id, id))
        .returning();
      res.json({ success: true, data: category });
    } catch (error: any) {
      console.error("Update category error:", error);
      res.status(500).json({ message: "Failed to update category" });
    }
  });

  app.delete("/api/admin/categories/:id", adminMiddleware, async (req: any, res) => {
    try {
      const { id } = req.params;
      await db.delete(productCategories).where(eq(productCategories.id, id));
      res.json({ success: true, message: "Category deleted" });
    } catch (error: any) {
      console.error("Delete category error:", error);
      res.status(500).json({ message: "Failed to delete category" });
    }
  });
}
