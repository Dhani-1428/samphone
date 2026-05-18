import { Router, type IRouter } from "express";
import { z } from "zod";
import { requireAdmin } from "../middleware/admin-auth";
import { rateLimit } from "../middleware/rate-limit";
import {
  createCategoryDiscount,
  createCustomerProductPrice,
  listCategoryDiscounts,
  listCustomerProductPrices,
  listCustomers,
  listPricingHistory,
  listVatRules,
  resolveCustomerPrice,
  softDeleteCustomerProductPrice,
  updateCustomerProductPrice,
} from "../services/pricing-service";

const router: IRouter = Router();

function paramId(value: string | string[]): string {
  return Array.isArray(value) ? value[0] ?? "" : value;
}

const resolveSchema = z.object({
  customerId: z.string().uuid().optional(),
  customerEmail: z.string().email().optional(),
  wooProductId: z.coerce.number().int().positive().optional(),
  productId: z.string().optional(),
  basePriceCents: z.coerce.number().int().nonnegative(),
  categoryIds: z.array(z.string()).optional(),
  quantity: z.coerce.number().int().positive().optional(),
});

const productPriceBody = z.object({
  customerId: z.string().uuid(),
  productId: z.string().uuid().optional(),
  wooProductId: z.number().int().positive().optional(),
  ruleType: z.enum(["fixed_price", "percent_discount"]),
  fixedPriceCents: z.number().int().nonnegative().optional().nullable(),
  percentBps: z.number().int().min(0).max(10000).optional().nullable(),
  minQuantity: z.number().int().positive().optional(),
  maxQuantity: z.number().int().positive().optional().nullable(),
  vatMode: z.enum(["inclusive", "exclusive"]).optional(),
  validFrom: z.string().datetime().optional().nullable(),
  validTo: z.string().datetime().optional().nullable(),
  isActive: z.boolean().optional(),
  notes: z.string().max(2000).optional().nullable(),
});

const categoryDiscountBody = z.object({
  customerId: z.string().uuid(),
  categoryId: z.string().uuid(),
  ruleType: z.enum(["fixed_price", "percent_discount"]),
  fixedPriceCents: z.number().int().nonnegative().optional().nullable(),
  percentBps: z.number().int().min(0).max(10000).optional().nullable(),
  validFrom: z.string().datetime().optional().nullable(),
  validTo: z.string().datetime().optional().nullable(),
  isActive: z.boolean().optional(),
});

/** Public/storefront: resolve personalized unit price */
router.post(
  "/pricing/resolve",
  rateLimit({ windowMs: 60_000, max: 120 }),
  (req, res) => {
    const parsed = resolveSchema.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({ error: parsed.error.flatten() });
      return;
    }
    if (!parsed.data.customerId && !parsed.data.customerEmail) {
      res.status(400).json({ error: "customerId or customerEmail required" });
      return;
    }
    const result = resolveCustomerPrice(parsed.data);
    if (!result) {
      res.status(404).json({ error: "Customer not found" });
      return;
    }
    res.json(result);
  },
);

router.get("/pricing/vat-rules", (_req, res) => {
  res.json({ items: listVatRules() });
});

/** GET /api/customer-pricing/:customerId */
router.get(
  "/customer-pricing/:customerId",
  requireAdmin,
  (req, res) => {
    const items = listCustomerProductPrices(paramId(req.params.customerId));
    res.json({ items });
  },
);

/** POST /api/customer-pricing */
router.post("/customer-pricing", requireAdmin, (req, res) => {
  const parsed = productPriceBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.flatten() });
    return;
  }
  try {
    const row = createCustomerProductPrice({
      customerId: parsed.data.customerId,
      productId: parsed.data.productId ?? null,
      wooProductId: parsed.data.wooProductId ?? null,
      ruleType: parsed.data.ruleType,
      fixedPriceCents: parsed.data.fixedPriceCents ?? null,
      percentBps: parsed.data.percentBps ?? null,
      minQuantity: parsed.data.minQuantity ?? 1,
      maxQuantity: parsed.data.maxQuantity ?? null,
      vatMode: parsed.data.vatMode ?? "inclusive",
      validFrom: parsed.data.validFrom ?? null,
      validTo: parsed.data.validTo ?? null,
      isActive: parsed.data.isActive ?? true,
      notes: parsed.data.notes ?? null,
    });
    res.status(201).json(row);
  } catch (e) {
    res.status(400).json({ error: e instanceof Error ? e.message : "Invalid data" });
  }
});

/** PUT /api/customer-pricing/:id */
router.put("/customer-pricing/:id", requireAdmin, (req, res) => {
  const parsed = productPriceBody.partial().safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.flatten() });
    return;
  }
  try {
    const row = updateCustomerProductPrice(paramId(req.params.id), parsed.data);
    if (!row) {
      res.status(404).json({ error: "Not found" });
      return;
    }
    res.json(row);
  } catch (e) {
    res.status(400).json({ error: e instanceof Error ? e.message : "Invalid data" });
  }
});

/** DELETE /api/customer-pricing/:id */
router.delete("/customer-pricing/:id", requireAdmin, (req, res) => {
  const ok = softDeleteCustomerProductPrice(paramId(req.params.id));
  if (!ok) {
    res.status(404).json({ error: "Not found" });
    return;
  }
  res.status(204).send();
});

/** GET /api/customer-category-discounts */
router.get("/customer-category-discounts", requireAdmin, (req, res) => {
  const customerId = typeof req.query.customerId === "string" ? req.query.customerId : undefined;
  res.json({ items: listCategoryDiscounts(customerId) });
});

/** POST /api/customer-category-discounts */
router.post("/customer-category-discounts", requireAdmin, (req, res) => {
  const parsed = categoryDiscountBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.flatten() });
    return;
  }
  const row = createCategoryDiscount({
    customerId: parsed.data.customerId,
    categoryId: parsed.data.categoryId,
    ruleType: parsed.data.ruleType,
    fixedPriceCents: parsed.data.fixedPriceCents ?? null,
    percentBps: parsed.data.percentBps ?? null,
    validFrom: parsed.data.validFrom ?? null,
    validTo: parsed.data.validTo ?? null,
    isActive: parsed.data.isActive ?? true,
  });
  res.status(201).json(row);
});

router.get("/customers", requireAdmin, (req, res) => {
  const search = typeof req.query.q === "string" ? req.query.q : undefined;
  res.json({ items: listCustomers(search) });
});

router.get("/pricing-history", requireAdmin, (_req, res) => {
  res.json({ items: listPricingHistory() });
});

export default router;
