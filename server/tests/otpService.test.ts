import { describe, it, expect } from "vitest";
import { generateOTP, hashOTP, compareOTP, validateExpiry, OTP_LENGTH, MAX_ATTEMPTS } from "../services/otpService";

describe("otpService", () => {
  it("generates a 6-digit OTP", () => {
    const code = generateOTP();
    expect(code).toHaveLength(OTP_LENGTH);
    expect(Number.isNaN(Number(code))).toBe(false);
  });

  it("validates expiry correctly", () => {
    const valid = new Date(Date.now() + 1000);
    const expired = new Date(Date.now() - 1000);
    expect(validateExpiry(valid)).toBe(true);
    expect(validateExpiry(expired)).toBe(false);
  });

  it("hashes and compares OTP correctly", async () => {
    const code = "123456";
    const hash = await hashOTP(code);
    const ok = await compareOTP(code, hash);
    const bad = await compareOTP("000000", hash);
    expect(ok).toBe(true);
    expect(bad).toBe(false);
  });

  it("exposes max attempts constant", () => {
    expect(MAX_ATTEMPTS).toBe(3);
  });
});
