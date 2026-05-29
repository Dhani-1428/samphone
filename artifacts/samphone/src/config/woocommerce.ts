/**
 * Public storefront WooCommerce settings (safe for the browser).
 * REST credentials live only on the API server — see WOOCOMMERCE_* in artifacts/api-server/.env
 */

const PLACEHOLDER_URL_RE = /your-old-site\.com|example\.com/i;

/** Base path for the server-side WooCommerce proxy (no secrets in URLs). */
export const WOO_API_BASE =
  (import.meta.env.VITE_WOO_API_BASE ?? "/api/woocommerce").replace(/\/$/, "");

export function getWooStoreDisplayUrl(): string | null {
  const url = import.meta.env.VITE_WOOCOMMERCE_STORE_URL?.replace(/\/$/, "").trim() ?? "";
  if (!url || isPlaceholderUrl(url)) return null;
  return url;
}

function isPlaceholderUrl(url: string): boolean {
  return PLACEHOLDER_URL_RE.test(url);
}

/** True when the app is wired to use the secure proxy (default). */
export function usesWooProxy(): boolean {
  return import.meta.env.VITE_WOO_USE_CLIENT_CREDENTIALS !== "true";
}

/** @deprecated Client credentials are disabled for security. Use usesWooProxy(). */
export function hasWooCommerceConfig(): boolean {
  return usesWooProxy();
}
