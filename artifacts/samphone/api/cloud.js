const UPSTREAM_ORIGIN = (process.env.SAMPHONE_CLOUD_ORIGIN || process.env.SAMPHONE_API_ORIGIN || "https://samphone.cloud").replace(
  /\/$/,
  "",
);
const UPSTREAM = `${UPSTREAM_ORIGIN}/api`;
const ALLOWED =
  /^(auth|products|products-search|featured|new-arrivals|home-rails|categories|banners|related|notify-stock|stock-alerts|notifications|orders|cart|payments|brands|admin|leads|contact|newsletter|health|translate)(\/|$)/i;

function header(req, name) {
  const raw = req.headers?.[name] ?? req.headers?.[name.toLowerCase()];
  if (Array.isArray(raw)) return raw[0] || "";
  return typeof raw === "string" ? raw : "";
}

function clientIp(req) {
  for (const name of ["x-vercel-forwarded-for", "x-real-ip", "x-forwarded-for", "cf-connecting-ip"]) {
    const raw = header(req, name);
    if (raw) return raw.split(",")[0].trim();
  }
  return "";
}

function subPath(req) {
  const raw = req.query?.path;
  if (Array.isArray(raw) && raw.length > 0) return raw.filter(Boolean).join("/");
  if (typeof raw === "string" && raw.length > 0) return raw.replace(/^\/+/, "");

  const href = req.url || "/";
  const pathname = href.split("?")[0] || "";
  for (const marker of ["/api/cloud/", "/cloud-api/"]) {
    const at = pathname.indexOf(marker);
    if (at >= 0) return pathname.slice(at + marker.length).replace(/^\/+/, "");
  }
  if (pathname === "/api/cloud" || pathname === "/cloud-api") return "";
  return "";
}

function forwardSearch(req) {
  const href = req.url || "";
  const qIndex = href.indexOf("?");
  if (qIndex < 0) return "";
  const qs = new URLSearchParams(href.slice(qIndex + 1));
  qs.delete("path");
  const s = qs.toString();
  return s ? `?${s}` : "";
}

async function readBody(req) {
  if (typeof req.body === "string") return Buffer.from(req.body);
  if (Buffer.isBuffer(req.body)) return req.body;
  if (req.body && typeof req.body === "object") return Buffer.from(JSON.stringify(req.body));
  const chunks = [];
  try {
    for await (const chunk of req) {
      if (typeof chunk === "string") chunks.push(Buffer.from(chunk));
      else if (Buffer.isBuffer(chunk)) chunks.push(Buffer.from(chunk));
      else if (chunk instanceof Uint8Array) chunks.push(Buffer.from(chunk));
    }
  } catch {
    /* no stream body */
  }
  return Buffer.concat(chunks);
}

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function proxyOnce(target, method, headers, body) {
  const payload = method === "GET" || method === "HEAD" ? undefined : body;
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 25_000);
  try {
    const upstream = await fetch(target, {
      method,
      headers,
      body: payload && payload.length > 0 ? payload : undefined,
      signal: controller.signal,
      redirect: "follow",
    });
    return {
      status: upstream.status,
      contentType: upstream.headers.get("content-type") || "application/json; charset=utf-8",
      body: Buffer.from(await upstream.arrayBuffer()),
    };
  } finally {
    clearTimeout(timer);
  }
}

async function proxy(target, method, headers, body) {
  let last;
  for (let attempt = 0; attempt < 2; attempt += 1) {
    try {
      last = await proxyOnce(target, method, headers, body);
      if (last.status < 502 || method !== "GET") return last;
    } catch (err) {
      last = err;
    }
    if (attempt === 0) await sleep(350);
  }
  if (last && typeof last.status === "number") return last;
  throw last || new Error("upstream failed");
}

module.exports = async function handler(req, res) {
  const method = (req.method || "GET").toUpperCase();
  if (method === "OPTIONS") {
    res.statusCode = 204;
    res.setHeader("Cache-Control", "no-store");
    res.end();
    return;
  }

  const path = subPath(req);
  if (!path || path.includes("..") || !ALLOWED.test(path)) {
    res.statusCode = 404;
    res.setHeader("Content-Type", "application/json; charset=utf-8");
    res.end(JSON.stringify({ detail: "Not found" }));
    return;
  }

  const target = `${UPSTREAM}/${path}${forwardSearch(req)}`;
  const body = method === "GET" || method === "HEAD" ? Buffer.alloc(0) : await readBody(req);
  const headers = {
    Accept: header(req, "accept") || "application/json",
    "User-Agent": "samphone-vercel-proxy",
  };
  const ip = clientIp(req);
  if (ip) {
    headers["X-Forwarded-For"] = ip;
    headers["X-Real-IP"] = ip;
  }
  const contentType = header(req, "content-type");
  if (contentType) headers["Content-Type"] = contentType;
  const auth = header(req, "authorization");
  if (auth) headers.Authorization = auth;

  try {
    const upstream = await proxy(target, method, headers, body);
    res.statusCode = upstream.status;
    res.setHeader("Content-Type", upstream.contentType);
    res.setHeader("Cache-Control", "no-store");
    res.end(upstream.body);
  } catch {
    res.statusCode = 502;
    res.setHeader("Content-Type", "application/json; charset=utf-8");
    res.end(JSON.stringify({ detail: "Could not reach the account service. Please try again." }));
  }
};

if (typeof module.exports === "function") module.exports.config = { maxDuration: 30 };
