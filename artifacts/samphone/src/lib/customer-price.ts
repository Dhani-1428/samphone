import type { WooProduct } from "@/lib/woocommerce";

export type PersonalPricingRule = {
  productId?: string;
  wooProductId?: number;
  percent?: number;
  fixedEur?: number;
};

export type PriceUser = {
  isWholesale?: boolean;
  wholesaleStatus?: string;
  personalPricing?: PersonalPricingRule[];
} | null | undefined;

const BLOCKED_WHOLESALE = new Set(["pending", "rejected", "suspended", "denied", "blocked", "inactive"]);

export function seesWholesalePrices(user: PriceUser): boolean {
  if (!user?.isWholesale) return false;
  const status = (user.wholesaleStatus || "approved").trim().toLowerCase();
  if (!status) return true;
  return !BLOCKED_WHOLESALE.has(status);
}

export function parseMoney(value: string | number | null | undefined): number | null {
  if (value == null || value === "") return null;
  const n = typeof value === "number" ? value : Number.parseFloat(String(value).replace(",", "."));
  if (!Number.isFinite(n) || n <= 0) return null;
  return n;
}

export function formatEuroAmount(value: number, locale = "pt-PT"): string {
  return new Intl.NumberFormat(locale, { style: "currency", currency: "EUR" }).format(value);
}

function retailAmount(product: WooProduct): number | null {
  return parseMoney(product.retailPrice) ?? parseMoney(product.price) ?? parseMoney(product.regular_price);
}

function wholesaleAmount(product: WooProduct): number | null {
  return parseMoney(product.wholesalePrice) ?? parseMoney(product.regular_price) ?? retailAmount(product);
}

export function catalogUnitPrice(product: WooProduct, user: PriceUser): number | null {
  const unit = seesWholesalePrices(user) ? wholesaleAmount(product) : retailAmount(product);
  return applyPersonalPricing(unit, product, user);
}

export function catalogCompareAtPrice(product: WooProduct, user: PriceUser): number | null {
  if (seesWholesalePrices(user)) return null;
  const current = catalogUnitPrice(product, user);
  const compare = parseMoney(product.compareAtPrice);
  if (current == null || compare == null || compare <= current) return null;
  return compare;
}

export function applyPersonalPricing(
  unit: number | null,
  product: WooProduct,
  user: PriceUser,
): number | null {
  if (unit == null || !user?.personalPricing?.length) return unit;
  let next = unit;
  for (const rule of user.personalPricing) {
    if (!ruleMatchesProduct(rule, product)) continue;
    if (rule.fixedEur != null && rule.fixedEur > 0) {
      next = rule.fixedEur;
      continue;
    }
    if (rule.percent != null && Number.isFinite(rule.percent)) {
      next = Math.max(0, next * (1 - rule.percent / 100));
    }
  }
  return next > 0 ? next : unit;
}

function ruleMatchesProduct(rule: PersonalPricingRule, product: WooProduct): boolean {
  const hasTarget = Boolean(rule.productId || rule.wooProductId);
  if (!hasTarget) return true;
  if (rule.wooProductId && rule.wooProductId === product.id) return true;
  if (rule.productId && (rule.productId === product.cloudId || rule.productId === String(product.id))) return true;
  return false;
}

export function parsePersonalPricing(raw: unknown): PersonalPricingRule[] {
  if (!Array.isArray(raw)) return [];
  const out: PersonalPricingRule[] = [];
  for (const row of raw) {
    if (!row || typeof row !== "object") continue;
    const o = row as Record<string, unknown>;
    const productId =
      str(o.productId) ||
      str(o.product_id) ||
      str(o.cloudId) ||
      str(o.cloud_id) ||
      undefined;
    const wooRaw = o.wooProductId ?? o.woo_product_id ?? o.wc_id;
    const wooProductId = typeof wooRaw === "number" ? wooRaw : Number.parseInt(String(wooRaw ?? ""), 10);
    const percentRaw = o.percent ?? o.discountPercent ?? o.discount_percent ?? o.percentBps ?? o.percent_bps;
    let percent: number | undefined;
    if (typeof percentRaw === "number" && Number.isFinite(percentRaw)) {
      percent = percentRaw > 100 ? percentRaw / 100 : percentRaw;
    }
    const fixedRaw = o.fixedEur ?? o.fixed_eur ?? o.amount ?? o.fixedPrice ?? o.fixed_price ?? o.price;
    const fixedEur = parseMoney(typeof fixedRaw === "number" || typeof fixedRaw === "string" ? fixedRaw : null) ?? undefined;
    if (!productId && !Number.isFinite(wooProductId) && percent == null && fixedEur == null) continue;
    out.push({
      productId,
      wooProductId: Number.isFinite(wooProductId) && wooProductId > 0 ? wooProductId : undefined,
      percent,
      fixedEur,
    });
  }
  return out;
}

function str(v: unknown): string {
  return typeof v === "string" && v.trim() ? v.trim() : "";
}

export function isDealerOnlyHidden(product: WooProduct, user: PriceUser): boolean {
  return Boolean(product.dealerOnly) && !seesWholesalePrices(user);
}

export function filterCatalogForCustomer(products: WooProduct[], user: PriceUser): WooProduct[] {
  return products.filter((p) => !isDealerOnlyHidden(p, user));
}

export function minOrderQty(product: WooProduct | null | undefined): number {
  const n = product?.minOrderQty;
  return typeof n === "number" && n > 1 ? Math.floor(n) : 1;
}
