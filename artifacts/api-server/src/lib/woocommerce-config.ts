/** Server-only WooCommerce credentials — never expose to the browser. */

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

export type WooHeroBanner = { id: number; src: string; alt: string };

/** Homepage slides from WordPress media titled/named “banner”. */
export async function fetchStoreBanners(cfg: WooServerConfig): Promise<WooHeroBanner[]> {
  const qs = new URLSearchParams({
    search: "banner",
    per_page: "12",
    media_type: "image",
    orderby: "date",
    order: "desc",
    consumer_key: cfg.consumerKey,
    consumer_secret: cfg.consumerSecret,
  });
  const res = await fetch(`${cfg.storeUrl}/wp-json/wp/v2/media?${qs.toString()}`, {
    method: "GET",
    headers: { Accept: "application/json" },
  });
  if (!res.ok) {
    throw new Error(`Banner media request failed (${res.status})`);
  }
  const data = (await res.json()) as Array<{
    id?: number;
    source_url?: string;
    alt_text?: string;
    mime_type?: string;
    title?: { rendered?: string };
  }>;
  if (!Array.isArray(data)) return [];
  const seen = new Set<string>();
  const out: WooHeroBanner[] = [];
  for (const item of data) {
    const src = typeof item.source_url === "string" ? item.source_url.trim() : "";
    if (!src || seen.has(src)) continue;
    if (item.mime_type && !item.mime_type.startsWith("image/")) continue;
    seen.add(src);
    const title = item.title?.rendered?.replace(/<[^>]+>/g, "").trim() ?? "";
    out.push({
      id: typeof item.id === "number" ? item.id : out.length,
      src,
      alt: (item.alt_text?.trim() || title || "SAMPHONE").slice(0, 160),
    });
  }
  return out;
}
