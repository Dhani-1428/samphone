import { Search, X } from "lucide-react";
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

type Props = {
  filters: CatalogListFilterState;
  onChange: (next: CatalogListFilterState) => void;
  resultCount?: number;
  searchPlaceholder?: string;
  className?: string;
};

export default function CatalogListFilters({
  filters,
  onChange,
  resultCount,
  searchPlaceholder = "Search products…",
  className,
}: Props) {
  const active = catalogListFilterCount(filters);

  return (
    <div
      className={cn(
        "mb-6 rounded-xl border border-black/[0.08] bg-white p-4 shadow-sm",
        className,
      )}
    >
      <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
        <div className="relative w-full md:max-w-md">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <input
            type="search"
            value={filters.query}
            onChange={(e) => onChange({ ...filters, query: e.target.value })}
            placeholder={searchPlaceholder}
            autoComplete="off"
            className="w-full rounded-lg border border-border bg-white py-2 pl-9 pr-10 text-sm focus:outline-none focus:ring-2 focus:ring-sam/30"
            aria-label={searchPlaceholder}
          />
          {filters.query ? (
            <button
              type="button"
              onClick={() => onChange({ ...filters, query: "" })}
              className="absolute right-2 top-1/2 flex h-7 w-7 -translate-y-1/2 items-center justify-center rounded-md text-muted-foreground hover:bg-muted"
              aria-label="Clear search"
            >
              <X className="h-4 w-4" />
            </button>
          ) : null}
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {typeof resultCount === "number" ? (
            <span className="text-sm text-muted-foreground">{resultCount} results</span>
          ) : null}
          {active > 0 ? (
            <button
              type="button"
              className="text-sm font-semibold text-sam hover:underline"
              onClick={() => onChange({ ...EMPTY_CATALOG_LIST_FILTERS })}
            >
              Clear filters
            </button>
          ) : null}
        </div>
      </div>

      <div className="mt-3 flex flex-wrap items-center gap-2">
        <CatalogTypeChip
          active={filters.inStock}
          onClick={() => onChange({ ...filters, inStock: !filters.inStock })}
        >
          In stock
        </CatalogTypeChip>
        <CatalogTypeChip
          active={filters.onSale}
          onClick={() => onChange({ ...filters, onSale: !filters.onSale })}
        >
          On sale
        </CatalogTypeChip>

        <label className="inline-flex items-center gap-1.5 text-sm text-navy">
          <span className="text-muted-foreground">Min €</span>
          <input
            type="number"
            min={0}
            step={1}
            value={filters.minPrice ?? ""}
            onChange={(e) =>
              onChange({
                ...filters,
                minPrice: e.target.value === "" ? null : Number(e.target.value),
              })
            }
            className="w-20 rounded-md border border-border px-2 py-1.5 text-sm focus:outline-none focus:ring-1 focus:ring-sam"
          />
        </label>
        <label className="inline-flex items-center gap-1.5 text-sm text-navy">
          <span className="text-muted-foreground">Max €</span>
          <input
            type="number"
            min={0}
            step={1}
            value={filters.maxPrice ?? ""}
            onChange={(e) =>
              onChange({
                ...filters,
                maxPrice: e.target.value === "" ? null : Number(e.target.value),
              })
            }
            className="w-20 rounded-md border border-border px-2 py-1.5 text-sm focus:outline-none focus:ring-1 focus:ring-sam"
          />
        </label>

        <select
          value={filters.sort}
          onChange={(e) =>
            onChange({
              ...filters,
              sort: e.target.value as CatalogListFilterState["sort"],
            })
          }
          className="rounded-lg border border-border bg-white px-3 py-2 text-sm font-semibold text-navy focus:outline-none focus:ring-2 focus:ring-sam/30"
          aria-label="Sort products"
        >
          <option value="newest">Newest</option>
          <option value="price-asc">Price: low to high</option>
          <option value="price-desc">Price: high to low</option>
        </select>
      </div>
    </div>
  );
}
