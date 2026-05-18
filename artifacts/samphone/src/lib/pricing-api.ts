export interface ResolvedPriceApiResponse {
  customerId: string;
  resolved: {
    unitPriceCents: number;
    basePriceCents: number;
    source: string;
    ruleId?: string;
    vatRate: number;
    vatMode: string;
    discountBps?: number;
  };
  displayPriceCents: number;
  displayFormatted: string;
  netCents: number;
  grossCents: number;
}

const API_BASE = (import.meta.env.VITE_PRICING_API_URL ?? "/api").replace(/\/$/, "");

export async function resolveCustomerPrice(params: {
  customerEmail: string;
  wooProductId?: number;
  basePriceCents: number;
  categoryIds?: string[];
  quantity?: number;
}): Promise<ResolvedPriceApiResponse | null> {
  try {
    const res = await fetch(`${API_BASE}/pricing/resolve`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      credentials: "include",
      body: JSON.stringify(params),
    });
    if (res.status === 404) return null;
    if (!res.ok) return null;
    return (await res.json()) as ResolvedPriceApiResponse;
  } catch {
    return null;
  }
}

export function eurosToCents(price: string | number | null | undefined): number {
  if (price == null) return 0;
  const n = typeof price === "number" ? price : Number.parseFloat(String(price).replace(",", "."));
  if (!Number.isFinite(n) || n < 0) return 0;
  return Math.round(n * 100);
}

export function centsToDisplayString(cents: number, locale = "pt-PT"): string {
  return new Intl.NumberFormat(locale, { style: "currency", currency: "EUR" }).format(cents / 100);
}
