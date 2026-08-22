export const config = { runtime: "edge" };

const PLACEHOLDER_RE = /your-old-site\.com|example\.com|xxxxxxxx/i;
const ALLOWED_PREFIXES = ["products", "products/categories"];

function json(body, status = 200, extra = {}) {
  return new Response(JSON.stringify(body), {
    status,
    headers: {
      "content-type": "application/json; charset=utf-8",
      ...extra,
    },
  });
}

function getWooServerConfig() {
  const storeUrl = (process.env.WOOCOMMERCE_STORE_URL || "").replace(/\/$/, "").trim();
  const consumerKey = (process.env.WOOCOMMERCE_CONSUMER_KEY || "").trim();
  const consumerSecret = (process.env.WOOCOMMERCE_CONSUMER_SECRET || "").trim();
  if (!storeUrl || !consumerKey || !consumerSecret) return null;
  if (PLACEHOLDER_RE.test(storeUrl) || PLACEHOLDER_RE.test(consumerKey)) return null;
  return { storeUrl, consumerKey, consumerSecret };
}

function isAllowedWooPath(path) {
  const normalized = path.replace(/^\/+/, "").split("?")[0] ?? "";
  if (!normalized || normalized.includes("..")) return false;
  return ALLOWED_PREFIXES.some((p) => normalized === p || normalized.startsWith(`${p}/`));
}

function subPathFromUrl(url) {
  const fromQuery = (url.searchParams.get("p") || "").replace(/^\/+|\/+$/g, "");
  if (fromQuery) return fromQuery;
  const pathname = url.pathname || "";
  const marker = "/api/woocommerce/";
  const at = pathname.indexOf(marker);
  if (at >= 0) return pathname.slice(at + marker.length).replace(/\/$/, "");
  if (pathname.endsWith("/api/woocommerce") || pathname.endsWith("/api/woo")) return "";
  return "";
}

async function fetchStoreBanners(cfg) {
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
  const data = await res.json();
  if (!Array.isArray(data)) return [];
  const seen = new Set();
  const out = [];
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

export default async function handler(request) {
  try {
    if (request.method !== "GET" && request.method !== "HEAD") {
      return json({ error: "Method not allowed" }, 405);
    }

    const url = new URL(request.url);
    const cfg = getWooServerConfig();
    const subPath = subPathFromUrl(url);

    if (!subPath || subPath === "status") {
      return json({ configured: Boolean(cfg) }, 200, { "cache-control": "no-store" });
    }

    if (!cfg) {
      return json(
        {
          error: "WooCommerce proxy not configured. Set WOOCOMMERCE_* in Vercel environment variables.",
        },
        503,
      );
    }

    if (subPath === "banners") {
      try {
        const banners = await fetchStoreBanners(cfg);
        return json(banners, 200, { "cache-control": "private, max-age=120" });
      } catch {
        return json({ error: "Failed to load homepage banners" }, 502);
      }
    }

    if (!isAllowedWooPath(subPath)) {
      return json({ error: "Path not allowed" }, 403);
    }

    const qs = new URLSearchParams(url.search);
    qs.delete("p");
    qs.delete("path");
    qs.set("consumer_key", cfg.consumerKey);
    qs.set("consumer_secret", cfg.consumerSecret);
    const target = `${cfg.storeUrl}/wp-json/wc/v3/${subPath}?${qs.toString()}`;
    const upstream = await fetch(target, {
      method: "GET",
      headers: { Accept: "application/json" },
    });
    const body = await upstream.text();
    return new Response(body, {
      status: upstream.status,
      headers: {
        "content-type": upstream.headers.get("content-type") || "application/json; charset=utf-8",
        "cache-control": "private, max-age=60",
      },
    });
  } catch {
    return json({ error: "Function error" }, 500);
  }
}
