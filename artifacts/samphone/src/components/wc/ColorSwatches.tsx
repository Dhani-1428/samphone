import type { ProductColorSwatch } from "@/lib/woocommerce";
import { cn } from "@/lib/utils";

function isLight(hex: string): boolean {
  const h = hex.replace("#", "");
  const full = h.length === 3 ? h.split("").map((c) => c + c).join("") : h;
  if (full.length < 6) return true;
  const r = Number.parseInt(full.slice(0, 2), 16);
  const g = Number.parseInt(full.slice(2, 4), 16);
  const b = Number.parseInt(full.slice(4, 6), 16);
  return (r * 299 + g * 587 + b * 114) / 1000 > 186;
}

export default function ColorSwatches({
  swatches,
  selected = 0,
  onSelect,
  max = 8,
  size = "sm",
}: {
  swatches: ProductColorSwatch[];
  selected?: number;
  onSelect?: (index: number) => void;
  max?: number;
  size?: "sm" | "md";
}) {
  if (swatches.length === 0) return null;
  const shown = swatches.slice(0, max);
  const extra = swatches.length - shown.length;
  const dim = size === "md" ? "h-6 w-6" : "h-4 w-4";

  return (
    <div className="flex flex-wrap items-center gap-1.5" role="list">
      {shown.map((s, i) => {
        const active = i === selected;
        return (
          <button
            key={`${s.label}-${i}`}
            type="button"
            role="listitem"
            title={s.label}
            aria-label={s.label}
            aria-pressed={active}
            onClick={(e) => {
              e.preventDefault();
              e.stopPropagation();
              onSelect?.(i);
            }}
            onMouseEnter={() => onSelect?.(i)}
            className={cn(
              "rounded-full border shadow-sm transition-transform",
              dim,
              active ? "scale-110 ring-2 ring-offset-1 ring-foreground/40" : "border-black/15",
              isLight(s.hex) ? "border-black/25" : "border-black/20",
            )}
            style={{ backgroundColor: s.hex }}
          />
        );
      })}
      {extra > 0 ? <span className="text-[10px] font-semibold text-muted-foreground">+{extra}</span> : null}
    </div>
  );
}
