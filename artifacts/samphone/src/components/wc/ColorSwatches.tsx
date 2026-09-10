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
  direction = "row",
}: {
  swatches: ProductColorSwatch[];
  selected?: number;
  onSelect?: (index: number) => void;
  max?: number;
  size?: "sm" | "md";
  direction?: "row" | "col";
}) {
  if (swatches.length === 0) return null;
  const cap = max == null || max <= 0 ? swatches.length : max;
  const shown = swatches.slice(0, cap);
  const extra = swatches.length - shown.length;
  const dim = size === "md" ? "h-6 w-6" : "h-4 w-4";
  const vertical = direction === "col";

  return (
    <div
      className={cn(
        "flex items-center",
        vertical
          ? "max-h-full w-auto flex-col gap-1 overflow-y-auto py-0"
          : "min-h-7 w-full flex-wrap gap-2.5 py-0.5",
      )}
      role="list"
    >
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
            onPointerDown={(e) => {
              e.stopPropagation();
            }}
            onPointerUp={(e) => {
              e.preventDefault();
              e.stopPropagation();
              onSelect?.(i);
            }}
            className={cn(
              "shrink-0 rounded-full border shadow-sm pointer-events-auto",
              dim,
              active
                ? vertical
                  ? "ring-1 ring-sam ring-offset-1 ring-offset-white"
                  : "ring-2 ring-sam ring-offset-2 ring-offset-white"
                : "border-black/15",
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
