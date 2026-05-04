export type ShippingZone = "lisbon" | "portugal" | "islands";
export type ShippingSpeed = "standard" | "express";

const DAY_MS = 86_400_000;

function addBusinessDays(from: Date, businessDays: number): Date {
  const d = new Date(from);
  let added = 0;
  while (added < businessDays) {
    d.setTime(d.getTime() + DAY_MS);
    const day = d.getDay();
    if (day !== 0 && day !== 6) added++;
  }
  return d;
}

function rangeDays(zone: ShippingZone, speed: ShippingSpeed): { min: number; max: number } {
  if (speed === "express") {
    if (zone === "lisbon") return { min: 1, max: 2 };
    if (zone === "portugal") return { min: 2, max: 3 };
    return { min: 3, max: 5 };
  }
  if (zone === "lisbon") return { min: 2, max: 4 };
  if (zone === "portugal") return { min: 3, max: 6 };
  return { min: 5, max: 9 };
}

export function estimateDeliveryRange(
  zone: ShippingZone,
  speed: ShippingSpeed,
  from: Date = new Date(),
): { start: Date; end: Date } {
  const { min, max } = rangeDays(zone, speed);
  const start = addBusinessDays(from, min);
  const end = addBusinessDays(from, max);
  return { start, end };
}

export function formatDeliveryRange(start: Date, end: Date, locale: string): string {
  const opts: Intl.DateTimeFormatOptions = { weekday: "short", month: "short", day: "numeric" };
  return `${start.toLocaleDateString(locale, opts)} – ${end.toLocaleDateString(locale, opts)}`;
}
