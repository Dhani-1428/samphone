function getWooServerConfig() {
  const storeUrl = process.env.WOOCOMMERCE_STORE_URL?.replace(/\/$/, "").trim() ?? "";
  const consumerKey = process.env.WOOCOMMERCE_CONSUMER_KEY?.trim() ?? "";
  const consumerSecret = process.env.WOOCOMMERCE_CONSUMER_SECRET?.trim() ?? "";
  if (!storeUrl || !consumerKey || !consumerSecret) return null;
  if (/your-old-site\.com|example\.com|xxxxxxxx/i.test(storeUrl) || /xxxxxxxx/i.test(consumerKey)) {
    return null;
  }
  return { storeUrl, consumerKey, consumerSecret };
}

function sendJson(res, status, body, extra = {}) {
  if (res.writableEnded) return;
  res.statusCode = status;
  res.setHeader("Content-Type", "application/json; charset=utf-8");
  for (const [key, value] of Object.entries(extra)) res.setHeader(key, value);
  res.end(JSON.stringify(body));
}

function requestUrl(req) {
  const host = req.headers?.host || "localhost";
  try {
    return new URL(req.url || "/", `https://${host}`);
  } catch {
    return new URL("https://localhost/");
  }
}

function subPathFromRequest(req) {
  const url = requestUrl(req);
  const pathname = url.pathname || "";
  const marker = "/api/woocommerce/";
  const at = pathname.indexOf(marker);
  if (at >= 0) return pathname.slice(at + marker.length).replace(/\/$/, "");
  if (pathname.endsWith("/api/woocommerce")) return "";
  const raw = req.query?.path;
  if (Array.isArray(raw) && raw.length > 0) return raw.join("/");
  if (typeof raw === "string" && raw.length > 0) return raw;
  return "";
}

function isAllowedWooPath(path) {
  const normalized = path.replace(/^\/+/, "").split("?")[0] ?? "";
  if (normalized.includes("..")) return false;
  return (
    normalized === "products" ||
    normalized.startsWith("products/") ||
    normalized === "products/categories" ||
    normalized.startsWith("products/categories/")
  );
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
    const title = String(item.title?.rendered ?? "").replace(/<[^>]+>/g, "").trim();
    out.push({
      id: typeof item.id === "number" ? item.id : out.length,
      src,
      alt: (item.alt_text?.trim() || title || "SAMPHONE").slice(0, 160),
    });
  }
  return out;
}

module.exports = async function handler(req, res) {
  try {
    if (req.method !== "GET" && req.method !== "HEAD") {
      sendJson(res, 405, { error: "Method not allowed" });
      return;
    }

    const cfg = getWooServerConfig();
    if (!cfg) {
      sendJson(res, 503, {
        error: "WooCommerce proxy not configured. Set WOOCOMMERCE_* in Vercel environment variables.",
      });
      return;
    }

    const url = requestUrl(req);
    const subPath = subPathFromRequest(req);
    if (!subPath || subPath === "status") {
      sendJson(res, 200, { configured: true }, { "Cache-Control": "no-store" });
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

    const qs = new URLSearchParams(url.search);
    qs.delete("path");
    qs.set("consumer_key", cfg.consumerKey);
    qs.set("consumer_secret", cfg.consumerSecret);
    const target = `${cfg.storeUrl}/wp-json/wc/v3/${subPath}?${qs.toString()}`;

    const upstream = await fetch(target, {
      method: "GET",
      headers: { Accept: "application/json" },
    });
    const body = await upstream.text();
    if (res.writableEnded) return;
    res.statusCode = upstream.status;
    res.setHeader("Content-Type", upstream.headers.get("content-type") ?? "application/json; charset=utf-8");
    res.setHeader("Cache-Control", "private, max-age=60");
    res.end(body);
  } catch {
    sendJson(res, 500, { error: "Function error" });
  }
};
