import { useEffect, useMemo, useState, type InputHTMLAttributes } from "react";
import { useParams } from "wouter";
import { motion } from "framer-motion";
import { ChevronDown, ChevronUp, Search, Sparkles, Wrench } from "lucide-react";
import WooProductCard from "@/components/wc/WooProductCard";
import CatalogLoading from "@/components/CatalogLoading";
import { CatalogSectionHeading, CatalogTypeChip } from "@/components/CatalogPageChrome";
import { useProductCatalog } from "@/contexts/ProductCatalogContext";
import { useLang } from "@/contexts/LanguageContext";
import { useTranslatedText } from "@/hooks/useTranslatedText";
import TranslatedText from "@/components/TranslatedText";
import { useAuth } from "@/contexts/AuthContext";
import { hasWooCommerceConfig } from "@/config/woocommerce";
import {
  brandKeywordNeedles,
  filterProductsByBrandKeyword,
  productSearchHaystack,
  textMatchesSearchQuery,
} from "@/lib/woo-product-filters";
import type { WooProduct } from "@/lib/woocommerce";
import { fetchCloudProductsForModel, fetchCloudAllProducts } from "@/lib/samphone-cloud";
import { modelSearchNames, productBelongsToModel, splitModelCatalog } from "@/lib/model-catalog";
import { filterCatalogForCustomer, pricingAudience } from "@/lib/customer-price";
import {
  familiesForBrandSlug,
  familySearchQuery,
  type BrandNavFamily,
  type BrandNavModel,
} from "@/data/brand-nav-families";

const containerVariants = {
  hidden: { opacity: 0 },
  visible: { opacity: 1, transition: { staggerChildren: 0.04 } },
};
const itemVariants = {
  hidden: { opacity: 0, y: 16 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.35 } },
};

function toTitleCase(s: string) {
  return s.replace(/-/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
}

function getPrice(p: WooProduct): number {
  return parseFloat(p.price || p.regular_price || "0") || 0;
}

function productKey(p: WooProduct): string {
  return p.cloudId || `wc:${p.id}:${p.slug || p.name}`;
}

function mergeProducts(...lists: WooProduct[][]): WooProduct[] {
  const seen = new Set<string>();
  const out: WooProduct[] = [];
  for (const list of lists) {
    for (const p of list) {
      const key = productKey(p);
      if (seen.has(key)) continue;
      seen.add(key);
      out.push(p);
    }
  }
  return out;
}

function catalogBrandRoute(slug: string): string {
  const s = slug.toLowerCase();
  if (s === "apple" || s === "iphone") return "iphone";
  return s;
}

type Filters = {
  minPrice: number | null;
  maxPrice: number | null;
  inStock: boolean;
  onSale: boolean;
  family: string | null;
  model: string | null;
};

const EMPTY_FILTERS: Filters = {
  minPrice: null,
  maxPrice: null,
  inStock: false,
  onSale: false,
  family: null,
  model: null,
};

function modelsFromProducts(products: WooProduct[], family: BrandNavFamily | null): BrandNavModel[] {
  const counts = new Map<string, string>();
  for (const p of products) {
    const label = (p.modelLabel || p.specs?.Model || "").trim();
    if (!label) continue;
    if (family && !family.test(productSearchHaystack(p)) && !family.test(label.toLowerCase())) continue;
    if (/\b(cover|jelly|magsafe|glass|cable|charger|case|protector|tempered|holder)\b/i.test(label)) continue;
    const id = label.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "");
    if (!id) continue;
    if (!counts.has(id)) counts.set(id, label);
  }
  return [...counts.entries()]
    .map(([id, label]) => ({ id, label }))
    .sort((a, b) => a.label.localeCompare(b.label));
}

function Ph({ text, ...rest }: { text: string } & InputHTMLAttributes<HTMLInputElement>) {
  const placeholder = useTranslatedText(text);
  return <input {...rest} placeholder={placeholder} />;
}

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
  const heading = useTranslatedText(title);
  return (
    <div className="border-b border-black/[0.07] pb-4">
      <button
        type="button"
        className="flex w-full items-center justify-between py-3 text-[13px] font-bold uppercase tracking-wide text-black"
        onClick={() => setOpen((v) => !v)}
      >
        {heading}
        {open ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
      </button>
      {open && <div className="mt-1 space-y-2">{children}</div>}
    </div>
  );
}

