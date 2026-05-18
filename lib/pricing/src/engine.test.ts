import { describe, expect, it } from "node:test";
import { resolveUnitPrice } from "./engine";
import { PT_VAT_RULES } from "./vat";
import type { PricingContext } from "./types";

const baseCtx = (overrides: Partial<PricingContext> = {}): PricingContext => ({
  customerId: "cust-1",
  productRules: [],
  categoryRules: [],
  globalPromotions: [],
  vatRules: PT_VAT_RULES,
  ...overrides,
});

describe("resolveUnitPrice priority", () => {
  const product = {
    productId: "p1",
    wooProductId: 100,
    categoryIds: ["cat-phones"],
    basePriceCents: 10_000,
  };

  it("uses catalog price by default", () => {
    const r = resolveUnitPrice(product, baseCtx());
    expect(r.unitPriceCents).toBe(10_000);
    expect(r.source).toBe("catalog");
  });

  it("customer product price overrides category and promo", () => {
    const r = resolveUnitPrice(
      product,
      baseCtx({
        productRules: [
          {
            id: "r1",
            customerId: "cust-1",
            productId: "p1",
            ruleType: "fixed_price",
            fixedPriceCents: 8_500,
            isActive: true,
            vatMode: "inclusive",
          },
        ],
        categoryRules: [
          {
            id: "c1",
            customerId: "cust-1",
            categoryId: "cat-phones",
            ruleType: "percent_discount",
            percentBps: 500,
            isActive: true,
          },
        ],
        globalPromotions: [
          { id: "g1", name: "Sale", percentBps: 1000, isActive: true },
        ],
      }),
    );
    expect(r.unitPriceCents).toBe(8_500);
    expect(r.source).toBe("customer_product");
  });

  it("category discount when no product rule", () => {
    const r = resolveUnitPrice(
      product,
      baseCtx({
        categoryRules: [
          {
            id: "c1",
            customerId: "cust-1",
            categoryId: "cat-phones",
            ruleType: "percent_discount",
            percentBps: 800,
            isActive: true,
          },
        ],
      }),
    );
    expect(r.unitPriceCents).toBe(9_200);
    expect(r.source).toBe("customer_category");
  });

  it("never returns negative price", () => {
    const r = resolveUnitPrice(
      product,
      baseCtx({
        productRules: [
          {
            id: "r1",
            customerId: "cust-1",
            productId: "p1",
            ruleType: "fixed_price",
            fixedPriceCents: -50,
            isActive: true,
            vatMode: "inclusive",
          },
        ],
      }),
    );
    expect(r.unitPriceCents).toBe(0);
  });
});
