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
const ALLOWED = /^(auth|products|products-search|featured|new-arrivals|home-rails|categories|banners|related|notify-stock|orders|cart|payments|brands)(\/|$)/i;

function header(req: NodeReq, name: string): string {
  const raw = req.headers?.[name] ?? req.headers?.[name.toLowerCase()];
  if (Array.isArray(raw)) return raw[0] || "";
  return typeof raw === "string" ? raw : "";
}

function subPath(req: NodeReq): string {
  const url = req.url || "/";
  const pathname = url.split("?")[0] || "";
  for (const marker of ["/api/cloud/", "/cloud-api/"]) {
    const at = pathname.indexOf(marker);
    if (at >= 0) return pathname.slice(at + marker.length).replace(/^\/+/, "");
  }
  if (pathname === "/api/cloud" || pathname === "/cloud-api") return "";
  const raw = req.query?.path;
  if (Array.isArray(raw)) return raw.join("/");
  if (typeof raw === "string") return raw.replace(/^\/+/, "");
  return "";
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

  const search = (req.url || "").includes("?") ? (req.url || "").slice((req.url || "").indexOf("?")) : "";
  const target = `${UPSTREAM}/${path}${search}`;
  const body = method === "GET" || method === "HEAD" ? undefined : await readBody(req);
  const headers: Record<string, string> = { Accept: header(req, "accept") || "application/json" };
  const contentType = header(req, "content-type");
  if (contentType) headers["Content-Type"] = contentType;
  const auth = header(req, "authorization");
  if (auth) headers.Authorization = auth;

  try {
    const upstream = await fetch(target, {
      method,
      headers,
      body: body && body.length > 0 ? new Uint8Array(body) : undefined,
    });
    const buf = Buffer.from(await upstream.arrayBuffer());
    res.statusCode = upstream.status;
    res.setHeader("Content-Type", upstream.headers.get("content-type") || "application/json; charset=utf-8");
    res.setHeader("Cache-Control", "no-store");
    res.end(buf);
  } catch {
    res.statusCode = 502;
    res.setHeader("Content-Type", "application/json; charset=utf-8");
    res.end(JSON.stringify({ detail: "Could not reach the account service. Please try again." }));
  }
}