function Sidebar({
  filters,
  onChange,
  families,
  models,
}: {
  filters: Filters;
  onChange: (f: Filters) => void;
  families: BrandNavFamily[];
  models: BrandNavModel[];
}) {
  const [modelQuery, setModelQuery] = useState("");
  const visibleModels = useMemo(() => {
    const q = modelQuery.trim().toLowerCase();
    if (!q) return models;
    return models.filter((m) => textMatchesSearchQuery(m.label, q));
  }, [models, modelQuery]);

  return (
    <div className="rounded-xl border border-black/[0.08] bg-white p-4 shadow-sm">
      <div className="mb-3 flex items-center justify-between">
        <span className="text-[15px] font-bold text-black">Filters</span>
        <button
          type="button"
          className="text-[12px] text-sam hover:underline"
          onClick={() => onChange({ ...EMPTY_FILTERS })}
        >
          Clear all
        </button>
      </div>

        {families.length > 0 && (
          <FilterSection title="Family">
            <div className="flex flex-wrap gap-2">
              <CatalogTypeChip
                active={filters.family == null}
                onClick={() => onChange({ ...filters, family: null, model: null })}
              >
                All
              </CatalogTypeChip>
              {families.map((f) => (
                <CatalogTypeChip
                  key={f.id}
                  active={filters.family === f.id}
                  onClick={() =>
                    onChange({
                      ...filters,
                      family: filters.family === f.id ? null : f.id,
                      model: null,
                    })
                  }
                >
                  {f.label}
                </CatalogTypeChip>
              ))}
            </div>
          </FilterSection>
        )}

        {models.length > 0 && (
          <FilterSection title="Model" defaultOpen>
            <label className="relative mb-2 block">
              <Search className="pointer-events-none absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-neutral-400" />
              <Ph
                type="search"
                text="Search models"
                value={modelQuery}
                onChange={(e) => setModelQuery(e.target.value)}
                className="w-full rounded-md border border-black/[0.12] py-1.5 pl-8 pr-2 text-sm focus:outline-none focus:ring-1 focus:ring-sam"
              />
            </label>
            <div className="mt-2 flex max-h-56 flex-col gap-1.5 overflow-y-auto pr-1">
              <label className="flex cursor-pointer items-center gap-2 rounded-lg border border-black/[0.08] bg-white px-3 py-1.5 text-sm">
                <input
                  type="radio"
                  name="brand-model"
                  checked={filters.model == null}
                  onChange={() => onChange({ ...filters, model: null })}
                  className="accent-sam"
                />
                <span><TranslatedText text="All models" /></span>
              </label>
              {visibleModels.map((m) => (
                <label key={m.id} className="flex cursor-pointer items-start gap-2 rounded-lg border border-black/[0.08] bg-white px-3 py-1.5 text-sm">
                  <input
                    type="radio"
                    name="brand-model"
                    checked={filters.model === m.id}
                    onChange={() => onChange({ ...filters, model: m.id })}
                    className="mt-0.5 accent-sam"
                  />
                  <span className="leading-snug">{m.label}</span>
                </label>
              ))}
            </div>
          </FilterSection>
        )}

        <FilterSection title="Availability">
          <div className="flex flex-wrap gap-4">
            <label className="flex cursor-pointer items-center gap-2 text-sm">
              <input
                type="checkbox"
                checked={filters.inStock}
                onChange={(e) => onChange({ ...filters, inStock: e.target.checked })}
                className="accent-sam"
              />
              <TranslatedText text="In stock only" />
            </label>
            <label className="flex cursor-pointer items-center gap-2 text-sm">
              <input
                type="checkbox"
                checked={filters.onSale}
                onChange={(e) => onChange({ ...filters, onSale: e.target.checked })}
                className="accent-sam"
              />
              <TranslatedText text="On sale" />
            </label>
          </div>
        </FilterSection>

        <FilterSection title="Price range">
          <div className="flex items-center gap-2">
            <Ph
              type="number"
              text="Min"
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
            <Ph
              type="number"
              text="Max"
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
    </div>
  );
}

