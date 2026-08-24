import {
  SAMPHONE_API_BASE,
  catalogImageReferrerPolicy,
  getStoredApiJwt,
  normalizeCatalogImageUrl,
  setStoredApiJwt,
} from "@/config/samphone";
import type { WooCategory, WooProduct } from "@/lib/woocommerce";
import { WooCommerceFetchError, normalizeProductGallery } from "@/lib/woocommerce";

export { catalogImageReferrerPolicy };

type CloudCategory = {
  wc_id?: number;
  name?: string;
  slug?: string;
  count?: number;
  parent?: number;
};

type CloudProduct = {
  id?: string;
  wc_id?: number;
  slug?: string;
  title?: string;
  name?: string;
  permalink?: string;
  price?: number | string | null;
  regularPrice?: number | string | null;
  salePrice?: number | string | null;
  image?: string | null;
  images?: string[] | { src?: string }[];
  sku?: string;
  description?: string;
  categories?: { wc_id?: number; id?: number; name?: string; slug?: string }[];
  category?: string;
  brand?: string;
  color_variants?: unknown[];
  variants?: unknown[];
  in_stock?: boolean;
  on_sale?: boolean;
};

type ListEnvelope<T> = { items?: T[]; total?: number; has_more?: boolean };

function formatFastApiError(text: string, status: number): string {
  try {
    const parsed = JSON.parse(text) as { detail?: unknown };
    if (typeof parsed.detail === "string" && parsed.detail.trim()) return parsed.detail;
    if (Array.isArray(parsed.detail)) {
      return parsed.detail
        .map((row) => {
          if (typeof row === "string") return row;
          if (row && typeof row === "object" && "msg" in row) return String((row as { msg: unknown }).msg);
          return "";
        })
        .filter(Boolean)
        .join("; ");
    }
  } catch {
    /* not JSON */
  }
  return text.trim() || `Request failed with status ${status}`;
}

async function cloudFetchJson<T>(path: string, init?: RequestInit): Promise<T> {
  const url = path.startsWith("http") ? path : `${SAMPHONE_API_BASE}${path.startsWith("/") ? path : `/${path}`}`;
  const headers = new Headers(init?.headers);
  headers.set("Accept", "application/json");
  const jwt = getStoredApiJwt();
  if (jwt && !headers.has("Authorization")) headers.set("Authorization", `Bearer ${jwt}`);
  let res: Response;
  try {
    res = await fetch(url, { ...init, headers });
  } catch {
    throw new WooCommerceFetchError(`Network request failed: ${url.split("?")[0]}`);
  }
  if (!res.ok) {
    const text = await res.text().catch(() => "");
    throw new WooCommerceFetchError(formatFastApiError(text, res.status), res.status);
  }
  return (await res.json()) as T;
}

function money(v: number | string | null | undefined): string {
  if (v == null || v === "") return "";
  const n = typeof v === "number" ? v : Number.parseFloat(String(v));
  if (!Number.isFinite(n) || n <= 0) return "";
  return String(n);
}

function imageList(p: CloudProduct): WooProduct["images"] {
  const raw: string[] = [];
  if (Array.isArray(p.images)) {
    for (const img of p.images) {
      if (typeof img === "string") raw.push(img);
      else if (img && typeof img.src === "string") raw.push(img.src);
    }
  }
  if (typeof p.image === "string") raw.unshift(p.image);
  const out: WooProduct["images"] = [];
  const seen = new Set<string>();
  let i = 0;
  for (const src of raw) {
    const n = normalizeCatalogImageUrl(src);
    if (!n || seen.has(n)) continue;
    seen.add(n);
    out.push({ id: i++, src: n, name: "", alt: p.title || p.name || "" });
  }
  return out;
}

