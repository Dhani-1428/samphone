type ApiReq = {
  method?: string;
  url?: string;
  headers?: { host?: string };
  query?: { path?: string | string[] };
};
type ApiRes = {
  statusCode: number;
  writableEnded?: boolean;
  headersSent?: boolean;
  setHeader: (name: string, value: string) => void;
  end: (body: string) => void;
};

function sendJson(res: ApiRes, status: number, body: unknown, extra?: Record<string, string>): void {
  if (res.writableEnded) return;
  res.statusCode = status;
  res.setHeader("Content-Type", "application/json; charset=utf-8");
  if (extra) {
    for (const key of Object.keys(extra)) res.setHeader(key, extra[key]);
  }
  res.end(JSON.stringify(body));
}

function getWooServerConfig(): { storeUrl: string; consumerKey: string; consumerSecret: string } | null {
  const storeUrl = String(process.env.WOOCOMMERCE_STORE_URL || "")
    .replace(/\/$/, "")
    .trim();
  const consumerKey = String(process.env.WOOCOMMERCE_CONSUMER_KEY || "").trim();
  const consumerSecret = String(process.env.WOOCOMMERCE_CONSUMER_SECRET || "").trim();
  if (!storeUrl || !consumerKey || !consumerSecret) return null;
  if (/your-old-site\.com|example\.com|xxxxxxxx/i.test(storeUrl)) return null;
  return { storeUrl, consumerKey, consumerSecret };
}

function requestUrl(req: ApiReq): URL {
  const host = req.headers?.host || "localhost";
  try {
    return new URL(req.url || "/", `https://${host}`);
  } catch {
    return new URL("https://localhost/");
  }
}

function subPathFromRequest(req: ApiReq): string {
  const url = requestUrl(req);
  const pathname = url.pathname || "";
  const marker = "/api/woocommerce/";
  const at = pathname.indexOf(marker);
  if (at >= 0) return pathname.slice(at + marker.length).replace(/\/$/, "");
  const raw = req.query?.path;
  if (Array.isArray(raw) && raw.length > 0) return raw.join("/");
  if (typeof raw === "string" && raw.length > 0) return raw;
  return "";
}

function isAllowedWooPath(path: string): boolean {
  const normalized = path.replace(/^\/+/, "").split("?")[0] || "";
  if (!normalized || normalized.includes("..")) return false;
  return normalized === "products" || normalized.startsWith("products/");
}

async function fetchStoreBanners(cfg: { storeUrl: string; consumerKey: string; consumerSecret: string }) {
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
  if (!res.ok) throw new Error("Banner media request failed");
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

export default async function handler(req: ApiReq, res: ApiRes): Promise<void> {
  try {
    if (req.method !== "GET" && req.method !== "HEAD") {
      sendJson(res, 405, { error: "Method not allowed" });
      return;
    }

    const cfg = getWooServerConfig();
    const url = requestUrl(req);
    const subPath = subPathFromRequest(req);

    if (!subPath || subPath === "status") {
      sendJson(res, 200, { configured: Boolean(cfg) }, { "Cache-Control": "no-store" });
      return;
    }

    if (!cfg) {
      sendJson(res, 503, {
        error: "WooCommerce proxy not configured. Set WOOCOMMERCE_* in Vercel environment variables.",
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

    const qs = new URLSearchParams(url.search);
    qs.delete("path");
    qs.set("consumer_key", cfg.consumerKey);
    qs.set("consumer_secret", cfg.consumerSecret);
    const target = `${cfg.storeUrl}/wp-json/wc/v3/${subPath}?${qs.toString()}`;
    const upstream = await fetch(target, { method: "GET", headers: { Accept: "application/json" } });
    const body = await upstream.text();
    if (res.writableEnded) return;
    res.statusCode = upstream.status;
    res.setHeader("Content-Type", upstream.headers.get("content-type") || "application/json; charset=utf-8");
    res.setHeader("Cache-Control", "private, max-age=60");
    res.end(body);
  } catch {
    sendJson(res, 500, { error: "Function error" });
  }
}
