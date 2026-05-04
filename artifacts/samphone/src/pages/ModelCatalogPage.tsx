import { useMemo, useState } from "react";
import { Link, useParams } from "wouter";
import { ArrowLeft, Loader2 } from "lucide-react";
import { hasWooCommerceConfig } from "@/config/woocommerce";
import { useProductCatalog } from "@/contexts/ProductCatalogContext";
import { useLang } from "@/contexts/LanguageContext";
import WooProductCard from "@/components/wc/WooProductCard";
import PageVideoHero from "@/components/PageVideoHero";
import type { WooProduct } from "@/lib/woocommerce";

function tokenRegexForModel(modelSlug: string): RegExp {
  if (modelSlug === "iphones") return /\biphone\b/i;
  if (modelSlug === "ipad") return /\bipad\b/i;
  if (modelSlug === "iwatch") return /\bwatch\b|apple\s*watch|iwatch/i;
  const token = modelSlug.replace(/-/g, "\\s*");
  return new RegExp(token, "i");
}

function tokenRegexForFamily(familySlug: string): RegExp {
  if (familySlug === "iphones") return /\biphone\b/i;
  if (familySlug === "ipad") return /\bipad\b/i;
  if (familySlug === "iwatch") return /\bwatch\b|apple\s*watch|iwatch/i;
  if (familySlug === "a-series") return /\ba\d{1,2}\b|a-series|galaxy\s*a/i;
  if (familySlug === "s-series") return /\bs\d{1,2}\b|s-series|galaxy\s*s|ultra/i;
  if (familySlug === "z-series") return /\bz\s*fold\b|\bz\s*flip\b|\bfold\b|\bflip\b|z-series/i;
  if (familySlug === "m-series") return /\bm\d{1,2}\b|m-series|galaxy\s*m/i;
  if (familySlug === "j-series") return /\bj\d{1,2}\b|j-series|galaxy\s*j/i;
  if (familySlug === "note-series") return /\bnote\b|note-series|galaxy\s*note/i;
  if (familySlug === "redmi-series") return /\bredmi\b|\bredmi\s*a\b|redmi-series/i;
  if (familySlug === "poco-series") return /\bpoco\b|poco-series/i;
  if (familySlug === "redmi-note-series") return /\bredmi\s*note\b|redmi-note-series/i;
  if (familySlug === "mi-series") return /\bmi\b|\bxiaomi\s+\d|mi-series|xiaomi\s+mi/i;
  return tokenRegexForModel(familySlug);
}

function brandRegex(brandSlug: string): RegExp {
  if (brandSlug === "iphone") return /\biphone\b|\bapple\b|\bipad\b|\bwatch\b/i;
  if (brandSlug === "samsung") return /\bsamsung\b|\bgalaxy\b/i;
  if (brandSlug === "xiaomi") return /\bxiaomi\b|\bredmi\b|\bpoco\b/i;
  const token = brandSlug.replace(/-/g, "\\s*");
  return new RegExp(token, "i");
}

