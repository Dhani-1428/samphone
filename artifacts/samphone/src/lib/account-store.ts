import type { StoredOrder } from "@/lib/orders";

const PREFIX = "samphone-account";

export interface AccountAddress {
  street: string;
  street2: string;
  zip: string;
  city: string;
  country: string;
  phone: string;
  company: string;
  useForDelivery: boolean;
}

export interface PaymentMethod {
  id: string;
  label: string;
  last4?: string;
}

export interface CreditNote {
  id: string;
  amount: number;
  createdAt: string;
}

export interface WarrantyReturn {
  id: string;
  status: "pending" | "approved" | "rejected";
  createdAt: string;
  productName: string;
}

export interface AccountData {
  address: AccountAddress;
  vatNumber: string;
  twoFactorEnabled: boolean;
  notifications: {
    orders: boolean;
    promotions: boolean;
    restock: boolean;
  };
  paymentMethods: PaymentMethod[];
  walletBalance: number;
  restockAlerts: string[];
  creditNotes: CreditNote[];
  warrantyReturns: WarrantyReturn[];
}

const EMPTY_ADDRESS: AccountAddress = {
  street: "",
  street2: "",
  zip: "",
  city: "",
  country: "Portugal",
  phone: "",
  company: "",
  useForDelivery: true,
};

export function defaultAccountData(): AccountData {
  return {
    address: { ...EMPTY_ADDRESS },
    vatNumber: "",
    twoFactorEnabled: false,
    notifications: { orders: true, promotions: false, restock: true },
    paymentMethods: [],
    walletBalance: 0,
    restockAlerts: [],
    creditNotes: [],
    warrantyReturns: [],
  };
}

function storageKey(email: string) {
  return `${PREFIX}:${email.toLowerCase()}`;
}

export function loadAccountData(email: string): AccountData {
  try {
    const raw = localStorage.getItem(storageKey(email));
    if (!raw) return defaultAccountData();
    const parsed = JSON.parse(raw) as Partial<AccountData>;
    return {
      ...defaultAccountData(),
      ...parsed,
      address: { ...EMPTY_ADDRESS, ...parsed.address },
      notifications: { ...defaultAccountData().notifications, ...parsed.notifications },
      paymentMethods: Array.isArray(parsed.paymentMethods) ? parsed.paymentMethods : [],
      restockAlerts: Array.isArray(parsed.restockAlerts) ? parsed.restockAlerts : [],
      creditNotes: Array.isArray(parsed.creditNotes) ? parsed.creditNotes : [],
      warrantyReturns: Array.isArray(parsed.warrantyReturns) ? parsed.warrantyReturns : [],
    };
  } catch {
    return defaultAccountData();
  }
}

export function saveAccountData(email: string, data: AccountData) {
  localStorage.setItem(storageKey(email), JSON.stringify(data));
}

export function profileCompletionPercent(data: AccountData): number {
  const checks = [
    Boolean(data.address.street.trim()),
    Boolean(data.address.zip.trim()),
    Boolean(data.address.city.trim()),
    Boolean(data.address.country.trim()),
    Boolean(data.address.phone.trim()),
    Boolean(data.address.company.trim()),
    Boolean(data.vatNumber.trim()),
    data.twoFactorEnabled,
    data.paymentMethods.length > 0,
  ];
  const done = checks.filter(Boolean).length;
  return Math.min(100, Math.max(25, Math.round((done / checks.length) * 100)));
}

export interface OrderStats {
  turnover: number;
  orderCount: number;
  qtyPurchased: number;
}

export function computeOrderStats(orders: StoredOrder[]): OrderStats {
  let turnover = 0;
  let qtyPurchased = 0;
  for (const o of orders) {
    turnover += o.totalEur ?? 0;
    for (const line of o.lines) qtyPurchased += line.qty;
  }
  return {
    turnover,
    orderCount: orders.length,
    qtyPurchased,
  };
}

export type ChartRange = "12m" | "90d" | "30d" | "7d";

export function turnoverByMonth(
  orders: StoredOrder[],
  range: ChartRange,
): { label: string; value: number }[] {
  const now = Date.now();
  const rangeMs =
    range === "7d"
      ? 7 * 86_400_000
      : range === "30d"
        ? 30 * 86_400_000
        : range === "90d"
          ? 90 * 86_400_000
          : 365 * 86_400_000;

  const cutoff = now - rangeMs;
  const buckets = new Map<string, number>();

  for (const o of orders) {
    const t = new Date(o.createdAt).getTime();
    if (t < cutoff) continue;
    const d = new Date(o.createdAt);
    const key =
      range === "7d" || range === "30d"
        ? d.toLocaleDateString("en-GB", { day: "numeric", month: "short" })
        : d.toLocaleDateString("en-GB", { month: "short" });
    buckets.set(key, (buckets.get(key) ?? 0) + (o.totalEur ?? 0));
  }

  if (buckets.size === 0) {
    const labels =
      range === "7d"
        ? ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"]
        : range === "30d"
          ? ["W1", "W2", "W3", "W4"]
          : ["May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec", "Jan", "Feb", "Mar", "Apr"];
    return labels.map((label) => ({ label, value: 0 }));
  }

  return [...buckets.entries()].map(([label, value]) => ({ label, value }));
}
