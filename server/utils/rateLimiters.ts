import rateLimit, { ipKeyGenerator } from "express-rate-limit";
import { errorResponse, ErrorCode } from "./apiResponse";
import { trackOtpEvent } from "./otpMonitoring";

const WINDOW_MS = 60 * 1000;

function createCustomLimiter(windowMs: number, max: number, keyGenerator: (req: any) => string, eventType?: "rate_limited") {
  return rateLimit({
    windowMs,
    max,
    keyGenerator,
    standardHeaders: true,
    legacyHeaders: false,
    validate: { xForwardedForHeader: false },
    handler: (req, res) => {
      if (eventType) {
        trackOtpEvent(eventType, {
          path: req.path,
          ip: ipKeyGenerator(req.ip || ""),
          destination: req.body?.email || req.body?.phoneNumber,
        });
      }
      res.set("Retry-After", String(Math.ceil(windowMs / 1000)));
      res.status(429).json(errorResponse(ErrorCode.RATE_LIMITED, "Too many requests. Please try again later."));
    },
  });
}

function createLimiter(max: number, keyGenerator: (req: any) => string, eventType?: "rate_limited") {
  return createCustomLimiter(WINDOW_MS, max, keyGenerator, eventType);
}

function compositeKey(req: any) {
  const ip = ipKeyGenerator(req.ip || "");
  const email = (req.body?.email || "").toString().trim().toLowerCase();
  return email ? `${ip}:${email}` : ip;
}

export const registerLimiter = createLimiter(5, (req) => ipKeyGenerator(req.ip || ""));
export const loginLimiter = createLimiter(5, compositeKey);
export const otpRequestLimiter = createLimiter(3, compositeKey, "rate_limited");
export const otpVerifyLimiter = createLimiter(5, compositeKey, "rate_limited");
export const childLinkLimiter = createCustomLimiter(15 * 60 * 1000, 5, (req) => ipKeyGenerator(req.ip || ""));
export const childLoginRequestLimiter = createCustomLimiter(15 * 60 * 1000, 10, (req) => ipKeyGenerator(req.ip || ""));
export const childLoginStatusLimiter = createCustomLimiter(60 * 1000, 30, (req) => `${ipKeyGenerator(req.ip || "")}:${req.params?.id || "unknown"}`);
