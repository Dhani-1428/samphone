import type { IncomingMessage, ServerResponse } from "node:http";
import type { Plugin } from "vite";

export type WooServerConfig = {
  storeUrl: string;
  consumerKey: string;
  consumerSecret: string;
};

async function fetchStoreBanners(cfg: WooServerConfig): Promise<{ id: number; src: string; alt: string }[]> {
  const qs = new URLSearchParams({
    search: "banner",
    per_page: "12",
    media_type: "image",
    orderby: "date",
    order: "desc",
    consumer_key: cfg.consumerKey,
    consumer_secret: cfg.consumerSecret,
  });
  const res = await fetch(`${cfg.storeUrl}/wp-json/wp/v2/media?${qs.toString()}`, {
    method: "GET",
    headers: { Accept: "application/json" },
  });
  if (!res.ok) throw new Error(`Banner media request failed (${res.status})`);
  const data = (await res.json()) as Array<{
    id?: number;
    source_url?: string;
    alt_text?: string;
    mime_type?: string;
    title?: { rendered?: string };
  }>;
  if (!Array.isArray(data)) return [];
  const seen = new Set<string>();
  const out: { id: number; src: string; alt: string }[] = [];
  for (const item of data) {
    const src = typeof item.source_url === "string" ? item.source_url.trim() : "";
    if (!src || seen.has(src)) continue;
    if (item.mime_type && !String(item.mime_type).startsWith("image/")) continue;
    seen.add(src);
    const title = String(item.title?.rendered ?? "")
      .replace(/<[^>]+>/g, "")
      .trim();
    out.push({
      id: typeof item.id === "number" ? item.id : out.length,
      src,
      alt: (item.alt_text?.trim() || title || "SAMPHONE").slice(0, 160),
    });
  }
  return out;
}

/** Read-only WooCommerce REST paths allowed through the proxy. */
const ALLOWED_PREFIXES = ["products", "products/categories"];

function isAllowedWooPath(path: string): boolean {
  const normalized = path.replace(/^\/+/, "").split("?")[0] ?? "";
  if (normalized.includes("..")) return false;
  return ALLOWED_PREFIXES.some((p) => normalized === p || normalized.startsWith(`${p}/`));
}

function sendJson(res: ServerResponse, status: number, body: unknown, extra?: Record<string, string>) {
  if (res.writableEnded) return;
  res.statusCode = status;
  res.setHeader("Content-Type", "application/json; charset=utf-8");
  if (extra) {
    for (const [k, v] of Object.entries(extra)) res.setHeader(k, v);
  }
  res.end(JSON.stringify(body));
}

export function wooConfigFromEnv(env: Record<string, string>): WooServerConfig | null {
  const storeUrl = (env.WOOCOMMERCE_STORE_URL || env.VITE_WOOCOMMERCE_STORE_URL || "").replace(/\/$/, "").trim();
  const consumerKey = (env.WOOCOMMERCE_CONSUMER_KEY || "").trim();
  const consumerSecret = (env.WOOCOMMERCE_CONSUMER_SECRET || "").trim();
  if (!storeUrl || !consumerKey || !consumerSecret) return null;
  if (/your-old-site\.com|example\.com|xxxxxxxx/i.test(storeUrl) || /xxxxxxxx/i.test(consumerKey)) {
    return null;
  }
  return { storeUrl, consumerKey, consumerSecret };
}

/**
 * Handles `/api/woocommerce` in Vite so the storefront works with `pnpm dev`
 * even when api-server (:8080) is not running. Keys stay on the Vite process,
 * never in the browser bundle.
 */
export function wooDevPlugin(cfg: WooServerConfig | null): Plugin {
  const handle = async (req: IncomingMessage, res: ServerResponse, next: () => void) => {
    const raw = req.url ?? "";
    if (!raw.startsWith("/api/woocommerce")) {
      next();
      return;
    }
    if (req.method !== "GET" && req.method !== "HEAD") {
      sendJson(res, 405, { error: "Method not allowed" });
      return;
    }

    const q = raw.indexOf("?");
    const pathname = q >= 0 ? raw.slice(0, q) : raw;
    const search = q >= 0 ? raw.slice(q + 1) : "";
    const subPath = pathname.replace(/^\/api\/woocommerce\/?/, "").replace(/\/$/, "");

    if (subPath === "status" || subPath === "") {
      sendJson(res, 200, { configured: cfg != null }, { "Cache-Control": "no-store" });
      return;
    }

    if (!cfg) {
      sendJson(res, 503, {
        error:
          "WooCommerce proxy not configured. Set WOOCOMMERCE_STORE_URL, WOOCOMMERCE_CONSUMER_KEY, and WOOCOMMERCE_CONSUMER_SECRET in artifacts/api-server/.env or the repo root .env.",
      });
      return;
    }

    if (subPath === "banners") {
      try {
        const banners = await fetchStoreBanners(cfg);
        sendJson(res, 200, banners, { "Cache-Control": "private, max-age=120" });
      } catch {
        sendJson(res, 502, { error: "Failed to load homepage banners" });
      }
      return;
    }

    if (!isAllowedWooPath(subPath)) {
      sendJson(res, 403, { error: "Path not allowed" });
      return;
    }

    const qs = new URLSearchParams(search);
    qs.set("consumer_key", cfg.consumerKey);
    qs.set("consumer_secret", cfg.consumerSecret);
    const target = `${cfg.storeUrl}/wp-json/wc/v3/${subPath}?${qs.toString()}`;

    try {
      const upstream = await fetch(target, {
        method: "GET",
        headers: { Accept: "application/json" },
      });
      const body = await upstream.text();
      res.statusCode = upstream.status;
      res.setHeader("Content-Type", upstream.headers.get("content-type") ?? "application/json; charset=utf-8");
      res.setHeader("Cache-Control", "private, max-age=60");
      res.end(body);
    } catch {
      sendJson(res, 502, { error: "Failed to reach WooCommerce store" });
    }
  };

  return {
    name: "woo-dev-proxy",
    configureServer(server) {
      server.middlewares.use(handle);
    },
    configurePreviewServer(server) {
      server.middlewares.use(handle);
    },
  };
}
