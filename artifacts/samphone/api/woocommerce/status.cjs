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

module.exports = function handler(req, res) {
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
    res.end(JSON.stringify({ configured: getWooServerConfig() != null }));
  } catch {
    res.statusCode = 500;
    res.setHeader("Content-Type", "application/json; charset=utf-8");
    res.end(JSON.stringify({ error: "Function error" }));
  }
};
