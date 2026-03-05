import { describe, it, expect } from "@jest/globals";
import { validateBody } from "../server/validators";
import {
  updateProfileSchema,
  changePasswordSchema,
  depositSchema,
  sendGiftSchema,
} from "../server/validators/parentSchemas";
import {
  childLinkSchema,
  childCompleteGameSchema,
  childNotificationSettingsSchema,
} from "../server/validators/childSchemas";

describe("Zod Validators", () => {
  describe("validateBody helper", () => {
    it("should return success with valid data", () => {
      const result = validateBody(updateProfileSchema, { name: "Ahmed" });
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.name).toBe("Ahmed");
      }
    });

    it("should return error with invalid data", () => {
      const result = validateBody(changePasswordSchema, {});
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error).toBeDefined();
      }
    });

    it("should return error message with field path", () => {
      // oldPassword provided so first missing field is newPassword
      const result = validateBody(changePasswordSchema, { oldPassword: "old" });
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error).toContain("newPassword");
      }
    });
  });

  describe("Parent Schemas", () => {
    describe("updateProfileSchema", () => {
      it("should accept valid profile update", () => {
        const result = updateProfileSchema.safeParse({ name: "Ahmed", phoneNumber: "+201234567890" });
        expect(result.success).toBe(true);
      });

      it("should reject empty object (refine requires at least one field)", () => {
        const result = updateProfileSchema.safeParse({});
        expect(result.success).toBe(false);
      });

      it("should reject empty name", () => {
        const result = updateProfileSchema.safeParse({ name: "" });
        expect(result.success).toBe(false);
      });
    });

    describe("changePasswordSchema", () => {
      it("should accept valid password change", () => {
        const result = changePasswordSchema.safeParse({
          oldPassword: "oldpass123",
          newPassword: "newpass456",
          otpCode: "123456",
        });
        expect(result.success).toBe(true);
      });

      it("should reject short new password", () => {
        const result = changePasswordSchema.safeParse({
          oldPassword: "old",
          newPassword: "ab",
          otpCode: "123456",
        });
        expect(result.success).toBe(false);
      });

      it("should reject missing fields", () => {
        const result = changePasswordSchema.safeParse({});
        expect(result.success).toBe(false);
      });
    });

    describe("depositSchema", () => {
      it("should accept numeric amount", () => {
        const result = depositSchema.safeParse({
          paymentMethodId: "pm-1",
          amount: 50,
          transactionId: "txn-1234",
        });
        expect(result.success).toBe(true);
      });

      it("should accept string amount and transform", () => {
        const result = depositSchema.safeParse({
          paymentMethodId: "pm-1",
          amount: "100",
          transactionId: "txn-5678",
        });
        expect(result.success).toBe(true);
      });

      it("should reject missing required fields", () => {
        const result = depositSchema.safeParse({ amount: 50 });
        expect(result.success).toBe(false);
      });
    });

    describe("sendGiftSchema", () => {
      it("should accept valid gift", () => {
        const result = sendGiftSchema.safeParse({
          entitlementId: "ent-1",
          childId: "child-1",
        });
        expect(result.success).toBe(true);
      });

      it("should reject missing required fields", () => {
        const result = sendGiftSchema.safeParse({ childId: "child-1" });
        expect(result.success).toBe(false);
      });
    });
  });

  describe("Child Schemas", () => {
    describe("childLinkSchema", () => {
      it("should accept valid link data", () => {
        const result = childLinkSchema.safeParse({ childName: "Sara", code: "ABC123" });
        expect(result.success).toBe(true);
      });

      it("should reject empty code", () => {
        const result = childLinkSchema.safeParse({ childName: "Sara", code: "" });
        expect(result.success).toBe(false);
      });
    });

    describe("childCompleteGameSchema", () => {
      it("should accept valid game completion", () => {
        const result = childCompleteGameSchema.safeParse({
          gameId: "game-1",
          score: 95,
        });
        expect(result.success).toBe(true);
      });

      it("should reject missing gameId", () => {
        const result = childCompleteGameSchema.safeParse({ score: 95 });
        expect(result.success).toBe(false);
      });
    });

    describe("childNotificationSettingsSchema", () => {
      it("should accept valid notification mode", () => {
        const validModes = ["popup_strict", "popup_soft", "floating_bubble", "normal", "focus", "silent"];
        for (const mode of validModes) {
          const result = childNotificationSettingsSchema.safeParse({ mode });
          expect(result.success).toBe(true);
        }
      });

      it("should reject invalid notification mode", () => {
        const result = childNotificationSettingsSchema.safeParse({ mode: "invalid_mode" });
        expect(result.success).toBe(false);
      });
    });
  });
});
