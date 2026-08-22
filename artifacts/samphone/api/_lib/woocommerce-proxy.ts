import type { VercelRequest, VercelResponse } from "@vercel/node";
import { fetchStoreBanners, getWooServerConfig } from "./woocommerce-config";

/** Read-only WooCommerce REST paths allowed through the proxy. */
const ALLOWED_PREFIXES = ["products", "products/categories"];

function isAllowedWooPath(path: string): boolean {
  const normalized = path.replace(/^\/+/, "").split("?")[0] ?? "";
  if (normalized.includes("..")) return false;
  return ALLOWED_PREFIXES.some(
    (p) => normalized === p || normalized.startsWith(`${p}/`),
  );
}

function pathFromQuery(req: VercelRequest): string {
  const raw = req.query.path;
  if (Array.isArray(raw)) return raw.join("/");
  return typeof raw === "string" ? raw : "";
}

/** Proxy GET /api/woocommerce/* to WooCommerce REST (credentials added server-side). */
export async function handleWooCommerceProxy(req: VercelRequest, res: VercelResponse): Promise<void> {
  if (req.method !== "GET") {
    res.status(405).json({ error: "Method not allowed" });
    return;
  }

  const cfg = getWooServerConfig();
  if (!cfg) {
    res.status(503).json({
      error: "WooCommerce proxy not configured. Set WOOCOMMERCE_* in Vercel environment variables.",
    });
    return;
  }

  const subPath = pathFromQuery(req);
  if (!subPath || subPath === "status") {
    res.status(404).json({ error: "Not found" });
    return;
  }

  if (subPath === "banners") {
    try {
      const banners = await fetchStoreBanners(cfg);
      res.setHeader("Cache-Control", "private, max-age=120");
      res.status(200).json(banners);
    } catch {
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
    if (key === "path") continue;
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
  } catch {
    res.status(502).json({ error: "Failed to reach WooCommerce store" });
  }
}