type SortKey = "newest" | "price-asc" | "price-desc" | "name-asc";

function Opt({ value, text }: { value: string; text: string }) {
  const label = useTranslatedText(text);
  return <option value={value}>{label}</option>;
}

function SortBar({
  sort,
  onSort,
  total,
}: {
  sort: SortKey;
  onSort: (s: SortKey) => void;
  total: number;
}) {
  const { t } = useLang();
  return (
    <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
      <p className="text-sm text-muted-foreground">{t("accessory_product_count", { count: total })}</p>
      <div className="flex items-center gap-2">
        <span className="text-sm text-muted-foreground">
          <TranslatedText text="Sort:" />
        </span>
        <select
          value={sort}
          onChange={(e) => onSort(e.target.value as SortKey)}
          className="rounded-md border border-black/[0.12] bg-white px-2 py-1.5 text-sm focus:outline-none focus:ring-1 focus:ring-sam"
        >
          <Opt value="newest" text="Newest" />
          <Opt value="price-asc" text="Price: low → high" />
          <Opt value="price-desc" text="Price: high → low" />
          <Opt value="name-asc" text="Name A–Z" />
        </select>
      </div>
    </div>
  );
}

export default function BrandPage() {
  const { slug } = useParams<{ slug: string }>();
  const brandSlug = slug ?? "";
  const brandLabel = toTitleCase(brandSlug);
  const { t } = useLang();
  const { user } = useAuth();
  const audience = pricingAudience(user);
  const woo = hasWooCommerceConfig();
  const { products, loading, syncingMore } = useProductCatalog();

  const [filters, setFilters] = useState<Filters>({ ...EMPTY_FILTERS });
  const [sort, setSort] = useState<SortKey>("newest");
  const [remoteBrand, setRemoteBrand] = useState<WooProduct[]>([]);
  const [brandLoading, setBrandLoading] = useState(true);
  const [remoteModel, setRemoteModel] = useState<WooProduct[] | null>(null);
  const [modelLoading, setModelLoading] = useState(false);

  const families = useMemo(() => familiesForBrandSlug(brandSlug), [brandSlug]);
  const activeFamily = useMemo(
    () => families.find((f) => f.id === filters.family) ?? null,
    [families, filters.family],
  );
  const routeBrand = catalogBrandRoute(brandSlug);

  useEffect(() => {
    setFilters({ ...EMPTY_FILTERS });
    setSort("newest");
    setRemoteBrand([]);
    setRemoteModel(null);
    setBrandLoading(true);
  }, [brandSlug]);

  useEffect(() => {
    let alive = true;
    const needles = brandKeywordNeedles(brandSlug || brandLabel).slice(0, 5);
    if (!needles.length) {
      setBrandLoading(false);
      return;
    }
    setBrandLoading(true);
    void Promise.all(
      needles.map(async (q) => {
        try {
          return await fetchCloudAllProducts({ q }, 250, (items) => {
            if (!alive) return;
            setRemoteBrand((prev) =>
              filterProductsByBrandKeyword(mergeProducts(prev, items), brandSlug || brandLabel),
            );
          });
        } catch {
          return [] as WooProduct[];
        }
      }),
    )
      .then((lists) => {
        if (!alive) return;
        setRemoteBrand(filterProductsByBrandKeyword(mergeProducts(...lists), brandSlug || brandLabel));
      })
      .finally(() => {
        if (alive) setBrandLoading(false);
      });
    return () => {
      alive = false;
    };
  }, [brandSlug, brandLabel, audience]);

  useEffect(() => {
    if (!activeFamily || filters.model) return;
    let alive = true;
    const q = familySearchQuery(activeFamily);
    void fetchCloudAllProducts({ q })
      .then((items) => {
        if (!alive) return;
        setRemoteBrand((prev) =>
          filterProductsByBrandKeyword(mergeProducts(prev, items), brandSlug || brandLabel),
        );
      })
      .catch(() => {
        /* keep existing */
      });
    return () => {
      alive = false;
    };
  }, [activeFamily, filters.model, brandSlug, brandLabel, audience]);

  const selectedModel = useMemo(() => {
    if (!filters.model) return null;
    const fromFamily = (activeFamily?.models ?? []).find((m) => m.id === filters.model);
    if (fromFamily) return fromFamily;
    for (const family of families) {
      const hit = family.models.find((m) => m.id === filters.model);
      if (hit) return hit;
    }
    return { id: filters.model, label: filters.model.replace(/-/g, " ") };
  }, [filters.model, activeFamily, families]);

  useEffect(() => {
    if (!selectedModel) {
      setRemoteModel(null);
      setModelLoading(false);
      return;
    }
    let alive = true;
    setModelLoading(true);
    setRemoteModel(null);
    const names = modelSearchNames(routeBrand, selectedModel.label);
    void fetchCloudProductsForModel(names, routeBrand)
      .then((list) => {
        if (!alive) return;
        const strict = list.filter((p) => names.some((n) => productBelongsToModel(p, n, routeBrand)));
        setRemoteModel(strict.length ? strict : list);
      })
      .catch(() => {
        if (alive) setRemoteModel([]);
      })
      .finally(() => {
        if (alive) setModelLoading(false);
      });
    return () => {
      alive = false;
    };
  }, [selectedModel, routeBrand, audience]);

  const catalogBrandProducts = useMemo(
    () => (woo ? filterProductsByBrandKeyword(products, brandSlug || brandLabel) : []),
    [woo, products, brandSlug, brandLabel],
  );

  const brandProducts = useMemo(() => {
    const merged = mergeProducts(catalogBrandProducts, remoteBrand, remoteModel ?? []);
    return filterCatalogForCustomer(merged, user);
  }, [catalogBrandProducts, remoteBrand, remoteModel, user]);

  const models = useMemo(() => {
    const listed = activeFamily
      ? activeFamily.models.length
        ? activeFamily.models
        : modelsFromProducts(brandProducts, activeFamily)
      : families.some((f) => f.models.length > 0)
        ? families.flatMap((f) => f.models)
        : modelsFromProducts(brandProducts, null);
    return listed;
  }, [activeFamily, families, brandProducts]);

  const filteredProducts = useMemo(() => {
    let list = brandProducts;

    if (selectedModel) {
      const names = modelSearchNames(routeBrand, selectedModel.label);
      const byModel = list.filter(
        (p) =>
          names.some((n) => productBelongsToModel(p, n, routeBrand)) ||
          productBelongsToModel(p, selectedModel.label, routeBrand),
      );
      if (byModel.length > 0) list = byModel;
    } else if (activeFamily) {
      list = list.filter((p) => activeFamily.test(productSearchHaystack(p)));
    }
    if (filters.inStock) list = list.filter((p) => p.stock_status === "instock");
    if (filters.onSale) list = list.filter((p) => p.on_sale);
    if (filters.minPrice != null)
      list = list.filter((p) => getPrice(p) >= (filters.minPrice ?? 0));
    if (filters.maxPrice != null)
      list = list.filter((p) => getPrice(p) <= (filters.maxPrice ?? Infinity));

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
  }, [brandProducts, activeFamily, selectedModel, filters, sort, routeBrand]);

  const { parts: modelParts, accessories: modelAccessories } = useMemo(
    () => (selectedModel ? splitModelCatalog(filteredProducts) : { parts: [], accessories: [] }),
    [filteredProducts, selectedModel],
  );

  const waiting =
    filteredProducts.length === 0 &&
    (selectedModel ? modelLoading || brandLoading || loading : brandLoading || loading);

  return (
    <div className="min-h-screen bg-[#F4F6F8]">
      <div className="mx-auto w-full max-w-[1600px] px-5 py-8 sm:px-8 md:px-10 lg:px-14 xl:px-16">
        <div className="flex flex-col gap-6 lg:flex-row lg:items-start lg:gap-8">
          <aside className="w-full shrink-0 lg:sticky lg:top-24 lg:w-[280px]">
            <Sidebar
              filters={filters}
              onChange={setFilters}
              families={families}
              models={models}
            />
          </aside>

          <div className="min-w-0 flex-1">
        <SortBar sort={sort} onSort={setSort} total={filteredProducts.length} />

        {waiting ? (
          <CatalogLoading className="rounded-xl border border-black/[0.06] bg-white shadow-sm" />
        ) : !woo ? (
          <p className="py-16 text-center text-muted-foreground">
            <TranslatedText text="No store connected yet." />
          </p>
        ) : filteredProducts.length === 0 ? (
          <div className="py-16 text-center">
            <p className="text-muted-foreground"><TranslatedText text="No products match your filters." /></p>
            <button
              type="button"
              className="mt-3 text-sm text-sam hover:underline"
              onClick={() => setFilters({ ...EMPTY_FILTERS })}
            >
              <TranslatedText text="Clear filters" />
            </button>
          </div>
        ) : selectedModel ? (
          <div className="space-y-12">
            <section
              data-catalog-section="parts"
              className="rounded-2xl border border-black/[0.06] bg-white p-5 shadow-sm sm:p-6"
            >
              <p className="mb-2 text-[11px] font-bold uppercase tracking-[0.2em] text-sam">{t("model_parts_title")}</p>
              <CatalogSectionHeading icon={Wrench} title={t("model_parts_of")} highlight={selectedModel.label} />
              <p className="mb-4 -mt-2 text-sm font-semibold text-neutral-600">{t("model_parts_hint")}</p>
              {modelParts.length === 0 ? (
                modelLoading ? (
                  <CatalogLoading className="rounded-xl bg-white" />
                ) : (
                  <p className="py-8 text-sm text-muted-foreground">{t("woo_empty")}</p>
                )
              ) : (
                <>
                  <motion.div
                    variants={containerVariants}
                    initial="hidden"
                    animate="visible"
                    className="catalog-product-grid"
                  >
                    {modelParts.map((p) => (
                      <motion.div key={productKey(p)} variants={itemVariants}>
                        <WooProductCard product={p} priceUnavailableLabel={t("woo_price_na")} compact />
                      </motion.div>
                    ))}
                  </motion.div>
                </>
              )}
            </section>
            <section
              data-catalog-section="accessories"
              className="rounded-2xl border border-black/[0.06] bg-white p-5 shadow-sm sm:p-6"
            >
              <p className="mb-2 text-[11px] font-bold uppercase tracking-[0.2em] text-sam">
                {t("model_accessories_section")}
              </p>
              <CatalogSectionHeading
                icon={Sparkles}
                title={t("model_accessories_of")}
                highlight={selectedModel.label}
              />
              <p className="mb-4 -mt-2 text-sm font-semibold text-neutral-600">{t("model_accessories_section_hint")}</p>
              {modelAccessories.length === 0 ? (
                modelLoading ? (
                  <CatalogLoading className="rounded-xl bg-white" />
                ) : (
                  <p className="py-8 text-sm text-muted-foreground">{t("woo_empty")}</p>
                )
              ) : (
                <>
                  <motion.div
                    variants={containerVariants}
                    initial="hidden"
                    animate="visible"
                    className="catalog-product-grid"
                  >
                    {modelAccessories.map((p) => (
                      <motion.div key={productKey(p)} variants={itemVariants}>
                        <WooProductCard product={p} priceUnavailableLabel={t("woo_price_na")} compact />
                      </motion.div>
                    ))}
                  </motion.div>
                </>
              )}
            </section>
          </div>
        ) : (
          <>
            <motion.div
              variants={containerVariants}
              initial="hidden"
              animate="visible"
              className="catalog-product-grid"
            >
              {filteredProducts.map((p) => (
                <motion.div key={productKey(p)} variants={itemVariants}>
                  <WooProductCard product={p} priceUnavailableLabel={t("woo_price_na")} compact />
                </motion.div>
              ))}
            </motion.div>
          </>
        )}
          </div>
        </div>
      </div>
    </div>
  );
}
