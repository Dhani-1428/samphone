import type { Cents, VatDisplayMode, VatRule } from "./types";

/** Default Portuguese IVA rates (2025). */
export const PT_VAT_RULES: VatRule[] = [
  {
    id: "pt-iva-nor",
    code: "NOR",
    name: "IVA taxa normal",
    rate: 0.23,
    countryCode: "PT",
    isDefault: true,
  },
  {
    id: "pt-iva-int",
    code: "INT",
    name: "IVA taxa intermédia",
    rate: 0.13,
    countryCode: "PT",
  },
  {
    id: "pt-iva-red",
    code: "RED",
    name: "IVA taxa reduzida",
    rate: 0.06,
    countryCode: "PT",
  },
  {
    id: "pt-iva-ise",
    code: "ISE",
    name: "Isento de IVA",
    rate: 0,
    countryCode: "PT",
  },
];

export function resolveVatRule(rules: VatRule[], vatRuleId?: string): VatRule {
  if (vatRuleId) {
    const found = rules.find((r) => r.id === vatRuleId);
    if (found) return found;
  }
  return rules.find((r) => r.isDefault) ?? PT_VAT_RULES[0]!;
}

/** Add IVA to net (exclusive) amount. */
export function addVat(netCents: Cents, rate: number): Cents {
  return Math.round(netCents * (1 + rate));
}

/** Extract net from gross (inclusive) amount. */
export function removeVat(grossCents: Cents, rate: number): Cents {
  if (rate <= 0) return grossCents;
  return Math.round(grossCents / (1 + rate));
}

export function formatEur(cents: Cents, locale = "pt-PT"): string {
  return new Intl.NumberFormat(locale, {
    style: "currency",
    currency: "EUR",
  }).format(cents / 100);
}

export function formatEuropeanDate(d: Date, locale = "pt-PT"): string {
  return new Intl.DateTimeFormat(locale, {
    dateStyle: "short",
    timeStyle: "short",
  }).format(d);
}

export function toDisplayCents(
  amountCents: Cents,
  vatRate: number,
  mode: VatDisplayMode,
  /** true if stored amount is VAT-inclusive */
  amountIsInclusive: boolean,
): { displayCents: Cents; netCents: Cents; grossCents: Cents } {
  if (mode === "inclusive") {
    const gross = amountIsInclusive ? amountCents : addVat(amountCents, vatRate);
    return { displayCents: gross, netCents: removeVat(gross, vatRate), grossCents: gross };
  }
  const net = amountIsInclusive ? removeVat(amountCents, vatRate) : amountCents;
  return { displayCents: net, netCents: net, grossCents: addVat(net, vatRate) };
}
