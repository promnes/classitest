import type { Express } from "express";
import { storage } from "../storage";
import { 
  parents,
  referrals,
  parentReferralCodes,
  parentWallet,
  ads,
  adShares,
  referralSettings,
} from "../../shared/schema";
import { eq, sql, and, or, isNull } from "drizzle-orm";
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

      // Get dynamic points from settings
      const settingsRows = await db.select().from(referralSettings);
      const rewardPoints = settingsRows[0]?.pointsPerReferral ?? REFERRAL_REWARD_POINTS;

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
            balance: sql`${parentWallet.balance} + ${rewardPoints}`,
            updatedAt: new Date()
          })
          .where(eq(parentWallet.parentId, referral.referrerId));
      } else {
        await db.insert(parentWallet).values({
          parentId: referral.referrerId,
          balance: rewardPoints.toString(),
        });
      }

      await db.update(referrals)
        .set({ 
          status: "rewarded",
          pointsAwarded: rewardPoints,
          rewardedAt: new Date()
        })
        .where(eq(referrals.id, referral.id));

      await db.update(parentReferralCodes)
        .set({ totalPointsEarned: sql`${parentReferralCodes.totalPointsEarned} + ${rewardPoints}` })
        .where(eq(parentReferralCodes.parentId, referral.referrerId));

      await createNotification({
        parentId: referral.referrerId,
        type: "referral_reward",
        title: "مكافأة الإحالة!",
        message: `تهانينا! حصلت على ${rewardPoints} نقطة كمكافأة للإحالة الناجحة!`,
        relatedId: referral.id,
      });

      res.json({ 
        success: true, 
        message: `Referral activated! Referrer received ${rewardPoints} points.`
      });
    } catch (error: any) {
      console.error("Activate referral error:", error);
      res.status(500).json({ message: "Failed to activate referral" });
    }
  });

  // ===== Parent Ads (for referral section) =====

  // Get active ads for parent to view and share
  app.get("/api/parent/ads", authMiddleware, async (req: any, res) => {
    try {
      const now = new Date();
      const activeAds = await db.select().from(ads)
        .where(and(
          eq(ads.isActive, true),
          or(isNull(ads.startDate), sql`${ads.startDate} <= ${now}`),
          or(isNull(ads.endDate), sql`${ads.endDate} >= ${now}`),
          or(eq(ads.targetAudience, "all"), eq(ads.targetAudience, "parents"))
        ));

      // Get share counts for this parent
      const parentId = req.user?.parentId || req.user?.userId;
      const shares = await db.select({
        adId: adShares.adId,
        shareCount: sql<number>`count(*)`,
        totalPoints: sql<number>`COALESCE(sum(${adShares.pointsAwarded}), 0)`,
      })
      .from(adShares)
      .where(eq(adShares.parentId, parentId))
      .groupBy(adShares.adId);

      const shareMap: Record<string, { shareCount: number; totalPoints: number }> = {};
      for (const s of shares) {
        shareMap[s.adId] = { shareCount: Number(s.shareCount), totalPoints: Number(s.totalPoints) };
      }

      const adsWithShares = activeAds.map((ad: any) => ({
        ...ad,
        myShares: shareMap[ad.id]?.shareCount || 0,
        mySharePoints: shareMap[ad.id]?.totalPoints || 0,
      }));

      res.json({ success: true, data: adsWithShares });
    } catch (error: any) {
      console.error("Get parent ads error:", error);
      res.status(500).json({ message: "Failed to get ads" });
    }
  });

  // Track parent ad share + award points
  app.post("/api/parent/ads/:id/share", authMiddleware, async (req: any, res) => {
    try {
      const parentId = req.user?.parentId || req.user?.userId;
      const { id } = req.params;
      const { platform } = req.body;

      if (!platform) {
        return res.status(400).json({ message: "Platform is required" });
      }

      // Get settings for points
      const settingsRows = await db.select().from(referralSettings);
      const pointsPerShare = settingsRows[0]?.pointsPerAdShare ?? 10;

      // Record share
      await db.insert(adShares).values({
        adId: id,
        parentId,
        platform,
        pointsAwarded: pointsPerShare,
      });

      // Award points
      const wallet = await db.select().from(parentWallet).where(eq(parentWallet.parentId, parentId));
      if (wallet[0]) {
        await db.update(parentWallet)
          .set({ balance: sql`${parentWallet.balance} + ${pointsPerShare}`, updatedAt: new Date() })
          .where(eq(parentWallet.parentId, parentId));
      } else {
        await db.insert(parentWallet).values({ parentId, balance: pointsPerShare.toString() });
      }

      res.json({ success: true, data: { pointsAwarded: pointsPerShare } });
    } catch (error: any) {
      console.error("Share ad error:", error);
      res.status(500).json({ message: "Failed to track share" });
    }
  });

  // Get parent's referral stats including ads sharing summary
  app.get("/api/parent/referral-stats", authMiddleware, async (req: any, res) => {
    try {
      const parentId = req.user?.parentId || req.user?.userId;

      // Referral code info
      const codeInfo = await db.select().from(parentReferralCodes).where(eq(parentReferralCodes.parentId, parentId));

      // Get referral settings
      const settingsRows = await db.select().from(referralSettings);
      const settingsData = settingsRows[0] || { pointsPerReferral: 100, pointsPerAdShare: 10 };

      // Get total ad share points
      const shareStats = await db.select({
        totalShares: sql<number>`count(*)`,
        totalSharePoints: sql<number>`COALESCE(sum(${adShares.pointsAwarded}), 0)`,
      })
      .from(adShares)
      .where(eq(adShares.parentId, parentId));

      // Build share link
      const code = codeInfo[0]?.code;
      const baseUrl = process.env.APP_URL || process.env.REPLIT_DEV_DOMAIN || 'https://classi-fy.com';
      const shareLink = code ? `${baseUrl}/register?ref=${code}` : null;

      res.json({
        success: true,
        data: {
          referralCode: code || null,
          shareLink,
          totalReferrals: codeInfo[0]?.totalReferrals || 0,
          activeReferrals: codeInfo[0]?.activeReferrals || 0,
          pointsEarned: codeInfo[0]?.totalPointsEarned || 0,
          totalAdShares: Number(shareStats[0]?.totalShares || 0),
          totalAdSharePoints: Number(shareStats[0]?.totalSharePoints || 0),
          settings: {
            pointsPerReferral: settingsData.pointsPerReferral,
            pointsPerAdShare: settingsData.pointsPerAdShare,
          },
        },
      });
    } catch (error: any) {
      console.error("Get referral stats error:", error);
      res.status(500).json({ message: "Failed to get referral stats" });
    }
  });
}
