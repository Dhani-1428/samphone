module.exports = function handler(req, res) {
  try {
    if (req.method !== "GET" && req.method !== "HEAD") {
      res.statusCode = 405;
      res.setHeader("Content-Type", "application/json; charset=utf-8");
      res.end(JSON.stringify({ error: "Method not allowed" }));
      return;
    }
    const storeUrl = String(process.env.WOOCOMMERCE_STORE_URL || "").trim();
    const key = String(process.env.WOOCOMMERCE_CONSUMER_KEY || "").trim();
    const secret = String(process.env.WOOCOMMERCE_CONSUMER_SECRET || "").trim();
    res.statusCode = 200;
    res.setHeader("Content-Type", "application/json; charset=utf-8");
    res.setHeader("Cache-Control", "no-store");
    res.end(JSON.stringify({ configured: Boolean(storeUrl && key && secret) }));
  } catch {
    res.statusCode = 500;
    res.setHeader("Content-Type", "application/json; charset=utf-8");
    res.end(JSON.stringify({ error: "Function error" }));
  }
};
