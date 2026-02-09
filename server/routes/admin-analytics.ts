import type { Express } from "express";
import { storage } from "../storage";
import { successResponse, errorResponse, ErrorCode } from "../utils/apiResponse";
import {
  parents,
  children,
  orders,
  deposits,
  parentWallet,
  products,
} from "../../shared/schema";
import { eq, sum, sql, and, gte } from "drizzle-orm";
import { adminMiddleware } from "./middleware";

const db = storage.db;

export async function registerAnalyticsRoutes(app: Express) {
  // Analytics overview
  app.get("/api/admin/analytics/overview", adminMiddleware, async (req: any, res) => {
    try {
      // Total parents
      const parentCount = await db
        .select({ count: sql<number>`COUNT(*)` })
        .from(parents);

      // Total children
      const childCount = await db
        .select({ count: sql<number>`COUNT(*)` })
        .from(children);

      // Total products
      const productCount = await db
        .select({ count: sql<number>`COUNT(*)` })
        .from(products);

      // Total orders
      const orderCount = await db
        .select({ count: sql<number>`COUNT(*)` })
        .from(orders);

      // Total deposits
      const depositCount = await db
        .select({ count: sql<number>`COUNT(*)` })
        .from(deposits);

      // Total wallet balance
      const totalBalance = await db
        .select({ total: sum(parentWallet.balance) })
        .from(parentWallet);

      // Total deposits amount
      const totalDepositsAmount = await db
        .select({ total: sum(deposits.amount) })
        .from(deposits)
        .where(eq(deposits.status, "completed"));

      // Completed orders count
      const completedOrdersCount = await db
        .select({ count: sql<number>`COUNT(*)` })
        .from(orders)
        .where(eq(orders.status, "completed"));

      res.json({
        success: true,
        data: {
          totalParents: parentCount[0]?.count || 0,
          totalChildren: childCount[0]?.count || 0,
          totalProducts: productCount[0]?.count || 0,
          totalOrders: orderCount[0]?.count || 0,
          totalDeposits: depositCount[0]?.count || 0,
          totalWalletBalance: parseFloat(totalBalance[0]?.total || "0"),
          totalDepositsAmount: parseFloat(totalDepositsAmount[0]?.total || "0"),
          completedOrders: completedOrdersCount[0]?.count || 0,
        },
      });
    } catch (error: any) {
      console.error("Analytics overview error:", error);
      res.status(500).json({ success: false, message: "Failed to fetch analytics" });
    }
  });

  // Weekly registrations
  app.get("/api/admin/analytics/weekly-registrations", adminMiddleware, async (req: any, res) => {
    try {
      const days = 7;
      const data = [];

      // Get data for last 7 days
      for (let i = days - 1; i >= 0; i--) {
        const date = new Date();
        date.setDate(date.getDate() - i);
        const startOfDay = new Date(date.getFullYear(), date.getMonth(), date.getDate(), 0, 0, 0);
        const endOfDay = new Date(date.getFullYear(), date.getMonth(), date.getDate(), 23, 59, 59);

        const parentRegistrations = await db
          .select({ count: sql<number>`COUNT(*)` })
          .from(parents)
          .where(
            and(
              gte(parents.createdAt, startOfDay),
              sql`${parents.createdAt} <= ${endOfDay}`
            )
          );

        const childRegistrations = await db
          .select({ count: sql<number>`COUNT(*)` })
          .from(children)
          .where(
            and(
              gte(children.createdAt, startOfDay),
              sql`${children.createdAt} <= ${endOfDay}`
            )
          );

        data.push({
          date: date.toISOString().split("T")[0],
          parents: parentRegistrations[0]?.count || 0,
          children: childRegistrations[0]?.count || 0,
        });
      }

      res.json({
        success: true,
        data,
        period: "Last 7 days",
      });
    } catch (error: any) {
      console.error("Weekly registrations error:", error);
      res.status(500).json({ success: false, message: "Failed to fetch registrations" });
    }
  });

  // Weekly orders
  app.get("/api/admin/analytics/weekly-orders", adminMiddleware, async (req: any, res) => {
    try {
      const days = 7;
      const data = [];

      // Get data for last 7 days
      for (let i = days - 1; i >= 0; i--) {
        const date = new Date();
        date.setDate(date.getDate() - i);
        const startOfDay = new Date(date.getFullYear(), date.getMonth(), date.getDate(), 0, 0, 0);
        const endOfDay = new Date(date.getFullYear(), date.getMonth(), date.getDate(), 23, 59, 59);

        const orderCount = await db
          .select({ count: sql<number>`COUNT(*)` })
          .from(orders)
          .where(
            and(
              gte(orders.createdAt, startOfDay),
              sql`${orders.createdAt} <= ${endOfDay}`
            )
          );

        const completedCount = await db
          .select({ count: sql<number>`COUNT(*)` })
          .from(orders)
          .where(
            and(
              gte(orders.createdAt, startOfDay),
              sql`${orders.createdAt} <= ${endOfDay}`,
              eq(orders.status, "completed")
            )
          );

        data.push({
          date: date.toISOString().split("T")[0],
          total: orderCount[0]?.count || 0,
          completed: completedCount[0]?.count || 0,
        });
      }

      res.json({
        success: true,
        data,
        period: "Last 7 days",
      });
    } catch (error: any) {
      console.error("Weekly orders error:", error);
      res.status(500).json({ success: false, message: "Failed to fetch orders" });
    }
  });

  // Weekly wallet movement
  app.get("/api/admin/analytics/weekly-wallet-movement", adminMiddleware, async (req: any, res) => {
    try {
      const days = 7;
      const data = [];

      // Get data for last 7 days
      for (let i = days - 1; i >= 0; i--) {
        const date = new Date();
        date.setDate(date.getDate() - i);
        const startOfDay = new Date(date.getFullYear(), date.getMonth(), date.getDate(), 0, 0, 0);
        const endOfDay = new Date(date.getFullYear(), date.getMonth(), date.getDate(), 23, 59, 59);

        // Deposits (inflow)
        const depositAmount = await db
          .select({ total: sum(deposits.amount) })
          .from(deposits)
          .where(
            and(
              gte(deposits.createdAt, startOfDay),
              sql`${deposits.createdAt} <= ${endOfDay}`,
              eq(deposits.status, "completed")
            )
          );

        // Orders (outflow)
        const orderAmount = await db
          .select({ total: sql<string>`COUNT(*)` })
          .from(orders)
          .where(
            and(
              gte(orders.createdAt, startOfDay),
              sql`${orders.createdAt} <= ${endOfDay}`,
              eq(orders.status, "completed")
            )
          );

        data.push({
          date: date.toISOString().split("T")[0],
          deposits: parseFloat(depositAmount[0]?.total || "0"),
          orders: parseInt(orderAmount[0]?.total as any || "0"),
        });
      }

      res.json({
        success: true,
        data,
        period: "Last 7 days",
      });
    } catch (error: any) {
      console.error("Weekly wallet movement error:", error);
      res.status(500).json({ success: false, message: "Failed to fetch wallet movement" });
    }
  });

  // Wallet analytics - detailed
  app.get("/api/admin/analytics/wallet", adminMiddleware, async (req: any, res) => {
    try {
      // Total deposits amount
      const totalDepositsAmount = await db
        .select({ total: sum(deposits.amount) })
        .from(deposits)
        .where(eq(deposits.status, "completed"));

      // Total wallet balance
      const totalBalance = await db
        .select({ total: sum(parentWallet.balance) })
        .from(parentWallet);

      // Top 5 parents by balance
      const topParents = await db
        .select({
          parentId: parentWallet.parentId,
          parentEmail: parents.email,
          parentName: parents.name,
          balance: parentWallet.balance,
          totalDeposited: parentWallet.totalDeposited,
          totalSpent: parentWallet.totalSpent,
        })
        .from(parentWallet)
        .leftJoin(parents, eq(parentWallet.parentId, parents.id))
        .orderBy(sql`${parentWallet.balance} DESC`)
        .limit(5);

      // Average balance per parent
      const avgBalance = await db
        .select({ avg: sql<string>`AVG(${parentWallet.balance})` })
        .from(parentWallet);

      res.json({
        success: true,
        data: {
          totalDeposits: parseFloat(totalDepositsAmount[0]?.total || "0"),
          totalBalance: parseFloat(totalBalance[0]?.total || "0"),
          averageBalance: parseFloat(avgBalance[0]?.avg || "0"),
          topParentsByBalance: topParents,
        },
      });
    } catch (error: any) {
      console.error("Wallet analytics error:", error);
      res.status(500).json({ success: false, message: "Failed to fetch wallet analytics" });
    }
  });
}
