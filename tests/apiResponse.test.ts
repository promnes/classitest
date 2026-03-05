import { describe, it, expect } from "@jest/globals";
import { successResponse, errorResponse, ErrorCode, getHttpStatus } from "../server/utils/apiResponse";

describe("API Response Helpers", () => {
  describe("successResponse", () => {
    it("should return success: true with data", () => {
      const result = successResponse({ id: "1", name: "test" });
      expect(result.success).toBe(true);
      expect(result.data).toEqual({ id: "1", name: "test" });
    });

    it("should return success: true with message", () => {
      const result = successResponse(undefined, "Created successfully");
      expect(result.success).toBe(true);
      expect(result.message).toBe("Created successfully");
      expect(result.data).toBeUndefined();
    });

    it("should return success: true with both data and message", () => {
      const result = successResponse({ id: "1" }, "Done");
      expect(result.success).toBe(true);
      expect(result.data).toEqual({ id: "1" });
      expect(result.message).toBe("Done");
    });

    it("should return success: true with no args", () => {
      const result = successResponse();
      expect(result.success).toBe(true);
    });
  });

  describe("errorResponse", () => {
    it("should return success: false with error and message", () => {
      const result = errorResponse(ErrorCode.NOT_FOUND, "Resource not found");
      expect(result.success).toBe(false);
      expect(result.error).toBe("NOT_FOUND");
      expect(result.message).toBe("Resource not found");
    });

    it("should work with all error codes", () => {
      const codes = Object.values(ErrorCode);
      for (const code of codes) {
        const result = errorResponse(code, "test");
        expect(result.success).toBe(false);
        expect(result.error).toBe(code);
      }
    });
  });

  describe("getHttpStatus", () => {
    it("should map NOT_FOUND to 404", () => {
      expect(getHttpStatus(ErrorCode.NOT_FOUND)).toBe(404);
    });

    it("should map UNAUTHORIZED to 401", () => {
      expect(getHttpStatus(ErrorCode.UNAUTHORIZED)).toBe(401);
    });

    it("should map BAD_REQUEST to 400", () => {
      expect(getHttpStatus(ErrorCode.BAD_REQUEST)).toBe(400);
    });

    it("should map INTERNAL_SERVER_ERROR to 500", () => {
      expect(getHttpStatus(ErrorCode.INTERNAL_SERVER_ERROR)).toBe(500);
    });

    it("should map RATE_LIMITED to 429", () => {
      expect(getHttpStatus(ErrorCode.RATE_LIMITED)).toBe(429);
    });

    it("should map PARENT_CHILD_MISMATCH to 403", () => {
      expect(getHttpStatus(ErrorCode.PARENT_CHILD_MISMATCH)).toBe(403);
    });

    it("should map CONFLICT to 409", () => {
      expect(getHttpStatus(ErrorCode.CONFLICT)).toBe(409);
    });
  });
});
