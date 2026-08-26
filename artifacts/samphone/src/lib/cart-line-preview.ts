import { hrefForCartKey, resolveCatalogProduct } from "@/data/catalog";
import { getPrimaryImageUrl, type WooProduct } from "@/lib/woocommerce";
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
  if (cartKey.startsWith("woo:")) {
    const id = Number(cartKey.slice(4));
    const w = Number.isFinite(id) ? wooById.get(id) : undefined;
    const unit = w ? catalogUnitPrice(w, user) : null;
    return {
      cartKey,
      qty,
      name: w?.name ?? `Product #${id}`,
      img: w ? getPrimaryImageUrl(w) : null,
      href,
      unitPrice: unit,
      isWoo: true,
      productId: w?.cloudId || (Number.isFinite(id) ? String(id) : null),
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
