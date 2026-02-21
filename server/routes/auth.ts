import type { Express } from "express";
import { storage } from "../storage";
import { parents, children, parentChild, otpCodes, otpRequestLogs, sessions, loginHistory, trustedDevices, socialLoginProviders, otpProviders, libraries, libraryReferrals, parentReferralCodes, referrals, parentWallet, referralSettings } from "../../shared/schema";
import { eq, and, gt, isNull, desc, or, sql } from "drizzle-orm";
import jwt from "jsonwebtoken";
import bcrypt from "bcrypt";
import { JWT_SECRET, authMiddleware } from "./middleware";
import { smsOTPService } from "../sms-otp";
import crypto from "crypto";
import { successResponse, errorResponse, ErrorCode } from "../utils/apiResponse";
import { trackOtpEvent } from "../utils/otpMonitoring";
import { loginLimiter, otpRequestLimiter, otpVerifyLimiter, registerLimiter } from "../utils/rateLimiters";
import {
  generateOTP,
  hashOTP,
  compareOTP,
  createOTPRecord,
  validateExpiry,
  incrementAttempts,
  incrementAttemptsAtomic,
  markVerified,
  markVerifiedAtomic,
  blockOTP,
  MAX_ATTEMPTS,
  OTP_EXPIRY_MINUTES,
  OTP_COOLDOWN_SECONDS,
} from "../services/otpService";
import { getProviderOrFallback } from "../providers/otp/providerFactory";
import { NOTIFICATION_TYPES, NOTIFICATION_STYLES, NOTIFICATION_PRIORITIES } from "../../shared/notificationTypes";

const MAX_FAILED_LOGIN_ATTEMPTS = 5;
const LOCKOUT_MINUTES = 15;
const OTP_RATE_LIMIT_RETRY_AFTER_SEC = 10 * 60;

const MAX_TRUSTED_DEVICES = 5;
const DEVICE_TOKEN_EXPIRY_DAYS = 45;

const db = storage.db;

// Helper functions
function maskPhoneNumber(phone: string): string {
  return phone.slice(0, 4) + "****" + phone.slice(-4);
}

function computeDeviceHash(deviceId: string | undefined, req: any): string | null {
  if (!deviceId) return null;
  const ua = req.get("user-agent") || "";
  const ip = req.ip || "";
  const seed = `${deviceId}|${ua}|${ip}`;
  return crypto.createHash("sha256").update(seed).digest("hex");
}

function normalizeEmail(email: string | undefined): string | null {
  if (!email) return null;
  return email.trim().toLowerCase();
}

function respondRateLimited(res: any, message: string) {
  res.set("Retry-After", String(OTP_RATE_LIMIT_RETRY_AFTER_SEC));
  return res.status(429).json(errorResponse(ErrorCode.RATE_LIMITED, message));
}

function respondOtpCooldown(res: any, retryAfter: number) {
  res.set("Retry-After", String(retryAfter));
  return res.status(429).json(errorResponse(ErrorCode.RATE_LIMITED, "Please wait before requesting a new OTP."));
}

async function isOtpRequestAllowed(destination: string, ipAddress: string): Promise<boolean> {
  const windowStart = new Date(Date.now() - 10 * 60 * 1000);
  const recent = await db
    .select()
    .from(otpRequestLogs)
    .where(and(
      eq(otpRequestLogs.destination, destination),
      eq(otpRequestLogs.ipAddress, ipAddress),
      gt(otpRequestLogs.createdAt, windowStart)
    ));

  return recent.length < 3;
}

async function logOtpRequest(destination: string, ipAddress: string) {
  await db.insert(otpRequestLogs).values({
    destination,
    ipAddress,
    createdAt: new Date(),
  });
}

async function canUseSMS(parentId: string): Promise<boolean> {
  if (!smsOTPService.isEnabled()) return false;
  
  const parent = await db.select().from(parents).where(eq(parents.id, parentId));
  return !!(parent[0]?.phoneNumber && parent[0]?.smsEnabled);
}

async function checkSMSRateLimit(parentId: string): Promise<boolean> {
  const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000);
  
  const recentAttempts = await db
    .select()
    .from(otpCodes)
    .where(
      and(
        eq(otpCodes.parentId, parentId),
        eq(otpCodes.method, "sms"),
        gt(otpCodes.createdAt, oneHourAgo)
      )
    );
  
  return recentAttempts.length < 5;
}

