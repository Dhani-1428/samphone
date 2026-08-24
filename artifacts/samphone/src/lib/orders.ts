import { resolveCatalogProduct } from "@/data/catalog";

const STORAGE_KEY = "samphone-orders";
const DEMO_ID = "SP-DEMO-TRACK";

export type OrderStatus = "processing" | "shipped" | "out_for_delivery" | "delivered";

export interface OrderLine {
  cartKey: string;
  name: string;
  qty: number;
}

export interface StoredOrder {
  id: string;
  createdAt: string;
  status: OrderStatus;
  lines: OrderLine[];
  /** Progress 0–3 for UI steps */
  stepIndex: number;
  /** Order total in EUR for account statistics */
  totalEur?: number;
}

function readAll(): StoredOrder[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as unknown;
    if (!Array.isArray(parsed)) return [];
    return parsed.filter((o): o is StoredOrder => typeof o?.id === "string");
  } catch {
    return [];
  }
}

function writeAll(orders: StoredOrder[]) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(orders));
}

export function listOrders(): StoredOrder[] {
  return readAll().sort((a, b) => b.createdAt.localeCompare(a.createdAt));
}

export function getOrderById(id: string): StoredOrder | null {
  const normalized = id.trim().toUpperCase();
  if (!normalized) return null;
  if (normalized === DEMO_ID) ensureDemoOrder();
  return readAll().find((o) => o.id.toUpperCase() === normalized) ?? null;
}

export function saveOrder(order: StoredOrder) {
  const all = readAll().filter((o) => o.id !== order.id);
  all.push(order);
  writeAll(all);
}

function linesFromCart(items: Record<string, number>): OrderLine[] {
  const lines: OrderLine[] = [];
  for (const [cartKey, qty] of Object.entries(items)) {
    if (qty <= 0) continue;
    const p = resolveCatalogProduct(cartKey);
    lines.push({
      cartKey,
      qty,
      name: p?.name ?? cartKey,
    });
  }
  return lines;
}

function estimateLineTotal(cartKey: string, qty: number): number {
  const p = resolveCatalogProduct(cartKey);
  if (!p?.price) return 0;
  return p.price * qty;
}

function orderTotalFromLines(lines: OrderLine[]): number {
  return lines.reduce((sum, l) => sum + estimateLineTotal(l.cartKey, l.qty), 0);
}

export function createOrderFromCart(items: Record<string, number>): StoredOrder | null {
  const lines = linesFromCart(items);
  if (lines.length === 0) return null;
  const suffix = Date.now().toString(36).toUpperCase().slice(-5);
  const order: StoredOrder = {
    id: `SP-LIS-${suffix}`,
    createdAt: new Date().toISOString(),
    status: "processing",
    lines,
    stepIndex: 0,
    totalEur: orderTotalFromLines(lines),
  };
  saveOrder(order);
  return order;
}

/** Demo order always resolvable for marketing / QA. */

export function ensureDemoOrder(): void {
  const all = readAll();
  if (all.some((o) => o.id === DEMO_ID)) return;
  const demoLines: OrderLine[] = [
    { cartKey: "phones:1", name: "iPhone 15 Pro OLED Display", qty: 1 },
    { cartKey: "acc:1", name: "Full Glue Tempered Glass iPhone 15", qty: 2 },
  ];
  const demo: StoredOrder = {
    id: DEMO_ID,
    createdAt: new Date(Date.now() - 2 * 86_400_000).toISOString(),
    status: "out_for_delivery",
    stepIndex: 2,
    lines: demoLines,
    totalEur: orderTotalFromLines(demoLines) || 89.97,
  };
  writeAll([demo, ...all]);
}
