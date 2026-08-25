type ApiReq = { method?: string; url?: string; headers?: { host?: string } };
type ApiRes = {
  statusCode: number;
  writableEnded?: boolean;
  setHeader: (name: string, value: string) => void;
  end: (body: string) => void;
};

/** Vercel function TS uses a Node `Response` type without fetch methods. */
type Upstream = {
  status: number;
  text: () => Promise<string>;
  headers: { get: (name: string) => string | null };
};

function sendJson(res: ApiRes, status: number, body: unknown): void {
  if (res.writableEnded) return;
  res.statusCode = status;
  res.setHeader("Content-Type", "application/json; charset=utf-8");
  res.end(JSON.stringify(body));
}

function cfg() {
  const storeUrl = String(process.env.WOOCOMMERCE_STORE_URL || "").replace(/\/$/, "").trim();
  const consumerKey = String(process.env.WOOCOMMERCE_CONSUMER_KEY || "").trim();
  const consumerSecret = String(process.env.WOOCOMMERCE_CONSUMER_SECRET || "").trim();
  if (!storeUrl || !consumerKey || !consumerSecret) return null;
  return { storeUrl, consumerKey, consumerSecret };
}

export default async function handler(req: ApiReq, res: ApiRes): Promise<void> {
  try {
    if (req.method !== "GET" && req.method !== "HEAD") {
      sendJson(res, 405, { error: "Method not allowed" });
      return;
    }
    const c = cfg();
    if (!c) {
      sendJson(res, 503, { error: "WooCommerce proxy not configured. Set WOOCOMMERCE_* in Vercel environment variables." });
      return;
    }
    const qs = new URLSearchParams({
      search: "banner",
      per_page: "12",
      media_type: "image",
      orderby: "date",
      order: "desc",
      consumer_key: c.consumerKey,
      consumer_secret: c.consumerSecret,
    });
    const upstream = (await fetch(`${c.storeUrl}/wp-json/wp/v2/media?${qs.toString()}`, {
      headers: { Accept: "application/json" },
    })) as unknown as Upstream;
    const body = await upstream.text();
    if (upstream.status < 200 || upstream.status >= 300) {
      sendJson(res, 502, { error: "Failed to load homepage banners" });
      return;
    }
    let data: Array<{
      id?: number;
      source_url?: string;
      alt_text?: string;
      mime_type?: string;
      title?: { rendered?: string };
    }> = [];
    try {
      data = JSON.parse(body) as typeof data;
    } catch {
      sendJson(res, 502, { error: "Failed to load homepage banners" });
      return;
    }
    const seen = new Set<string>();
    const out: { id: number; src: string; alt: string }[] = [];
    for (const item of Array.isArray(data) ? data : []) {
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
    res.statusCode = 200;
    res.setHeader("Content-Type", "application/json; charset=utf-8");
    res.setHeader("Cache-Control", "private, max-age=120");
    res.end(JSON.stringify(out));
  } catch {
    sendJson(res, 500, { error: "Function error" });
  }
}
