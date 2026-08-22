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
}

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

/** First page only — use for fast initial UI; follow with `fetchProductsPage` for remaining pages. */
export async function fetchProductsFirstBatch(perPage = 100): Promise<WooProduct[]> {
  const raw = await wooFetchJson<WooProduct[]>("products", {
    ...STORE_PRODUCT_PARAMS,
    per_page: perPage,
    page: 1,
    _fields: PRODUCT_LIST_FIELDS,
  });
  return Array.isArray(raw) ? raw.map(normalizeProductGallery) : [];
}

/** Single page of products (same field projection as first batch). */
export async function fetchProductsPage(page: number, perPage = 100): Promise<WooProduct[]> {
  if (!Number.isFinite(page) || page < 1) return [];
  const raw = await wooFetchJson<WooProduct[]>("products", {
    ...STORE_PRODUCT_PARAMS,
    per_page: perPage,
    page,
    _fields: PRODUCT_LIST_FIELDS,
  });
  return Array.isArray(raw) ? raw.map(normalizeProductGallery) : [];
}

/** GET /products — all products (paginated). Normalizes `images` for gallery viewers. */
export async function fetchAllProducts(): Promise<WooProduct[]> {
  const raw = await fetchAllPages<WooProduct>("products", {
    ...STORE_PRODUCT_PARAMS,
    _fields: PRODUCT_LIST_FIELDS,
  });
  return raw.map(normalizeProductGallery);
}

/**
 * WooCommerce GET /products?search=… — server-side search (title, content, SKU depending on store).
 * Paginates until no more results. Returns deduped products.
 */
export async function searchProductsQuery(query: string): Promise<WooProduct[]> {
  const term = query.trim();
  if (!term) return [];
  const raw = await fetchAllPages<WooProduct>("products", {
    ...STORE_PRODUCT_PARAMS,
    search: term,
    _fields: PRODUCT_LIST_FIELDS,
  });
  const seen = new Set<number>();
  const out: WooProduct[] = [];
  for (const p of raw.map(normalizeProductGallery)) {
    if (seen.has(p.id)) continue;
    seen.add(p.id);
    out.push(p);
  }
  return out;
}

/** GET /products/:id — single product (full gallery; same schema as list). */
export async function fetchProductById(id: number): Promise<WooProduct | null> {
  if (!Number.isFinite(id) || id <= 0) return null;
  try {
    const p = await wooFetchJson<WooProduct>(`products/${id}`);
    return p?.id != null ? normalizeProductGallery(p) : null;
  } catch (e) {
    if (e instanceof WooCommerceFetchError && e.status === 404) return null;
    throw e;
  }
}

/** GET /products?category={id} — products in a WooCommerce category (by ID). */
export async function fetchProductsByCategory(categoryId: number): Promise<WooProduct[]> {
  if (!Number.isFinite(categoryId) || categoryId <= 0) {
    throw new WooCommerceFetchError("Invalid category ID.");
  }
  const raw = await fetchAllPages<WooProduct>("products", {
    category: categoryId,
    ...STORE_PRODUCT_PARAMS,
    _fields: PRODUCT_LIST_FIELDS,
  });
  return raw.map(normalizeProductGallery);
}

const CATEGORY_LIST_FIELDS = "id,name,slug,parent,count";

/** GET /products/categories — all product categories (paginated). */
export async function fetchCategories(): Promise<WooCategory[]> {
  return fetchAllPages<WooCategory>("products/categories", {
    hide_empty: 0,
    _fields: CATEGORY_LIST_FIELDS,
  });
}

/** Resolve a storefront category by slug (WooCommerce `slug` matches `/category/:slug`). */
export async function fetchCategoryBySlug(slug: string): Promise<WooCategory | null> {
  const s = slug.trim();
  if (!s) return null;
  const list = await wooFetchJson<WooCategory[]>("products/categories", {
    slug: s,
    per_page: 100,
    page: 1,
    hide_empty: 0,
    _fields: CATEGORY_LIST_FIELDS,
  });
  if (!Array.isArray(list) || list.length === 0) return null;
  const exact = list.find((c) => c.slug === s);
  return exact ?? list[0] ?? null;
}

/** GET /products/categories/:id */
export async function fetchCategoryById(id: number): Promise<WooCategory | null> {
  try {
    const c = await wooFetchJson<WooCategory>(`products/categories/${id}`);
    return c?.id != null ? c : null;
  } catch (e) {
    if (e instanceof WooCommerceFetchError && e.status === 404) return null;
    throw e;
  }
}

/** GET /products?search= — live search (no client-side product cache). */
export async function searchProductsRemote(query: string, limit = 10): Promise<WooProduct[]> {
  const q = query.trim();
  if (!q) return [];
  const list = await wooFetchJson<WooProduct[]>("products", {
    search: q,
    per_page: limit,
    page: 1,
    ...STORE_PRODUCT_PARAMS,
    _fields: PRODUCT_LIST_FIELDS,
  });
  return Array.isArray(list) ? list.map(normalizeProductGallery) : [];
}

/** @deprecated Use fetchAllProducts() — same behavior, live API only. */
export async function fetchProducts(): Promise<WooProduct[]> {
  return fetchAllProducts();
}

/** GET /banners — homepage slides from store media (via API proxy). */
export async function fetchHeroBanners(): Promise<{ id: number; src: string; alt: string }[]> {
  const raw = await wooFetchJson<{ id: number; src: string; alt: string }[]>("banners");
  if (!Array.isArray(raw)) return [];
  return raw.filter((b) => typeof b?.src === "string" && b.src.length > 0);
}

export function getDisplayPrice(product: WooProduct): string | null {
  const raw = product.price?.trim() ?? "";
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
