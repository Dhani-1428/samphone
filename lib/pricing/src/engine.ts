import { resolveVatRule } from "./vat";
import type {
  Cents,
  CustomerCategoryDiscountRule,
  CustomerProductPriceRule,
  GlobalPromotionRule,
  PriceSource,
  PricingContext,
  ProductPriceInput,
  ResolvedPrice,
} from "./types";

function isActiveInWindow(
  isActive: boolean,
  validFrom?: Date | null,
  validTo?: Date | null,
  at: Date = new Date(),
): boolean {
  if (!isActive) return false;
  if (validFrom && at < validFrom) return false;
  if (validTo && at > validTo) return false;
  return true;
}

function applyPercent(priceCents: Cents, percentBps: number): Cents {
  const factor = 1 - percentBps / 10_000;
  return Math.max(0, Math.round(priceCents * factor));
}

function ruleMatchesQuantity(
  rule: { minQuantity?: number; maxQuantity?: number | null },
  quantity: number,
): boolean {
  const min = rule.minQuantity ?? 1;
  if (quantity < min) return false;
  if (rule.maxQuantity != null && quantity > rule.maxQuantity) return false;
  return true;
}

function resolveProductRule(
  rules: CustomerProductPriceRule[],
  product: ProductPriceInput,
  quantity: number,
  at: Date,
): { cents: Cents; rule: CustomerProductPriceRule } | null {
  const candidates = rules.filter(
    (r) =>
      r.productId === product.productId ||
      (product.wooProductId != null && r.wooProductId === product.wooProductId),
  );

  for (const rule of candidates) {
    if (!isActiveInWindow(rule.isActive, rule.validFrom, rule.validTo, at)) continue;
    if (!ruleMatchesQuantity(rule, quantity)) continue;

    if (rule.ruleType === "fixed_price" && rule.fixedPriceCents != null) {
      return { cents: Math.max(0, rule.fixedPriceCents), rule };
    }
    if (rule.ruleType === "percent_discount" && rule.percentBps != null) {
      return {
        cents: applyPercent(product.basePriceCents, rule.percentBps),
        rule,
      };
    }
  }
  return null;
}

function resolveCategoryRule(
  rules: CustomerCategoryDiscountRule[],
  product: ProductPriceInput,
  baseCents: Cents,
  at: Date,
): { cents: Cents; rule: CustomerCategoryDiscountRule } | null {
  for (const categoryId of product.categoryIds) {
    const rule = rules.find((r) => r.categoryId === categoryId);
    if (!rule) continue;
    if (!isActiveInWindow(rule.isActive, rule.validFrom, rule.validTo, at)) continue;

    if (rule.ruleType === "fixed_price" && rule.fixedPriceCents != null) {
      return { cents: Math.max(0, rule.fixedPriceCents), rule };
    }
    if (rule.ruleType === "percent_discount" && rule.percentBps != null) {
      return { cents: applyPercent(baseCents, rule.percentBps), rule };
    }
  }
  return null;
}

function resolveGlobalPromotion(
  promotions: GlobalPromotionRule[],
  product: ProductPriceInput,
  baseCents: Cents,
  at: Date,
): { cents: Cents; rule: GlobalPromotionRule } | null {
  for (const promo of promotions) {
    if (!isActiveInWindow(promo.isActive, promo.validFrom, promo.validTo, at)) continue;
    if (promo.categoryIds?.length) {
      const overlap = product.categoryIds.some((id) => promo.categoryIds!.includes(id));
      if (!overlap) continue;
    }
    return { cents: applyPercent(baseCents, promo.percentBps), rule: promo };
  }
  return null;
}

/**
 * Portugal B2C/B2B pricing priority:
 * 1. Customer product-specific
 * 2. Customer category
 * 3. Global promotion
 * 4. Catalog base price
 */
export function resolveUnitPrice(
  product: ProductPriceInput,
  ctx: PricingContext,
): ResolvedPrice {
  const at = ctx.at ?? new Date();
  const quantity = ctx.quantity ?? 1;
  const vatRule = resolveVatRule(ctx.vatRules, product.vatRuleId);
  const base = Math.max(0, product.basePriceCents);

  let unitCents = base;
  let source: PriceSource = "catalog";
  let ruleId: string | undefined;
  let vatMode: "inclusive" | "exclusive" = "inclusive";

  const productHit = resolveProductRule(ctx.productRules, product, quantity, at);
  if (productHit) {
    unitCents = productHit.cents;
    source = "customer_product";
    ruleId = productHit.rule.id;
    vatMode = productHit.rule.vatMode;
  } else {
    const categoryHit = resolveCategoryRule(ctx.categoryRules, product, base, at);
    if (categoryHit) {
      unitCents = categoryHit.cents;
      source = "customer_category";
      ruleId = categoryHit.rule.id;
    } else {
      const promoHit = resolveGlobalPromotion(ctx.globalPromotions, product, base, at);
      if (promoHit) {
        unitCents = promoHit.cents;
        source = "global_promotion";
        ruleId = promoHit.rule.id;
      }
    }
  }

  unitCents = Math.max(0, unitCents);
  const discountBps =
    base > 0 && unitCents < base ? Math.round(((base - unitCents) / base) * 10_000) : undefined;

  return {
    unitPriceCents: unitCents,
    basePriceCents: base,
    source,
    ruleId,
    vatRuleId: vatRule.id,
    vatRate: vatRule.rate,
    discountBps,
    vatMode,
  };
}

export function resolveCartLine(
  product: ProductPriceInput,
  ctx: PricingContext,
  quantity: number,
): ResolvedPrice & { lineTotalCents: Cents } {
  const unit = resolveUnitPrice(product, { ...ctx, quantity });
  return {
    ...unit,
    lineTotalCents: unit.unitPriceCents * quantity,
  };
}