export async function registerAuthRoutes(app: Express) {
  // Parent Register (with rate limiting)
  app.post("/api/auth/register", registerLimiter, async (req, res) => {
    try {
      const { email, password, name, phoneNumber, libraryReferralCode, referralCode, pin, governorate } = req.body;
      const normalizedEmail = normalizeEmail(email);

      // Validation
      if (!normalizedEmail || !password || !name) {
        return res.status(400).json(errorResponse(ErrorCode.BAD_REQUEST, "Email, password, and name are required"));
      }
      if (password.length < 8) {
        return res.status(400).json(errorResponse(ErrorCode.BAD_REQUEST, "Password must be at least 8 characters"));
      }
      if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(normalizedEmail)) {
        return res.status(400).json(errorResponse(ErrorCode.BAD_REQUEST, "Invalid email format"));
      }

      // Validate optional PIN
      let hashedPin: string | null = null;
      if (pin) {
        const pinStr = String(pin).trim();
        if (!/^\d{4,6}$/.test(pinStr)) {
          return res.status(400).json(errorResponse(ErrorCode.BAD_REQUEST, "PIN must be 4-6 digits"));
        }
        hashedPin = await bcrypt.hash(pinStr, 10);
      }

      // Check if email exists
      const existing = await db.select().from(parents).where(eq(parents.email, normalizedEmail));
      if (existing[0]) {
        return res.status(409).json(errorResponse(ErrorCode.CONFLICT, "Email already registered"));
      }

      const hashedPassword = await bcrypt.hash(password, 10);
      const uniqueCode = Math.random().toString(36).substring(2, 8).toUpperCase();

      const result = await db
        .insert(parents)
        .values({
          email: normalizedEmail,
          password: hashedPassword,
          name,
          phoneNumber: phoneNumber || null,
          uniqueCode,
          pin: hashedPin,
          governorate: governorate || null,
        })
        .returning();

      if (libraryReferralCode && typeof libraryReferralCode === "string") {
        try {
          const normalizedReferralCode = libraryReferralCode.trim().toUpperCase();
          if (normalizedReferralCode) {
            const library = await db
              .select({ id: libraries.id })
              .from(libraries)
              .where(and(eq(libraries.referralCode, normalizedReferralCode), eq(libraries.isActive, true)))
              .limit(1);

            if (library[0]) {
              const libraryId = library[0].id;

              const pendingByCode = await db
                .select({ id: libraryReferrals.id })
                .from(libraryReferrals)
                .where(
                  and(
                    eq(libraryReferrals.libraryId, libraryId),
                    eq(libraryReferrals.referralCode, normalizedReferralCode),
                    isNull(libraryReferrals.referredParentId)
                  )
                )
                .orderBy(desc(libraryReferrals.createdAt))
                .limit(1);

              if (pendingByCode[0]) {
                await db
                  .update(libraryReferrals)
                  .set({
                    referredParentId: result[0].id,
                    status: "registered",
                  })
                  .where(eq(libraryReferrals.id, pendingByCode[0].id));
              } else {
                await db.insert(libraryReferrals).values({
                  libraryId,
                  referredParentId: result[0].id,
                  referralCode: normalizedReferralCode,
                  status: "registered",
                });
              }
            }
          }
        } catch (referralErr) {
          console.error("Library referral register mapping failed:", referralErr);
        }
      }

      // Process parent-to-parent referral code
      if (referralCode && typeof referralCode === "string") {
        try {
          const normalizedCode = referralCode.trim().toUpperCase();
          if (normalizedCode) {
            const codeRecord = await db
              .select()
              .from(parentReferralCodes)
              .where(eq(parentReferralCodes.code, normalizedCode))
              .limit(1);

            if (codeRecord[0] && codeRecord[0].parentId !== result[0].id) {
              // Check no duplicate referral
              const existingReferral = await db
                .select({ id: referrals.id })
                .from(referrals)
                .where(
                  and(
                    eq(referrals.referrerId, codeRecord[0].parentId),
                    eq(referrals.referredId, result[0].id)
                  )
                )
                .limit(1);

              if (!existingReferral[0]) {
                // Get reward points from settings
                const settingsRows = await db.select().from(referralSettings);
                const rewardPoints = settingsRows[0]?.pointsPerReferral ?? 100;

                // Create referral record as rewarded directly
                await db.insert(referrals).values({
                  referrerId: codeRecord[0].parentId,
                  referredId: result[0].id,
                  referralCode: normalizedCode,
                  status: "rewarded",
                  pointsAwarded: rewardPoints,
                  activatedAt: new Date(),
                  rewardedAt: new Date(),
                });

                // Update referral code stats (total + active + points)
                await db
                  .update(parentReferralCodes)
                  .set({
                    totalReferrals: (codeRecord[0].totalReferrals || 0) + 1,
                    activeReferrals: (codeRecord[0].activeReferrals || 0) + 1,
                    totalPointsEarned: (codeRecord[0].totalPointsEarned || 0) + rewardPoints,
                  })
                  .where(eq(parentReferralCodes.id, codeRecord[0].id));

                // Award points to referrer's wallet
                const wallet = await db.select().from(parentWallet).where(eq(parentWallet.parentId, codeRecord[0].parentId));
                if (wallet[0]) {
                  await db.update(parentWallet)
                    .set({
                      balance: sql`${parentWallet.balance} + ${rewardPoints}`,
                      updatedAt: new Date(),
                    })
                    .where(eq(parentWallet.parentId, codeRecord[0].parentId));
                } else {
                  await db.insert(parentWallet).values({
                    parentId: codeRecord[0].parentId,
                    balance: rewardPoints.toString(),
                  });
                }

                // Notify referrer
                try {
                  const { createNotification } = await import("../notifications");
                  await createNotification({
                    parentId: codeRecord[0].parentId,
                    type: NOTIFICATION_TYPES.REFERRAL_REWARD,
                    title: "مكافأة الإحالة! 🎉",
                    message: `تهانينا! حصلت على ${rewardPoints} نقطة لأن شخصاً سجّل من خلال رابط الإحالة الخاص بك!`,
                    relatedId: result[0].id,
                  });
                } catch (notifyErr) {
                  console.error("Referral notification failed:", notifyErr);
                }
              }
            }
          }
        } catch (refErr) {
          console.error("Parent referral code mapping failed:", refErr);
        }
      }

      const token = jwt.sign({ userId: result[0].id, type: "parent" }, JWT_SECRET, { expiresIn: "30d" });

      // Send notification with the linking code
      try {
        const { createNotification } = await import("../notifications");
        await createNotification({
          parentId: result[0].id,
          type: NOTIFICATION_TYPES.INFO,
          title: "كود ربط الأطفال الخاص بك",
          message: `كود الربط الخاص بك هو: ${uniqueCode}. شاركه مع أطفالك للربط بحسابك. حافظ على سرية هذا الكود!`,
          style: NOTIFICATION_STYLES.BANNER,
          priority: NOTIFICATION_PRIORITIES.URGENT,
          metadata: { code: uniqueCode },
        });
      } catch (err) {
        console.error("Failed to send linking code notification:", err);
      }

      // Notify all admins about new registration
      try {
        const { notifyAllAdmins } = await import("../notifications");
        await notifyAllAdmins({
          type: NOTIFICATION_TYPES.NEW_REGISTRATION,
          title: "👤 مستخدم جديد",
          message: `تسجيل جديد: ${name} (${normalizedEmail})`,
          style: NOTIFICATION_STYLES.TOAST,
          priority: NOTIFICATION_PRIORITIES.NORMAL,
          soundAlert: true,
          relatedId: result[0].id,
          metadata: { parentId: result[0].id, parentName: name, email: normalizedEmail },
        });
      } catch (err) {
        console.error("Failed to send admin registration notification:", err);
      }

      res.json(successResponse({ token, userId: result[0].id, uniqueCode, hasPin: !!hashedPin }, "Registration successful"));
    } catch (error: any) {
      console.error("Registration error:", error);
      res.status(500).json(errorResponse(ErrorCode.INTERNAL_SERVER_ERROR, "Registration failed"));
    }
  });

  // Parent Login (with rate limiting)
  app.post("/api/auth/login", loginLimiter, async (req, res) => {
    try {
      const { email, password } = req.body;
      const normalizedEmail = normalizeEmail(email);

      if (!normalizedEmail || !password) {
        return res.status(400).json(errorResponse(ErrorCode.BAD_REQUEST, "Email and password are required"));
      }

      const result = await db.select().from(parents).where(eq(parents.email, normalizedEmail));
      if (!result[0]) {
        return res.status(401).json(errorResponse(ErrorCode.INVALID_CREDENTIALS, "Invalid credentials"));
      }

      if (result[0].lockedUntil && new Date() < new Date(result[0].lockedUntil)) {
        const retryAfter = Math.ceil((new Date(result[0].lockedUntil).getTime() - Date.now()) / 1000);
        res.set("Retry-After", String(retryAfter));
        return res.status(403).json(errorResponse(ErrorCode.FORBIDDEN, "Account locked. Please try again later."));
      }

      const passwordMatch = await bcrypt.compare(password, result[0].password);
      if (!passwordMatch) {
        const nextAttempts = (result[0].failedLoginAttempts || 0) + 1;
        const updates: { failedLoginAttempts: number; lockedUntil?: Date | null } = {
          failedLoginAttempts: nextAttempts,
        };
        let lockedUntil: Date | null = null;
        if (nextAttempts >= MAX_FAILED_LOGIN_ATTEMPTS) {
          lockedUntil = new Date(Date.now() + LOCKOUT_MINUTES * 60 * 1000);
          updates.lockedUntil = lockedUntil;
        }
        await db.update(parents).set(updates).where(eq(parents.id, result[0].id));
        if (lockedUntil) {
          res.set("Retry-After", String(LOCKOUT_MINUTES * 60));
          return res.status(403).json(errorResponse(ErrorCode.FORBIDDEN, "Account locked. Please try again later."));
        }
        return res.status(401).json(errorResponse(ErrorCode.INVALID_CREDENTIALS, "Invalid credentials"));
      }

      // SEC-002 FIX: Admin bypass OTP - moved to environment variable
      const ADMIN_BYPASS_EMAILS = process.env["ADMIN_BYPASS_EMAILS"]?.split(",").map(e => e.trim().toLowerCase()) || [];
      const allowAdminBypass = process.env["NODE_ENV"] !== "production" && process.env["ALLOW_ADMIN_BYPASS"] === "true";
      if (allowAdminBypass && ADMIN_BYPASS_EMAILS.length > 0 && ADMIN_BYPASS_EMAILS.includes(normalizedEmail)) {
        console.warn(`⚠️ Admin bypass login: ${normalizedEmail}`);
        await db.update(parents).set({ failedLoginAttempts: 0, lockedUntil: null }).where(eq(parents.id, result[0].id));
        const token = jwt.sign({ userId: result[0].id, type: "parent" }, JWT_SECRET, { expiresIn: "30d" });
        return res.json(successResponse({ 
          token, 
          userId: result[0].id,
          uniqueCode: result[0].uniqueCode,
          hasPin: !!result[0].pin,
          isAdmin: true,
        }, "تسجيل دخول المسؤول بنجاح"));
      }

      // Send OTP instead of direct token
      const ipAddress = req.ip || "0.0.0.0";
      const canSend = await isOtpRequestAllowed(normalizedEmail, ipAddress);
      if (!canSend) {
        trackOtpEvent("rate_limited", {
          reason: "request_limit",
          purpose: "login",
          destination: normalizedEmail,
          parentId: result[0].id,
          ip: ipAddress,
        });
        return respondRateLimited(res, "Too many OTP requests. Please try again later.");
      }

      const code = generateOTP();
      const codeHash = await hashOTP(code);
      const deviceHash = computeDeviceHash(req.body.deviceId, req);

      const provider = await getProviderOrFallback("email");
      if (!provider) {
        return res.status(500).json(errorResponse(ErrorCode.INTERNAL_SERVER_ERROR, "No OTP provider available"));
      }

      try {
        await provider.instance.send(normalizedEmail, code);
      } catch (err: any) {
        console.error("❌ Failed to send OTP:", err);
        return res.status(500).json(errorResponse(
          ErrorCode.INTERNAL_SERVER_ERROR,
          "Failed to send OTP. Please try again later"
        ));
      }

      let record;
      try {
        record = await createOTPRecord(db, {
          parentId: result[0].id,
          purpose: "login",
          destination: normalizedEmail,
          provider: provider.provider,
          codeHash,
          expiresAt: new Date(Date.now() + OTP_EXPIRY_MINUTES * 60 * 1000),
          deviceHash,
          ipAddress,
        });
        await logOtpRequest(normalizedEmail, ipAddress);
        trackOtpEvent("send", {
          purpose: "login",
          method: provider.provider,
          destination: normalizedEmail,
          parentId: result[0].id,
          ip: ipAddress,
          otpId: record?.id,
        });
      } catch (dbErr: any) {
        if (dbErr?.message === "OTP_COOLDOWN") {
          trackOtpEvent("rate_limited", {
            reason: "cooldown",
            purpose: "login",
            destination: normalizedEmail,
            parentId: result[0].id,
            ip: ipAddress,
          });
          return respondOtpCooldown(res, dbErr.retryAfter || OTP_COOLDOWN_SECONDS);
        }
        console.error("❌ Failed to persist login OTP after send:", dbErr);
        return res.status(500).json(errorResponse(
          ErrorCode.INTERNAL_SERVER_ERROR,
          "Failed to store OTP. Please request a new code."
        ));
      }

      res.json(successResponse({
        requiresOtp: true,
        email: normalizedEmail,
        otpId: record?.id,
      }, "OTP sent successfully to your email"));
    } catch (error: any) {
      console.error("Login error:", error);
      res.status(500).json(errorResponse(ErrorCode.INTERNAL_SERVER_ERROR, "Login failed"));
    }
  });

  // Forgot Password - Send reset OTP (with rate limiting)
  app.post("/api/auth/forgot-password", otpRequestLimiter, async (req, res) => {
    try {
      const { email } = req.body;
      const normalizedEmail = normalizeEmail(email);
      if (!normalizedEmail) {
        return res.status(400).json(errorResponse(ErrorCode.BAD_REQUEST, "Email is required"));
      }

      const parent = await db.select().from(parents).where(eq(parents.email, normalizedEmail));

      // Always return success to prevent user enumeration
      if (!parent[0]) {
        return res.json(successResponse({ sent: true }, "OTP sent to your email"));
      }

      const ipAddress = req.ip || "0.0.0.0";
      const canSend = await isOtpRequestAllowed(normalizedEmail, ipAddress);
      if (!canSend) {
        trackOtpEvent("rate_limited", {
          reason: "request_limit",
          purpose: "reset",
          destination: normalizedEmail,
          parentId: parent[0].id,
          ip: ipAddress,
        });
        return respondRateLimited(res, "Too many OTP requests. Please try again later.");
      }

      const code = generateOTP();
      const codeHash = await hashOTP(code);
      const provider = await getProviderOrFallback("email");
      if (!provider) {
        return res.status(500).json(errorResponse(ErrorCode.INTERNAL_SERVER_ERROR, "No OTP provider available"));
      }

      try {
        await provider.instance.send(normalizedEmail, code);
      } catch (err: any) {
        console.error("❌ Failed to send password reset OTP email:", err);
        return res.status(500).json(errorResponse(
          ErrorCode.INTERNAL_SERVER_ERROR,
          "Failed to send OTP. Please try again later."
        ));
      }

      let record;
      try {
        record = await createOTPRecord(db, {
          parentId: parent[0].id,
          purpose: "reset",
          destination: normalizedEmail,
          provider: provider.provider,
          codeHash,
          expiresAt: new Date(Date.now() + 10 * 60 * 1000),
          ipAddress,
        });
        await logOtpRequest(normalizedEmail, ipAddress);
        trackOtpEvent("send", {
          purpose: "reset",
          method: provider.provider,
          destination: normalizedEmail,
          parentId: parent[0].id,
          ip: ipAddress,
          otpId: record?.id,
        });
      } catch (dbErr: any) {
        if (dbErr?.message === "OTP_COOLDOWN") {
          trackOtpEvent("rate_limited", {
            reason: "cooldown",
            purpose: "reset",
            destination: normalizedEmail,
            parentId: parent[0].id,
            ip: ipAddress,
          });
          return respondOtpCooldown(res, dbErr.retryAfter || OTP_COOLDOWN_SECONDS);
        }
        console.error("❌ Failed to persist password reset OTP after email send:", dbErr);
        return res.status(500).json(errorResponse(
          ErrorCode.INTERNAL_SERVER_ERROR,
          "Failed to store OTP. Please request a new code."
        ));
      }

      res.json(successResponse({ sent: true, otpId: record?.id }, "Password reset OTP sent to your email. Please check your inbox."));
    } catch (error: any) {
      console.error("Forgot password error:", error);
      res.status(500).json(errorResponse(ErrorCode.INTERNAL_SERVER_ERROR, "Failed to send OTP"));
    }
  });

  // Verify reset OTP
  app.post("/api/auth/verify-reset-otp", otpVerifyLimiter, async (req, res) => {
    try {
      const { email, code, otpId } = req.body;
      const normalizedEmail = normalizeEmail(email);
      if (!normalizedEmail || !code) {
        return res.status(400).json(errorResponse(ErrorCode.BAD_REQUEST, "Email and code are required"));
      }

      const pendingCondition = or(eq(otpCodes.status, "pending"), isNull(otpCodes.status));
      let record: typeof otpCodes.$inferSelect | undefined;

      if (otpId) {
        const byId = await db
          .select()
          .from(otpCodes)
          .where(and(
            eq(otpCodes.id, otpId),
            eq(otpCodes.destination, normalizedEmail),
            eq(otpCodes.purpose, "reset"),
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
            eq(otpCodes.destination, normalizedEmail),
            eq(otpCodes.purpose, "reset"),
            pendingCondition
          ))
          .orderBy(desc(otpCodes.createdAt))
          .limit(1);
        record = latest[0];
      }
      if (!record) {
        trackOtpEvent("verify_failed", {
          purpose: "reset",
          destination: normalizedEmail,
          reason: "not_found",
        });
        return res.status(400).json(errorResponse(ErrorCode.BAD_REQUEST, "Invalid OTP"));
      }
      if (!validateExpiry(record.expiresAt)) {
        await db.update(otpCodes).set({ status: "expired" }).where(eq(otpCodes.id, record.id));
        trackOtpEvent("verify_failed", {
          purpose: "reset",
          destination: normalizedEmail,
          parentId: record.parentId || undefined,
          reason: "expired",
          otpId: record.id,
        });
        return res.status(400).json(errorResponse(ErrorCode.OTP_EXPIRED, "OTP expired"));
      }

      const ok = await compareOTP(code, record.code);
      if (!ok) {
        const attempts = await incrementAttemptsAtomic(db, record.id);
        if (attempts !== null && attempts >= MAX_ATTEMPTS) {
          await blockOTP(db, record.id);
          trackOtpEvent("blocked", {
            purpose: "reset",
            destination: normalizedEmail,
            parentId: record.parentId || undefined,
            reason: "max_attempts",
            otpId: record.id,
          });
        }
        if (attempts === null) {
          trackOtpEvent("verify_failed", {
            purpose: "reset",
            destination: normalizedEmail,
            parentId: record.parentId || undefined,
            reason: "used",
            otpId: record.id,
          });
          return res.status(400).json(errorResponse(ErrorCode.BAD_REQUEST, "OTP already used"));
        }
        trackOtpEvent("verify_failed", {
          purpose: "reset",
          destination: normalizedEmail,
          parentId: record.parentId || undefined,
          reason: "invalid",
          otpId: record.id,
        });
        return res.status(400).json(errorResponse(ErrorCode.BAD_REQUEST, "Invalid OTP"));
      }

      trackOtpEvent("verify_success", {
        purpose: "reset",
        destination: normalizedEmail,
        parentId: record.parentId || undefined,
        otpId: record.id,
      });
      res.json(successResponse({ verified: true }, "OTP verified"));
    } catch (error: any) {
      console.error("Verify reset OTP error:", error);
      res.status(500).json(errorResponse(ErrorCode.INTERNAL_SERVER_ERROR, "OTP verification failed"));
    }
  });

  // Reset Password
  app.post("/api/auth/reset-password", async (req, res) => {
    try {
      const { email, code, newPassword, otpId } = req.body;
      const normalizedEmail = normalizeEmail(email);
      if (!normalizedEmail || !code || !newPassword) {
        return res.status(400).json(errorResponse(ErrorCode.BAD_REQUEST, "Email, OTP, and new password are required"));
      }

      if (newPassword.length < 8) {
        return res.status(400).json(errorResponse(ErrorCode.BAD_REQUEST, "Password must be at least 8 characters"));
      }

      const pendingCondition = or(eq(otpCodes.status, "pending"), isNull(otpCodes.status));
      let record: typeof otpCodes.$inferSelect | undefined;

      if (otpId) {
        const byId = await db
          .select()
          .from(otpCodes)
          .where(and(
            eq(otpCodes.id, otpId),
            eq(otpCodes.destination, normalizedEmail),
            eq(otpCodes.purpose, "reset"),
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
            eq(otpCodes.destination, normalizedEmail),
            eq(otpCodes.purpose, "reset"),
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
            purpose: "reset",
            destination: normalizedEmail,
            parentId: record.parentId || undefined,
            reason: "expired",
            otpId: record.id,
          });
        }
        if (!record) {
          trackOtpEvent("verify_failed", {
            purpose: "reset",
            destination: normalizedEmail,
            reason: "not_found",
          });
        }
        return res.status(400).json(errorResponse(ErrorCode.OTP_EXPIRED, "Invalid or expired OTP"));
      }

      const ok = await compareOTP(code, record.code);
      if (!ok) {
        const attempts = await incrementAttemptsAtomic(db, record.id);
        if (attempts !== null && attempts >= MAX_ATTEMPTS) {
          await blockOTP(db, record.id);
          trackOtpEvent("blocked", {
            purpose: "reset",
            destination: normalizedEmail,
            parentId: record.parentId || undefined,
            reason: "max_attempts",
            otpId: record.id,
          });
        }
        if (attempts === null) {
          trackOtpEvent("verify_failed", {
            purpose: "reset",
            destination: normalizedEmail,
            parentId: record.parentId || undefined,
            reason: "used",
            otpId: record.id,
          });
          return res.status(400).json(errorResponse(ErrorCode.BAD_REQUEST, "OTP already used"));
        }
        trackOtpEvent("verify_failed", {
          purpose: "reset",
          destination: normalizedEmail,
          parentId: record.parentId || undefined,
          reason: "invalid",
          otpId: record.id,
        });
        return res.status(400).json(errorResponse(ErrorCode.BAD_REQUEST, "Invalid OTP"));
      }

      const parent = await db.select().from(parents).where(eq(parents.email, normalizedEmail));
      if (!parent[0]) {
        return res.status(404).json(errorResponse(ErrorCode.NOT_FOUND, "User not found"));
      }

      const hashedPassword = await bcrypt.hash(newPassword, 10);
      await db.update(parents).set({ password: hashedPassword }).where(eq(parents.id, parent[0].id));

      const verifiedId = await markVerifiedAtomic(db, record.id);
      if (!verifiedId) {
        trackOtpEvent("verify_failed", {
          purpose: "reset",
          destination: normalizedEmail,
          parentId: record.parentId || undefined,
          reason: "used",
          otpId: record.id,
        });
        return res.status(400).json(errorResponse(ErrorCode.BAD_REQUEST, "OTP already used"));
      }

      trackOtpEvent("verify_success", {
        purpose: "reset",
        destination: normalizedEmail,
        parentId: record.parentId || undefined,
        otpId: record.id,
        action: "consume",
      });

      res.json(successResponse({ reset: true }, "Password reset successful"));
    } catch (error: any) {
      console.error("Reset password error:", error);
      res.status(500).json(errorResponse(ErrorCode.INTERNAL_SERVER_ERROR, "Password reset failed"));
    }
  });

  // Send OTP (general)
  app.post("/api/auth/send-otp", otpRequestLimiter, async (req, res) => {
    try {
      const { email, provider: requestedProvider, purpose: requestedPurpose } = req.body;
      const normalizedEmail = normalizeEmail(email);
      if (!normalizedEmail) {
        return res.status(400).json(errorResponse(ErrorCode.BAD_REQUEST, "Email is required"));
      }

      const purpose = requestedPurpose || "login";
      const allowedPurposes = new Set(["login", "register", "change_password"]);
      if (!allowedPurposes.has(purpose)) {
        return res.status(400).json(errorResponse(ErrorCode.BAD_REQUEST, "Invalid OTP purpose"));
      }

      const parent = await db.select().from(parents).where(eq(parents.email, normalizedEmail));
      if (!parent[0]) {
        return res.status(404).json(errorResponse(ErrorCode.NOT_FOUND, "User not found"));
      }

      const ipAddress = req.ip || "0.0.0.0";
      const canSend = await isOtpRequestAllowed(normalizedEmail, ipAddress);
      if (!canSend) {
        trackOtpEvent("rate_limited", {
          reason: "request_limit",
          purpose,
          destination: normalizedEmail,
          parentId: parent[0].id,
          ip: ipAddress,
        });
        return respondRateLimited(res, "Too many OTP requests. Please try again later.");
      }

      const code = generateOTP();
      const codeHash = await hashOTP(code);
      const provider = await getProviderOrFallback(requestedProvider);
      if (!provider) {
        return res.status(500).json(errorResponse(ErrorCode.INTERNAL_SERVER_ERROR, "No OTP provider available"));
      }

      try {
        await provider.instance.send(normalizedEmail, code);
      } catch (err: any) {
        console.error("❌ Failed to send OTP:", err);
        return res.status(500).json(errorResponse(ErrorCode.INTERNAL_SERVER_ERROR, "Failed to send OTP. Please try again later."));
      }

      let record;
      try {
        record = await createOTPRecord(db, {
          parentId: parent[0].id,
          purpose,
          destination: normalizedEmail,
          provider: provider.provider,
          codeHash,
          expiresAt: new Date(Date.now() + OTP_EXPIRY_MINUTES * 60 * 1000),
          ipAddress,
        });
        await logOtpRequest(normalizedEmail, ipAddress);
        trackOtpEvent("send", {
          purpose,
          method: provider.provider,
          destination: normalizedEmail,
          parentId: parent[0].id,
          ip: ipAddress,
          otpId: record?.id,
        });
      } catch (dbErr: any) {
        if (dbErr?.message === "OTP_COOLDOWN") {
          trackOtpEvent("rate_limited", {
            reason: "cooldown",
            purpose,
            destination: normalizedEmail,
            parentId: parent[0].id,
            ip: ipAddress,
          });
          return respondOtpCooldown(res, dbErr.retryAfter || OTP_COOLDOWN_SECONDS);
        }
        console.error("❌ Failed to persist OTP after send:", dbErr);
        return res.status(500).json(errorResponse(ErrorCode.INTERNAL_SERVER_ERROR, "Failed to store OTP. Please request a new code."));
      }

      res.json(successResponse({ sent: true, otpId: record?.id, purpose }, "OTP sent successfully to your email"));
    } catch (error: any) {
      console.error("Send OTP error:", error);
      res.status(500).json(errorResponse(ErrorCode.INTERNAL_SERVER_ERROR, "Failed to send OTP"));
    }
  });

  // Verify OTP
  app.post("/api/auth/verify-otp", otpVerifyLimiter, async (req, res) => {
    try {
      const { email, code, otpId, deviceId, deviceName, deviceType, purpose: requestedPurpose } = req.body;
      const normalizedEmail = normalizeEmail(email);
      if (!normalizedEmail || !code) {
        return res.status(400).json(errorResponse(ErrorCode.BAD_REQUEST, "Email and OTP are required"));
      }

      const allowedPurposes = new Set(["login", "register", "change_password"]);
      if (requestedPurpose && !allowedPurposes.has(requestedPurpose)) {
        return res.status(400).json(errorResponse(ErrorCode.BAD_REQUEST, "Invalid OTP purpose"));
      }

      if (requestedPurpose === "change_password") {
        const parent = await db.select().from(parents).where(eq(parents.email, normalizedEmail));
        if (!parent[0]) {
          return res.status(404).json(errorResponse(ErrorCode.NOT_FOUND, "User not found"));
        }

        const pendingCondition = or(eq(otpCodes.status, "pending"), isNull(otpCodes.status));
        let record: typeof otpCodes.$inferSelect | undefined;

        if (otpId) {
          const byId = await db
            .select()
            .from(otpCodes)
            .where(and(
              eq(otpCodes.id, otpId),
              eq(otpCodes.parentId, parent[0].id),
              eq(otpCodes.destination, normalizedEmail),
              eq(otpCodes.purpose, "change_password"),
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
              eq(otpCodes.destination, normalizedEmail),
              eq(otpCodes.purpose, "change_password"),
              pendingCondition
            ))
            .orderBy(desc(otpCodes.createdAt))
            .limit(1);
          record = latest[0];
        }

        if (!record) {
          trackOtpEvent("verify_failed", {
            purpose: "change_password",
            destination: normalizedEmail,
            parentId: parent[0].id,
            reason: "not_found",
            otpId,
          });
          return res.status(400).json(errorResponse(ErrorCode.BAD_REQUEST, "Invalid OTP"));
        }

        if (!validateExpiry(record.expiresAt)) {
          await db.update(otpCodes).set({ status: "expired" }).where(eq(otpCodes.id, record.id));
          trackOtpEvent("verify_failed", {
            purpose: "change_password",
            destination: normalizedEmail,
            parentId: parent[0].id,
            reason: "expired",
            otpId: record.id,
          });
          return res.status(400).json(errorResponse(ErrorCode.OTP_EXPIRED, "OTP expired"));
        }

        const ok = await compareOTP(code, record.code);
        if (!ok) {
          const attempts = await incrementAttemptsAtomic(db, record.id);
          if (attempts !== null && attempts >= MAX_ATTEMPTS) {
            await blockOTP(db, record.id);
            trackOtpEvent("blocked", {
              purpose: "change_password",
              destination: normalizedEmail,
              parentId: parent[0].id,
              reason: "max_attempts",
              otpId: record.id,
            });
          }
          if (attempts === null) {
            trackOtpEvent("verify_failed", {
              purpose: "change_password",
              destination: normalizedEmail,
              parentId: parent[0].id,
              reason: "used",
              otpId: record.id,
            });
            return res.status(400).json(errorResponse(ErrorCode.BAD_REQUEST, "OTP already used"));
          }
          trackOtpEvent("verify_failed", {
            purpose: "change_password",
            destination: normalizedEmail,
            parentId: parent[0].id,
            reason: "invalid",
            otpId: record.id,
          });
          return res.status(400).json(errorResponse(ErrorCode.BAD_REQUEST, "Invalid OTP"));
        }

        trackOtpEvent("verify_success", {
          purpose: "change_password",
          destination: normalizedEmail,
          parentId: parent[0].id,
          otpId: record.id,
        });

        return res.json(successResponse({ verified: true }, "OTP verified"));
      }

      const pendingCondition = or(eq(otpCodes.status, "pending"), isNull(otpCodes.status));
      let otpRecord: typeof otpCodes.$inferSelect | undefined;

      const purposeCondition = requestedPurpose
        ? eq(otpCodes.purpose, requestedPurpose)
        : or(
            eq(otpCodes.purpose, "login"),
            eq(otpCodes.purpose, "register")
          );
      const purposeLabel = requestedPurpose || "login_or_register";

      if (otpId) {
        const byId = await db
          .select()
          .from(otpCodes)
          .where(and(
            eq(otpCodes.id, otpId),
            eq(otpCodes.destination, normalizedEmail),
            purposeCondition,
            pendingCondition
          ))
          .orderBy(desc(otpCodes.createdAt))
          .limit(1);
        otpRecord = byId[0];
      } else {
        const latest = await db
          .select()
          .from(otpCodes)
          .where(and(
            eq(otpCodes.destination, normalizedEmail),
            purposeCondition,
            pendingCondition
          ))
          .orderBy(desc(otpCodes.createdAt))
          .limit(1);
        otpRecord = latest[0];
      }

      if (!otpRecord) {
        // Log failed login attempt
        const parentRes = await db.select().from(parents).where(eq(parents.email, normalizedEmail));
        if (parentRes[0]) {
          await db.insert(loginHistory).values({
            parentId: parentRes[0].id,
            deviceId: deviceId || "unknown",
            deviceHash: computeDeviceHash(deviceId, req),
            success: false,
            ipAddress: req.ip,
            userAgent: req.get("user-agent"),
            failureReason: "invalid_otp",
            suspiciousActivity: false,
          });
        }
        trackOtpEvent("verify_failed", {
          purpose: purposeLabel,
          destination: normalizedEmail,
          parentId: parentRes[0]?.id,
          reason: "not_found",
          otpId,
        });
        return res.status(400).json(errorResponse(ErrorCode.BAD_REQUEST, "Invalid OTP"));
      }

      if (!validateExpiry(otpRecord.expiresAt)) {
        await db.update(otpCodes).set({ status: "expired" }).where(eq(otpCodes.id, otpRecord.id));
        // Log expired OTP attempt
        const parentRes = await db.select().from(parents).where(eq(parents.id, otpRecord.parentId!));
        if (parentRes[0]) {
          await db.insert(loginHistory).values({
            parentId: parentRes[0].id,
            deviceId: deviceId || "unknown",
            deviceHash: computeDeviceHash(deviceId, req),
            success: false,
            ipAddress: req.ip,
            userAgent: req.get("user-agent"),
            failureReason: "otp_expired",
            suspiciousActivity: false,
          });
        }
        trackOtpEvent("verify_failed", {
          purpose: otpRecord.purpose,
          destination: normalizedEmail,
          parentId: otpRecord.parentId || undefined,
          reason: "expired",
          otpId: otpRecord.id,
        });
        return res.status(400).json(errorResponse(ErrorCode.OTP_EXPIRED, "OTP expired"));
      }

      const isValid = await compareOTP(code, otpRecord.code);
      if (!isValid) {
        const attempts = await incrementAttemptsAtomic(db, otpRecord.id);
        if (attempts !== null && attempts >= MAX_ATTEMPTS) {
          await blockOTP(db, otpRecord.id);
          trackOtpEvent("blocked", {
            purpose: otpRecord.purpose,
            destination: normalizedEmail,
            parentId: otpRecord.parentId || undefined,
            reason: "max_attempts",
            otpId: otpRecord.id,
          });
          return res.status(400).json(errorResponse(ErrorCode.BAD_REQUEST, "OTP blocked"));
        }
        if (attempts === null) {
          trackOtpEvent("verify_failed", {
            purpose: otpRecord.purpose,
            destination: normalizedEmail,
            parentId: otpRecord.parentId || undefined,
            reason: "used",
            otpId: otpRecord.id,
          });
          return res.status(400).json(errorResponse(ErrorCode.BAD_REQUEST, "OTP already used"));
        }
        trackOtpEvent("verify_failed", {
          purpose: otpRecord.purpose,
          destination: normalizedEmail,
          parentId: otpRecord.parentId || undefined,
          reason: "invalid",
          otpId: otpRecord.id,
        });
        return res.status(400).json(errorResponse(ErrorCode.BAD_REQUEST, "Invalid OTP"));
      }

      const parent = await db.select().from(parents).where(eq(parents.id, otpRecord.parentId!));
      if (!parent[0]) {
        return res.status(404).json(errorResponse(ErrorCode.NOT_FOUND, "User not found"));
      }

      // Mark OTP as verified
      const verifiedId = await markVerifiedAtomic(db, otpRecord.id);
      if (!verifiedId) {
        trackOtpEvent("verify_failed", {
          purpose: otpRecord.purpose,
          destination: normalizedEmail,
          parentId: otpRecord.parentId || undefined,
          reason: "used",
          otpId: otpRecord.id,
        });
        return res.status(400).json(errorResponse(ErrorCode.BAD_REQUEST, "OTP already used"));
      }

      await db.update(parents).set({ failedLoginAttempts: 0, lockedUntil: null }).where(eq(parents.id, parent[0].id));

      // Create session (Phase 1: Session-based auth)
      const sessionToken = crypto.randomBytes(32).toString("hex");
      const tokenHash = crypto.createHash("sha256").update(sessionToken).digest("hex");
      const sessionExpiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000); // 24 hours

      const finalDeviceId = deviceId || `device_${Date.now()}`;
      
      // Upsert session (replace if exists for same device)
      await db
        .insert(sessions)
        .values({
          parentId: parent[0].id,
          deviceId: finalDeviceId,
          tokenHash,
          ipAddress: req.ip,
          userAgent: req.get("user-agent"),
          isActive: true,
          expiresAt: sessionExpiresAt,
        })
        .onConflictDoUpdate({
          target: [sessions.parentId, sessions.deviceId],
          set: {
            tokenHash,
            ipAddress: req.ip,
            userAgent: req.get("user-agent"),
            isActive: true,
            expiresAt: sessionExpiresAt,
          },
        })
        .catch(() => {
          // Fallback: delete old session and create new one
          return db.insert(sessions).values({
            parentId: parent[0].id,
            deviceId: finalDeviceId,
            tokenHash,
            ipAddress: req.ip,
            userAgent: req.get("user-agent"),
            isActive: true,
            expiresAt: sessionExpiresAt,
          });
        });

      // Log successful login
      await db.insert(loginHistory).values({
        parentId: parent[0].id,
        deviceId: finalDeviceId,
        deviceHash: computeDeviceHash(deviceId, req),
        success: true,
        ipAddress: req.ip,
        userAgent: req.get("user-agent"),
        suspiciousActivity: false,
      });

      // Create JWT token for stateless fallback (30 days)
      const jwtToken = jwt.sign({ userId: parent[0].id, parentId: parent[0].id, type: "parent" }, JWT_SECRET, { expiresIn: "30d" });

      // Handle "Remember this device" functionality
      let deviceRefreshToken: string | undefined;
      const rememberDevice = req.body.rememberDevice;
      
      if (rememberDevice && deviceId) {
        // Check device limit (max 5 trusted devices per parent)
        const existingDevices = await db
          .select()
          .from(trustedDevices)
          .where(and(
            eq(trustedDevices.parentId, parent[0].id),
            isNull(trustedDevices.revokedAt)
          ));
        
        // Remove oldest device if limit exceeded
        if (existingDevices.length >= MAX_TRUSTED_DEVICES) {
          const oldest = existingDevices.sort((a: typeof existingDevices[0], b: typeof existingDevices[0]) => 
            new Date(a.lastUsedAt).getTime() - new Date(b.lastUsedAt).getTime()
          )[0];
          await db
            .update(trustedDevices)
            .set({ revokedAt: new Date() })
            .where(eq(trustedDevices.id, oldest.id));
        }
        
        // Generate refresh token
        deviceRefreshToken = crypto.randomBytes(48).toString("hex");
        const refreshTokenHash = crypto.createHash("sha256").update(deviceRefreshToken).digest("hex");
        const deviceIdHash = crypto.createHash("sha256").update(deviceId).digest("hex");
        const deviceLabel = deviceName || deviceType || "Unknown Device";
        
        // Check if device already exists and update, or create new
        const existingDevice = existingDevices.find((d: typeof existingDevices[0]) => d.deviceIdHash === deviceIdHash);
        
        if (existingDevice) {
          // Update existing device
          await db
            .update(trustedDevices)
            .set({
              refreshTokenHash,
              lastUsedAt: new Date(),
              expiresAt: new Date(Date.now() + DEVICE_TOKEN_EXPIRY_DAYS * 24 * 60 * 60 * 1000),
              userAgent: req.get("user-agent"),
            })
            .where(eq(trustedDevices.id, existingDevice.id));
        } else {
          // Create new trusted device
          await db.insert(trustedDevices).values({
            parentId: parent[0].id,
            deviceIdHash,
            deviceLabel,
            refreshTokenHash,
            userAgent: req.get("user-agent"),
            expiresAt: new Date(Date.now() + DEVICE_TOKEN_EXPIRY_DAYS * 24 * 60 * 60 * 1000),
          });
        }
      }

      // Set device refresh token as httpOnly cookie for security (prevents XSS theft)
      if (deviceRefreshToken) {
        res.cookie("device_refresh", deviceRefreshToken, {
          httpOnly: true,
          secure: process.env["NODE_ENV"] === "production",
          sameSite: "strict",
          maxAge: DEVICE_TOKEN_EXPIRY_DAYS * 24 * 60 * 60 * 1000,
          path: "/api/auth/device",
        });
      }

      // Return both session + JWT in standard format
      trackOtpEvent("verify_success", {
        purpose: otpRecord.purpose,
        destination: normalizedEmail,
        parentId: otpRecord.parentId || undefined,
        otpId: otpRecord.id,
      });
      res.json(successResponse({
        token: jwtToken, // JWT for stateless fallback
        sessionToken, // Session token for httpOnly cookie
        parentId: parent[0].id,
        userId: parent[0].id,
        uniqueCode: parent[0].uniqueCode, // For family PIN login flow
        hasPin: !!parent[0].pin, // Only enable PIN flow if parent has PIN
        deviceTrusted: !!deviceRefreshToken, // Indicate if device was saved
      }, "Login successful"));
    } catch (error: any) {
      console.error("Verify OTP error:", error);
      res.status(500).json(errorResponse(ErrorCode.INTERNAL_SERVER_ERROR, "OTP verification failed"));
    }
  });

  // Phone Registration (requires email)
  app.post("/api/auth/register-phone", registerLimiter, async (req, res) => {
    try {
      const { email, password, name, phoneNumber } = req.body;
      const normalizedEmail = normalizeEmail(email);

      if (!normalizedEmail || !password || !name || !phoneNumber) {
        return res.status(400).json(errorResponse(ErrorCode.BAD_REQUEST, "Email, password, name, and phone number are required"));
      }
      if (password.length < 8) {
        return res.status(400).json(errorResponse(ErrorCode.BAD_REQUEST, "Password must be at least 8 characters"));
      }
      if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(normalizedEmail)) {
        return res.status(400).json(errorResponse(ErrorCode.BAD_REQUEST, "Invalid email format"));
      }

      const existing = await db.select().from(parents).where(eq(parents.email, normalizedEmail));
      if (existing[0]) {
        return res.status(409).json(errorResponse(ErrorCode.CONFLICT, "Email already registered"));
      }

      const hashedPassword = await bcrypt.hash(password, 10);
      const uniqueCode = Math.random().toString(36).substring(2, 8).toUpperCase();

      const result = await db
        .insert(parents)
        .values({
          email: normalizedEmail,
          password: hashedPassword,
          name,
          phoneNumber,
          uniqueCode,
        })
        .returning();

      try {
        const { createNotification } = await import("../notifications");
        await createNotification({
          parentId: result[0].id,
          type: NOTIFICATION_TYPES.INFO,
          title: "كود ربط الأطفال الخاص بك",
          message: `كود الربط الخاص بك هو: ${uniqueCode}. شاركه مع أطفالك للربط بحسابك. حافظ على سرية هذا الكود!`,
          style: NOTIFICATION_STYLES.BANNER,
          priority: NOTIFICATION_PRIORITIES.URGENT,
          metadata: { code: uniqueCode },
        });
      } catch (err) {
        console.error("Failed to send linking code notification:", err);
      }

      // Notify all admins about new phone registration
      try {
        const { notifyAllAdmins } = await import("../notifications");
        await notifyAllAdmins({
          type: NOTIFICATION_TYPES.NEW_REGISTRATION,
          title: "👤 مستخدم جديد (هاتف)",
          message: `تسجيل جديد بالهاتف: ${name} (${normalizedEmail})`,
          style: NOTIFICATION_STYLES.TOAST,
          priority: NOTIFICATION_PRIORITIES.NORMAL,
          soundAlert: true,
          relatedId: result[0].id,
          metadata: { parentId: result[0].id, parentName: name, email: normalizedEmail, phoneNumber },
        });
      } catch (err) {
        console.error("Failed to send admin registration notification:", err);
      }

      const ipAddress = req.ip || "0.0.0.0";
      const canSend = await isOtpRequestAllowed(normalizedEmail, ipAddress);
      if (!canSend) {
        trackOtpEvent("rate_limited", {
          reason: "request_limit",
          purpose: "register",
          destination: normalizedEmail,
          parentId: result[0].id,
          ip: ipAddress,
        });
        return respondRateLimited(res, "Too many OTP requests. Please try again later.");
      }

      const code = generateOTP();
      const codeHash = await hashOTP(code);
      const provider = await getProviderOrFallback("email");
      if (!provider) {
        return res.status(500).json(errorResponse(ErrorCode.INTERNAL_SERVER_ERROR, "No OTP provider available"));
      }

      try {
        await provider.instance.send(normalizedEmail, code);
      } catch (err: any) {
        console.error("❌ Failed to send registration OTP:", err);
        return res.status(500).json(errorResponse(
          ErrorCode.INTERNAL_SERVER_ERROR,
          "Failed to send OTP. Please try again later"
        ));
      }

      let record;
      try {
        record = await createOTPRecord(db, {
          parentId: result[0].id,
          purpose: "register",
          destination: normalizedEmail,
          provider: provider.provider,
          codeHash,
          expiresAt: new Date(Date.now() + OTP_EXPIRY_MINUTES * 60 * 1000),
          ipAddress,
        });
        await logOtpRequest(normalizedEmail, ipAddress);
        trackOtpEvent("send", {
          purpose: "register",
          method: provider.provider,
          destination: normalizedEmail,
          parentId: result[0].id,
          ip: ipAddress,
          otpId: record?.id,
        });
      } catch (dbErr: any) {
        if (dbErr?.message === "OTP_COOLDOWN") {
          trackOtpEvent("rate_limited", {
            reason: "cooldown",
            purpose: "register",
            destination: normalizedEmail,
            parentId: result[0].id,
            ip: ipAddress,
          });
          return respondOtpCooldown(res, dbErr.retryAfter || OTP_COOLDOWN_SECONDS);
        }
        console.error("❌ Failed to persist registration OTP after send:", dbErr);
        return res.status(500).json(errorResponse(
          ErrorCode.INTERNAL_SERVER_ERROR,
          "Failed to store OTP. Please request a new code."
        ));
      }

      res.json(successResponse({
        requiresOtp: true,
        email: normalizedEmail,
        otpId: record?.id,
        otpPurpose: "register",
        uniqueCode,
      }, "OTP sent successfully to your email"));
    } catch (error: any) {
      console.error("Phone registration error:", error);
      res.status(500).json(errorResponse(ErrorCode.INTERNAL_SERVER_ERROR, "Phone registration failed"));
    }
  });

  // Phone Login (SMS OTP)
  app.post("/api/auth/login-phone", loginLimiter, async (req, res) => {
    try {
      const { phoneNumber, password } = req.body;
      if (!phoneNumber || !password) {
        return res.status(400).json(errorResponse(ErrorCode.BAD_REQUEST, "Phone number and password are required"));
      }

      const result = await db.select().from(parents).where(eq(parents.phoneNumber, phoneNumber));
      if (!result[0]) {
        return res.status(401).json(errorResponse(ErrorCode.INVALID_CREDENTIALS, "Invalid credentials"));
      }

      if (result[0].lockedUntil && new Date() < new Date(result[0].lockedUntil)) {
        const retryAfter = Math.ceil((new Date(result[0].lockedUntil).getTime() - Date.now()) / 1000);
        res.set("Retry-After", String(retryAfter));
        return res.status(403).json(errorResponse(ErrorCode.FORBIDDEN, "Account locked. Please try again later."));
      }

      const passwordMatch = await bcrypt.compare(password, result[0].password);
      if (!passwordMatch) {
        const nextAttempts = (result[0].failedLoginAttempts || 0) + 1;
        const updates: { failedLoginAttempts: number; lockedUntil?: Date | null } = {
          failedLoginAttempts: nextAttempts,
        };
        let lockedUntil: Date | null = null;
        if (nextAttempts >= MAX_FAILED_LOGIN_ATTEMPTS) {
          lockedUntil = new Date(Date.now() + LOCKOUT_MINUTES * 60 * 1000);
          updates.lockedUntil = lockedUntil;
        }
        await db.update(parents).set(updates).where(eq(parents.id, result[0].id));
        if (lockedUntil) {
          res.set("Retry-After", String(LOCKOUT_MINUTES * 60));
          return res.status(403).json(errorResponse(ErrorCode.FORBIDDEN, "Account locked. Please try again later."));
        }
        return res.status(401).json(errorResponse(ErrorCode.INVALID_CREDENTIALS, "Invalid credentials"));
      }

      if (!smsOTPService.isEnabled() || !result[0].smsEnabled || !result[0].phoneNumber) {
        return res.status(400).json(errorResponse(ErrorCode.BAD_REQUEST, "SMS OTP is not enabled for this account"));
      }

      const withinLimit = await checkSMSRateLimit(result[0].id);
      const ipAddress = req.ip || "0.0.0.0";
      const canSend = await isOtpRequestAllowed(result[0].phoneNumber, ipAddress);
      if (!withinLimit || !canSend) {
        trackOtpEvent("rate_limited", {
          reason: "request_limit",
          purpose: "login",
          method: "sms",
          destination: result[0].phoneNumber,
          parentId: result[0].id,
          ip: ipAddress,
        });
        return respondRateLimited(res, "Too many SMS requests. Please try again later.");
      }

      const code = generateOTP();
      const codeHash = await hashOTP(code);
      const sendResult = await smsOTPService.sendOTP(result[0].phoneNumber, code, "login");

      if (!sendResult.success) {
        console.error("SMS send failed:", sendResult.error);
        return res.status(500).json(errorResponse(ErrorCode.INTERNAL_SERVER_ERROR, "Failed to send SMS"));
      }

      let record;
      try {
        record = await createOTPRecord(db, {
          parentId: result[0].id,
          purpose: "login",
          destination: result[0].phoneNumber,
          provider: "sms",
          codeHash,
          expiresAt: new Date(Date.now() + OTP_EXPIRY_MINUTES * 60 * 1000),
          ipAddress,
        });
        await logOtpRequest(result[0].phoneNumber, ipAddress);
        trackOtpEvent("send", {
          purpose: "login",
          method: "sms",
          destination: result[0].phoneNumber,
          parentId: result[0].id,
          ip: ipAddress,
          otpId: record?.id,
        });
      } catch (dbErr: any) {
        if (dbErr?.message === "OTP_COOLDOWN") {
          trackOtpEvent("rate_limited", {
            reason: "cooldown",
            purpose: "login",
            method: "sms",
            destination: result[0].phoneNumber,
            parentId: result[0].id,
            ip: ipAddress,
          });
          return respondOtpCooldown(res, dbErr.retryAfter || OTP_COOLDOWN_SECONDS);
        }
        console.error("❌ Failed to persist phone login OTP after send:", dbErr);
        return res.status(500).json(errorResponse(ErrorCode.INTERNAL_SERVER_ERROR, "Failed to store OTP. Please request a new code."));
      }

      res.json(successResponse({
        requiresOtp: true,
        phone: result[0].phoneNumber,
        otpId: record?.id,
      }, "SMS OTP sent successfully"));
    } catch (error: any) {
      console.error("Phone login error:", error);
      res.status(500).json(errorResponse(ErrorCode.INTERNAL_SERVER_ERROR, "Phone login failed"));
    }
  });

  // ============================================================================
  // SMS OTP Endpoints
  // ============================================================================

  // Get available OTP methods for a user
  app.get("/api/auth/otp-methods/:email", async (req, res) => {
    try {
      const normalizedEmail = normalizeEmail(req.params.email);
      const methods: string[] = ["email"];

      if (smsOTPService.isEnabled()) {
        if (!normalizedEmail) {
          return res.status(400).json(errorResponse(ErrorCode.BAD_REQUEST, "Email is required"));
        }
        const parent = await db.select().from(parents).where(eq(parents.email, normalizedEmail));
        if (parent[0]?.phoneNumber && parent[0]?.smsEnabled) {
          methods.push("sms");
        }
      }

      res.json(successResponse({ methods }, "OTP methods retrieved"));
    } catch (error: any) {
      console.error("Get OTP methods error:", error);
      res.status(500).json(errorResponse(ErrorCode.INTERNAL_SERVER_ERROR, "Failed to get OTP methods"));
    }
  });

  // Send OTP via SMS
  app.post("/api/auth/send-otp-sms", otpRequestLimiter, async (req, res) => {
    try {
      const { email, phoneNumber, purpose: requestedPurpose } = req.body;
      const normalizedEmail = normalizeEmail(email);

      if (!normalizedEmail && !phoneNumber) {
        return res.status(400).json(errorResponse(ErrorCode.BAD_REQUEST, "Email or phone number is required"));
      }

      if (!smsOTPService.isEnabled()) {
        return res.status(503).json(errorResponse(ErrorCode.INTERNAL_SERVER_ERROR, "SMS service not available"));
      }

      const parent = normalizedEmail
        ? await db.select().from(parents).where(eq(parents.email, normalizedEmail))
        : await db.select().from(parents).where(eq(parents.phoneNumber, phoneNumber));
      if (!parent[0]) {
        return res.status(404).json(errorResponse(ErrorCode.NOT_FOUND, "User not found"));
      }

      if (!parent[0].phoneNumber) {
        return res.status(400).json(errorResponse(ErrorCode.BAD_REQUEST, "Phone number not configured for SMS OTP"));
      }

      const purpose = requestedPurpose || "login";
      const allowedPurposes = new Set(["login", "register", "change_password"]);
      if (!allowedPurposes.has(purpose)) {
        return res.status(400).json(errorResponse(ErrorCode.BAD_REQUEST, "Invalid OTP purpose"));
      }

      // Check rate limit
      const withinLimit = await checkSMSRateLimit(parent[0].id);
      const ipAddress = req.ip || "0.0.0.0";
      const canSend = await isOtpRequestAllowed(parent[0].phoneNumber, ipAddress);
      if (!withinLimit || !canSend) {
        trackOtpEvent("rate_limited", {
          reason: "request_limit",
          purpose,
          method: "sms",
          destination: parent[0].phoneNumber,
          parentId: parent[0].id,
          ip: ipAddress,
        });
        return respondRateLimited(res, "Too many SMS requests. Please try again later.");
      }

      // Generate and send OTP
      const code = generateOTP();
      const codeHash = await hashOTP(code);
      const result = await smsOTPService.sendOTP(parent[0].phoneNumber, code, purpose);

      if (!result.success) {
        console.error("SMS send failed:", result.error);
        return res.status(500).json(errorResponse(ErrorCode.INTERNAL_SERVER_ERROR, "Failed to send SMS"));
      }

      // Store OTP in database
      let record;
      try {
        record = await createOTPRecord(db, {
          parentId: parent[0].id,
          purpose,
          destination: parent[0].phoneNumber,
          provider: "sms",
          codeHash,
          expiresAt: new Date(Date.now() + OTP_EXPIRY_MINUTES * 60 * 1000),
          ipAddress,
        });
        await logOtpRequest(parent[0].phoneNumber, ipAddress);
        trackOtpEvent("send", {
          purpose,
          method: "sms",
          destination: parent[0].phoneNumber,
          parentId: parent[0].id,
          ip: ipAddress,
          otpId: record?.id,
        });
      } catch (dbErr: any) {
        if (dbErr?.message === "OTP_COOLDOWN") {
          trackOtpEvent("rate_limited", {
            reason: "cooldown",
            purpose,
            method: "sms",
            destination: parent[0].phoneNumber,
            parentId: parent[0].id,
            ip: ipAddress,
          });
          return respondOtpCooldown(res, dbErr.retryAfter || OTP_COOLDOWN_SECONDS);
        }
        console.error("❌ Failed to persist OTP after send:", dbErr);
        return res.status(500).json(errorResponse(ErrorCode.INTERNAL_SERVER_ERROR, "Failed to store OTP. Please request a new code."));
      }

      console.log(`[SMS_OTP] SMS sent to ${maskPhoneNumber(parent[0].phoneNumber)}`);

      res.json(successResponse({
        method: "sms",
        destination: maskPhoneNumber(parent[0].phoneNumber),
        expiresIn: 300,
        otpId: record?.id,
        purpose,
      }, "SMS OTP sent successfully"));
    } catch (error: any) {
      console.error("Send SMS OTP error:", error);
      res.status(500).json(errorResponse(ErrorCode.INTERNAL_SERVER_ERROR, "Internal server error"));
    }
  });

  // Verify OTP sent via SMS
  app.post("/api/auth/verify-otp-sms", otpVerifyLimiter, async (req, res) => {
    try {
      const { email, phoneNumber, code, otpId, purpose: requestedPurpose } = req.body;
      const normalizedEmail = normalizeEmail(email);

      if ((!normalizedEmail && !phoneNumber) || !code) {
        return res.status(400).json(errorResponse(ErrorCode.BAD_REQUEST, "Email or phone number and code are required"));
      }

      const allowedPurposes = new Set(["login", "register", "change_password"]);
      if (requestedPurpose && !allowedPurposes.has(requestedPurpose)) {
        return res.status(400).json(errorResponse(ErrorCode.BAD_REQUEST, "Invalid OTP purpose"));
      }

      const parent = normalizedEmail
        ? await db.select().from(parents).where(eq(parents.email, normalizedEmail))
        : await db.select().from(parents).where(eq(parents.phoneNumber, phoneNumber));
      if (!parent[0]) {
        return res.status(404).json(errorResponse(ErrorCode.NOT_FOUND, "User not found"));
      }

      const destination = phoneNumber || parent[0].phoneNumber;
      if (!destination) {
        return res.status(400).json(errorResponse(ErrorCode.BAD_REQUEST, "Phone number not configured for SMS OTP"));
      }

      const pendingCondition = or(eq(otpCodes.status, "pending"), isNull(otpCodes.status));

      if (requestedPurpose === "change_password") {
        let record: typeof otpCodes.$inferSelect | undefined;

        if (otpId) {
          const byId = await db
            .select()
            .from(otpCodes)
            .where(
              and(
                eq(otpCodes.parentId, parent[0].id),
                eq(otpCodes.purpose, "change_password"),
                eq(otpCodes.method, "sms"),
                eq(otpCodes.destination, destination),
                eq(otpCodes.id, otpId),
                pendingCondition
              )
            )
            .limit(1);
          record = byId[0];
        } else {
          const latest = await db
            .select()
            .from(otpCodes)
            .where(
              and(
                eq(otpCodes.parentId, parent[0].id),
                eq(otpCodes.purpose, "change_password"),
                eq(otpCodes.method, "sms"),
                eq(otpCodes.destination, destination),
                pendingCondition
              )
            )
            .orderBy(desc(otpCodes.createdAt))
            .limit(1);
          record = latest[0];
        }

        if (!record) {
          trackOtpEvent("verify_failed", {
            purpose: "change_password",
            method: "sms",
            destination,
            parentId: parent[0].id,
            reason: "not_found",
            otpId,
          });
          return res.status(400).json(errorResponse(ErrorCode.BAD_REQUEST, "Invalid OTP"));
        }

        if (!validateExpiry(record.expiresAt)) {
          await db.update(otpCodes).set({ status: "expired" }).where(eq(otpCodes.id, record.id));
          trackOtpEvent("verify_failed", {
            purpose: "change_password",
            method: "sms",
            destination,
            parentId: parent[0].id,
            reason: "expired",
            otpId: record.id,
          });
          return res.status(400).json(errorResponse(ErrorCode.OTP_EXPIRED, "OTP expired"));
        }

        const ok = await compareOTP(code, record.code);
        if (!ok) {
          const attempts = await incrementAttemptsAtomic(db, record.id);
          if (attempts !== null && attempts >= MAX_ATTEMPTS) {
            await blockOTP(db, record.id);
            trackOtpEvent("blocked", {
              purpose: "change_password",
              method: "sms",
              destination,
              parentId: parent[0].id,
              reason: "max_attempts",
              otpId: record.id,
            });
          }
          if (attempts === null) {
            trackOtpEvent("verify_failed", {
              purpose: "change_password",
              method: "sms",
              destination,
              parentId: parent[0].id,
              reason: "used",
              otpId: record.id,
            });
            return res.status(400).json(errorResponse(ErrorCode.BAD_REQUEST, "OTP already used"));
          }
          trackOtpEvent("verify_failed", {
            purpose: "change_password",
            method: "sms",
            destination,
            parentId: parent[0].id,
            reason: "invalid",
            otpId: record.id,
          });
          return res.status(400).json(errorResponse(ErrorCode.BAD_REQUEST, "Invalid OTP"));
        }

        trackOtpEvent("verify_success", {
          purpose: "change_password",
          method: "sms",
          destination,
          parentId: parent[0].id,
          otpId: record.id,
        });

        return res.json(successResponse({ verified: true }, "OTP verified"));
      }

      const purposeCondition = requestedPurpose
        ? eq(otpCodes.purpose, requestedPurpose)
        : or(
            eq(otpCodes.purpose, "login"),
            eq(otpCodes.purpose, "register")
          );
      const purposeLabel = requestedPurpose || "login_or_register";

      let otpRecord;
      if (otpId) {
        otpRecord = await db
          .select()
          .from(otpCodes)
          .where(
            and(
              eq(otpCodes.parentId, parent[0].id),
              purposeCondition,
              eq(otpCodes.method, "sms"),
              eq(otpCodes.destination, destination),
              eq(otpCodes.id, otpId),
              pendingCondition
            )
          )
          .limit(1);
      } else {
        otpRecord = await db
          .select()
          .from(otpCodes)
          .where(
            and(
              eq(otpCodes.parentId, parent[0].id),
              purposeCondition,
              eq(otpCodes.method, "sms"),
              eq(otpCodes.destination, destination),
              pendingCondition
            )
          )
          .orderBy(desc(otpCodes.createdAt))
          .limit(1);
      }

      const record = otpRecord[0];
      if (!record || !validateExpiry(record.expiresAt)) {
        if (record) {
          await db.update(otpCodes).set({ status: "expired" }).where(eq(otpCodes.id, record.id));
          trackOtpEvent("verify_failed", {
            purpose: record.purpose,
            method: "sms",
            destination,
            parentId: record.parentId || undefined,
            reason: "expired",
            otpId: record.id,
          });
        }
        if (!record) {
          trackOtpEvent("verify_failed", {
            purpose: purposeLabel,
            method: "sms",
            destination,
            parentId: parent[0].id,
            reason: "not_found",
            otpId,
          });
        }
        return res.status(400).json(errorResponse(ErrorCode.OTP_EXPIRED, "Invalid or expired OTP"));
      }

      const ok = await compareOTP(code, record.code);
      if (!ok) {
        const attempts = await incrementAttemptsAtomic(db, record.id);
        if (attempts !== null && attempts >= MAX_ATTEMPTS) {
          await blockOTP(db, record.id);
          trackOtpEvent("blocked", {
            purpose: record.purpose,
            method: "sms",
            destination,
            parentId: record.parentId || undefined,
            reason: "max_attempts",
            otpId: record.id,
          });
        }
        if (attempts === null) {
          trackOtpEvent("verify_failed", {
            purpose: record.purpose,
            method: "sms",
            destination,
            parentId: record.parentId || undefined,
            reason: "used",
            otpId: record.id,
          });
          return res.status(400).json(errorResponse(ErrorCode.BAD_REQUEST, "OTP already used"));
        }
        trackOtpEvent("verify_failed", {
          purpose: record.purpose,
          method: "sms",
          destination,
          parentId: record.parentId || undefined,
          reason: "invalid",
          otpId: record.id,
        });
        return res.status(400).json(errorResponse(ErrorCode.BAD_REQUEST, "Invalid OTP"));
      }

      const verifiedId = await markVerifiedAtomic(db, record.id);
      if (!verifiedId) {
        trackOtpEvent("verify_failed", {
          purpose: record.purpose,
          method: "sms",
          destination,
          parentId: record.parentId || undefined,
          reason: "used",
          otpId: record.id,
        });
        return res.status(400).json(errorResponse(ErrorCode.BAD_REQUEST, "OTP already used"));
      }

      await db.update(parents).set({ failedLoginAttempts: 0, lockedUntil: null }).where(eq(parents.id, parent[0].id));

      // Create session token
      const token = jwt.sign(
        { userId: parent[0].id, type: "parent" },
        JWT_SECRET,
        { expiresIn: "30d" }
      );

      console.log(`[SMS_OTP] OTP verified successfully for user ${parent[0].id}`);

      trackOtpEvent("verify_success", {
        purpose: record.purpose,
        method: "sms",
        destination,
        parentId: record.parentId || undefined,
        otpId: record.id,
      });

      res.json(successResponse({
        token,
        parentId: parent[0].id,
        userId: parent[0].id,
        uniqueCode: parent[0].uniqueCode,
        hasPin: !!parent[0].pin,
        user: {
          id: parent[0].id,
          email: parent[0].email,
        },
      }, "SMS OTP verified"));
    } catch (error: any) {
      console.error("Verify SMS OTP error:", error);
      res.status(500).json(errorResponse(ErrorCode.INTERNAL_SERVER_ERROR, "Internal server error"));
    }
  });

  // Send OTP via SMS for password reset
  app.post("/api/auth/forgot-password-sms", otpRequestLimiter, async (req, res) => {
    try {
      const { email, phoneNumber } = req.body;
      const normalizedEmail = normalizeEmail(email);

      if (!normalizedEmail && !phoneNumber) {
        return res.status(400).json(errorResponse(ErrorCode.BAD_REQUEST, "Email or phone number is required"));
      }

      if (!smsOTPService.isEnabled()) {
        return res.json(successResponse({ sent: true }, "OTP sent to your email"));
      }

      const parent = normalizedEmail
        ? await db.select().from(parents).where(eq(parents.email, normalizedEmail))
        : await db.select().from(parents).where(eq(parents.phoneNumber, phoneNumber));

      // Always return success to prevent user enumeration
      if (!parent[0] || !parent[0].phoneNumber || !parent[0].smsEnabled) {
        return res.json(successResponse({ sent: true }, "If SMS is enabled, you will receive a code"));
      }

      // Check rate limit
      const withinLimit = await checkSMSRateLimit(parent[0].id);
      const ipAddress = req.ip || "0.0.0.0";
      const canSend = await isOtpRequestAllowed(parent[0].phoneNumber, ipAddress);
      if (!withinLimit || !canSend) {
        trackOtpEvent("rate_limited", {
          reason: "request_limit",
          purpose: "reset",
          method: "sms",
          destination: parent[0].phoneNumber,
          parentId: parent[0].id,
          ip: ipAddress,
        });
        return res.json(successResponse({ sent: true }, "If SMS is enabled, you will receive a code"));
      }

      // Generate and send OTP
      const code = generateOTP();
      const codeHash = await hashOTP(code);
      const result = await smsOTPService.sendOTP(
        parent[0].phoneNumber,
        code,
        "password-reset"
      );

      if (!result.success) {
        console.error("SMS send failed for password reset:", result.error);
        return res.json(successResponse({ sent: true }, "If SMS is enabled, you will receive a code"));
      }

      // Store OTP in database (longer expiry for password reset)
      let record;
      try {
        record = await createOTPRecord(db, {
          parentId: parent[0].id,
          purpose: "reset",
          destination: parent[0].phoneNumber,
          provider: "sms",
          codeHash,
          expiresAt: new Date(Date.now() + 10 * 60 * 1000),
          ipAddress,
        });
        await logOtpRequest(parent[0].phoneNumber, ipAddress);
        trackOtpEvent("send", {
          purpose: "reset",
          method: "sms",
          destination: parent[0].phoneNumber,
          parentId: parent[0].id,
          ip: ipAddress,
          otpId: record?.id,
        });
      } catch (dbErr: any) {
        if (dbErr?.message === "OTP_COOLDOWN") {
          trackOtpEvent("rate_limited", {
            reason: "cooldown",
            purpose: "reset",
            method: "sms",
            destination: parent[0].phoneNumber,
            parentId: parent[0].id,
            ip: ipAddress,
          });
          return respondOtpCooldown(res, dbErr.retryAfter || OTP_COOLDOWN_SECONDS);
        }
        console.error("❌ Failed to persist OTP after send:", dbErr);
        return res.json(successResponse({ sent: true }, "If SMS is enabled, you will receive a code"));
      }

      console.log(
        `[SMS_OTP] Password reset SMS sent to ${maskPhoneNumber(parent[0].phoneNumber)}`
      );

      res.json(successResponse({ sent: true, otpId: record?.id }, "If SMS is enabled, you will receive a code"));
    } catch (error: any) {
      console.error("Forgot password SMS error:", error);
      res.json(successResponse({ sent: true }, "If SMS is enabled, you will receive a code"));
    }
  });

  // Verify SMS OTP for password reset
  app.post("/api/auth/verify-reset-otp-sms", otpVerifyLimiter, async (req, res) => {
    try {
      const { email, phoneNumber, code, otpId } = req.body;
      const normalizedEmail = normalizeEmail(email);

      if ((!normalizedEmail && !phoneNumber) || !code) {
        return res.status(400).json(errorResponse(ErrorCode.BAD_REQUEST, "Email or phone number and code are required"));
      }

      const parent = normalizedEmail
        ? await db.select().from(parents).where(eq(parents.email, normalizedEmail))
        : await db.select().from(parents).where(eq(parents.phoneNumber, phoneNumber));
      if (!parent[0]) {
        return res.status(404).json(errorResponse(ErrorCode.NOT_FOUND, "User not found"));
      }

      const destination = phoneNumber || parent[0].phoneNumber;
      if (!destination) {
        return res.status(400).json(errorResponse(ErrorCode.BAD_REQUEST, "Phone number not configured for SMS OTP"));
      }

      const pendingCondition = or(eq(otpCodes.status, "pending"), isNull(otpCodes.status));

      let otpRecord;
      if (otpId) {
        otpRecord = await db
          .select()
          .from(otpCodes)
          .where(
            and(
              eq(otpCodes.parentId, parent[0].id),
              eq(otpCodes.purpose, "reset"),
              eq(otpCodes.method, "sms"),
              eq(otpCodes.destination, destination),
              eq(otpCodes.id, otpId),
              pendingCondition
            )
          )
          .limit(1);
      } else {
        otpRecord = await db
          .select()
          .from(otpCodes)
          .where(
            and(
              eq(otpCodes.parentId, parent[0].id),
              eq(otpCodes.purpose, "reset"),
              eq(otpCodes.method, "sms"),
              eq(otpCodes.destination, destination),
              pendingCondition
            )
          )
          .orderBy(desc(otpCodes.createdAt))
          .limit(1);
      }

      const record = otpRecord[0];
      if (!record || !validateExpiry(record.expiresAt)) {
        if (record) {
          await db.update(otpCodes).set({ status: "expired" }).where(eq(otpCodes.id, record.id));
          trackOtpEvent("verify_failed", {
            purpose: "reset",
            method: "sms",
            destination,
            parentId: record.parentId || undefined,
            reason: "expired",
            otpId: record.id,
          });
        }
        if (!record) {
          trackOtpEvent("verify_failed", {
            purpose: "reset",
            method: "sms",
            destination,
            parentId: parent[0].id,
            reason: "not_found",
            otpId,
          });
        }
        return res.status(400).json(errorResponse(ErrorCode.OTP_EXPIRED, "Invalid or expired OTP"));
      }

      const ok = await compareOTP(code, record.code);
      if (!ok) {
        const attempts = await incrementAttemptsAtomic(db, record.id);
        if (attempts !== null && attempts >= MAX_ATTEMPTS) {
          await blockOTP(db, record.id);
          trackOtpEvent("blocked", {
            purpose: "reset",
            method: "sms",
            destination,
            parentId: record.parentId || undefined,
            reason: "max_attempts",
            otpId: record.id,
          });
        }
        if (attempts === null) {
          trackOtpEvent("verify_failed", {
            purpose: "reset",
            method: "sms",
            destination,
            parentId: record.parentId || undefined,
            reason: "used",
            otpId: record.id,
          });
          return res.status(400).json(errorResponse(ErrorCode.BAD_REQUEST, "OTP already used"));
        }
        trackOtpEvent("verify_failed", {
          purpose: "reset",
          method: "sms",
          destination,
          parentId: record.parentId || undefined,
          reason: "invalid",
          otpId: record.id,
        });
        return res.status(400).json(errorResponse(ErrorCode.BAD_REQUEST, "Invalid OTP"));
      }

      trackOtpEvent("verify_success", {
        purpose: "reset",
        method: "sms",
        destination,
        parentId: record.parentId || undefined,
        otpId: record.id,
      });
      res.json(successResponse({ verified: true }, "OTP verified"));
    } catch (error: any) {
      console.error("Verify reset OTP SMS error:", error);
      res.status(500).json(errorResponse(ErrorCode.INTERNAL_SERVER_ERROR, "OTP verification failed"));
    }
  });

  // Reset Password via SMS OTP
  app.post("/api/auth/reset-password-sms", async (req, res) => {
    try {
      const { email, phoneNumber, code, newPassword, otpId } = req.body;
      const normalizedEmail = normalizeEmail(email);

      if ((!normalizedEmail && !phoneNumber) || !code || !newPassword) {
        return res.status(400).json(errorResponse(ErrorCode.BAD_REQUEST, "Phone number or email, OTP, and new password are required"));
      }

      if (newPassword.length < 8) {
        return res.status(400).json(errorResponse(ErrorCode.BAD_REQUEST, "Password must be at least 8 characters"));
      }

      const parent = normalizedEmail
        ? await db.select().from(parents).where(eq(parents.email, normalizedEmail))
        : await db.select().from(parents).where(eq(parents.phoneNumber, phoneNumber));
      if (!parent[0]) {
        return res.status(404).json(errorResponse(ErrorCode.NOT_FOUND, "User not found"));
      }

      const destination = phoneNumber || parent[0].phoneNumber;
      if (!destination) {
        return res.status(400).json(errorResponse(ErrorCode.BAD_REQUEST, "Phone number not configured for SMS OTP"));
      }

      const pendingCondition = or(eq(otpCodes.status, "pending"), isNull(otpCodes.status));
      let otpRecord;

      if (otpId) {
        otpRecord = await db
          .select()
          .from(otpCodes)
          .where(
            and(
              eq(otpCodes.parentId, parent[0].id),
              eq(otpCodes.purpose, "reset"),
              eq(otpCodes.method, "sms"),
              eq(otpCodes.destination, destination),
              eq(otpCodes.id, otpId),
              pendingCondition
            )
          )
          .limit(1);
      } else {
        otpRecord = await db
          .select()
          .from(otpCodes)
          .where(
            and(
              eq(otpCodes.parentId, parent[0].id),
              eq(otpCodes.purpose, "reset"),
              eq(otpCodes.method, "sms"),
              eq(otpCodes.destination, destination),
              pendingCondition
            )
          )
          .orderBy(desc(otpCodes.createdAt))
          .limit(1);
      }

      const record = otpRecord[0];
      if (!record || !validateExpiry(record.expiresAt)) {
        if (record) {
          await db.update(otpCodes).set({ status: "expired" }).where(eq(otpCodes.id, record.id));
          trackOtpEvent("verify_failed", {
            purpose: "reset",
            method: "sms",
            destination,
            parentId: record.parentId || undefined,
            reason: "expired",
            otpId: record.id,
          });
        }
        if (!record) {
          trackOtpEvent("verify_failed", {
            purpose: "reset",
            method: "sms",
            destination,
            parentId: parent[0].id,
            reason: "not_found",
            otpId,
          });
        }
        return res.status(400).json(errorResponse(ErrorCode.OTP_EXPIRED, "Invalid or expired OTP"));
      }

      const ok = await compareOTP(code, record.code);
      if (!ok) {
        const attempts = await incrementAttemptsAtomic(db, record.id);
        if (attempts !== null && attempts >= MAX_ATTEMPTS) {
          await blockOTP(db, record.id);
          trackOtpEvent("blocked", {
            purpose: "reset",
            method: "sms",
            destination,
            parentId: record.parentId || undefined,
            reason: "max_attempts",
            otpId: record.id,
          });
        }
        if (attempts === null) {
          trackOtpEvent("verify_failed", {
            purpose: "reset",
            method: "sms",
            destination,
            parentId: record.parentId || undefined,
            reason: "used",
            otpId: record.id,
          });
          return res.status(400).json(errorResponse(ErrorCode.BAD_REQUEST, "OTP already used"));
        }
        trackOtpEvent("verify_failed", {
          purpose: "reset",
          method: "sms",
          destination,
          parentId: record.parentId || undefined,
          reason: "invalid",
          otpId: record.id,
        });
        return res.status(400).json(errorResponse(ErrorCode.BAD_REQUEST, "Invalid OTP"));
      }

      const hashedPassword = await bcrypt.hash(newPassword, 10);
      await db.update(parents).set({ password: hashedPassword }).where(eq(parents.id, parent[0].id));

      const verifiedId = await markVerifiedAtomic(db, record.id);
      if (!verifiedId) {
        trackOtpEvent("verify_failed", {
          purpose: "reset",
          method: "sms",
          destination,
          parentId: record.parentId || undefined,
          reason: "used",
          otpId: record.id,
        });
        return res.status(400).json(errorResponse(ErrorCode.BAD_REQUEST, "OTP already used"));
      }
      trackOtpEvent("verify_success", {
        purpose: "reset",
        method: "sms",
        destination,
        parentId: record.parentId || undefined,
        otpId: record.id,
        action: "consume",
      });
      res.json(successResponse({ reset: true }, "Password reset successful"));
    } catch (error: any) {
      console.error("Reset password SMS error:", error);
      res.status(500).json(errorResponse(ErrorCode.INTERNAL_SERVER_ERROR, "Password reset failed"));
    }
  });

  // ============================================================================
  // Trusted Device / Remember Me Endpoints
  // ============================================================================

  // Refresh session using trusted device token (bypass OTP)
  app.post("/api/auth/device/refresh", async (req, res) => {
    try {
      const { deviceId } = req.body;
      const refreshToken = req.cookies?.device_refresh;
      
      if (!deviceId || !refreshToken) {
        return res.status(400).json(errorResponse(ErrorCode.BAD_REQUEST, "Device credentials missing"));
      }

      const deviceIdHash = crypto.createHash("sha256").update(deviceId).digest("hex");
      const refreshTokenHash = crypto.createHash("sha256").update(refreshToken).digest("hex");

      // Find the trusted device
      const device = await db
        .select()
        .from(trustedDevices)
        .where(and(
          eq(trustedDevices.deviceIdHash, deviceIdHash),
          eq(trustedDevices.refreshTokenHash, refreshTokenHash),
          isNull(trustedDevices.revokedAt)
        ));

      if (!device[0]) {
        return res.status(401).json(errorResponse(ErrorCode.INVALID_CREDENTIALS, "Invalid device credentials"));
      }

      // Check expiration
      if (new Date() > device[0].expiresAt) {
        // Mark as revoked
        await db
          .update(trustedDevices)
          .set({ revokedAt: new Date() })
          .where(eq(trustedDevices.id, device[0].id));
        return res.status(401).json(errorResponse(ErrorCode.INVALID_CREDENTIALS, "Device token expired"));
      }

      // Get parent info
      const parent = await db.select().from(parents).where(eq(parents.id, device[0].parentId));
      if (!parent[0]) {
        return res.status(404).json(errorResponse(ErrorCode.NOT_FOUND, "User not found"));
      }

      if (parent[0].lockedUntil && new Date() < new Date(parent[0].lockedUntil)) {
        const retryAfter = Math.ceil((new Date(parent[0].lockedUntil).getTime() - Date.now()) / 1000);
        res.set("Retry-After", String(retryAfter));
        return res.status(403).json(errorResponse(ErrorCode.FORBIDDEN, "Account locked. Please try again later."));
      }

      // Generate new refresh token (token rotation for security)
      const newRefreshToken = crypto.randomBytes(48).toString("hex");
      const newRefreshTokenHash = crypto.createHash("sha256").update(newRefreshToken).digest("hex");

      // Update device with new token and last used time
      await db
        .update(trustedDevices)
        .set({
          refreshTokenHash: newRefreshTokenHash,
          lastUsedAt: new Date(),
          userAgent: req.get("user-agent"),
        })
        .where(eq(trustedDevices.id, device[0].id));

      // Create new session
      const sessionToken = crypto.randomBytes(32).toString("hex");
      const tokenHash = crypto.createHash("sha256").update(sessionToken).digest("hex");
      const sessionExpiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000);

      await db.insert(sessions).values({
        parentId: parent[0].id,
        deviceId,
        tokenHash,
        ipAddress: req.ip,
        userAgent: req.get("user-agent"),
        isActive: true,
        expiresAt: sessionExpiresAt,
      }).onConflictDoUpdate({
        target: [sessions.parentId, sessions.deviceId],
        set: {
          tokenHash,
          ipAddress: req.ip,
          userAgent: req.get("user-agent"),
          isActive: true,
          expiresAt: sessionExpiresAt,
        },
      }).catch(() => {
        return db.insert(sessions).values({
          parentId: parent[0].id,
          deviceId,
          tokenHash,
          ipAddress: req.ip,
          userAgent: req.get("user-agent"),
          isActive: true,
          expiresAt: sessionExpiresAt,
        });
      });

      // Log successful auto-login
      await db.insert(loginHistory).values({
        parentId: parent[0].id,
        deviceId,
        deviceHash: computeDeviceHash(deviceId, req),
        success: true,
        ipAddress: req.ip,
        userAgent: req.get("user-agent"),
        suspiciousActivity: false,
      });

      // Create JWT
      const jwtToken = jwt.sign({ userId: parent[0].id, parentId: parent[0].id, type: "parent" }, JWT_SECRET, { expiresIn: "30d" });

      await db.update(parents).set({ failedLoginAttempts: 0, lockedUntil: null }).where(eq(parents.id, parent[0].id));

      // Set new refresh token as httpOnly cookie (token rotation)
      res.cookie("device_refresh", newRefreshToken, {
        httpOnly: true,
        secure: process.env["NODE_ENV"] === "production",
        sameSite: "strict",
        maxAge: DEVICE_TOKEN_EXPIRY_DAYS * 24 * 60 * 60 * 1000,
        path: "/api/auth/device",
      });

      res.json(successResponse({
        token: jwtToken,
        sessionToken,
        parentId: parent[0].id,
        deviceTrusted: true,
      }, "Session refreshed successfully"));
    } catch (error: any) {
      console.error("Device refresh error:", error);
      res.status(500).json(errorResponse(ErrorCode.INTERNAL_SERVER_ERROR, "Device refresh failed"));
    }
  });

  // Get list of trusted devices
  app.get("/api/auth/trusted-devices", authMiddleware, async (req: any, res) => {
    try {
      const parentId = req.user.userId;

      const devices = await db
        .select({
          id: trustedDevices.id,
          deviceLabel: trustedDevices.deviceLabel,
          lastUsedAt: trustedDevices.lastUsedAt,
          createdAt: trustedDevices.createdAt,
          userAgent: trustedDevices.userAgent,
        })
        .from(trustedDevices)
        .where(and(
          eq(trustedDevices.parentId, parentId),
          isNull(trustedDevices.revokedAt)
        ));

      res.json(successResponse({ devices }, "Trusted devices retrieved"));
    } catch (error: any) {
      console.error("Get trusted devices error:", error);
      res.status(500).json(errorResponse(ErrorCode.INTERNAL_SERVER_ERROR, "Failed to get trusted devices"));
    }
  });

  // Revoke a trusted device
  app.post("/api/auth/trusted-devices/revoke", authMiddleware, async (req: any, res) => {
    try {
      const parentId = req.user.userId;
      const { deviceId } = req.body;

      if (!deviceId) {
        return res.status(400).json(errorResponse(ErrorCode.BAD_REQUEST, "Device ID is required"));
      }

      // Verify device belongs to parent
      const device = await db
        .select()
        .from(trustedDevices)
        .where(and(
          eq(trustedDevices.id, deviceId),
          eq(trustedDevices.parentId, parentId)
        ));

      if (!device[0]) {
        return res.status(404).json(errorResponse(ErrorCode.NOT_FOUND, "Device not found"));
      }

      // Revoke device
      await db
        .update(trustedDevices)
        .set({ revokedAt: new Date() })
        .where(eq(trustedDevices.id, deviceId));

      res.json(successResponse({ revoked: true }, "Device revoked successfully"));
    } catch (error: any) {
      console.error("Revoke device error:", error);
      res.status(500).json(errorResponse(ErrorCode.INTERNAL_SERVER_ERROR, "Failed to revoke device"));
    }
  });

  // Revoke all trusted devices (e.g., on password change)
  app.post("/api/auth/trusted-devices/revoke-all", authMiddleware, async (req: any, res) => {
    try {
      const parentId = req.user.userId;

      await db
        .update(trustedDevices)
        .set({ revokedAt: new Date() })
        .where(and(
          eq(trustedDevices.parentId, parentId),
          isNull(trustedDevices.revokedAt)
        ));

      res.json(successResponse({ revoked: true }, "All devices revoked successfully"));
    } catch (error: any) {
      console.error("Revoke all devices error:", error);
      res.status(500).json(errorResponse(ErrorCode.INTERNAL_SERVER_ERROR, "Failed to revoke devices"));
    }
  });

  // Get active social login providers (public API - no auth required)
  app.get("/api/auth/social-providers", async (req, res) => {
    try {
      const providers = await db
        .select({
          id: socialLoginProviders.id,
          provider: socialLoginProviders.provider,
          displayName: socialLoginProviders.displayName,
          displayNameAr: socialLoginProviders.displayNameAr,
          iconUrl: socialLoginProviders.iconUrl,
          iconName: socialLoginProviders.iconName,
          sortOrder: socialLoginProviders.sortOrder,
        })
        .from(socialLoginProviders)
        .where(eq(socialLoginProviders.isActive, true))
        .orderBy(socialLoginProviders.sortOrder);

      res.json(successResponse(providers, "Active social providers retrieved"));
    } catch (error: any) {
      console.error("Get social providers error:", error);
      res.status(500).json(errorResponse(ErrorCode.INTERNAL_SERVER_ERROR, "Failed to get social providers"));
    }
  });

  // Get active OTP providers (public API - no auth required)
  app.get("/api/auth/otp-providers", async (req, res) => {
    try {
      const providers = await db
        .select({
          id: otpProviders.id,
          provider: otpProviders.provider,
          displayName: otpProviders.displayName,
          displayNameAr: otpProviders.displayNameAr,
          description: otpProviders.description,
          descriptionAr: otpProviders.descriptionAr,
          iconName: otpProviders.iconName,
          sortOrder: otpProviders.sortOrder,
          codeLength: otpProviders.codeLength,
          expiryMinutes: otpProviders.expiryMinutes,
          maxAttempts: otpProviders.maxAttempts,
          cooldownMinutes: otpProviders.cooldownMinutes,
        })
        .from(otpProviders)
        .where(eq(otpProviders.isActive, true))
        .orderBy(otpProviders.sortOrder);

      res.json(successResponse(providers, "Active OTP providers retrieved"));
    } catch (error: any) {
      console.error("Get OTP providers error:", error);
      res.status(500).json(errorResponse(ErrorCode.INTERNAL_SERVER_ERROR, "Failed to get OTP providers"));
    }
  });

  // OAuth redirect endpoint (initiates OAuth flow)
  app.get("/api/auth/oauth/:provider", async (req, res) => {
    try {
      const { provider } = req.params;
      
      const providerConfig = await db
        .select()
        .from(socialLoginProviders)
        .where(and(
          eq(socialLoginProviders.provider, provider),
          eq(socialLoginProviders.isActive, true)
        ));

      if (!providerConfig[0]) {
        return res.status(404).json(errorResponse(ErrorCode.NOT_FOUND, "Provider not found or not active"));
      }

      const config = providerConfig[0];
      
      if (!config.clientId) {
        return res.status(400).json(errorResponse(ErrorCode.BAD_REQUEST, "Provider not configured"));
      }

      // Generate state for CSRF protection
      const state = crypto.randomBytes(16).toString("hex");
      
      // Store state in session or cookie for validation
      res.cookie("oauth_state", state, { 
        httpOnly: true, 
        secure: process.env["NODE_ENV"] === "production",
        maxAge: 10 * 60 * 1000 // 10 minutes
      });

      // Build OAuth URL based on provider
      let authUrl = "";
      const redirectUri = config.redirectUri || `${req.protocol}://${req.get("host")}/api/auth/oauth/${provider}/callback`;
      const scopes = config.scopes || "email profile";

      switch (provider) {
        case "google":
          authUrl = `https://accounts.google.com/o/oauth2/v2/auth?client_id=${config.clientId}&redirect_uri=${encodeURIComponent(redirectUri)}&response_type=code&scope=${encodeURIComponent(scopes)}&state=${state}&access_type=offline&prompt=consent`;
          break;
        case "facebook":
          authUrl = `https://www.facebook.com/v18.0/dialog/oauth?client_id=${config.clientId}&redirect_uri=${encodeURIComponent(redirectUri)}&scope=${encodeURIComponent(scopes)}&state=${state}`;
          break;
        case "apple":
          authUrl = `https://appleid.apple.com/auth/authorize?client_id=${config.clientId}&redirect_uri=${encodeURIComponent(redirectUri)}&response_type=code&scope=${encodeURIComponent(scopes)}&state=${state}&response_mode=form_post`;
          break;
        case "twitter":
          authUrl = `https://twitter.com/i/oauth2/authorize?client_id=${config.clientId}&redirect_uri=${encodeURIComponent(redirectUri)}&response_type=code&scope=${encodeURIComponent(scopes || "tweet.read users.read")}&state=${state}&code_challenge=challenge&code_challenge_method=plain`;
          break;
        case "github":
          authUrl = `https://github.com/login/oauth/authorize?client_id=${config.clientId}&redirect_uri=${encodeURIComponent(redirectUri)}&scope=${encodeURIComponent(scopes || "user:email")}&state=${state}`;
          break;
        case "microsoft":
          authUrl = `https://login.microsoftonline.com/common/oauth2/v2.0/authorize?client_id=${config.clientId}&redirect_uri=${encodeURIComponent(redirectUri)}&response_type=code&scope=${encodeURIComponent(scopes || "openid email profile")}&state=${state}`;
          break;
        case "linkedin":
          authUrl = `https://www.linkedin.com/oauth/v2/authorization?client_id=${config.clientId}&redirect_uri=${encodeURIComponent(redirectUri)}&response_type=code&scope=${encodeURIComponent(scopes || "r_emailaddress r_liteprofile")}&state=${state}`;
          break;
        case "discord":
          authUrl = `https://discord.com/api/oauth2/authorize?client_id=${config.clientId}&redirect_uri=${encodeURIComponent(redirectUri)}&response_type=code&scope=${encodeURIComponent(scopes || "identify email")}&state=${state}`;
          break;
        default:
          return res.status(400).json(errorResponse(ErrorCode.BAD_REQUEST, "Unsupported provider"));
      }

      res.redirect(authUrl);
    } catch (error: any) {
      console.error("OAuth redirect error:", error);
      res.status(500).json(errorResponse(ErrorCode.INTERNAL_SERVER_ERROR, "Failed to initiate OAuth"));
    }
  });

  // ===== PIN Login (family shared device) =====
  app.post("/api/auth/pin-login", loginLimiter, async (req, res) => {
    try {
      const { pin, familyCode } = req.body;

      if (!pin || !familyCode) {
        return res.status(400).json(errorResponse(ErrorCode.BAD_REQUEST, "PIN and family code are required"));
      }

      const pinStr = String(pin).trim();
      const code = String(familyCode).trim().toUpperCase();

      if (!/^\d{4,6}$/.test(pinStr)) {
        return res.status(400).json(errorResponse(ErrorCode.BAD_REQUEST, "PIN must be 4-6 digits"));
      }

      // Find parent by unique code
      const parentList = await db.select().from(parents).where(eq(parents.uniqueCode, code));
      if (!parentList[0]) {
        return res.status(401).json(errorResponse(ErrorCode.UNAUTHORIZED, "Invalid family code or PIN"));
      }

      const parent = parentList[0];

      // Check parent PIN first
      if (parent.pin) {
        const parentMatch = await bcrypt.compare(pinStr, parent.pin);
        if (parentMatch) {
          const token = jwt.sign({ userId: parent.id, type: "parent" }, JWT_SECRET, { expiresIn: "30d" });
          return res.json(successResponse({
            type: "parent",
            token,
            id: parent.id,
            name: parent.name,
            familyCode: parent.uniqueCode,
          }, "Parent PIN login successful"));
        }
      }

      // Check children PINs
      const links = await db
        .select({ childId: parentChild.childId })
        .from(parentChild)
        .where(eq(parentChild.parentId, parent.id));

      for (const link of links) {
        const childList = await db.select().from(children).where(eq(children.id, link.childId));
        const child = childList[0];
        if (child?.pin) {
          const childMatch = await bcrypt.compare(pinStr, child.pin);
          if (childMatch) {
            const token = jwt.sign({ childId: child.id, parentId: parent.id, type: "child" }, JWT_SECRET, { expiresIn: "7d" });
            return res.json(successResponse({
              type: "child",
              token,
              id: child.id,
              name: child.name,
              familyCode: parent.uniqueCode,
            }, "Child PIN login successful"));
          }
        }
      }

      return res.status(401).json(errorResponse(ErrorCode.UNAUTHORIZED, "Invalid family code or PIN"));
    } catch (error: any) {
      console.error("PIN login error:", error);
      res.status(500).json(errorResponse(ErrorCode.INTERNAL_SERVER_ERROR, "PIN login failed"));
    }
  });

  // ===== Set Parent PIN =====
  app.put("/api/auth/set-pin", authMiddleware, async (req: any, res) => {
    try {
      const { pin } = req.body;
      const parentId = req.user.userId;

      if (!pin) {
        return res.status(400).json(errorResponse(ErrorCode.BAD_REQUEST, "PIN is required"));
      }

      const pinStr = String(pin).trim();
      if (!/^\d{4,6}$/.test(pinStr)) {
        return res.status(400).json(errorResponse(ErrorCode.BAD_REQUEST, "PIN must be 4-6 digits"));
      }

      // Ensure PIN is unique within this family (no child has the same PIN)
      const links = await db
        .select({ childId: parentChild.childId })
        .from(parentChild)
        .where(eq(parentChild.parentId, parentId));

      for (const link of links) {
        const childList = await db.select().from(children).where(eq(children.id, link.childId));
        if (childList[0]?.pin) {
          const conflict = await bcrypt.compare(pinStr, childList[0].pin);
          if (conflict) {
            return res.status(409).json(errorResponse(ErrorCode.CONFLICT, "This PIN is already used by a child. Choose a different PIN."));
          }
        }
      }

      const hashedPin = await bcrypt.hash(pinStr, 10);
      await db.update(parents).set({ pin: hashedPin }).where(eq(parents.id, parentId));

      // Return familyCode for localStorage
      const parent = await db.select({ uniqueCode: parents.uniqueCode }).from(parents).where(eq(parents.id, parentId));

      res.json(successResponse({ familyCode: parent[0]?.uniqueCode }, "PIN set successfully"));
    } catch (error: any) {
      console.error("Set parent PIN error:", error);
      res.status(500).json(errorResponse(ErrorCode.INTERNAL_SERVER_ERROR, "Failed to set PIN"));
    }
  });

  // ===== Set Child PIN (by parent) =====
  app.put("/api/auth/set-child-pin", authMiddleware, async (req: any, res) => {
    try {
      const { childId, pin } = req.body;
      const parentId = req.user.userId;

      if (!childId || !pin) {
        return res.status(400).json(errorResponse(ErrorCode.BAD_REQUEST, "Child ID and PIN are required"));
      }

      const pinStr = String(pin).trim();
      if (!/^\d{4,6}$/.test(pinStr)) {
        return res.status(400).json(errorResponse(ErrorCode.BAD_REQUEST, "PIN must be 4-6 digits"));
      }

      // Verify parent owns this child
      const link = await db.select().from(parentChild).where(
        and(eq(parentChild.parentId, parentId), eq(parentChild.childId, childId))
      );
      if (!link[0]) {
        return res.status(403).json(errorResponse(ErrorCode.UNAUTHORIZED, "Not authorized for this child"));
      }

      // Check PIN doesn't conflict with parent's PIN
      const parent = await db.select().from(parents).where(eq(parents.id, parentId));
      if (parent[0]?.pin) {
        const conflictParent = await bcrypt.compare(pinStr, parent[0].pin);
        if (conflictParent) {
          return res.status(409).json(errorResponse(ErrorCode.CONFLICT, "This PIN is already used. Choose a different PIN."));
        }
      }

      // Check PIN doesn't conflict with other children's PINs
      const allLinks = await db
        .select({ childId: parentChild.childId })
        .from(parentChild)
        .where(eq(parentChild.parentId, parentId));

      for (const l of allLinks) {
        if (l.childId === childId) continue; // skip self
        const childList = await db.select().from(children).where(eq(children.id, l.childId));
        if (childList[0]?.pin) {
          const conflict = await bcrypt.compare(pinStr, childList[0].pin);
          if (conflict) {
            return res.status(409).json(errorResponse(ErrorCode.CONFLICT, "This PIN is already used by another child. Choose a different PIN."));
          }
        }
      }

      const hashedPin = await bcrypt.hash(pinStr, 10);
      await db.update(children).set({ pin: hashedPin }).where(eq(children.id, childId));

      res.json(successResponse(null, "Child PIN set successfully"));
    } catch (error: any) {
      console.error("Set child PIN error:", error);
      res.status(500).json(errorResponse(ErrorCode.INTERNAL_SERVER_ERROR, "Failed to set child PIN"));
    }
  });

  // ===== Add Child with PIN (from parent dashboard) =====
  app.post("/api/auth/add-child-with-pin", authMiddleware, async (req: any, res) => {
    try {
      const { childName, pin, birthday, governorate, academicGrade, schoolId, schoolName, teacherIds } = req.body;
      const parentId = req.user.userId;

      if (!childName || !pin) {
        return res.status(400).json(errorResponse(ErrorCode.BAD_REQUEST, "Child name and PIN are required"));
      }

      const trimmedName = String(childName).trim();
      if (trimmedName.length < 2 || trimmedName.length > 100) {
        return res.status(400).json(errorResponse(ErrorCode.BAD_REQUEST, "Child name must be 2-100 characters"));
      }

      const pinStr = String(pin).trim();
      if (!/^\d{4,6}$/.test(pinStr)) {
        return res.status(400).json(errorResponse(ErrorCode.BAD_REQUEST, "PIN must be 4-6 digits"));
      }

      // Check PIN doesn't conflict with parent's PIN
      const parent = await db.select().from(parents).where(eq(parents.id, parentId));
      if (parent[0]?.pin) {
        const conflictParent = await bcrypt.compare(pinStr, parent[0].pin);
        if (conflictParent) {
          return res.status(409).json(errorResponse(ErrorCode.CONFLICT, "This PIN is already used. Choose a different PIN."));
        }
      }

      // Check PIN doesn't conflict with existing children
      const allLinks = await db
        .select({ childId: parentChild.childId })
        .from(parentChild)
        .where(eq(parentChild.parentId, parentId));

      for (const l of allLinks) {
        const childList = await db.select().from(children).where(eq(children.id, l.childId));
        if (childList[0]?.pin) {
          const conflict = await bcrypt.compare(pinStr, childList[0].pin);
          if (conflict) {
            return res.status(409).json(errorResponse(ErrorCode.CONFLICT, "This PIN is already used by another child. Choose a different PIN."));
          }
        }
      }

      const hashedPin = await bcrypt.hash(pinStr, 10);

      // Build child data with optional enhanced fields
      const childData: any = {
        name: trimmedName,
        pin: hashedPin,
      };

      if (birthday) childData.birthday = new Date(birthday);
      if (governorate) childData.governorate = governorate;
      if (academicGrade) childData.academicGrade = academicGrade;
      if (schoolName) childData.schoolName = schoolName;

      // Create child
      const childResult = await db.insert(children).values(childData).returning();
      const newChildId = childResult[0].id;

      // Link to parent
      await db.insert(parentChild).values({
        parentId,
        childId: newChildId,
      });

      // Initialize growth tree
      const { childGrowthTrees, childSchoolAssignment, childTeacherAssignment } = await import("../../shared/schema");
      await db.insert(childGrowthTrees).values({
        childId: newChildId,
        currentStage: 1,
        totalGrowthPoints: 0,
      }).onConflictDoNothing();

      // Assign school if provided
      if (schoolId) {
        try {
          await db.insert(childSchoolAssignment).values({
            childId: newChildId,
            schoolId: schoolId,
          }).onConflictDoNothing();
        } catch (e) {
          console.warn("Could not assign school:", e);
        }
      }

      // Assign teachers if provided
      if (teacherIds && Array.isArray(teacherIds) && teacherIds.length > 0) {
        try {
          for (const teacherId of teacherIds) {
            await db.insert(childTeacherAssignment).values({
              childId: newChildId,
              teacherId: teacherId,
            }).onConflictDoNothing();
          }
        } catch (e) {
          console.warn("Could not assign teachers:", e);
        }
      }

      // Notify parent
      const { createNotification } = await import("../notifications");
      await createNotification({
        parentId,
        type: NOTIFICATION_TYPES.CHILD_LINKED,
        title: "تم إضافة طفل جديد!",
        message: `تم إضافة ${trimmedName} بنجاح وتعيين رمز PIN خاص به`,
        metadata: { childId: newChildId, childName: trimmedName },
      });

      res.json(successResponse({
        child: { id: newChildId, name: trimmedName },
        familyCode: parent[0]?.uniqueCode,
      }, "Child added successfully"));
    } catch (error: any) {
      console.error("Add child with PIN error:", error);
      res.status(500).json(errorResponse(ErrorCode.INTERNAL_SERVER_ERROR, "Failed to add child"));
    }
  });

  // ===== Get family PIN status =====
  app.get("/api/auth/family-pin-status", authMiddleware, async (req: any, res) => {
    try {
      const parentId = req.user.userId;
      const parent = await db.select().from(parents).where(eq(parents.id, parentId));
      if (!parent[0]) {
        return res.status(404).json(errorResponse(ErrorCode.NOT_FOUND, "Parent not found"));
      }

      const links = await db
        .select({ childId: parentChild.childId })
        .from(parentChild)
        .where(eq(parentChild.parentId, parentId));

      const childrenPinStatus = [];
      for (const link of links) {
        const childList = await db.select().from(children).where(eq(children.id, link.childId));
        if (childList[0]) {
          childrenPinStatus.push({
            id: childList[0].id,
            name: childList[0].name,
            hasPin: !!childList[0].pin,
          });
        }
      }

      res.json(successResponse({
        parentHasPin: !!parent[0].pin,
        familyCode: parent[0].uniqueCode,
        children: childrenPinStatus,
      }, "Family PIN status retrieved"));
    } catch (error: any) {
      console.error("Family PIN status error:", error);
      res.status(500).json(errorResponse(ErrorCode.INTERNAL_SERVER_ERROR, "Failed to get PIN status"));
    }
  });
}