export function mapCloudProduct(p: CloudProduct): WooProduct | null {
  const wcId = typeof p.wc_id === "number" && p.wc_id > 0 ? p.wc_id : 0;
  const uuid = typeof p.id === "string" ? p.id : "";
  if (!wcId && !uuid) return null;
  const cats = Array.isArray(p.categories)
    ? p.categories.map((c) => ({
        id: typeof c.wc_id === "number" ? c.wc_id : typeof c.id === "number" ? c.id : 0,
        name: c.name || p.category || p.brand || "",
        slug: c.slug || "",
      }))
    : p.category
      ? [{ id: 0, name: p.category, slug: "" }]
      : [];
  const price = money(p.price) || money(p.regularPrice);
  return normalizeProductGallery({
    id: wcId || Math.abs(hashString(uuid)),
    cloudId: uuid || undefined,
    name: p.title || p.name || "",
    slug: p.slug || "",
    permalink: p.permalink || "",
    price,
    regular_price: money(p.regularPrice) || price,
    sale_price: money(p.salePrice),
    categories: cats,
    images: imageList(p),
    sku: p.sku,
    description: p.description,
    on_sale: Boolean(p.on_sale) || Boolean(money(p.salePrice)),
    stock_status: p.in_stock === false ? "outofstock" : "instock",
  });
}

function hashString(s: string): number {
  let h = 0;
  for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) | 0;
  return h === 0 ? 1 : h;
}

function mapItems(raw: unknown): WooProduct[] {
  const items = Array.isArray(raw)
    ? raw
    : raw && typeof raw === "object" && Array.isArray((raw as ListEnvelope<CloudProduct>).items)
      ? (raw as ListEnvelope<CloudProduct>).items!
      : [];
  const out: WooProduct[] = [];
  const seen = new Set<number>();
  for (const row of items) {
    const p = mapCloudProduct(row as CloudProduct);
    if (!p || seen.has(p.id)) continue;
    seen.add(p.id);
    out.push(p);
  }
  return out;
}

export async function fetchCloudProductsPage(offset: number, limit = 100): Promise<WooProduct[]> {
  const qs = new URLSearchParams({ limit: String(limit), offset: String(Math.max(0, offset)) });
  const data = await cloudFetchJson<ListEnvelope<CloudProduct>>(`/products?${qs.toString()}`);
  return mapItems(data);
}

export async function fetchCloudHomeSeed(limit = 24): Promise<WooProduct[]> {
  const [featured, news, rails] = await Promise.allSettled([
    cloudFetchJson<ListEnvelope<CloudProduct>>(`/featured?limit=${limit}`),
    cloudFetchJson<ListEnvelope<CloudProduct>>(`/new-arrivals?limit=${limit}`),
    cloudFetchJson<{ best?: CloudProduct[]; items?: CloudProduct[] }>(`/home-rails?part=all&limit=${limit}`),
  ]);
  const bag: CloudProduct[] = [];
  if (featured.status === "fulfilled") bag.push(...(featured.value.items ?? []));
  if (news.status === "fulfilled") bag.push(...(news.value.items ?? []));
  if (rails.status === "fulfilled") {
    const r = rails.value;
    if (Array.isArray(r.best)) bag.push(...r.best);
    if (Array.isArray(r.items)) bag.push(...r.items);
    for (const v of Object.values(r)) {
      if (Array.isArray(v)) bag.push(...(v as CloudProduct[]));
    }
  }
  return mapItems(bag);
}

export async function fetchCloudCategories(): Promise<WooCategory[]> {
  const data = await cloudFetchJson<ListEnvelope<CloudCategory>>("/categories");
  const items = data.items ?? [];
  return items
    .filter((c) => typeof c.wc_id === "number")
    .map((c) => ({
      id: c.wc_id as number,
      name: c.name || "",
      slug: c.slug || "",
      parent: typeof c.parent === "number" ? c.parent : 0,
      count: typeof c.count === "number" ? c.count : 0,
    }));
}

export async function fetchCloudBanners(): Promise<{ id: number; src: string; alt: string }[]> {
  const data = await cloudFetchJson<ListEnvelope<{ id?: string | number; wc_id?: number; src?: string; image?: string; image_url?: string; title?: string }>>(
    "/banners",
  );
  const items = data.items ?? [];
  const out: { id: number; src: string; alt: string }[] = [];
  const seen = new Set<string>();
  for (const b of items) {
    const src = normalizeCatalogImageUrl(b.src || b.image_url || b.image);
    if (!src || seen.has(src)) continue;
    seen.add(src);
    const id = typeof b.wc_id === "number" ? b.wc_id : Number(b.id) || out.length;
    out.push({ id, src, alt: b.title || "SAMPHONE" });
  }
  return out;
}

