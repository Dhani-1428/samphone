import {
  resolveUnitPrice,
  toDisplayCents,
  type PricingContext,
  type ProductPriceInput,
  type ResolvedPrice,
} from "@workspace/pricing";
import { randomUUID } from "node:crypto";
import {
  getMemoryStore,
  toEngineCategoryRules,
  toEngineProductRules,
  toEnginePromotions,
  type MemoryCustomerProductPrice,
  type MemoryCategoryDiscount,
} from "../repositories/pricing-memory-store";

export interface ResolvePriceRequest {
  customerId?: string;
  customerEmail?: string;
  wooProductId?: number;
  productId?: string;
  basePriceCents: number;
  categoryIds?: string[];
  quantity?: number;
}

export interface ResolvePriceResponse {
  customerId: string;
  resolved: ResolvedPrice;
  displayPriceCents: number;
  displayFormatted: string;
  netCents: number;
  grossCents: number;
}

function findCustomer(customerId?: string, customerEmail?: string) {
  const store = getMemoryStore();
  if (customerId) {
    return store.customers.find((c) => c.id === customerId && !c.deletedAt && c.isActive) ?? null;
  }
  if (customerEmail) {
    const email = customerEmail.trim().toLowerCase();
    return (
      store.customers.find(
        (c) => c.email.toLowerCase() === email && !c.deletedAt && c.isActive,
      ) ?? null
    );
  }
  return null;
}

function buildContext(customerId: string, quantity = 1): PricingContext {
  const store = getMemoryStore();
  return {
    customerId,
    quantity,
    productRules: toEngineProductRules(store.productPrices, customerId),
    categoryRules: toEngineCategoryRules(store.categoryDiscounts, customerId),
    globalPromotions: toEnginePromotions(store.promotions),
    vatRules: store.vatRules,
  };
}

export function resolveCustomerPrice(req: ResolvePriceRequest): ResolvePriceResponse | null {
  const customer = findCustomer(req.customerId, req.customerEmail);
  if (!customer) return null;

  const store = getMemoryStore();
  let productId = req.productId ?? "";
  let categoryIds = req.categoryIds ?? [];

  if (req.wooProductId) {
    const p = store.products.find((x) => x.wooProductId === req.wooProductId);
    if (p) {
      productId = p.id;
      if (p.categoryId) categoryIds = [...new Set([...categoryIds, p.categoryId])];
    }
  }

  const input: ProductPriceInput = {
    productId: productId || `woo:${req.wooProductId ?? "unknown"}`,
    wooProductId: req.wooProductId,
    categoryIds,
    basePriceCents: Math.max(0, req.basePriceCents),
    vatRuleId:
      store.products.find((p) => p.wooProductId === req.wooProductId)?.vatRuleId ?? undefined,
  };

  const ctx = buildContext(customer.id, req.quantity ?? 1);
  const resolved = resolveUnitPrice(input, ctx);
  const display = toDisplayCents(
    resolved.unitPriceCents,
    resolved.vatRate,
    resolved.vatMode,
    true,
  );

  const locale = customer.locale === "en-GB" ? "en-GB" : "pt-PT";
  const displayFormatted = new Intl.NumberFormat(locale, {
    style: "currency",
    currency: "EUR",
  }).format(display.displayCents / 100);

  return {
    customerId: customer.id,
    resolved,
    displayPriceCents: display.displayCents,
    displayFormatted,
    netCents: display.netCents,
    grossCents: display.grossCents,
  };
}

export function listCustomerProductPrices(customerId: string) {
  return getMemoryStore().productPrices.filter(
    (r) => r.customerId === customerId && !r.deletedAt,
  );
}

export function createCustomerProductPrice(
  input: Omit<MemoryCustomerProductPrice, "id" | "createdAt" | "updatedAt" | "deletedAt">,
): MemoryCustomerProductPrice {
  const store = getMemoryStore();
  const row: MemoryCustomerProductPrice = {
    ...input,
    id: randomUUID(),
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };
  if (row.fixedPriceCents != null && row.fixedPriceCents < 0) {
    throw new Error("Price cannot be negative");
  }
  store.productPrices.push(row);
  store.history.push({
    id: randomUUID(),
    entityType: "customer_product_prices",
    entityId: row.id,
    customerId: row.customerId,
    action: "create",
    snapshotJson: JSON.stringify(row),
    createdAt: new Date().toISOString(),
  });
  return row;
}

export function updateCustomerProductPrice(
  id: string,
  patch: Partial<MemoryCustomerProductPrice>,
): MemoryCustomerProductPrice | null {
  const store = getMemoryStore();
  const idx = store.productPrices.findIndex((r) => r.id === id && !r.deletedAt);
  if (idx < 0) return null;
  const prev = store.productPrices[idx]!;
  if (patch.fixedPriceCents != null && patch.fixedPriceCents < 0) {
    throw new Error("Price cannot be negative");
  }
  const next = { ...prev, ...patch, updatedAt: new Date().toISOString() };
  store.productPrices[idx] = next;
  store.history.push({
    id: randomUUID(),
    entityType: "customer_product_prices",
    entityId: id,
    customerId: next.customerId,
    action: "update",
    snapshotJson: JSON.stringify({ prev, next }),
    createdAt: new Date().toISOString(),
  });
  return next;
}

export function softDeleteCustomerProductPrice(id: string): boolean {
  const store = getMemoryStore();
  const row = store.productPrices.find((r) => r.id === id && !r.deletedAt);
  if (!row) return false;
  row.deletedAt = new Date().toISOString();
  row.isActive = false;
  row.updatedAt = new Date().toISOString();
  return true;
}

export function listCustomers(search?: string) {
  const q = search?.trim().toLowerCase();
  return getMemoryStore().customers.filter((c) => {
    if (c.deletedAt) return false;
    if (!q) return true;
    return c.email.toLowerCase().includes(q) || c.name.toLowerCase().includes(q);
  });
}

export function listCategoryDiscounts(customerId?: string) {
  return getMemoryStore().categoryDiscounts.filter(
    (r) => !r.deletedAt && (!customerId || r.customerId === customerId),
  );
}

export function createCategoryDiscount(
  input: Omit<MemoryCategoryDiscount, "id" | "createdAt" | "updatedAt" | "deletedAt">,
): MemoryCategoryDiscount {
  const store = getMemoryStore();
  const row: MemoryCategoryDiscount = {
    ...input,
    id: randomUUID(),
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };
  store.categoryDiscounts.push(row);
  return row;
}

export function listPricingHistory(limit = 50) {
  return getMemoryStore().history.slice(-limit).reverse();
}

export function listVatRules() {
  return getMemoryStore().vatRules;
}
