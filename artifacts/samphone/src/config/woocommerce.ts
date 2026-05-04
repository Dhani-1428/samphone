/**
 * WooCommerce REST credentials — environment variables only (`VITE_*` is bundled at build time).
 * For production, prefer a server-side proxy instead of exposing keys in the client.
 */

export interface WooCommerceConfig {
  storeUrl: string;
  consumerKey: string;
  consumerSecret: string;
}

const PLACEHOLDER_URL_RE = /your-old-site\.com|example\.com/i;

function isPlaceholderUrl(url: string): boolean {
  return PLACEHOLDER_URL_RE.test(url);
}

function readFromEnv(): WooCommerceConfig | null {
  const storeUrl = import.meta.env.VITE_WOOCOMMERCE_STORE_URL?.replace(/\/$/, "").trim() ?? "";
  const consumerKey = (import.meta.env.VITE_WOOCOMMERCE_CONSUMER_KEY ?? "").trim();
  const consumerSecret = (import.meta.env.VITE_WOOCOMMERCE_CONSUMER_SECRET ?? "").trim();

  if (!storeUrl || !consumerKey || !consumerSecret) {
    return null;
  }

  if (isPlaceholderUrl(storeUrl)) {
    return null;
  }

  return { storeUrl, consumerKey, consumerSecret };
}

export function getWooCommerceConfig(): WooCommerceConfig | null {
  return readFromEnv();
}

export function hasWooCommerceConfig(): boolean {
  return getWooCommerceConfig() != null;
}
