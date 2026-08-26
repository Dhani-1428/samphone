import { useEffect, useMemo, useState } from "react";
import { useParams, Link } from "wouter";
import { motion } from "framer-motion";
import { Loader2, SlidersHorizontal, ChevronDown, ChevronUp } from "lucide-react";
import WooProductCard from "@/components/wc/WooProductCard";
import { useProductCatalog } from "@/contexts/ProductCatalogContext";
import { useLang } from "@/contexts/LanguageContext";
import { hasWooCommerceConfig } from "@/config/woocommerce";
import { filterProductsByBrandKeyword, productSearchHaystack } from "@/lib/woo-product-filters";
import { CatalogTypeChip } from "@/components/CatalogPageChrome";
import type { WooProduct } from "@/lib/woocommerce";

const containerVariants = {
  hidden: { opacity: 0 },
  visible: { opacity: 1, transition: { staggerChildren: 0.06 } },
};
const itemVariants = {
  hidden: { opacity: 0, y: 20 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.4 } },
};

function toTitleCase(s: string) {
  return s.replace(/-/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
}

function getPrice(p: WooProduct): number {
  return parseFloat(p.price || p.regular_price || "0") || 0;
}

type FamilyChip = { id: string; label: string; test: (hay: string) => boolean };

function familiesForBrand(slug: string): FamilyChip[] {
  const key = slug.toLowerCase();
  if (key === "apple" || key === "iphone") {
    return [
      { id: "iphone", label: "iPhone", test: (h) => /\biphone\b/.test(h) },
      { id: "ipad", label: "iPad", test: (h) => /\bipad\b/.test(h) },
      { id: "watch", label: "Watch", test: (h) => /\b(iwatch|apple watch|watch series|watch se|watch ultra)\b/.test(h) },
      { id: "macbook", label: "MacBook", test: (h) => /\bmacbook\b/.test(h) },
      { id: "airpods", label: "AirPods", test: (h) => /\bairpods?\b/.test(h) },
    ];
  }
  if (key === "samsung") {
    return [
      { id: "galaxy-a", label: "Galaxy A", test: (h) => /\bgalaxy\s*a\d|\bsamsung\s*a\d/.test(h) },
      { id: "galaxy-s", label: "Galaxy S", test: (h) => /\bgalaxy\s*s\d|\bsamsung\s*s\d/.test(h) },
      { id: "galaxy-z", label: "Galaxy Z", test: (h) => /\bgalaxy\s*z|\bz\s*(fold|flip)/.test(h) },
      { id: "galaxy-m", label: "Galaxy M", test: (h) => /\bgalaxy\s*m\d/.test(h) },
      { id: "galaxy-note", label: "Note", test: (h) => /\bgalaxy\s*note\b/.test(h) },
      { id: "galaxy-tab", label: "Tab", test: (h) => /\bgalaxy\s*tab|\btab\s*[as]\d/.test(h) },
    ];
  }
  return [];
}

/* ── Sidebar filter panel ── */
interface Filters {
  minPrice: number | null;
  maxPrice: number | null;
  categories: Set<string>;
  inStock: boolean;
  onSale: boolean;
  family: string | null;
}

const EMPTY_FILTERS: Filters = {
  minPrice: null,
  maxPrice: null,
  categories: new Set(),
  inStock: false,
  onSale: false,
  family: null,
};

function FilterSection({
  title,
  children,
  defaultOpen = true,
}: {
  title: string;
  children: React.ReactNode;
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
      {open && <div className="mt-1 space-y-2">{children}</div>}
    </div>
  );
}

function Sidebar({
  filters,
  onChange,
  allProducts,
  families,
}: {
  filters: Filters;
  onChange: (f: Filters) => void;
  allProducts: WooProduct[];
  families: FamilyChip[];
}) {
  const categories = useMemo(() => {
    const map = new Map<string, string>();
    allProducts.forEach((p) =>
      (p.categories ?? []).forEach((c) => {
        if (!map.has(c.slug)) map.set(c.slug, c.name);
      }),
    );
    return [...map.entries()].sort((a, b) => a[1].localeCompare(b[1]));
  }, [allProducts]);

  const visibleFamilies = useMemo(
    () =>
      families.filter((f) =>
        allProducts.some((p) => f.test(productSearchHaystack(p))),
      ),
    [families, allProducts],
  );

  const prices = useMemo(
    () => allProducts.map(getPrice).filter((x) => x > 0),
    [allProducts],
  );
  const minAll = prices.length ? Math.floor(Math.min(...prices)) : 0;
  const maxAll = prices.length ? Math.ceil(Math.max(...prices)) : 9999;

  return (
    <aside className="w-full shrink-0 lg:w-60 xl:w-64">
      <div className="rounded-xl border border-black/[0.08] bg-white p-4 shadow-sm">
        <div className="mb-3 flex items-center justify-between">
          <span className="text-[15px] font-bold text-black">Filters</span>
          <button
            type="button"
            className="text-[12px] text-sam hover:underline"
            onClick={() => onChange({ ...EMPTY_FILTERS, categories: new Set() })}
          >
            Clear all
          </button>
        </div>

        {visibleFamilies.length > 0 && (
          <FilterSection title="Family">
            <div className="flex flex-wrap gap-2">
              <CatalogTypeChip
                active={filters.family == null}
                onClick={() => onChange({ ...filters, family: null })}
              >
                All
              </CatalogTypeChip>
              {visibleFamilies.map((f) => (
                <CatalogTypeChip
                  key={f.id}
                  active={filters.family === f.id}
                  onClick={() =>
                    onChange({
                      ...filters,
                      family: filters.family === f.id ? null : f.id,
                    })
                  }
                >
                  {f.label}
                </CatalogTypeChip>
              ))}
            </div>
          </FilterSection>
        )}

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
              placeholder={String(minAll)}
              value={filters.minPrice ?? ""}
              onChange={(e) =>
                onChange({
                  ...filters,
                  minPrice: e.target.value ? Number(e.target.value) : null,
                })
              }
              className="w-full rounded-md border border-black/[0.12] px-2 py-1.5 text-sm focus:outline-none focus:ring-1 focus:ring-sam"
            />
            <span className="text-muted-foreground">–</span>
            <input
              type="number"
              placeholder={String(maxAll)}
              value={filters.maxPrice ?? ""}
              onChange={(e) =>
                onChange({
                  ...filters,
                  maxPrice: e.target.value ? Number(e.target.value) : null,
                })
              }
              className="w-full rounded-md border border-black/[0.12] px-2 py-1.5 text-sm focus:outline-none focus:ring-1 focus:ring-sam"
            />
          </div>
        </FilterSection>

        {categories.length > 0 && (
          <FilterSection title="Category">
            <div className="max-h-52 space-y-1.5 overflow-y-auto pr-1">
              {categories.map(([slug, name]) => (
                <label key={slug} className="flex cursor-pointer items-center gap-2 text-sm">
                  <input
                    type="checkbox"
                    checked={filters.categories.has(slug)}
                    onChange={(e) => {
                      const next = new Set(filters.categories);
                      e.target.checked ? next.add(slug) : next.delete(slug);
                      onChange({ ...filters, categories: next });
                    }}
                    className="accent-sam"
                  />
                  <span className="leading-tight">{name}</span>
                </label>
              ))}
            </div>
          </FilterSection>
        )}
      </div>
    </aside>
  );
}

/* ── Sort bar ── */
type SortKey = "newest" | "price-asc" | "price-desc" | "name-asc";

function SortBar({
  sort,
  onSort,
  total,
}: {
  sort: SortKey;
  onSort: (s: SortKey) => void;
  total: number;
}) {
  return (
    <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
      <p className="text-sm text-muted-foreground">
        <strong className="font-semibold text-black">{total}</strong> products
      </p>
      <div className="flex items-center gap-2">
        <span className="text-sm text-muted-foreground">Sort:</span>
        <select
          value={sort}
          onChange={(e) => onSort(e.target.value as SortKey)}
          className="rounded-md border border-black/[0.12] bg-white px-2 py-1.5 text-sm focus:outline-none focus:ring-1 focus:ring-sam"
        >
          <option value="newest">Newest</option>
          <option value="price-asc">Price: low → high</option>
          <option value="price-desc">Price: high → low</option>
          <option value="name-asc">Name A–Z</option>
        </select>
      </div>
    </div>
  );
}

/* ── Main page ── */
export default function BrandPage() {
  const { slug } = useParams<{ slug: string }>();
  const brandLabel = toTitleCase(slug ?? "");
  const { t } = useLang();
  const woo = hasWooCommerceConfig();
  const { products, loading } = useProductCatalog();

  const [filters, setFilters] = useState<Filters>({
    ...EMPTY_FILTERS,
    categories: new Set(),
  });
  const [sort, setSort] = useState<SortKey>("newest");
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const families = useMemo(() => familiesForBrand(slug ?? ""), [slug]);

  useEffect(() => {
    setFilters({ ...EMPTY_FILTERS, categories: new Set() });
    setSort("newest");
  }, [slug]);

  // All products for this brand (unfiltered)
  const brandProducts = useMemo(
    () => (woo ? filterProductsByBrandKeyword(products, slug ?? brandLabel) : []),
    [woo, products, slug, brandLabel],
  );

  // Apply sidebar filters
  const filteredProducts = useMemo(() => {
    let list = brandProducts;

    if (filters.family) {
      const chip = families.find((f) => f.id === filters.family);
      if (chip) list = list.filter((p) => chip.test(productSearchHaystack(p)));
    }
    if (filters.inStock) list = list.filter((p) => p.stock_status === "instock");
    if (filters.onSale) list = list.filter((p) => p.on_sale);
    if (filters.minPrice != null)
      list = list.filter((p) => getPrice(p) >= (filters.minPrice ?? 0));
    if (filters.maxPrice != null)
      list = list.filter((p) => getPrice(p) <= (filters.maxPrice ?? Infinity));
    if (filters.categories.size > 0)
      list = list.filter((p) =>
        p.categories?.some((c) => filters.categories.has(c.slug)),
      );

    // Sort
    switch (sort) {
      case "price-asc":
        list = [...list].sort((a, b) => getPrice(a) - getPrice(b));
        break;
      case "price-desc":
        list = [...list].sort((a, b) => getPrice(b) - getPrice(a));
        break;
      case "name-asc":
        list = [...list].sort((a, b) => a.name.localeCompare(b.name));
        break;
      default:
        break;
    }

    return list;
  }, [brandProducts, filters, sort, families]);

  const activeFilterCount =
    (filters.inStock ? 1 : 0) +
    (filters.onSale ? 1 : 0) +
    (filters.minPrice != null ? 1 : 0) +
    (filters.maxPrice != null ? 1 : 0) +
    (filters.family ? 1 : 0) +
    filters.categories.size;

  return (
    <div className="min-h-screen bg-[#F4F6F8]">
      {/* Breadcrumb + hero */}
      <div className="bg-[#111111] py-8 text-white">
        <div className="mx-auto w-full max-w-[1600px] px-5 sm:px-8 md:px-10 lg:px-14 xl:px-16">
          <p className="mb-1 text-sm text-white/50">
            <Link href="/" className="hover:text-white/80">Home</Link>
            <span className="mx-1.5">/</span>
            {brandLabel}
          </p>
          <h1 className="text-3xl font-extrabold tracking-tight sm:text-4xl">
            {brandLabel}
          </h1>
          <p className="mt-1 text-sm text-white/60">
            {loading ? "Loading products…" : `${brandProducts.length} products found`}
          </p>
        </div>
      </div>

      <div className="mx-auto w-full max-w-[1600px] px-5 py-8 sm:px-8 md:px-10 lg:px-14 xl:px-16">
        {/* Mobile filter toggle */}
        <button
          type="button"
          className="mb-4 flex items-center gap-2 rounded-lg border border-black/[0.12] bg-white px-4 py-2 text-sm font-semibold lg:hidden"
          onClick={() => setSidebarOpen((v) => !v)}
        >
          <SlidersHorizontal className="h-4 w-4" />
          Filters
          {activeFilterCount > 0 && (
            <span className="ml-1 flex h-5 w-5 items-center justify-center rounded-full bg-sam text-[11px] text-white">
              {activeFilterCount}
            </span>
          )}
          {sidebarOpen ? <ChevronUp className="h-4 w-4 ml-auto" /> : <ChevronDown className="h-4 w-4 ml-auto" />}
        </button>

        {/* Mobile sidebar drawer */}
        {sidebarOpen && (
          <div className="mb-4 lg:hidden">
            <Sidebar
              filters={filters}
              onChange={setFilters}
              allProducts={brandProducts}
              families={families}
            />
          </div>
        )}

        <div className="flex gap-6">
          {/* Desktop sidebar */}
          <div className="hidden lg:block">
            <Sidebar
              filters={filters}
              onChange={setFilters}
              allProducts={brandProducts}
              families={families}
            />
          </div>

          {/* Products grid */}
          <div className="min-w-0 flex-1">
            <SortBar sort={sort} onSort={setSort} total={filteredProducts.length} />

            {loading && brandProducts.length === 0 ? (
              <div className="flex items-center justify-center py-24">
                <Loader2 className="h-8 w-8 animate-spin text-sam" />
              </div>
            ) : !woo ? (
              <p className="py-16 text-center text-muted-foreground">
                No store connected yet.
              </p>
            ) : filteredProducts.length === 0 ? (
              <div className="py-16 text-center">
                <p className="text-muted-foreground">No products match your filters.</p>
                <button
                  type="button"
                  className="mt-3 text-sm text-sam hover:underline"
                  onClick={() =>
                    setFilters({ ...EMPTY_FILTERS, categories: new Set() })
                  }
                >
                  Clear filters
                </button>
              </div>
            ) : (
              <motion.div
                variants={containerVariants}
                initial="hidden"
                animate="visible"
                className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-3 lg:grid-cols-3 xl:grid-cols-4"
              >
                {filteredProducts.map((p) => (
                  <motion.div key={p.id} variants={itemVariants}>
                    <WooProductCard product={p} priceUnavailableLabel={t("woo_price_na")} />
                  </motion.div>
                ))}
              </motion.div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
