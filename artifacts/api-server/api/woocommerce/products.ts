type ApiReq = { method?: string; url?: string; headers?: { host?: string } };
type ApiRes = {
  statusCode: number;
  writableEnded?: boolean;
  setHeader: (name: string, value: string) => void;
  end: (body: string) => void;
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
    const host = req.headers?.host || "localhost";
    let search = "";
    try {
      search = new URL(req.url || "/", `https://${host}`).search;
    } catch {
      search = "";
    }
    const qs = new URLSearchParams(search.startsWith("?") ? search.slice(1) : search);
    qs.set("consumer_key", c.consumerKey);
    qs.set("consumer_secret", c.consumerSecret);
    const upstream = await fetch(`${c.storeUrl}/wp-json/wc/v3/products?${qs.toString()}`, {
      headers: { Accept: "application/json" },
    });
    const body = await upstream.text();
    res.statusCode = upstream.status;
    res.setHeader("Content-Type", upstream.headers.get("content-type") || "application/json; charset=utf-8");
    res.setHeader("Cache-Control", "private, max-age=60");
    res.end(body);
  } catch {
    sendJson(res, 500, { error: "Function error" });
  }
}