function parseModelName(slug: string): string {
  if (slug === "iphones") return "iPhones";
  if (slug === "ipad") return "iPad";
  if (slug === "iwatch") return "iWatch";
  return slug.replace(/-/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
}

function matchesModelProduct(
  p: WooProduct,
  brandSlug: string,
  familySlug: string,
  modelSlug?: string,
): boolean {
  const hay = `${p.name} ${p.categories?.map((c) => `${c.name} ${c.slug}`).join(" ") ?? ""}`;
  if (!brandRegex(brandSlug).test(hay)) return false;
  if (!tokenRegexForFamily(familySlug).test(hay)) return false;
  if (modelSlug) {
    return tokenRegexForModel(modelSlug).test(hay);
  }
  return true;
}

export default function ModelCatalogPage() {
  const params = useParams<{ brand: string; family?: string; model: string }>();
  const brand = params.brand ?? "iphone";
  const family = params.family ?? params.model ?? "iphones";
  const model = params.family ? params.model : undefined;
  const { t, lang } = useLang();
  const configured = hasWooCommerceConfig();
  const { products, loading, error } = useProductCatalog();
  const [activeCategory, setActiveCategory] = useState<string>("all");

  const modelProducts = useMemo(
    () => products.filter((p) => matchesModelProduct(p, brand, family, model)),
    [products, brand, family, model],
  );

  const categoryOptions = useMemo(() => {
    const map = new Map<string, { slug: string; label: string; count: number }>();
    for (const p of modelProducts) {
      for (const c of p.categories ?? []) {
        const prev = map.get(c.slug);
        if (prev) {
          prev.count += 1;
        } else {
          map.set(c.slug, { slug: c.slug, label: c.name, count: 1 });
        }
      }
    }
    return [...map.values()].sort((a, b) => b.count - a.count || a.label.localeCompare(b.label));
  }, [modelProducts]);

  const visibleProducts = useMemo(() => {
    if (activeCategory === "all") return modelProducts;
    return modelProducts.filter((p) => p.categories?.some((c) => c.slug === activeCategory));
  }, [modelProducts, activeCategory]);

  const brandName = parseModelName(brand);
  const familyName = parseModelName(family);
  const modelName = model ? parseModelName(model) : null;

  return (
    <div className="bg-background min-h-screen">
      <section className="bg-background border-b border-border">
        <PageVideoHero
          eyebrow={modelName ? `Home / ${brandName} / ${familyName} / ${modelName}` : `Home / ${brandName} / ${familyName}`}
          title={modelName ? `${brandName} ${modelName}` : `${brandName} ${familyName}`}
          description="API catalog for selected model with category filters."
        />
      </section>

      <div className="container mx-auto px-4 md:px-6 py-8">
        <Link
          href="/"
          className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-primary transition-colors mb-7"
        >
          <ArrowLeft className="w-4 h-4" /> Back to Home
        </Link>

        {!configured && (
          <p className="text-sm text-muted-foreground py-8">
            {lang === "pt"
              ? "Configure as chaves WooCommerce para carregar produtos da API."
              : "Configure WooCommerce API keys to load products."}
          </p>
        )}

        {configured && loading && (
          <div className="flex flex-col items-center justify-center gap-3 py-20 text-muted-foreground">
            <Loader2 className="h-10 w-10 animate-spin text-primary" aria-hidden />
            <p className="text-sm font-medium">{t("woo_loading")}</p>
          </div>
        )}

        {configured && !loading && error && (
          <p className="text-sm text-destructive py-8">{error}</p>
        )}

        {configured && !loading && !error && (
          <div className="grid grid-cols-1 md:grid-cols-[260px_minmax(0,1fr)] gap-6">
            <aside className="rounded-2xl border border-border bg-card p-4 h-fit">
              <p className="text-xs font-semibold uppercase tracking-wide text-foreground/60 mb-3">
                {lang === "pt" ? "Categorias" : "Categories"}
              </p>
              <button
                type="button"
                onClick={() => setActiveCategory("all")}
                className={`w-full text-left rounded-lg px-3 py-2 text-sm mb-1 ${
                  activeCategory === "all"
                    ? "bg-primary/10 text-primary"
                    : "text-foreground/75 hover:bg-muted hover:text-foreground"
                }`}
              >
                {lang === "pt" ? "Todos" : "All"} ({modelProducts.length})
              </button>
              <div className="space-y-1 max-h-[60vh] overflow-auto pr-1">
                {categoryOptions.map((c) => (
                  <button
                    key={c.slug}
                    type="button"
                    onClick={() => setActiveCategory(c.slug)}
                    className={`w-full flex items-center justify-between rounded-lg px-3 py-2 text-sm ${
                      activeCategory === c.slug
                        ? "bg-primary/10 text-primary"
                        : "text-foreground/75 hover:bg-muted hover:text-foreground"
                    }`}
                  >
                    <span className="truncate">{c.label}</span>
                    <span className="text-xs">{c.count}</span>
                  </button>
                ))}
              </div>
            </aside>

            <section>
              {visibleProducts.length === 0 ? (
                <p className="py-16 text-center text-sm text-muted-foreground">{t("woo_empty")}</p>
              ) : (
                <ul className="grid list-none grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-5 p-0">
                  {visibleProducts.map((p) => (
                    <li key={p.id}>
                      <WooProductCard product={p} priceUnavailableLabel={t("woo_price_na")} />
                    </li>
                  ))}
                </ul>
              )}
            </section>
          </div>
        )}
      </div>
    </div>
  );
}
