/** Money stored in euro cents (integer) for Portugal EUR operations. */
export type Cents = number;

export type VatCode = "NOR" | "INT" | "RED" | "ISE";

export type PriceRuleType = "fixed_price" | "percent_discount";

export type VatDisplayMode = "inclusive" | "exclusive";

export interface VatRule {
  id: string;
  code: VatCode;
  name: string;
  /** Rate as decimal fraction, e.g. 0.23 for 23% IVA normal */
  rate: number;
  countryCode: "PT";
  isDefault?: boolean;
}

export interface ProductPriceInput {
  productId: string;
  wooProductId?: number;
  categoryIds: string[];
  basePriceCents: Cents;
  vatRuleId?: string;
}

export interface CustomerProductPriceRule {
  id: string;
  customerId: string;
  productId: string;
  wooProductId?: number;
  ruleType: PriceRuleType;
  fixedPriceCents?: Cents | null;
  /** Basis points: 500 = 5.00% */
  percentBps?: number | null;
  minQuantity?: number;
  maxQuantity?: number | null;
  vatMode: VatDisplayMode;
  validFrom?: Date | null;
  validTo?: Date | null;
  isActive: boolean;
}

export interface CustomerCategoryDiscountRule {
  id: string;
  customerId: string;
  categoryId: string;
  ruleType: PriceRuleType;
  fixedPriceCents?: Cents | null;
  percentBps?: number | null;
  validFrom?: Date | null;
  validTo?: Date | null;
  isActive: boolean;
}

export interface GlobalPromotionRule {
  id: string;
  name: string;
  percentBps: number;
  validFrom?: Date | null;
  validTo?: Date | null;
  isActive: boolean;
  /** Optional scope: empty = all products */
  categoryIds?: string[];
}

export interface PricingContext {
  customerId: string;
  at?: Date;
  quantity?: number;
  productRules: CustomerProductPriceRule[];
  categoryRules: CustomerCategoryDiscountRule[];
  globalPromotions: GlobalPromotionRule[];
  vatRules: VatRule[];
}

export type PriceSource =
  | "customer_product"
  | "customer_category"
  | "global_promotion"
  | "catalog";

export interface ResolvedPrice {
  /** Final unit price in cents (VAT applied per vatMode on display helpers) */
  unitPriceCents: Cents;
  basePriceCents: Cents;
  source: PriceSource;
  ruleId?: string;
  vatRuleId?: string;
  vatRate: number;
  /** Discount vs catalog in basis points (informational) */
  discountBps?: number;
  vatMode: VatDisplayMode;
}
