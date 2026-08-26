import https from "node:https";
import { Buffer } from "node:buffer";

type NodeReq = {
  method?: string;
  url?: string;
  headers?: Record<string, string | string[] | undefined>;
  body?: unknown;
  query?: { path?: string | string[] };
};

type NodeRes = {
  statusCode: number;
  writableEnded?: boolean;
  setHeader: (name: string, value: string) => void;
  end: (body?: string | Buffer) => void;
};

const UPSTREAM = "https://samphone.cloud/api";
const ALLOWED =
  /^(auth|products|products-search|featured|new-arrivals|home-rails|categories|banners|related|notify-stock|orders|cart|payments|brands|admin)(\/|$)/i;

function header(req: NodeReq, name: string): string {
  const raw = req.headers?.[name] ?? req.headers?.[name.toLowerCase()];
  if (Array.isArray(raw)) return raw[0] || "";
  return typeof raw === "string" ? raw : "";
}

function subPath(req: NodeReq): string {
  const raw = req.query?.path;
  if (Array.isArray(raw) && raw.length > 0) return raw.filter(Boolean).join("/");
  if (typeof raw === "string" && raw.length > 0) return raw.replace(/^\/+/, "");

  const url = req.url || "/";
  const pathname = url.split("?")[0] || "";
  for (const marker of ["/api/cloud/", "/cloud-api/"]) {
    const at = pathname.indexOf(marker);
    if (at >= 0) return pathname.slice(at + marker.length).replace(/^\/+/, "");
  }
  if (pathname === "/api/cloud" || pathname === "/cloud-api") return "";
  return "";
}

function forwardSearch(req: NodeReq): string {
  const url = req.url || "";
  const qIndex = url.indexOf("?");
  if (qIndex < 0) return "";
  const qs = new URLSearchParams(url.slice(qIndex + 1));
  qs.delete("path");
  const s = qs.toString();
  return s ? `?${s}` : "";
}

async function readBody(req: NodeReq): Promise<Buffer> {
  if (typeof req.body === "string") return Buffer.from(req.body);
  if (Buffer.isBuffer(req.body)) return req.body;
  if (req.body && typeof req.body === "object") return Buffer.from(JSON.stringify(req.body));
  const chunks: Buffer[] = [];
  const stream = req as unknown as AsyncIterable<unknown>;
  try {
    for await (const chunk of stream) {
      if (typeof chunk === "string") chunks.push(Buffer.from(chunk));
      else if (Buffer.isBuffer(chunk)) chunks.push(chunk);
      else if (chunk instanceof Uint8Array) chunks.push(Buffer.from(chunk));
    }
  } catch {
    /* no stream body */
  }
  return Buffer.concat(chunks);
}

function proxy(target: string, method: string, headers: Record<string, string>, body: Buffer): Promise<{
  status: number;
  contentType: string;
  body: Buffer;
}> {
  return new Promise((resolve, reject) => {
    const url = new URL(target);
    const payload = method === "GET" || method === "HEAD" ? undefined : body;
    const reqHeaders = { ...headers };
    if (payload && payload.length > 0) reqHeaders["Content-Length"] = String(payload.length);
    const upstream = https.request(
      {
        protocol: url.protocol,
        hostname: url.hostname,
        port: url.port || 443,
        path: `${url.pathname}${url.search}`,
        method,
        headers: reqHeaders,
      },
      (incoming) => {
        const chunks: Buffer[] = [];
        incoming.on("data", (chunk: Buffer) => {
          chunks.push(chunk);
        });
        incoming.on("end", () => {
          resolve({
            status: incoming.statusCode ?? 0,
            contentType: String(incoming.headers["content-type"] || "application/json; charset=utf-8"),
            body: Buffer.concat(chunks),
          });
        });
      },
    );
    upstream.on("error", reject);
    if (payload && payload.length > 0) upstream.write(payload);
    upstream.end();
  });
}

export default async function handler(req: NodeReq, res: NodeRes): Promise<void> {
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
  const headers: Record<string, string> = { Accept: header(req, "accept") || "application/json" };
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
}
