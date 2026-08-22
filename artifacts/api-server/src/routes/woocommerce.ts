import { Router, type IRouter, type Request, type Response } from "express";
import { rateLimit } from "../middleware/rate-limit";
import { getWooServerConfig, isWooConfigured, fetchStoreBanners } from "../lib/woocommerce-config";
import { logger } from "../lib/logger";

const router: IRouter = Router();

/** Read-only WooCommerce REST paths allowed through the proxy. */
const ALLOWED_PREFIXES = ["products", "products/categories"];

function isAllowedWooPath(path: string): boolean {
  const normalized = path.replace(/^\/+/, "").split("?")[0] ?? "";
  if (normalized.includes("..")) return false;
  return ALLOWED_PREFIXES.some(
    (p) => normalized === p || normalized.startsWith(`${p}/`),
  );
}

router.get("/status", (_req: Request, res: Response) => {
  res.json({ configured: isWooConfigured() });
});

router.use(
  rateLimit({ windowMs: 60_000, max: 180 }),
);

router.get("{*path}", async (req: Request, res: Response) => {
  const cfg = getWooServerConfig();
  if (!cfg) {
    res.status(503).json({
      error: "WooCommerce proxy not configured. Set WOOCOMMERCE_* on the API server.",
    });
    return;
  }

  const subPath = req.path.replace(/^\//, "");

  if (!subPath || subPath === "status") {
    res.status(404).json({ error: "Not found" });
    return;
  }

  if (subPath === "banners") {
    try {
      const banners = await fetchStoreBanners(cfg);
      res.setHeader("Cache-Control", "private, max-age=120");
      res.json(banners);
    } catch (err) {
      logger.error({ err }, "WooCommerce banner fetch failed");
      res.status(502).json({ error: "Failed to load homepage banners" });
    }
    return;
  }

  if (!isAllowedWooPath(subPath)) {
    res.status(403).json({ error: "Path not allowed" });
    return;
  }

  const qs = new URLSearchParams();
  for (const [key, value] of Object.entries(req.query)) {
    if (typeof value === "string") qs.set(key, value);
    else if (Array.isArray(value)) {
      for (const v of value) {
        if (typeof v === "string") qs.append(key, v);
      }
    }
  }
  qs.set("consumer_key", cfg.consumerKey);
  qs.set("consumer_secret", cfg.consumerSecret);

  const target = `${cfg.storeUrl}/wp-json/wc/v3/${subPath}?${qs.toString()}`;

  try {
    const upstream = await fetch(target, {
      method: "GET",
      headers: { Accept: "application/json" },
    });
    const body = await upstream.text();
    res.status(upstream.status);
    res.setHeader("Content-Type", upstream.headers.get("content-type") ?? "application/json");
    res.setHeader("Cache-Control", "private, max-age=60");
    res.send(body);
  } catch (err) {
    logger.error({ err, subPath }, "WooCommerce proxy fetch failed");
    res.status(502).json({ error: "Failed to reach WooCommerce store" });
  }
});

export default router;
