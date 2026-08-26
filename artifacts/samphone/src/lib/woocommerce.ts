import { WOO_API_BASE, getWooStoreDisplayUrl, usesWooProxy } from "@/config/woocommerce";

/**
 * Product shape as returned by WooCommerce REST (subset used in UI).
 * `images` is included by default on GET /wc/v3/products — required for gallery / 360-style viewers.
 */
export interface WooProductAttribute {
  id: number;
  name: string;
  position?: number;
  visible?: boolean;
  variation?: boolean;
  options: string[];
}

export interface WooProduct {
  id: number;
  /** FastAPI catalog UUID (`GET /products/{id}`). */
  cloudId?: string;
  name: string;
  slug: string;
  permalink: string;
  price: string;
  regular_price: string;
  sale_price: string;
  categories: { id: number; name: string; slug: string }[];
  images: { id: number; src: string; name: string; alt: string }[];
  /** Present on full single-product responses from WooCommerce. */
  sku?: string;
  description?: string;
  short_description?: string;
  attributes?: WooProductAttribute[];
  /** Present when requested via `_fields` (lighter list payloads). */
  date_created?: string;
  stock_status?: string;
  on_sale?: boolean;
  specs?: Record<string, string>;
  colorVariants?: string[];
  colorSwatches?: ProductColorSwatch[];
  brand?: string;
  /** FastAPI catalog type label (e.g. "Screen / LCD Assembly"). */
  partType?: string;
  rating?: number;
  reviewCount?: number;
  catalogGroup?: string;
  subcategory?: string;
  modelLabel?: string;
  retailPrice?: string;
  wholesalePrice?: string;
  compareAtPrice?: string;
  dealerOnly?: boolean;
  minOrderQty?: number;
}

export type ProductColorSwatch = {
  label: string;
  hex: string;
  image: string | null;
};

/** Stable gallery order, deduped by `src` (Woo occasionally repeats URLs). */
export function dedupeGalleryImages(images: WooProduct["images"] | undefined | null): WooProduct["images"] {
  if (!images?.length) return [];
  const seen = new Set<string>();
  const out: WooProduct["images"] = [];
  for (const img of images) {
    const src = typeof img.src === "string" ? img.src.trim() : "";
    if (!src || seen.has(src)) continue;
    seen.add(src);
    out.push({
      id: typeof img.id === "number" ? img.id : 0,
      src,
      name: typeof img.name === "string" ? img.name : "",
      alt: typeof img.alt === "string" ? img.alt : "",
    });
  }
  return out;
}

export function normalizeProductGallery(product: WooProduct): WooProduct {
  return {
    ...product,
    images: dedupeGalleryImages(product.images),
  };
}

/** Category as returned by GET /wc/v3/products/categories */
export interface WooCategory {
  id: number;
  name: string;
  slug: string;
  parent: number;
  count: number;
  description?: string;
}

export class WooCommerceFetchError extends Error {
  constructor(
    message: string,
    public readonly status?: number,
  ) {
    super(message);
    this.name = "WooCommerceFetchError";
  }
}

let wooProxyAvailable: boolean | null = null;

async function checkWooProxy(): Promise<boolean> {
  if (wooProxyAvailable === true) return true;
  if (!usesWooProxy()) {
    wooProxyAvailable = false;
    return false;
  }
  try {
    const res = await fetch(`${WOO_API_BASE}/status`, { method: "GET", cache: "no-store" });
    if (!res.ok) {
      return false;
    }
    const data = (await res.json()) as { configured?: boolean };
    const ok = Boolean(data.configured);
    if (ok) wooProxyAvailable = true;
    return ok;
  } catch {
    return false;
  }
}

function getApiBasePath(): string {
  if (!usesWooProxy()) {
    throw new WooCommerceFetchError(
      "Direct WooCommerce credentials in the browser are disabled. Run the API server with WOOCOMMERCE_* set, or remove VITE_WOO_USE_CLIENT_CREDENTIALS.",
    );
  }
  return WOO_API_BASE;
}

