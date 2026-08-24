import { hrefForCartKey, resolveCatalogProduct } from "@/data/catalog";
import { getDisplayPrice, getPrimaryImageUrl, type WooProduct } from "@/lib/woocommerce";

export type CartLinePreview = {
  cartKey: string;
  qty: number;
  name: string;
  img: string | null;
  href: string;
  unitPrice: number | null;
  isWoo: boolean;
  productId: string | null;
};

export function buildWooProductMap(products: WooProduct[]): Map<number, WooProduct> {
  return new Map(products.map((p) => [p.id, p]));
}

export function buildCartLinePreview(
  cartKey: string,
  qty: number,
  wooById: Map<number, WooProduct>,
): CartLinePreview {
  const href = hrefForCartKey(cartKey);
  if (cartKey.startsWith("woo:")) {
    const id = Number(cartKey.slice(4));
    const w = Number.isFinite(id) ? wooById.get(id) : undefined;
    const dp = w ? getDisplayPrice(w) : null;
    return {
      cartKey,
      qty,
      name: w?.name ?? `Product #${id}`,
      img: w ? getPrimaryImageUrl(w) : null,
      href,
      unitPrice: dp != null && dp !== "" ? Number.parseFloat(dp) : null,
      isWoo: true,
      productId: w?.cloudId || (Number.isFinite(id) ? String(id) : null),
    };
  }
  const c = resolveCatalogProduct(cartKey);
  return {
    cartKey,
    qty,
    name: c?.name ?? cartKey,
    img: c?.img ?? null,
    href,
    unitPrice: c?.price ?? null,
    isWoo: false,
    productId: null,
  };
}
