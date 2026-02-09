import jwt, { JwtPayload } from "jsonwebtoken";
import { errorResponse, ErrorCode } from "../utils/apiResponse";

const JWT_SECRET = process.env.JWT_SECRET || "classify-app-2025-secret";

if (!process.env.JWT_SECRET && process.env.NODE_ENV === "production") {
  console.error("ERROR: JWT_SECRET must be set in production!");
  process.exit(1);
}

export { JWT_SECRET };

export const authMiddleware = (req: any, res: any, next: any) => {
  const token = req.headers.authorization?.split(" ")[1];
  if (!token) return res.status(401).json({ message: "Unauthorized" });
  try {
    const decoded = jwt.verify(token, JWT_SECRET) as any;
    // Normalize payload to support legacy { userId } and new { parentId }
    if (decoded.parentId && !decoded.userId) {
      decoded.userId = decoded.parentId;
    }
    if (req.path?.startsWith("/api/child") && decoded.type !== "child") {
      return res
        .status(401)
        .json(errorResponse(ErrorCode.UNAUTHORIZED, "Child token required"));
    }
    req.user = decoded;
    next();
  } catch {
    res.status(401).json({ message: "Invalid token" });
  }
};

export const adminMiddleware = (req: any, res: any, next: any) => {
  const token = req.headers.authorization?.split(" ")[1];
  if (!token) return res.status(401).json({ message: "Unauthorized" });
  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    // jwt.verify can return a string or an object (JwtPayload). Ensure it's an object
    if (typeof decoded !== "object" || decoded === null) {
      return res.status(403).json({ message: "Forbidden" });
    }
    const payload = decoded as JwtPayload & { type?: string };
    if (payload.type !== "admin") return res.status(403).json({ message: "Forbidden" });
    req.admin = payload;
    next();
  } catch {
    res.status(401).json({ message: "Invalid token" });
  }
};
