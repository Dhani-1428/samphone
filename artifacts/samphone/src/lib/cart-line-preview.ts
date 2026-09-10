import { hrefForCartKey, resolveCatalogProduct } from "@/data/catalog";
import { colorCartSlug, getPrimaryImageUrl, parseWooCartKey, type WooProduct } from "@/lib/woocommerce";
import { catalogUnitPrice, type PriceUser } from "@/lib/customer-price";

export type CartLinePreview = {
  cartKey: string;
  qty: number;
  name: string;
  img: string | null;
  href: string;
  unitPrice: number | null;
  isWoo: boolean;
  productId: string | null;
  minOrderQty?: number;
  dealerOnly?: boolean;
};

export function buildWooProductMap(products: WooProduct[]): Map<number, WooProduct> {
  return new Map(products.map((p) => [p.id, p]));
}

export function buildCartLinePreview(
  cartKey: string,
  qty: number,
  wooById: Map<number, WooProduct>,
  user?: PriceUser,
): CartLinePreview {
  const href = hrefForCartKey(cartKey);
  const wooKey = parseWooCartKey(cartKey);
  if (wooKey) {
    const w = wooById.get(wooKey.id);
    const swatch = wooKey.colorSlug
      ? w?.colorSwatches?.find((s) => colorCartSlug(s.label) === wooKey.colorSlug)
      : undefined;
    const unit = w ? catalogUnitPrice(w, user) : null;
    const colorName = swatch?.label ? ` — ${swatch.label}` : "";
    return {
      cartKey,
      qty,
      name: `${w?.name ?? `Product #${wooKey.id}`}${colorName}`,
      img: swatch?.image || (w ? getPrimaryImageUrl(w) : null),
      href,
      unitPrice: unit,
      isWoo: true,
      productId: w?.cloudId || String(wooKey.id),
      minOrderQty: w?.minOrderQty,
      dealerOnly: w?.dealerOnly,
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
