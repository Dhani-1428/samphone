type ApiReq = { method?: string; url?: string; headers?: { host?: string }; query?: { path?: string | string[] } };
type ApiRes = {
  statusCode: number;
  writableEnded?: boolean;
  setHeader: (name: string, value: string) => void;
  end: (body: string) => void;
};

function configured(): boolean {
  const storeUrl = String(process.env.WOOCOMMERCE_STORE_URL || "").trim();
  const key = String(process.env.WOOCOMMERCE_CONSUMER_KEY || "").trim();
  const secret = String(process.env.WOOCOMMERCE_CONSUMER_SECRET || "").trim();
  return Boolean(storeUrl && key && secret);
}

export default function handler(req: ApiReq, res: ApiRes): void {
  try {
    if (req.method !== "GET" && req.method !== "HEAD") {
      res.statusCode = 405;
      res.setHeader("Content-Type", "application/json; charset=utf-8");
      res.end(JSON.stringify({ error: "Method not allowed" }));
      return;
    }
    res.statusCode = 200;
    res.setHeader("Content-Type", "application/json; charset=utf-8");
    res.setHeader("Cache-Control", "no-store");
    res.end(JSON.stringify({ configured: configured() }));
  } catch {
    res.statusCode = 500;
    res.setHeader("Content-Type", "application/json; charset=utf-8");
    res.end(JSON.stringify({ error: "Function error" }));
  }
}
