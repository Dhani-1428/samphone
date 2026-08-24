import {
  SAMPHONE_API_BASE,
  SITE_HOME_BANNERS,
  catalogImageReferrerPolicy,
  getStoredApiJwt,
  normalizeCatalogImageUrl,
  preferOriginalUpload,
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
  specs?: Record<string, string>;
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
    specs: p.specs && typeof p.specs === "object" ? p.specs : undefined,
    colorVariants: colorNames(p.color_variants),
    brand: p.brand,
  });
}

function colorNames(raw: unknown): string[] | undefined {
  if (!Array.isArray(raw) || raw.length === 0) return undefined;
  const out: string[] = [];
  for (const row of raw) {
    if (typeof row === "string" && row.trim()) out.push(row.trim());
    else if (row && typeof row === "object") {
      const o = row as { name?: string; color?: string; title?: string };
      const n = o.name || o.color || o.title;
      if (n) out.push(n);
    }
  }
  return out.length ? out : undefined;
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
    const src = preferOriginalUpload(
      normalizeCatalogImageUrl(b.src || b.image_url || b.image) || "",
    );
    if (!src || seen.has(src)) continue;
    seen.add(src);
    const id = typeof b.wc_id === "number" ? b.wc_id : Number(b.id) || out.length;
    out.push({ id, src, alt: b.title || "SAMPHONE" });
  }
  if (out.length > 0) return out;
  return SITE_HOME_BANNERS.map((src, i) => ({ id: i + 1, src, alt: "SAMPHONE" }));
}

export function firstCatalogImage(products: WooProduct[]): string | null {
  for (const p of products) {
    for (const img of p.images ?? []) {
      const src = preferOriginalUpload(img.src);
      if (src) return src;
    }
  }
  return null;
}

export async function fetchCloudProductList(
  query: Record<string, string>,
  limit = 16,
): Promise<{ items: WooProduct[]; total: number }> {
  const params = new URLSearchParams({ limit: String(limit), offset: "0", ...query });
  const data = await cloudFetchJson<ListEnvelope<CloudProduct>>(`/products?${params.toString()}`);
  const items = mapItems(data);
  return { items, total: typeof data.total === "number" ? data.total : items.length };
}

export async function searchCloudProductsPage(
  query: string,
  limit = 24,
): Promise<{ items: WooProduct[]; total: number }> {
  const q = query.trim();
  if (!q) return { items: [], total: 0 };
  const data = await cloudFetchJson<ListEnvelope<CloudProduct>>(
    `/products-search?q=${encodeURIComponent(q)}&sort=date_desc`,
  );
  const items = mapItems(data);
  return { items: items.slice(0, limit), total: typeof data.total === "number" ? data.total : items.length };
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
  const user = (data.user && typeof data.user === "object" ? data.user : data) as Record<string, unknown>;
  const str = (k: string) => (typeof user[k] === "string" ? (user[k] as string) : "");
  return {
    token,
    email: str("email") || fallbackEmail,
    name: str("name") || fallbackName || fallbackEmail.split("@")[0],
    isWholesale: user.isWholesale === true,
    wholesaleStatus: str("wholesaleStatus") || undefined,
    accountType: str("accountType") || undefined,
    dealerTier: str("dealerTier") || undefined,
    phone: str("phone") || undefined,
    vatNumber: str("vatNumber") || undefined,
    businessName: str("businessName") || undefined,
  };
}

export async function cloudAuth(
  path: "/auth/login" | "/auth/register" | "/auth/clerk-sync",
  body: Record<string, string | boolean | number>,
) {
  const data = await cloudFetchJson<Record<string, unknown>>(path, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  const email = typeof body.email === "string" ? body.email : "";
  const name = typeof body.name === "string" ? body.name : undefined;
  const parsed = parseAuthPayload(data, email, name);
  if (parsed.token) setStoredApiJwt(parsed.token);
  return parsed;
}

export async function clerkSync(clerkToken: string) {
  return cloudAuth("/auth/clerk-sync", { clerk_token: clerkToken });
}

export type CloudHomeRails = {
  best: WooProduct[];
  fresh: WooProduct[];
  sections: { key: string; title: string; group?: string; items: WooProduct[] }[];
};

export async function fetchCloudHomeRails(limit = 10): Promise<CloudHomeRails> {
  const data = await cloudFetchJson<{
    best?: CloudProduct[];
    fresh?: CloudProduct[];
    sections?: { key?: string; title?: string; category_group?: string; items?: CloudProduct[] }[];
  }>(`/home-rails?part=all&limit=${limit}`);
  return {
    best: mapItems(data.best ?? []),
    fresh: mapItems(data.fresh ?? []),
    sections: (data.sections ?? []).map((s) => ({
      key: s.key || s.title || "",
      title: s.title || s.key || "",
      group: s.category_group,
      items: mapItems(s.items ?? []),
    })),
  };
}

export async function fetchCloudProductsByGroup(group: string, limit = 48): Promise<WooProduct[]> {
  const g = group.trim();
  if (!g) return [];
  const page = await fetchCloudProductList({ category_group: g }, limit);
  return page.items;
}

export async function fetchCloudRelated(productId: string): Promise<WooProduct[]> {
  const id = productId.trim();
  if (!id) return [];
  const data = await cloudFetchJson<ListEnvelope<CloudProduct>>(`/related/${encodeURIComponent(id)}`);
  return mapItems(data);
}

export async function notifyStock(productId: string, email: string): Promise<void> {
  await cloudFetchJson("/notify-stock", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ product_id: productId, email }),
  });
}

