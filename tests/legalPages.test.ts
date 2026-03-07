import { describe, it, expect } from "@jest/globals";
import {
  LEGAL_PAGE_CONFIG,
  buildAdminLegalPayload,
  getAllLegalSettingKeys,
  getLegalConfig,
  isLegalPageType,
} from "../server/utils/legalPages";

describe("legalPages utils", () => {
  it("accepts only supported legal page types", () => {
    expect(isLegalPageType("privacy")).toBe(true);
    expect(isLegalPageType("terms")).toBe(true);
    expect(isLegalPageType("child-safety")).toBe(true);
    expect(isLegalPageType("refund")).toBe(true);
    expect(isLegalPageType("legal-center")).toBe(true);
    expect(isLegalPageType("unknown")).toBe(false);
  });

  it("returns config by type", () => {
    const config = getLegalConfig("legal-center");
    expect(config).not.toBeNull();
    expect(config?.key).toBe("legal_center");
    expect(config?.labelAr).toBe("المركز القانوني");
  });

  it("returns all content and timestamp setting keys", () => {
    const keys = getAllLegalSettingKeys();
    expect(keys).toContain("legal_privacy");
    expect(keys).toContain("legal_privacy_updated_at");
    expect(keys).toContain("legal_center");
    expect(keys).toContain("legal_center_updated_at");
    expect(keys.length).toBe(Object.keys(LEGAL_PAGE_CONFIG).length * 2);
  });

  it("builds admin payload shape from setting getter", () => {
    const map: Record<string, string> = {
      legal_privacy: "p",
      legal_privacy_updated_at: "pAt",
      legal_terms: "t",
      legal_terms_updated_at: "tAt",
      legal_child_safety: "c",
      legal_child_safety_updated_at: "cAt",
      legal_refund: "r",
      legal_refund_updated_at: "rAt",
      legal_center: "l",
      legal_center_updated_at: "lAt",
    };

    const payload = buildAdminLegalPayload((key) => map[key] || "");

    expect(payload).toEqual({
      privacy: "p",
      privacyUpdatedAt: "pAt",
      terms: "t",
      termsUpdatedAt: "tAt",
      childSafety: "c",
      childSafetyUpdatedAt: "cAt",
      refund: "r",
      refundUpdatedAt: "rAt",
      legalCenter: "l",
      legalCenterUpdatedAt: "lAt",
    });
  });
});
