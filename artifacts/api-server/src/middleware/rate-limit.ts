import type { Request, Response, NextFunction } from "express";

const hits = new Map<string, { count: number; resetAt: number }>();

/** Simple in-memory rate limiter (use Redis in production clusters). */
export function rateLimit(options: { windowMs: number; max: number }) {
  return (req: Request, res: Response, next: NextFunction): void => {
    const key = req.ip ?? "unknown";
    const now = Date.now();
    let bucket = hits.get(key);
    if (!bucket || now > bucket.resetAt) {
      bucket = { count: 0, resetAt: now + options.windowMs };
      hits.set(key, bucket);
    }
    bucket.count += 1;
    if (bucket.count > options.max) {
      res.status(429).json({ error: "Too many requests" });
      return;
    }
    next();
  };
}
