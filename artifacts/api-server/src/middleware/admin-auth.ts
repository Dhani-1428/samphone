import type { Request, Response, NextFunction } from "express";

export type AdminRole = "super_admin" | "pricing_manager" | "read_only";

export interface AdminSession {
  email: string;
  role: AdminRole;
}

declare global {
  namespace Express {
    interface Request {
      admin?: AdminSession;
    }
  }
}

const ADMIN_TOKEN = process.env.PRICING_ADMIN_TOKEN?.trim();
const ADMIN_EMAIL = process.env.PRICING_ADMIN_EMAIL?.trim() ?? "admin@samphone.pt";

/** Bearer token or X-Admin-Token header for pricing admin API. */
export function requireAdmin(req: Request, res: Response, next: NextFunction): void {
  if (!ADMIN_TOKEN) {
    res.status(503).json({
      error: "Admin API not configured. Set PRICING_ADMIN_TOKEN.",
    });
    return;
  }

  const auth = req.headers.authorization;
  const headerToken = req.headers["x-admin-token"];
  const token =
    (typeof auth === "string" && auth.startsWith("Bearer ")
      ? auth.slice(7)
      : typeof headerToken === "string"
        ? headerToken
        : "") || "";

  if (token !== ADMIN_TOKEN) {
    res.status(401).json({ error: "Unauthorized" });
    return;
  }

  req.admin = { email: ADMIN_EMAIL, role: "pricing_manager" };
  next();
}

export function requireRole(...roles: AdminRole[]) {
  return (req: Request, res: Response, next: NextFunction): void => {
    if (!req.admin || !roles.includes(req.admin.role)) {
      res.status(403).json({ error: "Forbidden" });
      return;
    }
    next();
  };
}
