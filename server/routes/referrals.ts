import type { Express } from "express";
import { storage } from "../storage";
import { 
  parents,
  referrals,
  parentReferralCodes,
  parentWallet
} from "../../shared/schema";
import { eq, sql } from "drizzle-orm";
import { authMiddleware } from "./middleware";
import { createNotification } from "../notifications";

const db = storage.db;

function generateReferralCode(length: number = 8): string {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  let result = "";
  for (let i = 0; i < length; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return result;
}

const REFERRAL_REWARD_POINTS = 100;

export async function registerReferralRoutes(app: Express) {
  app.get("/api/parent/referral-code", authMiddleware, async (req: any, res) => {
    try {
      const parentId = req.user?.parentId || req.user?.userId;
      
      const existing = await db.select().from(parentReferralCodes).where(eq(parentReferralCodes.parentId, parentId));
      
      if (existing[0]) {
        return res.json({ 
          success: true, 
          data: existing[0],
          shareLink: `${process.env.REPLIT_DEV_DOMAIN || 'https://classify.app'}/register?ref=${existing[0].code}`
        });
      }

      let code = generateReferralCode();
      let attempts = 0;
      while (attempts < 10) {
        const checkCode = await db.select().from(parentReferralCodes).where(eq(parentReferralCodes.code, code));
        if (!checkCode[0]) break;
        code = generateReferralCode();
        attempts++;
      }

      const [newCode] = await db.insert(parentReferralCodes).values({
        parentId,
        code,
      }).returning();

      res.json({ 
        success: true, 
        data: newCode,
        shareLink: `${process.env.REPLIT_DEV_DOMAIN || 'https://classify.app'}/register?ref=${newCode.code}`
      });
    } catch (error: any) {
      console.error("Get referral code error:", error);
      res.status(500).json({ message: "Failed to get referral code" });
    }
  });

  app.get("/api/parent/referrals", authMiddleware, async (req: any, res) => {
    try {
      const parentId = req.user?.parentId || req.user?.userId;
      
      const myReferrals = await db
        .select({
          id: referrals.id,
          referredId: referrals.referredId,
          status: referrals.status,
          pointsAwarded: referrals.pointsAwarded,
          referredAt: referrals.referredAt,
          activatedAt: referrals.activatedAt,
          referredName: parents.name,
        })
        .from(referrals)
        .leftJoin(parents, eq(referrals.referredId, parents.id))
        .where(eq(referrals.referrerId, parentId));

      const codeInfo = await db.select().from(parentReferralCodes).where(eq(parentReferralCodes.parentId, parentId));

      res.json({ 
        success: true, 
        data: {
          referrals: myReferrals,
          stats: codeInfo[0] || { totalReferrals: 0, activeReferrals: 0, totalPointsEarned: 0 },
        }
      });
    } catch (error: any) {
      console.error("Get referrals error:", error);
      res.status(500).json({ message: "Failed to get referrals" });
    }
  });

  app.post("/api/referrals/apply", async (req: any, res) => {
    try {
      const { referralCode, newParentId } = req.body;
      
      if (!referralCode || !newParentId) {
        return res.status(400).json({ message: "Referral code and parent ID are required" });
      }

      const codeRecord = await db.select().from(parentReferralCodes).where(eq(parentReferralCodes.code, referralCode.toUpperCase()));
      if (!codeRecord[0]) {
        return res.status(404).json({ message: "Invalid referral code" });
      }

      const referrerId = codeRecord[0].parentId;

      if (referrerId === newParentId) {
        return res.status(400).json({ message: "Cannot use your own referral code" });
      }

      const existingReferral = await db.select().from(referrals).where(eq(referrals.referredId, newParentId));
      if (existingReferral[0]) {
        return res.status(400).json({ message: "Referral already applied" });
      }

      const [referral] = await db.insert(referrals).values({
        referrerId,
        referredId: newParentId,
        referralCode: referralCode.toUpperCase(),
        status: "pending",
      }).returning();

      await db.update(parentReferralCodes)
        .set({ totalReferrals: sql`${parentReferralCodes.totalReferrals} + 1` })
        .where(eq(parentReferralCodes.parentId, referrerId));

      await createNotification({
        parentId: referrerId,
        type: "new_referral",
        title: "إحالة جديدة!",
        message: "لديك إحالة جديدة في انتظار التفعيل!",
        relatedId: referral.id,
      });

      res.json({ success: true, message: "Referral code applied successfully" });
    } catch (error: any) {
      console.error("Apply referral error:", error);
      res.status(500).json({ message: "Failed to apply referral" });
    }
  });

  app.post("/api/referrals/activate", authMiddleware, async (req: any, res) => {
    try {
      const parentId = req.user?.parentId || req.user?.userId;
      
      const pendingReferral = await db.select().from(referrals)
        .where(eq(referrals.referredId, parentId));
      
      if (!pendingReferral[0] || pendingReferral[0].status !== "pending") {
        return res.status(404).json({ message: "No pending referral found" });
      }

      const referral = pendingReferral[0];

      await db.update(referrals)
        .set({ 
          status: "active",
          activatedAt: new Date()
        })
        .where(eq(referrals.id, referral.id));

      await db.update(parentReferralCodes)
        .set({ activeReferrals: sql`${parentReferralCodes.activeReferrals} + 1` })
        .where(eq(parentReferralCodes.parentId, referral.referrerId));

      const wallet = await db.select().from(parentWallet).where(eq(parentWallet.parentId, referral.referrerId));
      if (wallet[0]) {
        await db.update(parentWallet)
          .set({ 
            balance: sql`${parentWallet.balance} + ${REFERRAL_REWARD_POINTS}`,
            updatedAt: new Date()
          })
          .where(eq(parentWallet.parentId, referral.referrerId));
      } else {
        await db.insert(parentWallet).values({
          parentId: referral.referrerId,
          balance: REFERRAL_REWARD_POINTS.toString(),
        });
      }

      await db.update(referrals)
        .set({ 
          status: "rewarded",
          pointsAwarded: REFERRAL_REWARD_POINTS,
          rewardedAt: new Date()
        })
        .where(eq(referrals.id, referral.id));

      await db.update(parentReferralCodes)
        .set({ totalPointsEarned: sql`${parentReferralCodes.totalPointsEarned} + ${REFERRAL_REWARD_POINTS}` })
        .where(eq(parentReferralCodes.parentId, referral.referrerId));

      await createNotification({
        parentId: referral.referrerId,
        type: "referral_reward",
        title: "مكافأة الإحالة!",
        message: `تهانينا! حصلت على ${REFERRAL_REWARD_POINTS} نقطة كمكافأة للإحالة الناجحة!`,
        relatedId: referral.id,
      });

      res.json({ 
        success: true, 
        message: `Referral activated! Referrer received ${REFERRAL_REWARD_POINTS} points.`
      });
    } catch (error: any) {
      console.error("Activate referral error:", error);
      res.status(500).json({ message: "Failed to activate referral" });
    }
  });
}