async function wooFetchJson<T>(
  pathAfterWc: string,
  extra: Record<string, string | number | undefined> = {},
): Promise<T> {
  const basePath = getApiBasePath();
  const qs = new URLSearchParams();
  for (const [k, v] of Object.entries(extra)) {
    if (v !== undefined) qs.set(k, String(v));
  }
  const query = qs.toString();
  const path = pathAfterWc.replace(/^\//, "");
  const url = query ? `${basePath}/${path}?${query}` : `${basePath}/${path}`;

  let res: Response;
  try {
    res = await fetch(url, { method: "GET", headers: { Accept: "application/json" } });
  } catch {
    const proxyOk = await checkWooProxy();
    const store = getWooStoreDisplayUrl();
    throw new WooCommerceFetchError(
      proxyOk
        ? `Network request failed. Attempted: ${url.split("?")[0]}`
        : store
          ? `Catalog API unavailable. Start the storefront (` +
            `pnpm --filter @workspace/samphone dev) so /api/woocommerce is proxied — store: ${store}`
          : "Catalog API unavailable. Set WOOCOMMERCE_* in artifacts/api-server/.env.",
    );
  }
  if (!res.ok) {
    const text = await res.text().catch(() => "");
    if (res.status === 503) {
      throw new WooCommerceFetchError(
        text || "WooCommerce proxy is not configured on the server.",
        res.status,
      );
    }
    throw new WooCommerceFetchError(text || `Request failed with status ${res.status}`, res.status);
  }
  return (await res.json()) as T;
}

/** Paginate any endpoint that returns a JSON array. */
async function fetchAllPages<T>(pathPrefix: string, baseExtra: Record<string, string | number> = {}): Promise<T[]> {
  const perPage = 100;
  const all: T[] = [];
  let page = 1;
  while (true) {
    const batch = await wooFetchJson<T[]>(pathPrefix, { ...baseExtra, per_page: perPage, page });
    if (!Array.isArray(batch) || batch.length === 0) break;
    all.push(...batch);
    if (batch.length < perPage) break;
    page += 1;
  }
  return all;
}

/** Default query: published products only (storefront). Keeps full payload including `images`. */
const STORE_PRODUCT_PARAMS = { status: "publish" as const };

/** Smaller JSON for catalog sync (faster TTFB than full product objects). */
const PRODUCT_LIST_FIELDS =
  "id,name,slug,permalink,price,regular_price,sale_price,categories,images,date_created";

/** First page from samphone.cloud FastAPI (home rails + catalog page). */
export async function fetchProductsFirstBatch(perPage = 100): Promise<WooProduct[]> {
  const cloud = await import("@/lib/samphone-cloud");
  const [seed, page] = await Promise.all([
    cloud.fetchCloudHomeSeed(Math.min(perPage, 24)),
    cloud.fetchCloudProductsPage(0, perPage),
  ]);
  const seen = new Set<number>();
  const out: WooProduct[] = [];
  for (const p of [...seed, ...page]) {
    if (seen.has(p.id)) continue;
    seen.add(p.id);
    out.push(p);
  }
  return out;
}

/** Next catalog page (`offset` pagination on FastAPI). */
export async function fetchProductsPage(page: number, perPage = 100): Promise<WooProduct[]> {
  if (!Number.isFinite(page) || page < 1) return [];
  const cloud = await import("@/lib/samphone-cloud");
  return cloud.fetchCloudProductsPage((page - 1) * perPage, perPage);
}

/** GET /products — paginated FastAPI catalog. */
export async function fetchAllProducts(): Promise<WooProduct[]> {
  const cloud = await import("@/lib/samphone-cloud");
  const all: WooProduct[] = [];
  const seen = new Set<number>();
  let offset = 0;
  const perPage = 100;
  for (let i = 0; i < 80; i += 1) {
    const batch = await cloud.fetchCloudProductsPage(offset, perPage);
    if (!batch.length) break;
    for (const p of batch) {
      if (seen.has(p.id)) continue;
      seen.add(p.id);
      all.push(p);
    }
    if (batch.length < perPage) break;
    offset += perPage;
  }
  return all;
}

export async function searchProductsQuery(query: string): Promise<WooProduct[]> {
  const cloud = await import("@/lib/samphone-cloud");
  return cloud.searchCloudProducts(query, 50);
}

/** GET /products/:id — FastAPI UUID or Woo wc_id lookup. */
export async function fetchProductById(id: number): Promise<WooProduct | null> {
  const cloud = await import("@/lib/samphone-cloud");
  return cloud.fetchCloudProductByWcId(id);
}

/** GET /products?category={id} — products in a category (by Woo category ID). */
export async function fetchProductsByCategory(categoryId: number, categoryName?: string): Promise<WooProduct[]> {
  const cloud = await import("@/lib/samphone-cloud");
  return cloud.fetchCloudProductsByCategory(categoryId, categoryName);
}

/** GET /categories — FastAPI catalog categories. */
export async function fetchCategories(): Promise<WooCategory[]> {
  const cloud = await import("@/lib/samphone-cloud");
  return cloud.fetchCloudCategories();
}

/** Resolve a storefront category by slug. */
export async function fetchCategoryBySlug(slug: string): Promise<WooCategory | null> {
  const s = slug.trim();
  if (!s) return null;
  const list = await fetchCategories();
  return list.find((c) => c.slug === s) ?? null;
}

/** GET /categories/:id */
export async function fetchCategoryById(id: number): Promise<WooCategory | null> {
  const list = await fetchCategories();
  return list.find((c) => c.id === id) ?? null;
}

export async function searchProductsRemote(query: string, limit = 10): Promise<WooProduct[]> {
  const cloud = await import("@/lib/samphone-cloud");
  return cloud.searchCloudProducts(query, limit);
}

/** @deprecated Use fetchAllProducts() — same behavior, live API only. */
export async function fetchProducts(): Promise<WooProduct[]> {
  return fetchAllProducts();
}

export async function fetchProductsByGroup(group: string): Promise<WooProduct[]> {
  const cloud = await import("@/lib/samphone-cloud");
  return cloud.fetchCloudProductsByGroup(group);
}

export async function fetchRelatedProducts(productId: string): Promise<WooProduct[]> {
  const cloud = await import("@/lib/samphone-cloud");
  return cloud.fetchCloudRelated(productId);
}

/** GET /banners — scraped homepage slides from samphone.cloud. */
export async function fetchHeroBanners(): Promise<{ id: number; src: string; alt: string }[]> {
  const cloud = await import("@/lib/samphone-cloud");
  return cloud.fetchCloudBanners();
}

export function getDisplayPrice(product: WooProduct): string | null {
  const raw = (product.retailPrice || product.price)?.trim() ?? "";
  if (!raw) return null;
  const n = Number.parseFloat(raw);
  if (Number.isNaN(n) || n <= 0) return null;
  return raw;
}

export function getPrimaryImageUrl(product: WooProduct): string | null {
  const src = product.images?.[0]?.src;
  if (typeof src === "string" && src.length > 0) return src;
  return null;
}

/** In-app product detail route — never use Woo `permalink` (opens the legacy WordPress store). */
export function wooProductHref(productId: number): string {
  return `/product/woo/${productId}`;
}
