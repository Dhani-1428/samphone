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
import { parsePersonalPricing } from "@/lib/customer-price";

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
  retailPrice?: number | string | null;
  wholesalePrice?: number | string | null;
  compareAtPrice?: number | string | null;
  dealerOnly?: boolean | string | number | null;
  dealer_only?: boolean | string | number | null;
  moq?: number | string | null;
  minOrderQty?: number | string | null;
  min_order_qty?: number | string | null;
  attributes?: unknown;
  image?: string | null;
  images?: string[] | { src?: string }[];
  sku?: string;
  description?: string;
  categories?: { wc_id?: number; id?: number; name?: string; slug?: string }[];
  category?: string;
  subcategory?: string;
  model?: string;
  brand?: string;
  part_type?: string;
  leaf_category?: string;
  color_variants?: unknown[];
  variants?: unknown[];
  in_stock?: boolean;
  on_sale?: boolean;
  specs?: Record<string, string>;
  rating?: number;
  reviews?: number;
  stock_quantity?: number;
};

type ListEnvelope<T> = { items?: T[]; total?: number; has_more?: boolean };

function formatFastApiError(text: string, status: number): string {
  const trimmed = text.trim();
  if (status === 429) return "Too many attempts. Please wait a minute and try again.";
  if (/^<!doctype html/i.test(trimmed) || /^<html/i.test(trimmed)) {
    return "The account service is temporarily unavailable. Please try again.";
  }
  try {
    const parsed = JSON.parse(trimmed) as { detail?: unknown };
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
  return trimmed || `Request failed with status ${status}`;
}

function looksLikeHtml(text: string): boolean {
  const t = text.trim();
  return /^<!doctype html/i.test(t) || /^<html/i.test(t);
}

function isPublicAuthPath(path: string): boolean {
  const p = path.split("?")[0];
  return p === "/auth/login" || p === "/auth/register" || p === "/auth/clerk-sync";
}

async function cloudFetchJson<T>(path: string, init?: RequestInit): Promise<T> {
  const url = path.startsWith("http") ? path : `${SAMPHONE_API_BASE}${path.startsWith("/") ? path : `/${path}`}`;
  const headers = new Headers(init?.headers);
  headers.set("Accept", "application/json");
  const jwt = getStoredApiJwt();
  if (jwt && !headers.has("Authorization") && !isPublicAuthPath(path)) {
    headers.set("Authorization", `Bearer ${jwt}`);
  }
  let res: Response;
  try {
    res = await fetch(url, { ...init, headers });
  } catch {
    throw new WooCommerceFetchError(`Network request failed: ${url.split("?")[0]}`);
  }
  const text = await res.text().catch(() => "");
  if (!res.ok) {
    throw new WooCommerceFetchError(formatFastApiError(text, res.status), res.status);
  }
  if (looksLikeHtml(text)) {
    throw new WooCommerceFetchError("Unexpected response from the server. Please try again.");
  }
  try {
    return JSON.parse(text) as T;
  } catch {
    throw new WooCommerceFetchError("Could not read the server response. Please try again.");
  }
}

function money(v: number | string | null | undefined): string {
  if (v == null || v === "") return "";
  const n = typeof v === "number" ? v : Number.parseFloat(String(v));
  if (!Number.isFinite(n) || n <= 0) return "";
  return String(n);
}

function truthyFlag(v: unknown): boolean {
  if (v === true || v === 1) return true;
  if (typeof v === "string") return /^(1|true|yes|dealer)$/i.test(v.trim());
  return false;
}

function positiveInt(v: unknown): number | undefined {
  const n = typeof v === "number" ? v : Number.parseFloat(String(v ?? ""));
  if (!Number.isFinite(n) || n <= 1) return undefined;
  return Math.floor(n);
}

function dealerFields(p: CloudProduct): { dealerOnly?: boolean; minOrderQty?: number } {
  const specs = p.specs && typeof p.specs === "object" ? p.specs : {};
  const dealerOnly =
    truthyFlag(p.dealerOnly) ||
    truthyFlag(p.dealer_only) ||
    truthyFlag(specs.dealerOnly) ||
    truthyFlag(specs.dealer_only) ||
    truthyFlag(specs["Dealer only"]) ||
    /dealer[\s_-]*only/i.test(JSON.stringify(p));
  const minOrderQty =
    positiveInt(p.moq) ||
    positiveInt(p.minOrderQty) ||
    positiveInt(p.min_order_qty) ||
    positiveInt(specs.MOQ) ||
    positiveInt(specs.moq) ||
    positiveInt(specs.min_order_qty);
  return {
    dealerOnly: dealerOnly || undefined,
    minOrderQty,
  };
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
  if (Array.isArray(p.color_variants)) {
    for (const row of p.color_variants) {
      if (row && typeof row === "object" && typeof (row as { image?: string }).image === "string") {
        raw.push((row as { image: string }).image);
      }
    }
  }
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
  const retail = money(p.retailPrice) || money(p.price);
  const wholesale = money(p.wholesalePrice) || money(p.regularPrice);
  const price = retail || wholesale;
  const extras = dealerFields(p);
  return normalizeProductGallery({
    id: wcId || Math.abs(hashString(uuid)),
    cloudId: uuid || undefined,
    name: p.title || p.name || "",
    slug: p.slug || "",
    permalink: p.permalink || "",
    price,
    regular_price: wholesale || price,
    sale_price: money(p.salePrice),
    retailPrice: retail || undefined,
    wholesalePrice: wholesale || undefined,
    compareAtPrice: money(p.compareAtPrice) || undefined,
    dealerOnly: extras.dealerOnly,
    minOrderQty: extras.minOrderQty,
    categories: cats,
    images: imageList(p),
    sku: p.sku,
    description: p.description,
    on_sale: Boolean(money(p.compareAtPrice)),
    stock_status: p.in_stock === false ? "outofstock" : "instock",
    specs: p.specs && typeof p.specs === "object" ? p.specs : undefined,
    colorVariants: colorNames(p.color_variants),
    colorSwatches: parseColorSwatches(p.color_variants),
    brand: p.brand,
    partType: (p.part_type || p.leaf_category || p.specs?.Type || "").trim() || undefined,
    rating: typeof p.rating === "number" ? p.rating : undefined,
    reviewCount: typeof p.reviews === "number" ? p.reviews : undefined,
    catalogGroup: typeof p.category === "string" ? p.category : undefined,
    subcategory: typeof p.subcategory === "string" ? p.subcategory : undefined,
    modelLabel: typeof p.model === "string" && p.model.trim() ? p.model.trim() : undefined,
  });
}

function parseColorSwatches(raw: unknown): WooProduct["colorSwatches"] {
  if (!Array.isArray(raw) || raw.length === 0) return undefined;
  const out: NonNullable<WooProduct["colorSwatches"]> = [];
  const seen = new Set<string>();
  for (const row of raw) {
    if (typeof row === "string" && row.trim()) {
      const label = row.trim();
      const key = label.toLowerCase();
      if (seen.has(key)) continue;
      seen.add(key);
      out.push({ label, hex: hexFromLabel(label), image: null });
      continue;
    }
    if (!row || typeof row !== "object") continue;
    const o = row as { label?: string; name?: string; color?: string; title?: string; image?: string };
    const label = (o.label || o.name || o.title || o.color || "").trim();
    if (!label) continue;
    const key = label.toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);
    const hex = /^#?[0-9a-f]{3,8}$/i.test(o.color || "")
      ? o.color!.startsWith("#")
        ? o.color!
        : `#${o.color}`
      : hexFromLabel(label);
    const image = normalizeCatalogImageUrl(o.image) || null;
    out.push({ label, hex, image });
  }
  return out.length ? out : undefined;
}

