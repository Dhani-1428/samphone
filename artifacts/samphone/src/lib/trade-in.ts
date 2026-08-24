export type TradeCondition = "excellent" | "good" | "fair" | "poor";

const BASE_BY_BRAND: Record<string, number> = {
  Apple: 320,
  Samsung: 240,
  Google: 200,
  Xiaomi: 140,
  OnePlus: 160,
  Other: 100,
};

const CONDITION_MULT: Record<TradeCondition, number> = {
  excellent: 1,
  good: 0.82,
  fair: 0.58,
  poor: 0.32,
};

export function estimateTradeInEuro(brand: string, ageYears: number, condition: TradeCondition): number {
  const base = BASE_BY_BRAND[brand] ?? BASE_BY_BRAND.Other;
  const ageDecay = Math.max(0.35, 1 - ageYears * 0.12);
  const raw = base * ageDecay * CONDITION_MULT[condition];
  return Math.round(raw);
}

export function generateTradeInCode(): string {
  const part = Math.random().toString(36).slice(2, 8).toUpperCase();
  return `TRADE-${part}`;
}

export const TRADEIN_CODE_KEY = "samphone-tradein-code";
export const TRADEIN_VALUE_KEY = "samphone-tradein-value";

export type TradeInVoucher = { code: string; value: number };

export function loadTradeInVoucher(): TradeInVoucher | null {
  try {
    const code = localStorage.getItem(TRADEIN_CODE_KEY)?.trim() ?? "";
    const value = Number.parseFloat(localStorage.getItem(TRADEIN_VALUE_KEY) ?? "");
    if (!code || !Number.isFinite(value) || value <= 0) return null;
    return { code, value };
  } catch {
    return null;
  }
}

export function saveTradeInVoucher(code: string, value: number): void {
  localStorage.setItem(TRADEIN_CODE_KEY, code);
  localStorage.setItem(TRADEIN_VALUE_KEY, String(value));
}

export function clearTradeInVoucher(): void {
  localStorage.removeItem(TRADEIN_CODE_KEY);
  localStorage.removeItem(TRADEIN_VALUE_KEY);
}
