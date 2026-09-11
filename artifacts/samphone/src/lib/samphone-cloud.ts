import {
  SAMPHONE_API_BASE,
  SAMPHONE_CLOUD_ORIGIN,
  SITE_HOME_BANNERS,
  catalogImageReferrerPolicy,
  getStoredApiJwt,
  normalizeCatalogImageUrl,
  preferOriginalUpload,
  setStoredApiJwt,
} from "@/config/samphone";
import { modelAliases } from "@/lib/model-aliases";
import type { WooCategory, WooProduct } from "@/lib/woocommerce";
import { WooCommerceFetchError, normalizeProductGallery, fillColorSwatchImages } from "@/lib/woocommerce";
import { parseAccountDiscountPercent, parsePersonalPricing } from "@/lib/customer-price";

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
  created_at?: string;
  createdAt?: string;
  date_created?: string;
  new_arrival?: boolean;
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
  return (
    p === "/auth/login" ||
    p === "/auth/register" ||
    p === "/auth/clerk-sync" ||
    p === "/auth/mfa/setup" ||
    p === "/auth/mfa/verify" ||
    p === "/contact" ||
    p === "/newsletter" ||
    p.startsWith("/leads/") ||
    p === "/translate"
  );
}

function cloudRequestUrls(path: string): string[] {
  const suffix = path.startsWith("/") ? path : `/${path}`;
  const primary = path.startsWith("http") ? path : `${SAMPHONE_API_BASE}${suffix}`;
  const absolute = `${SAMPHONE_CLOUD_ORIGIN}/api${suffix}`;
  if (primary === absolute) return [primary];
  return [primary, absolute];
}

const CLOUD_FETCH_TIMEOUT_MS = 20_000;

async function fetchWithTimeout(url: string, init: RequestInit, ms = CLOUD_FETCH_TIMEOUT_MS): Promise<Response> {
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), ms);
  if (init.signal) {
    if (init.signal.aborted) ctrl.abort();
    else init.signal.addEventListener("abort", () => ctrl.abort(), { once: true });
  }
  try {
    return await fetch(url, { ...init, signal: ctrl.signal });
  } finally {
    clearTimeout(timer);
  }
}

