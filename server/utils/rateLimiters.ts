import rateLimit, { ipKeyGenerator } from "express-rate-limit";
import { errorResponse, ErrorCode } from "./apiResponse";
import { trackOtpEvent } from "./otpMonitoring";

const WINDOW_MS = 60 * 1000;

function createLimiter(max: number, keyGenerator: (req: any) => string, eventType?: "rate_limited") {
  return rateLimit({
    windowMs: WINDOW_MS,
    max,
    keyGenerator,
    standardHeaders: true,
    legacyHeaders: false,
    validate: { xForwardedForHeader: false },
    handler: (req, res) => {
      if (eventType) {
        trackOtpEvent(eventType, {
          path: req.path,
          ip: ipKeyGenerator(req),
          destination: req.body?.email || req.body?.phoneNumber,
        });
      }
      res.set("Retry-After", String(Math.ceil(WINDOW_MS / 1000)));
      res.status(429).json(errorResponse(ErrorCode.RATE_LIMITED, "Too many requests. Please try again later."));
    },
  });
}

function compositeKey(req: any) {
  const ip = ipKeyGenerator(req);
  const email = (req.body?.email || "").toString().trim().toLowerCase();
  return email ? `${ip}:${email}` : ip;
}

export const registerLimiter = createLimiter(5, (req) => ipKeyGenerator(req));
export const loginLimiter = createLimiter(5, compositeKey);
export const otpRequestLimiter = createLimiter(3, compositeKey, "rate_limited");
export const otpVerifyLimiter = createLimiter(5, compositeKey, "rate_limited");
