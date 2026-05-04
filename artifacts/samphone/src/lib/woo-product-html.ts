import type { WooProduct } from "@/lib/woocommerce";

/** Prefer full description, then short description (Woo sends HTML). */
export function getWooProductDescriptionHtml(product: WooProduct): string | null {
  const full = product.description?.trim();
  if (full) return full;
  const short = product.short_description?.trim();
  return short || null;
}