async function cloudFetchJson<T>(path: string, init?: RequestInit): Promise<T> {
  const headers = new Headers(init?.headers);
  headers.set("Accept", "application/json");
  const jwt = getStoredApiJwt();
  if (jwt && !headers.has("Authorization") && !isPublicAuthPath(path)) {
    headers.set("Authorization", `Bearer ${jwt}`);
  }
  const urls = cloudRequestUrls(path);
  let lastError: WooCommerceFetchError | null = null;
  for (let i = 0; i < urls.length; i += 1) {
    const url = urls[i];
    let res: Response;
    try {
      res = await fetchWithTimeout(url, { ...init, headers });
    } catch {
      lastError = new WooCommerceFetchError(`Network request failed: ${url.split("?")[0]}`);
      if (i === 0) {
        await new Promise((r) => setTimeout(r, 350));
        try {
          res = await fetchWithTimeout(url, { ...init, headers });
        } catch {
          continue;
        }
      } else {
        continue;
      }
    }
    const text = await res.text().catch(() => "");
    const html = looksLikeHtml(text);
    const canRetry = i < urls.length - 1 && (html || res.status === 404 || res.status >= 502);
    if (!res.ok) {
      lastError = new WooCommerceFetchError(formatFastApiError(text, res.status), res.status);
      if (canRetry) continue;
      throw lastError;
    }
    if (html) {
      lastError = new WooCommerceFetchError("Unexpected response from the server. Please try again.");
      if (canRetry) continue;
      throw lastError;
    }
    try {
      return JSON.parse(text) as T;
    } catch {
      lastError = new WooCommerceFetchError("Could not read the server response. Please try again.");
      if (canRetry) continue;
      throw lastError;
    }
  }
  throw lastError ?? new WooCommerceFetchError("Network request failed.");
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

function parsePositiveInt(v: unknown): number {
  const n = typeof v === "number" ? v : Number.parseInt(String(v ?? "").trim(), 10);
  return Number.isFinite(n) && n > 0 ? n : 0;
}

function isoDate(v: unknown): string | undefined {
  if (v == null || v === "") return undefined;
  if (typeof v === "string") {
    const s = v.trim();
    return s && !s.startsWith("0000") ? s : undefined;
  }
  if (typeof v === "number" && Number.isFinite(v)) {
    const d = new Date(v);
    return Number.isNaN(d.getTime()) ? undefined : d.toISOString();
  }
  return undefined;
}

export function mapCloudProduct(p: CloudProduct): WooProduct | null {
  const wcId = parsePositiveInt(p.wc_id);
  const uuid = typeof p.id === "string" ? p.id : "";
  if (!wcId && !uuid) return null;
  const cats = Array.isArray(p.categories)
    ? p.categories.map((c) => ({
        id: parsePositiveInt(c.wc_id) || parsePositiveInt(c.id),
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
    date_created: isoDate(p.created_at || p.createdAt || p.date_created),
    on_sale: Boolean(money(p.compareAtPrice)),
    stock_status: p.in_stock === false ? "outofstock" : "instock",
    specs: p.specs && typeof p.specs === "object" ? p.specs : undefined,
    colorVariants: colorNames(p.color_variants),
    colorSwatches: fillColorSwatchImages(parseColorSwatches(p.color_variants), imageList(p)),
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
    const o = row as {
      label?: string;
      name?: string;
      color?: string;
      title?: string;
      image?: string;
      src?: string;
      url?: string;
      img?: string;
    };
    const label = (o.label || o.name || o.title || o.color || "").trim();
    if (!label) continue;
    const key = label.toLowerCase();
    const hex = /^#?[0-9a-f]{3,8}$/i.test(o.color || "")
      ? o.color!.startsWith("#")
        ? o.color!
        : `#${o.color}`
      : hexFromLabel(label);
    const image = normalizeCatalogImageUrl(o.image || o.src || o.url || o.img) || o.image || o.src || o.url || o.img || null;
    const normalizedImage = typeof image === "string" && image.trim() ? (normalizeCatalogImageUrl(image) || image) : null;
    const existing = out.find((s) => s.label.toLowerCase() === key);
    if (existing) {
      if (!existing.image && normalizedImage) existing.image = normalizedImage;
      continue;
    }
    seen.add(key);
    out.push({ label, hex, image: normalizedImage });
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
  const page = await fetchCloudProductList({ offset: String(Math.max(0, offset)) }, limit);
  return page.items;
}

export async function fetchCloudNewArrivals(limit = 100): Promise<WooProduct[]> {
  const cap = Math.max(8, Math.min(limit, 50));
  // Newest published SKUs (Woo ID desc). Do not use /new-arrivals first: live
  // that route still filters a stale new_arrival flag and hides just-added items.
  const page = await fetchCloudProductList({ sort: "date_desc" }, cap);
  if (page.items.length) return page.items;
  try {
    return mapItems(await cloudFetchJson<ListEnvelope<CloudProduct>>(`/new-arrivals?limit=${cap}`));
  } catch {
    return [];
  }
}

export async function fetchCloudFeatured(limit = 24): Promise<WooProduct[]> {
  try {
    const data = await cloudFetchJson<ListEnvelope<CloudProduct>>(`/featured?limit=${limit}`);
    const items = mapItems(data);
    if (items.length) return items;
  } catch {
    /* /products still has the catalog when this route is 503 */
  }
  const page = await fetchCloudProductList({ best_seller: "true" }, limit);
  return page.items;
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
  const byModel = await fetchCloudAllProducts({ model_wc_id: String(categoryId) });
  if (byModel.length > 0) return byModel;
  const name = categoryName?.trim();
  if (!name) return [];
  return fetchCloudAllProducts({ category: name });
}

export async function searchCloudProducts(query: string, limit = 20): Promise<WooProduct[]> {
  const q = query.trim();
  if (!q) return [];
  const data = await cloudFetchJson<ListEnvelope<CloudProduct>>(
    `/products-search?q=${encodeURIComponent(q)}&limit=${limit}&sort=date_desc`,
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
    accountDiscountPercent: parseAccountDiscountPercent(
      user.accountDiscountPercent ??
        user.account_discount_percent ??
        user.discountPercent ??
        user.discount_percent,
    ),
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

export type CloudAuthSession = ReturnType<typeof parseAuthPayload>;

export type ClerkSyncFields = {
  name?: string;
  email?: string;
  account_type?: string;
  phone?: string;
  business_name?: string;
  vat_number?: string;
  business_type?: string;
  company_address?: string;
  address?: string;
  city?: string;
  postal_code?: string;
  country?: string;
};

export class CloudMfaRequiredError extends Error {
  readonly mfaToken: string;
  readonly email: string;

  constructor(mfaToken: string, email: string) {
    super("mfa_required");
    this.name = "CloudMfaRequiredError";
    this.mfaToken = mfaToken;
    this.email = email;
  }
}

export async function cloudAuth(
  path: "/auth/login" | "/auth/register" | "/auth/clerk-sync",
  body: Record<string, string | boolean | number | undefined>,
): Promise<CloudAuthSession> {
  const cleaned = Object.fromEntries(Object.entries(body).filter(([, v]) => v !== undefined && v !== ""));
  const data = await cloudFetchJson<Record<string, unknown>>(path, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(cleaned),
  });
  const email = typeof body.email === "string" ? body.email : "";
  const name = typeof body.name === "string" ? body.name : undefined;

  const mfaRequired = data.mfa_required === true || data.mfaRequired === true;
  const mfaToken =
    (typeof data.mfa_token === "string" && data.mfa_token) ||
    (typeof data.mfaToken === "string" && data.mfaToken) ||
    "";
  if (mfaRequired && mfaToken) {
    throw new CloudMfaRequiredError(mfaToken, email);
  }

  const parsed = parseAuthPayload(data, email, name);
  if (!parsed.token) {
    throw new WooCommerceFetchError("Sign-in did not return a session. Please try again.");
  }
  setStoredApiJwt(parsed.token);
  return parsed;
}

export async function clerkSync(clerkToken: string, extra?: ClerkSyncFields): Promise<CloudAuthSession> {
  return cloudAuth("/auth/clerk-sync", {
    clerk_token: clerkToken,
    name: extra?.name,
    email: extra?.email,
    account_type: extra?.account_type,
    phone: extra?.phone,
    business_name: extra?.business_name,
    vat_number: extra?.vat_number,
    business_type: extra?.business_type,
    company_address: extra?.company_address,
    address: extra?.address,
    city: extra?.city,
    postal_code: extra?.postal_code,
    country: extra?.country,
  });
}

export async function cloudMfaVerify(opts: {
  mfaToken: string;
  code: string;
  email?: string;
}): Promise<CloudAuthSession> {
  const data = await cloudFetchJson<Record<string, unknown>>("/auth/mfa/verify", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      mfa_token: opts.mfaToken,
      code: opts.code.trim(),
      email: opts.email,
    }),
  });
  const parsed = parseAuthPayload(data, opts.email ?? "");
  if (!parsed.token) {
    throw new WooCommerceFetchError("MFA verification did not return a session.");
  }
  setStoredApiJwt(parsed.token);
  return parsed;
}

export type CloudHomeRails = {
  best: WooProduct[];
  fresh: WooProduct[];
  sections: { key: string; title: string; group?: string; items: WooProduct[] }[];
};

export async function fetchCloudHomeRails(limit = 10, part: "all" | "priority" | "sections" = "all"): Promise<CloudHomeRails> {
  const data = await cloudFetchJson<{
    best?: CloudProduct[];
    fresh?: CloudProduct[];
    sections?: { key?: string; title?: string; category_group?: string; items?: CloudProduct[] }[];
  }>(`/home-rails?part=${part}&limit=${limit}`);
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

/** API caps `limit` at 200 (`backend/server.py`). */
const CLOUD_PAGE_SIZE = 200;
const CLOUD_LIST_MAX_PAGES = 250;

export async function fetchCloudAllProducts(
  query: Record<string, string>,
  maxPages = CLOUD_LIST_MAX_PAGES,
  onProgress?: (items: WooProduct[], total: number) => void,
): Promise<WooProduct[]> {
  const all: WooProduct[] = [];
  const seen = new Set<string>();
  let offset = 0;
  const pageSize = CLOUD_PAGE_SIZE;
  let catalogTotal = 0;
  for (let i = 0; i < maxPages; i += 1) {
    const before = all.length;
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
    if (all.length === before) break;
    if (!hasMore) break;
    if (catalogTotal > 0 && offset + rawCount >= catalogTotal) break;
    offset += rawCount;
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
    return fetchCloudAllProducts(unique[0], CLOUD_LIST_MAX_PAGES, onProgress);
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
        const list = await fetchCloudAllProducts(query, CLOUD_LIST_MAX_PAGES, (items, total) => {
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

export async function fetchCloudProductsForModel(names: string[], brand?: string): Promise<WooProduct[]> {
  const expanded = new Set<string>();
  for (const n of names) {
    const trimmed = n.trim();
    if (trimmed.length >= 3) expanded.add(trimmed);
    for (const alias of modelAliases(brand ?? "", n)) {
      if (alias.length >= 4 && alias.length <= 40) expanded.add(alias);
    }
  }
  const unique = [...expanded];
  if (unique.length === 0) return [];
  const preferred = unique
    .filter((n) => n.length >= 5 && n.length <= 36)
    .sort((a, b) => a.length - b.length);
  const queries = (preferred.length > 0 ? preferred : unique).slice(0, 3);
  const bags = await Promise.all(
    queries.map(async (q) => {
      try {
        return await fetchCloudAllProducts({ q }, CLOUD_LIST_MAX_PAGES);
      } catch {
        return [] as WooProduct[];
      }
    }),
  );
  return mergeWooProducts(bags);
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

export async function translateCloudTexts(texts: string[], target: string): Promise<string[]> {
  const clean = texts.map((s) => (typeof s === "string" ? s : "")).slice(0, 40);
  if (clean.length === 0) return [];
  const data = await cloudFetchJson<{ texts?: string[] }>("/translate", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ texts: clean, target }),
  });
  const out = Array.isArray(data.texts) ? data.texts : [];
  return clean.map((s, i) => (typeof out[i] === "string" && out[i].trim() ? out[i] : s));
}

export type CloudNotificationPrefs = {
  orderUpdates: boolean;
  orders?: boolean;
  promotions: boolean;
  newArrivals: boolean;
  restock: boolean;
  push?: boolean;
  cartReminders?: boolean;
};

export async function fetchNotificationPrefs(): Promise<CloudNotificationPrefs | null> {
  try {
    return await cloudFetchJson<CloudNotificationPrefs>("/notifications/prefs");
  } catch {
    return null;
  }
}

export async function patchNotificationPrefs(
  body: Partial<CloudNotificationPrefs>,
): Promise<CloudNotificationPrefs | null> {
  return cloudFetchJson<CloudNotificationPrefs>("/notifications/prefs", {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
}

export type CloudStockAlert = {
  product_id: string;
  title: string;
  created_at?: string;
};

export async function fetchStockAlerts(): Promise<CloudStockAlert[]> {
  try {
    const data = await cloudFetchJson<{ items?: CloudStockAlert[] }>("/stock-alerts");
    return Array.isArray(data.items) ? data.items : [];
  } catch {
    return [];
  }
}

export async function deleteStockAlert(productId: string): Promise<void> {
  await cloudFetchJson(`/stock-alerts/${encodeURIComponent(productId)}`, { method: "DELETE" });
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
  accountDiscountPercent?: number;
  language?: string;
  rejectionReason?: string;
  personalPricing?: import("@/lib/customer-price").PersonalPricingRule[];
};

let meInflight: Promise<CloudProfile | null> | null = null;
let meCache: { jwt: string; at: number; profile: CloudProfile | null } | null = null;
const ME_CACHE_MS = 30_000;

export async function fetchCloudMe(): Promise<CloudProfile | null> {
  const jwt = getStoredApiJwt();
  if (!jwt) return null;
  if (meCache && meCache.jwt === jwt && Date.now() - meCache.at < ME_CACHE_MS) {
    return meCache.profile;
  }
  if (meInflight) return meInflight;
  meInflight = (async () => {
    try {
      const data = await cloudFetchJson<Record<string, unknown>>("/auth/me");
      const parsed = parseAuthPayload(data, "");
      const profile: CloudProfile = {
        ...parsed,
        postal_code: parsed.postalCode,
      };
      meCache = { jwt, at: Date.now(), profile };
      return profile;
    } catch {
      return null;
    } finally {
      meInflight = null;
    }
  })();
  return meInflight;
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
  const successPath = extra?.successPath ?? "/checkout?checkout=success";
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
  role?: string;
  createdAt?: string;
  accountType?: string;
  wholesaleStatus?: string;
  isWholesale?: boolean;
  accountDiscountPercent?: number;
  personalPricing?: import("@/lib/customer-price").PersonalPricingRule[];
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
  const createdAt =
    typeof o.createdAt === "string"
      ? o.createdAt
      : typeof o.created_at === "string"
        ? o.created_at
        : undefined;
  return {
    id: id || email,
    email,
    name: typeof o.name === "string" ? o.name : email.split("@")[0] || id,
    role: typeof o.role === "string" ? o.role : undefined,
    createdAt,
    accountType: typeof o.accountType === "string" ? o.accountType : typeof o.account_type === "string" ? o.account_type : undefined,
    wholesaleStatus:
      typeof o.wholesaleStatus === "string"
        ? o.wholesaleStatus
        : typeof o.wholesale_status === "string"
          ? o.wholesale_status
          : undefined,
    isWholesale: o.isWholesale === true,
    accountDiscountPercent: parseAccountDiscountPercent(
      o.accountDiscountPercent ?? o.account_discount_percent ?? o.discountPercent ?? o.discount_percent,
    ),
    personalPricing: parsePersonalPricing(o.personalPricing ?? o.personal_pricing),
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
  body: Record<string, string | boolean | number | null | import("@/lib/customer-price").PersonalPricingRule[]>,
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

export async function submitContactLead(body: {
  name: string;
  email: string;
  subject?: string;
  message: string;
}): Promise<void> {
  await cloudFetchJson("/leads/contact", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
}

export async function subscribeNewsletter(email: string): Promise<void> {
  await cloudFetchJson("/leads/newsletter", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email }),
  });
}

export async function submitRepairLead(body: Record<string, unknown>): Promise<void> {
  await cloudFetchJson("/leads/repair", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
}

export async function submitTradeInLead(body: Record<string, unknown>): Promise<void> {
  await cloudFetchJson("/leads/trade-in", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
}

export { cloudFetchJson };
