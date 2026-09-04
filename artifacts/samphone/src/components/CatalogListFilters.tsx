import { useState, type ReactNode } from "react";
import { ChevronDown, ChevronUp, Search, SlidersHorizontal, X } from "lucide-react";
import { CatalogTypeChip } from "@/components/CatalogPageChrome";
import { productSearchHaystack } from "@/lib/woo-product-filters";
import { cn } from "@/lib/utils";
import type { WooProduct } from "@/lib/woocommerce";

export type CatalogListFilterState = {
  query: string;
  inStock: boolean;
  onSale: boolean;
  minPrice: number | null;
  maxPrice: number | null;
  sort: "newest" | "price-asc" | "price-desc";
};

export const EMPTY_CATALOG_LIST_FILTERS: CatalogListFilterState = {
  query: "",
  inStock: false,
  onSale: false,
  minPrice: null,
  maxPrice: null,
  sort: "newest",
};

function productPrice(p: WooProduct): number {
  return parseFloat(p.price || p.regular_price || "0") || 0;
}

export function applyCatalogListFilters(
  products: WooProduct[],
  filters: CatalogListFilterState,
): WooProduct[] {
  const q = filters.query.trim().toLowerCase();
  let list = products;

  if (q) {
    list = list.filter((p) => productSearchHaystack(p).includes(q) || (p.name ?? "").toLowerCase().includes(q));
  }
  if (filters.inStock) list = list.filter((p) => p.stock_status === "instock");
  if (filters.onSale) list = list.filter((p) => p.on_sale);
  if (filters.minPrice != null) list = list.filter((p) => productPrice(p) >= filters.minPrice!);
  if (filters.maxPrice != null) list = list.filter((p) => productPrice(p) <= filters.maxPrice!);

  const sorted = [...list];
  if (filters.sort === "price-asc") sorted.sort((a, b) => productPrice(a) - productPrice(b));
  else if (filters.sort === "price-desc") sorted.sort((a, b) => productPrice(b) - productPrice(a));
  else {
    sorted.sort((a, b) => {
      const da = Date.parse(a.date_created || "") || 0;
      const db = Date.parse(b.date_created || "") || 0;
      if (db !== da) return db - da;
      return (b.id || 0) - (a.id || 0);
    });
  }
  return sorted;
}

export function catalogListFilterCount(filters: CatalogListFilterState): number {
  return (
    (filters.query.trim() ? 1 : 0) +
    (filters.inStock ? 1 : 0) +
    (filters.onSale ? 1 : 0) +
    (filters.minPrice != null ? 1 : 0) +
    (filters.maxPrice != null ? 1 : 0) +
    (filters.sort !== "newest" ? 1 : 0)
  );
}

