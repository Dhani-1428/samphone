/** Server-only WooCommerce credentials — set in Vercel Project → Environment Variables. */

export interface WooServerConfig {
  storeUrl: string;
  consumerKey: string;
  consumerSecret: string;
}

const PLACEHOLDER_RE = /your-old-site\.com|example\.com|xxxxxxxx/i;

export function getWooServerConfig(): WooServerConfig | null {
  const storeUrl = process.env.WOOCOMMERCE_STORE_URL?.replace(/\/$/, "").trim() ?? "";
  const consumerKey = process.env.WOOCOMMERCE_CONSUMER_KEY?.trim() ?? "";
  const consumerSecret = process.env.WOOCOMMERCE_CONSUMER_SECRET?.trim() ?? "";

  if (!storeUrl || !consumerKey || !consumerSecret) return null;
  if (PLACEHOLDER_RE.test(storeUrl) || PLACEHOLDER_RE.test(consumerKey)) return null;

  return { storeUrl, consumerKey, consumerSecret };
}

export function isWooConfigured(): boolean {
  return getWooServerConfig() != null;
}