export type CloudProfile = {
  email: string;
  name: string;
  phone?: string;
  address?: string;
  city?: string;
  postal_code?: string;
  vatNumber?: string;
  businessName?: string;
  businessType?: string;
  accountType?: string;
  isWholesale?: boolean;
  wholesaleStatus?: string;
  dealerTier?: string;
  language?: string;
};

export async function fetchCloudMe(): Promise<CloudProfile | null> {
  try {
    const data = await cloudFetchJson<Record<string, unknown>>("/auth/me");
    const parsed = parseAuthPayload(data, "");
    const extra = (data.user && typeof data.user === "object" ? data.user : data) as Record<string, unknown>;
    return {
      ...parsed,
      phone: parsed.phone,
      address: typeof extra.address === "string" ? extra.address : undefined,
      city: typeof extra.city === "string" ? extra.city : undefined,
      postal_code: typeof extra.postal_code === "string" ? extra.postal_code : undefined,
      vatNumber: parsed.vatNumber,
      businessName: parsed.businessName,
      businessType: typeof extra.businessType === "string" ? extra.businessType : undefined,
      language: typeof extra.language === "string" ? extra.language : undefined,
    };
  } catch {
    return null;
  }
}

export async function patchCloudProfile(body: Record<string, string>): Promise<CloudProfile | null> {
  const data = await cloudFetchJson<Record<string, unknown>>("/auth/profile", {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  return parseAuthPayload(data, "");
}

export async function exportCloudAccount(): Promise<unknown> {
  return cloudFetchJson("/auth/export");
}

export async function deleteCloudAccount(): Promise<void> {
  await cloudFetchJson("/auth/account", { method: "DELETE" });
}

export type CloudOrder = {
  id: string;
  createdAt: string;
  status: string;
  totalEur?: number;
  lines: { name: string; qty: number }[];
};

function mapCloudOrder(raw: unknown): CloudOrder | null {
  if (!raw || typeof raw !== "object") return null;
  const o = raw as Record<string, unknown>;
  const id = o.id != null ? String(o.id) : o.order_id != null ? String(o.order_id) : "";
  if (!id) return null;
  const items = Array.isArray(o.items) ? o.items : Array.isArray(o.lines) ? o.lines : [];
  const lines = items.map((row) => {
    const r = row && typeof row === "object" ? (row as Record<string, unknown>) : {};
    const qty = typeof r.quantity === "number" ? r.quantity : typeof r.qty === "number" ? r.qty : 1;
    const name =
      (typeof r.title === "string" && r.title) ||
      (typeof r.name === "string" && r.name) ||
      (typeof r.product_name === "string" && r.product_name) ||
      "Item";
    return { name, qty };
  });
  const totalRaw = o.total ?? o.totalEur ?? o.amount ?? o.grand_total;
  const totalEur = typeof totalRaw === "number" ? totalRaw : Number.parseFloat(String(totalRaw ?? ""));
  return {
    id,
    createdAt: typeof o.created_at === "string" ? o.created_at : typeof o.createdAt === "string" ? o.createdAt : new Date().toISOString(),
    status: typeof o.status === "string" ? o.status : "processing",
    totalEur: Number.isFinite(totalEur) ? totalEur : undefined,
    lines,
  };
}

export async function fetchCloudOrders(): Promise<CloudOrder[]> {
  const data = await cloudFetchJson<unknown>("/orders");
  const list = Array.isArray(data)
    ? data
    : data && typeof data === "object" && Array.isArray((data as { items?: unknown[] }).items)
      ? (data as { items: unknown[] }).items
      : [];
  return list.map(mapCloudOrder).filter((o): o is CloudOrder => o != null);
}

export async function createCloudOrder(payload: {
  items: { product_id: string; quantity: number }[];
  full_name: string;
  phone: string;
  address: string;
  city: string;
  postal_code: string;
  payment_method: string;
  shipping_method?: string;
  notes?: string;
}): Promise<CloudOrder> {
  const data = await cloudFetchJson<unknown>("/orders", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
  return mapCloudOrder(data) ?? { id: "ok", createdAt: new Date().toISOString(), status: "processing", lines: [] };
}

export async function cancelCloudOrder(orderId: string): Promise<void> {
  await cloudFetchJson(`/orders/${encodeURIComponent(orderId)}/cancel`, { method: "POST" });
}

export const CHECKOUT_DRAFT_KEY = "samphone-checkout-draft";

export type CheckoutDraft = {
  items: { productId: string; quantity: number }[];
  full_name: string;
  phone: string;
  address: string;
  city: string;
  postal_code: string;
  shipping_method: string;
  payment_method: string;
  notes: string;
};

export async function startStripeCheckout(
  items: { productId: string; quantity: number }[],
  extra?: { successPath?: string },
): Promise<string> {
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
  const successPath = extra?.successPath ?? "/cart?checkout=success";
  const data = await cloudFetchJson<{ url?: string; checkout_url?: string; session_url?: string }>(
    "/payments/stripe/checkout-session",
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        success_url: `${origin}${successPath}`,
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