export function FilterSection({
  title,
  children,
  defaultOpen = true,
}: {
  title: string;
  children: ReactNode;
  defaultOpen?: boolean;
}) {
  const [open, setOpen] = useState(defaultOpen);
  return (
    <div className="border-b border-black/[0.07] pb-4">
      <button
        type="button"
        className="flex w-full items-center justify-between py-3 text-[13px] font-bold uppercase tracking-wide text-black"
        onClick={() => setOpen((v) => !v)}
      >
        {title}
        {open ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
      </button>
      {open ? <div className="mt-1 space-y-2">{children}</div> : null}
    </div>
  );
}

/** Brand-page style: mobile toggle + sticky left sidebar + main column. */
export function CatalogFilterLayout({
  activeCount,
  sidebar,
  children,
}: {
  activeCount: number;
  sidebar: ReactNode;
  children: ReactNode;
}) {
  const [open, setOpen] = useState(false);
  return (
    <>
      <button
        type="button"
        className="mb-4 flex w-full items-center gap-2 rounded-lg border border-black/[0.12] bg-white px-4 py-2 text-sm font-semibold lg:hidden"
        onClick={() => setOpen((v) => !v)}
      >
        <SlidersHorizontal className="h-4 w-4" />
        Filters
        {activeCount > 0 ? (
          <span className="ml-1 flex h-5 w-5 items-center justify-center rounded-full bg-sam text-[11px] text-white">
            {activeCount}
          </span>
        ) : null}
        {open ? <ChevronUp className="ml-auto h-4 w-4" /> : <ChevronDown className="ml-auto h-4 w-4" />}
      </button>

      {open ? <div className="mb-4 lg:hidden">{sidebar}</div> : null}

      <div className="flex gap-6">
        <div className="hidden shrink-0 lg:block">{sidebar}</div>
        <div className="min-w-0 flex-1">{children}</div>
      </div>
    </>
  );
}

export function CatalogFilterAside({
  children,
  onClear,
  title = "Filters",
}: {
  children: ReactNode;
  onClear?: () => void;
  title?: string;
}) {
  return (
    <aside className="w-full shrink-0 lg:w-60 xl:w-64">
      <div className="rounded-xl border border-black/[0.08] bg-white p-4 shadow-sm lg:sticky lg:top-24">
        <div className="mb-3 flex items-center justify-between">
          <span className="text-[15px] font-bold text-black">{title}</span>
          {onClear ? (
            <button type="button" className="text-[12px] text-sam hover:underline" onClick={onClear}>
              Clear all
            </button>
          ) : null}
        </div>
        {children}
      </div>
    </aside>
  );
}

type Props = {
  filters: CatalogListFilterState;
  onChange: (next: CatalogListFilterState) => void;
  resultCount?: number;
  searchPlaceholder?: string;
  className?: string;
  /** Extra sections (e.g. brand / type chips) rendered above the common filters. */
  extraSections?: ReactNode;
};

export default function CatalogListFilters({
  filters,
  onChange,
  resultCount,
  searchPlaceholder = "Search products…",
  className,
  extraSections,
}: Props) {
  const active = catalogListFilterCount(filters);

  return (
    <CatalogFilterAside
      onClear={active > 0 ? () => onChange({ ...EMPTY_CATALOG_LIST_FILTERS }) : undefined}
    >
      <div className={cn(className)}>
        {extraSections}

        <FilterSection title="Search">
          <div className="relative">
            <Search className="pointer-events-none absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-neutral-400" />
            <input
              type="search"
              value={filters.query}
              onChange={(e) => onChange({ ...filters, query: e.target.value })}
              placeholder={searchPlaceholder}
              autoComplete="off"
              className="w-full rounded-md border border-black/[0.12] py-1.5 pl-8 pr-8 text-sm focus:outline-none focus:ring-1 focus:ring-sam"
              aria-label={searchPlaceholder}
            />
            {filters.query ? (
              <button
                type="button"
                onClick={() => onChange({ ...filters, query: "" })}
                className="absolute right-1.5 top-1/2 flex h-6 w-6 -translate-y-1/2 items-center justify-center rounded text-muted-foreground hover:bg-muted"
                aria-label="Clear search"
              >
                <X className="h-3.5 w-3.5" />
              </button>
            ) : null}
          </div>
          {typeof resultCount === "number" ? (
            <p className="text-xs text-muted-foreground">{resultCount} results</p>
          ) : null}
        </FilterSection>

        <FilterSection title="Availability">
          <label className="flex cursor-pointer items-center gap-2 text-sm">
            <input
              type="checkbox"
              checked={filters.inStock}
              onChange={(e) => onChange({ ...filters, inStock: e.target.checked })}
              className="accent-sam"
            />
            In stock only
          </label>
          <label className="flex cursor-pointer items-center gap-2 text-sm">
            <input
              type="checkbox"
              checked={filters.onSale}
              onChange={(e) => onChange({ ...filters, onSale: e.target.checked })}
              className="accent-sam"
            />
            On sale
          </label>
        </FilterSection>

        <FilterSection title="Price range">
          <div className="flex items-center gap-2">
            <input
              type="number"
              min={0}
              step={1}
              placeholder="Min"
              value={filters.minPrice ?? ""}
              onChange={(e) =>
                onChange({
                  ...filters,
                  minPrice: e.target.value === "" ? null : Number(e.target.value),
                })
              }
              className="w-full rounded-md border border-black/[0.12] px-2 py-1.5 text-sm focus:outline-none focus:ring-1 focus:ring-sam"
            />
            <span className="text-muted-foreground">–</span>
            <input
              type="number"
              min={0}
              step={1}
              placeholder="Max"
              value={filters.maxPrice ?? ""}
              onChange={(e) =>
                onChange({
                  ...filters,
                  maxPrice: e.target.value === "" ? null : Number(e.target.value),
                })
              }
              className="w-full rounded-md border border-black/[0.12] px-2 py-1.5 text-sm focus:outline-none focus:ring-1 focus:ring-sam"
            />
          </div>
        </FilterSection>

        <FilterSection title="Sort" defaultOpen={false}>
          <div className="flex flex-col gap-2">
            {(
              [
                ["newest", "Newest"],
                ["price-asc", "Price: low to high"],
                ["price-desc", "Price: high to low"],
              ] as const
            ).map(([value, label]) => (
              <CatalogTypeChip
                key={value}
                active={filters.sort === value}
                onClick={() => onChange({ ...filters, sort: value })}
              >
                {label}
              </CatalogTypeChip>
            ))}
          </div>
        </FilterSection>
      </div>
    </CatalogFilterAside>
  );
}