export async function fetchCloudProductByWcId(wcId: number | string): Promise<WooProduct | null> {
  const id = typeof wcId === "number" ? wcId : wcId.trim();
  if (id === "" || (typeof id === "number" && (!Number.isFinite(id) || id <= 0))) return null;
  try {
    const data = await cloudFetchJson<CloudProduct>(`/products/${encodeURIComponent(String(id))}`);
    return mapCloudProduct(data);
  } catch (e) {
    if (e instanceof WooCommerceFetchError && e.status === 404) return null;
    throw e;
  }
}

export async function fetchCloudProductsByCategory(categoryId: number, categoryName?: string): Promise<WooProduct[]> {
  if (!Number.isFinite(categoryId) || categoryId <= 0) {
    throw new WooCommerceFetchError("Invalid category ID.");
  }
  const byModel = await cloudFetchJson<ListEnvelope<CloudProduct>>(
    `/products?model_wc_id=${categoryId}&limit=100&offset=0`,
  );
  const modelItems = mapItems(byModel);
  if (modelItems.length > 0) return modelItems;
  const name = categoryName?.trim();
  if (!name) return [];
  const byName = await cloudFetchJson<ListEnvelope<CloudProduct>>(
    `/products?category=${encodeURIComponent(name)}&limit=100&offset=0`,
  );
  return mapItems(byName);
}

export async function searchCloudProducts(query: string, limit = 20): Promise<WooProduct[]> {
  const q = query.trim();
  if (!q) return [];
  const data = await cloudFetchJson<ListEnvelope<CloudProduct>>(
    `/products-search?q=${encodeURIComponent(q)}&sort=date_desc`,
  );
  return mapItems(data).slice(0, limit);
}

function parseAuthPayload(data: Record<string, unknown>, fallbackEmail: string, fallbackName?: string) {
  const token =
    (typeof data.access_token === "string" && data.access_token) ||
    (typeof data.token === "string" && data.token) ||
    (typeof data.jwt === "string" && data.jwt) ||
    null;
  const user = (data.user && typeof data.user === "object" ? data.user : data) as {
    email?: string;
    name?: string;
  };
  return {
    token,
    email: user.email || fallbackEmail,
    name: user.name || fallbackName || fallbackEmail.split("@")[0],
  };
}

export async function cloudAuth(
  path: "/auth/login" | "/auth/register" | "/auth/clerk-sync",
  body: Record<string, string>,
) {
  const data = await cloudFetchJson<Record<string, unknown>>(path, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  const parsed = parseAuthPayload(data, body.email || "", body.name);
  if (parsed.token) setStoredApiJwt(parsed.token);
  return parsed;
}

export async function clerkSync(clerkToken: string) {
  return cloudAuth("/auth/clerk-sync", { clerk_token: clerkToken });
}

export async function startStripeCheckout(items: { productId: string; quantity: number }[]): Promise<string> {
  if (items.length === 0) throw new WooCommerceFetchError("Cart is empty.");
  const cartItems = items.map((row) => ({ product_id: row.productId, quantity: row.quantity }));
  try {
    await cloudFetchJson("/cart", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ items: cartItems }),
    });
  } catch {
    /* Checkout session still recalculates amounts server-side. */
  }
  const origin = window.location.origin;
  const data = await cloudFetchJson<{ url?: string; checkout_url?: string; session_url?: string }>(
    "/payments/stripe/checkout-session",
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        success_url: `${origin}/cart?checkout=success`,
        cancel_url: `${origin}/cart?checkout=cancel`,
        items: cartItems,
      }),
    },
  );
  const url = data.url || data.checkout_url || data.session_url;
  if (!url) throw new WooCommerceFetchError("Checkout session did not return a URL.");
  return url;
}

export { cloudFetchJson };