function hexFromLabel(label: string): string {
  const n = label.toLowerCase();
  if (/\b(black|blk)\b/.test(n)) return "#1a1a1a";
  if (/\b(white|wht)\b/.test(n)) return "#f5f5f5";
  if (/\bred\b/.test(n)) return "#e53935";
  if (/\b(pink|pnk)\b/.test(n)) return "#f48fb1";
  if (/\b(blue|blu)\b/.test(n)) return "#2196f3";
  if (/\b(green|grn|pista)\b/.test(n) || /sea\s*green/.test(n)) return "#4caf50";
  if (/\byellow\b/.test(n)) return "#fdd835";
  if (/\b(purple|lavender)\b/.test(n)) return "#9c27b0";
  if (/\bmagenta\b/.test(n)) return "#4c2a4a";
  if (/\b(transparent|clear)\b/.test(n)) return "#e8e8e8";
  if (/\bgold\b/.test(n)) return "#d4af37";
  if (/\bsilver\b/.test(n)) return "#c0c0c0";
  if (/\borange\b/.test(n)) return "#fb8c00";
  if (/\bbrown\b/.test(n)) return "#6d4c41";
  if (/\b(grey|gray)\b/.test(n)) return "#9e9e9e";
  return "#9ca3af";
}

function colorNames(raw: unknown): string[] | undefined {
  return parseColorSwatches(raw)?.map((s) => s.label);
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
  const seen = new Set<string>();
  for (const row of items) {
    const p = mapCloudProduct(row as CloudProduct);
    if (!p) continue;
    const key = p.cloudId || `wc:${p.id}:${p.slug || p.name}`;
    if (seen.has(key)) continue;
    seen.add(key);
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
): Promise<{ items: WooProduct[]; total: number; hasMore: boolean; rawCount: number }> {
  const offset = query.offset ?? "0";
  const params = new URLSearchParams();
  params.set("limit", String(limit));
  params.set("offset", offset);
  for (const [k, v] of Object.entries(query)) {
    if (k === "limit" || k === "offset") continue;
    if (v != null && v !== "") params.set(k, v);
  }
  const data = await cloudFetchJson<ListEnvelope<CloudProduct>>(`/products?${params.toString()}`);
  const rawCount = Array.isArray(data.items) ? data.items.length : 0;
  const items = mapItems(data);
  const total = typeof data.total === "number" ? data.total : items.length;
  const offsetNum = Number.parseInt(offset, 10) || 0;
  const hasMore =
    data.has_more === true || (total > 0 && offsetNum + rawCount < total);
  return { items, total, hasMore, rawCount };
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
  const str = (...keys: string[]) => {
    for (const k of keys) {
      const v = user[k];
      if (typeof v === "string" && v.trim()) return v.trim();
    }
    return "";
  };
  return {
    token,
    email: str("email") || fallbackEmail,
    name: str("name") || fallbackName || fallbackEmail.split("@")[0],
    role: str("role") || undefined,
    isWholesale: user.isWholesale === true,
    wholesaleStatus: str("wholesaleStatus", "wholesale_status") || undefined,
    accountType: str("accountType", "account_type") || undefined,
    dealerTier: str("dealerTier", "dealer_tier") || undefined,
    phone: str("phone") || undefined,
    vatNumber: str("vatNumber", "vat_number") || undefined,
    businessName: str("businessName", "business_name") || undefined,
    companyAddress: str("companyAddress", "company_address") || undefined,
    businessType: str("businessType", "business_type") || undefined,
    address: str("address") || undefined,
    city: str("city") || undefined,
    postalCode: str("postal_code", "postalCode") || undefined,
    country: str("country") || undefined,
    language: str("language") || undefined,
    rejectionReason: str("rejectionReason", "rejection_reason") || undefined,
    personalPricing: parsePersonalPricing(user.personalPricing ?? user.personal_pricing),
  };
}

export async function cloudAuth(
  path: "/auth/login" | "/auth/register" | "/auth/clerk-sync",
  body: Record<string, string | boolean | number | undefined>,
) {
  const cleaned = Object.fromEntries(Object.entries(body).filter(([, v]) => v !== undefined && v !== ""));
  const data = await cloudFetchJson<Record<string, unknown>>(path, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(cleaned),
  });
  const email = typeof body.email === "string" ? body.email : "";
  const name = typeof body.name === "string" ? body.name : undefined;
  const parsed = parseAuthPayload(data, email, name);
  if (!parsed.token) {
    throw new WooCommerceFetchError("Sign-in did not return a session. Please try again.");
  }
  setStoredApiJwt(parsed.token);
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

function productDedupeKey(p: WooProduct): string {
  return p.cloudId || `wc:${p.id}:${p.slug || p.name}`;
}

function mergeWooProducts(lists: WooProduct[][]): WooProduct[] {
  const seen = new Set<string>();
  const out: WooProduct[] = [];
  for (const list of lists) {
    for (const p of list) {
      const key = productDedupeKey(p);
      if (seen.has(key)) continue;
      seen.add(key);
      out.push(p);
    }
  }
  return out;
}

export async function fetchCloudAllProducts(
  query: Record<string, string>,
  maxPages = 400,
  onProgress?: (items: WooProduct[], total: number) => void,
): Promise<WooProduct[]> {
  const all: WooProduct[] = [];
  const seen = new Set<string>();
  let offset = 0;
  const pageSize = 50;
  let catalogTotal = 0;
  for (let i = 0; i < maxPages; i += 1) {
    const { items, total, hasMore, rawCount } = await fetchCloudProductList(
      { ...query, offset: String(offset) },
      pageSize,
    );
    if (total > 0) catalogTotal = total;
    for (const p of items) {
      const key = productDedupeKey(p);
      if (seen.has(key)) continue;
      seen.add(key);
      all.push(p);
    }
    onProgress?.(all, catalogTotal || all.length);
    if (rawCount === 0) break;
    if (!hasMore) break;
    if (catalogTotal > 0 && offset + rawCount >= catalogTotal) break;
    offset += pageSize;
  }
  return all;
}

/** Load every query (category_group + Woo categories) and merge unique products. */
export async function fetchCloudMergedProducts(
  queries: Record<string, string>[],
  onProgress?: (items: WooProduct[], total: number) => void,
): Promise<WooProduct[]> {
  const unique = queries.filter((q) => Object.keys(q).length > 0);
  if (unique.length === 0) return [];
  if (unique.length === 1) {
    return fetchCloudAllProducts(unique[0], 400, onProgress);
  }
  const bags: WooProduct[][] = unique.map(() => []);
  const totals = unique.map(() => 0);
  const emit = () => {
    const merged = mergeWooProducts(bags);
    onProgress?.(merged, Math.max(merged.length, ...totals));
  };
  await Promise.all(
    unique.map(async (query, i) => {
      try {
        const list = await fetchCloudAllProducts(query, 400, (items, total) => {
          bags[i] = items;
          totals[i] = total;
          emit();
        });
        bags[i] = list;
        totals[i] = Math.max(totals[i], list.length);
        emit();
      } catch {
        emit();
      }
    }),
  );
  return mergeWooProducts(bags);
}

export async function fetchCloudProductsByGroup(group: string, limit = 48): Promise<WooProduct[]> {
  const g = group.trim();
  if (!g) return [];
  if (limit <= 50) {
    const page = await fetchCloudProductList({ category_group: g }, limit);
    return page.items;
  }
  return fetchCloudAllProducts({ category_group: g });
}

export async function fetchCloudProductsForModel(names: string[]): Promise<WooProduct[]> {
  for (const name of names) {
    const q = name.trim();
    if (!q) continue;
    const byModel = await fetchCloudAllProducts({ model: q });
    if (byModel.length > 0) return byModel;
  }
  for (const name of names) {
    const q = name.trim();
    if (!q) continue;
    const byQuery = await fetchCloudAllProducts({ q });
    if (byQuery.length > 0) return byQuery;
  }
  return [];
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
  token?: string | null;
  role?: string;
  phone?: string;
  address?: string;
  city?: string;
  postalCode?: string;
  postal_code?: string;
  country?: string;
  vatNumber?: string;
  businessName?: string;
  companyAddress?: string;
  businessType?: string;
  accountType?: string;
  isWholesale?: boolean;
  wholesaleStatus?: string;
  dealerTier?: string;
  language?: string;
  rejectionReason?: string;
  personalPricing?: import("@/lib/customer-price").PersonalPricingRule[];
};

export async function fetchCloudMe(): Promise<CloudProfile | null> {
  try {
    const data = await cloudFetchJson<Record<string, unknown>>("/auth/me");
    const parsed = parseAuthPayload(data, "");
    return {
      ...parsed,
      postal_code: parsed.postalCode,
    };
  } catch {
    return null;
  }
}

export async function patchCloudProfile(body: Record<string, string | boolean | number | undefined>): Promise<CloudProfile | null> {
  const cleaned = Object.fromEntries(Object.entries(body).filter(([, v]) => v !== undefined && v !== ""));
  const data = await cloudFetchJson<Record<string, unknown>>("/auth/profile", {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(cleaned),
  });
  const parsed = parseAuthPayload(data, "");
  return { ...parsed, postal_code: parsed.postalCode };
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

export async function fetchCloudOrderLookup(orderId: string): Promise<CloudOrder | null> {
  const needle = orderId.trim();
  if (!needle) return null;
  try {
    const mapped = mapCloudOrder(await cloudFetchJson<unknown>(`/orders/${encodeURIComponent(needle)}`));
    if (mapped) return mapped;
  } catch (e) {
    if (!(e instanceof WooCommerceFetchError) || (e.status !== 401 && e.status !== 403 && e.status !== 404)) {
      throw e;
    }
  }
  if (!getStoredApiJwt()) return null;
  try {
    const all = await fetchCloudOrders();
    const n = needle.toLowerCase();
    return all.find((o) => o.id.toLowerCase() === n) ?? null;
  } catch {
    return null;
  }
}

export async function createCloudOrder(payload: {
  items: { product_id: string; quantity: number }[];
  full_name: string;
  phone: string;
  address: string;
  city: string;
  postal_code: string;
  country?: string;
  company_name?: string;
  vat_number?: string;
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
  country: string;
  company_name?: string;
  vat_number?: string;
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

export type AdminWholesaleUser = {
  id: string;
  email: string;
  name: string;
  accountType?: string;
  wholesaleStatus?: string;
  isWholesale?: boolean;
  dealerTier?: string;
  businessName?: string;
  vatNumber?: string;
  businessType?: string;
  phone?: string;
};

function asAdminUser(raw: unknown): AdminWholesaleUser | null {
  if (!raw || typeof raw !== "object") return null;
  const o = raw as Record<string, unknown>;
  const email = typeof o.email === "string" ? o.email : "";
  const id = o.id != null ? String(o.id) : email;
  if (!id && !email) return null;
  return {
    id: id || email,
    email,
    name: typeof o.name === "string" ? o.name : email.split("@")[0] || id,
    accountType: typeof o.accountType === "string" ? o.accountType : typeof o.account_type === "string" ? o.account_type : undefined,
    wholesaleStatus: typeof o.wholesaleStatus === "string" ? o.wholesaleStatus : typeof o.wholesale_status === "string" ? o.wholesale_status : undefined,
    isWholesale: o.isWholesale === true,
    dealerTier: typeof o.dealerTier === "string" ? o.dealerTier : typeof o.dealer_tier === "string" ? o.dealer_tier : undefined,
    businessName: typeof o.businessName === "string" ? o.businessName : typeof o.business_name === "string" ? o.business_name : undefined,
    vatNumber: typeof o.vatNumber === "string" ? o.vatNumber : typeof o.vat_number === "string" ? o.vat_number : undefined,
    businessType: typeof o.businessType === "string" ? o.businessType : typeof o.business_type === "string" ? o.business_type : undefined,
    phone: typeof o.phone === "string" ? o.phone : undefined,
  };
}

function unwrapList(data: unknown): unknown[] {
  if (Array.isArray(data)) return data;
  if (data && typeof data === "object") {
    const o = data as Record<string, unknown>;
    if (Array.isArray(o.items)) return o.items;
    if (Array.isArray(o.users)) return o.users;
    if (Array.isArray(o.requests)) return o.requests;
  }
  return [];
}

export async function fetchAdminUsers(authToken: string): Promise<AdminWholesaleUser[]> {
  const data = await cloudFetchJson<unknown>("/admin/users", {
    headers: { Authorization: `Bearer ${authToken}` },
  });
  return unwrapList(data).map(asAdminUser).filter((u): u is AdminWholesaleUser => u != null);
}

export async function fetchAdminWholesaleRequests(authToken: string): Promise<AdminWholesaleUser[]> {
  const data = await cloudFetchJson<unknown>("/admin/wholesale-requests", {
    headers: { Authorization: `Bearer ${authToken}` },
  });
  return unwrapList(data).map(asAdminUser).filter((u): u is AdminWholesaleUser => u != null);
}

export async function patchAdminWholesaleUser(
  authToken: string,
  userId: string,
  body: Record<string, string | boolean | number>,
): Promise<void> {
  const headers = { Authorization: `Bearer ${authToken}`, "Content-Type": "application/json" };
  const payload = JSON.stringify(body);
  const paths = [`/admin/users/${encodeURIComponent(userId)}`, `/admin/wholesale-requests/${encodeURIComponent(userId)}`];
  let last: unknown = null;
  for (const path of paths) {
    try {
      await cloudFetchJson(path, { method: "PATCH", headers, body: payload });
      return;
    } catch (e) {
      last = e;
      if (e instanceof WooCommerceFetchError && e.status === 404) continue;
      throw e;
    }
  }
  throw last instanceof Error ? last : new WooCommerceFetchError("Could not update wholesale account.");
}

export async function patchAdminProduct(
  authToken: string,
  productId: string,
  body: Record<string, string | boolean | number | null>,
): Promise<void> {
  await cloudFetchJson(`/admin/products/${encodeURIComponent(productId)}`, {
    method: "PATCH",
    headers: { Authorization: `Bearer ${authToken}`, "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
}

export { cloudFetchJson };
