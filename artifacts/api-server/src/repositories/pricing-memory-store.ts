import { randomUUID } from "node:crypto";
import type {
  CustomerCategoryDiscountRule,
  CustomerProductPriceRule,
  GlobalPromotionRule,
  VatRule,
} from "@workspace/pricing";
import { PT_VAT_RULES } from "@workspace/pricing";

export interface MemoryCustomer {
  id: string;
  email: string;
  name: string;
  customerType: string;
  locale: string;
  vatNumber?: string | null;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
  deletedAt?: string | null;
}

export interface MemoryCategory {
  id: string;
  slug: string;
  name: string;
  wooCategoryId?: number | null;
}

export interface MemoryProduct {
  id: string;
  wooProductId?: number | null;
  sku?: string | null;
  name: string;
  categoryId?: string | null;
  basePriceCents: number;
  vatRuleId?: string | null;
}

export interface MemoryCustomerProductPrice {
  id: string;
  customerId: string;
  productId?: string | null;
  wooProductId?: number | null;
  ruleType: "fixed_price" | "percent_discount";
  fixedPriceCents?: number | null;
  percentBps?: number | null;
  minQuantity: number;
  maxQuantity?: number | null;
  vatMode: "inclusive" | "exclusive";
  validFrom?: string | null;
  validTo?: string | null;
  isActive: boolean;
  notes?: string | null;
  createdAt: string;
  updatedAt: string;
  deletedAt?: string | null;
}

export interface MemoryCategoryDiscount {
  id: string;
  customerId: string;
  categoryId: string;
  ruleType: "fixed_price" | "percent_discount";
  fixedPriceCents?: number | null;
  percentBps?: number | null;
  validFrom?: string | null;
  validTo?: string | null;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
  deletedAt?: string | null;
}

export interface MemoryPromotion {
  id: string;
  name: string;
  percentBps: number;
  categoryIds: string[];
  validFrom?: string | null;
  validTo?: string | null;
  isActive: boolean;
}

export interface PricingMemoryState {
  customers: MemoryCustomer[];
  categories: MemoryCategory[];
  products: MemoryProduct[];
  productPrices: MemoryCustomerProductPrice[];
  categoryDiscounts: MemoryCategoryDiscount[];
  promotions: MemoryPromotion[];
  vatRules: VatRule[];
  history: {
    id: string;
    entityType: string;
    entityId: string;
    customerId?: string;
    action: string;
    snapshotJson: string;
    actorEmail?: string;
    createdAt: string;
  }[];
}

function seed(): PricingMemoryState {
  const catPhones = randomUUID();
  const catAccessories = randomUUID();
  const pGeneric = randomUUID();

  const joao = randomUUID();
  const maria = randomUUID();
  const dealer = randomUUID();

  return {
    vatRules: PT_VAT_RULES,
    categories: [
      { id: catPhones, slug: "smartphones", name: "Smartphones", wooCategoryId: 1 },
      { id: catAccessories, slug: "accessories", name: "Accessories", wooCategoryId: 2 },
    ],
    products: [
      {
        id: pGeneric,
        wooProductId: 1000,
        name: "Sample Smartphone",
        categoryId: catPhones,
        basePriceCents: 10_000,
        vatRuleId: "pt-iva-nor",
      },
    ],
    customers: [
      {
        id: joao,
        email: "joao@example.pt",
        name: "João Silva",
        customerType: "b2b",
        locale: "pt-PT",
        isActive: true,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      },
      {
        id: maria,
        email: "maria@example.pt",
        name: "Maria Costa",
        customerType: "retail",
        locale: "pt-PT",
        isActive: true,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      },
      {
        id: dealer,
        email: "dealer@samphone.pt",
        name: "Dealer Lda",
        customerType: "dealer",
        locale: "pt-PT",
        vatNumber: "PT500000000",
        isActive: true,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      },
    ],
    productPrices: [
      {
        id: randomUUID(),
        customerId: joao,
        wooProductId: 1000,
        productId: pGeneric,
        ruleType: "fixed_price",
        fixedPriceCents: 8_500,
        minQuantity: 1,
        vatMode: "inclusive",
        isActive: true,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      },
      {
        id: randomUUID(),
        customerId: maria,
        wooProductId: 1000,
        productId: pGeneric,
        ruleType: "fixed_price",
        fixedPriceCents: 9_200,
        minQuantity: 1,
        vatMode: "inclusive",
        isActive: true,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      },
      {
        id: randomUUID(),
        customerId: dealer,
        wooProductId: 1000,
        productId: pGeneric,
        ruleType: "fixed_price",
        fixedPriceCents: 7_000,
        minQuantity: 1,
        vatMode: "inclusive",
        isActive: true,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      },
    ],
    categoryDiscounts: [
      {
        id: randomUUID(),
        customerId: joao,
        categoryId: catAccessories,
        ruleType: "percent_discount",
        percentBps: 500,
        isActive: true,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      },
    ],
    promotions: [
      {
        id: randomUUID(),
        name: "Spring promo",
        percentBps: 300,
        categoryIds: [],
        isActive: true,
      },
    ],
    history: [],
  };
}

let state: PricingMemoryState = seed();

export function getMemoryStore(): PricingMemoryState {
  return state;
}

export function resetMemoryStore(): void {
  state = seed();
}

export function toEngineProductRules(
  rows: MemoryCustomerProductPrice[],
  customerId: string,
): CustomerProductPriceRule[] {
  return rows
    .filter((r) => r.customerId === customerId && !r.deletedAt)
    .map((r) => ({
      id: r.id,
      customerId: r.customerId,
      productId: r.productId ?? "",
      wooProductId: r.wooProductId ?? undefined,
      ruleType: r.ruleType,
      fixedPriceCents: r.fixedPriceCents,
      percentBps: r.percentBps,
      minQuantity: r.minQuantity,
      maxQuantity: r.maxQuantity,
      vatMode: r.vatMode,
      validFrom: r.validFrom ? new Date(r.validFrom) : null,
      validTo: r.validTo ? new Date(r.validTo) : null,
      isActive: r.isActive,
    }));
}

export function toEngineCategoryRules(
  rows: MemoryCategoryDiscount[],
  customerId: string,
): CustomerCategoryDiscountRule[] {
  return rows
    .filter((r) => r.customerId === customerId && !r.deletedAt)
    .map((r) => ({
      id: r.id,
      customerId: r.customerId,
      categoryId: r.categoryId,
      ruleType: r.ruleType,
      fixedPriceCents: r.fixedPriceCents,
      percentBps: r.percentBps,
      validFrom: r.validFrom ? new Date(r.validFrom) : null,
      validTo: r.validTo ? new Date(r.validTo) : null,
      isActive: r.isActive,
    }));
}

export function toEnginePromotions(rows: MemoryPromotion[]): GlobalPromotionRule[] {
  return rows
    .filter((r) => r.isActive)
    .map((r) => ({
      id: r.id,
      name: r.name,
      percentBps: r.percentBps,
      categoryIds: r.categoryIds,
      validFrom: r.validFrom ? new Date(r.validFrom) : null,
      validTo: r.validTo ? new Date(r.validTo) : null,
      isActive: r.isActive,
    }));
}
