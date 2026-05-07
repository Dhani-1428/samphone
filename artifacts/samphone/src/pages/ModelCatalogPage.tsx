import { useEffect, useMemo, useState } from "react";
import { Link, useParams } from "wouter";
import { ArrowLeft, Loader2 } from "lucide-react";
import { hasWooCommerceConfig } from "@/config/woocommerce";
import { useProductCatalog } from "@/contexts/ProductCatalogContext";
import { useLang, type TranslationKey } from "@/contexts/LanguageContext";
import WooProductCard from "@/components/wc/WooProductCard";
import PageVideoHero from "@/components/PageVideoHero";
import type { WooProduct } from "@/lib/woocommerce";
import {
  ACCESSORY_BUCKET_IDS,
  countProductsByAccessoryBucket,
  productMatchesAccessoryBucket,
  type AccessoryBucketId,
} from "@/lib/model-accessory-buckets";

const ACCESSORY_LABEL_KEYS: Record<Exclude<AccessoryBucketId, "all">, TranslationKey> = {
  cases: "model_acc_cases",
  chargers: "model_acc_chargers",
  screen_glass: "model_acc_screen_glass",
  camera_lens: "model_acc_camera_lens",
  cables: "model_acc_cables",
  audio: "model_acc_audio",
  batteries: "model_acc_batteries",
  screens_parts: "model_acc_screens_parts",
  other: "model_acc_other",
};

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
  if (familySlug === "reno-series") return /\breno\b|reno-series/i;
  if (familySlug === "find-x-series") return /\bfind\s*x\b|find-x-series/i;
  if (familySlug === "f-series") return /\bf\d{1,2}\b|f-series|oppo\s*f/i;
  if (familySlug === "p-series") return /\bpura\b|\bp\d{1,2}\b|p-series|huawei\s*p\s*smart/i;
  if (familySlug === "y-series") return /\by\d{1,2}\b|y-series|huawei\s*y/i;
  if (familySlug === "honor-series") return /\bhonor\b|honor-series|magic|view|x\d/i;
  if (familySlug === "mate-series") return /\bmate\b|mate-series/i;
  if (familySlug === "nova-series") return /\bnova\b|nova-series/i;
  if (familySlug === "oneplus-series") return /\boneplus\b|oneplus-series|one\s*plus/i;
  if (familySlug === "oneplus-nord-series") return /\bnord\b|oneplus-nord-series|one\s*plus\s*nord/i;
  if (familySlug === "motorola-series") return /\bmotorola\b|\bmoto\b|\bedge\b|\bg\d{1,3}\b|\be\d{1,2}\b|motorola-series/i;
  if (familySlug === "alcatel-series") return /\balcatel\b|alcatel-series|pixi|idol|one\s*touch|ot[-\s]?|pop/i;
  if (familySlug === "tcl-series") return /\btcl\b|tcl-series|nxtpaper|t\d{3,4}[a-z]?|n30/i;
  if (familySlug === "series") return /\brealme\s*\d|\b\d{1,2}\s*(pro|plus|5g|4g)\b/i;
  if (familySlug === "narzo-series") return /\bnarzo\b|narzo-series/i;
  if (familySlug === "c-series") return /\bc\d{1,2}\b|c-series|realme\s*c/i;
  return tokenRegexForModel(familySlug);
}

function brandRegex(brandSlug: string): RegExp {
  if (brandSlug === "iphone") return /\biphone\b|\bapple\b|\bipad\b|\bwatch\b/i;
  if (brandSlug === "samsung") return /\bsamsung\b|\bgalaxy\b/i;
  if (brandSlug === "xiaomi") return /\bxiaomi\b|\bredmi\b|\bpoco\b/i;
  if (brandSlug === "oppo" || brandSlug.startsWith("oppo-")) return /\boppo\b/i;
  if (brandSlug === "huawei" || brandSlug.startsWith("huawei-")) return /\bhuawei\b|\bhonor\b/i;
  if (brandSlug === "realme" || brandSlug.startsWith("realme-")) return /\brealme\b|\bnarzo\b/i;
  if (brandSlug === "one-plus" || brandSlug.startsWith("one-plus")) return /\boneplus\b|one\s*plus|\bnord\b/i;
  if (brandSlug === "motorola" || brandSlug.startsWith("motorola-")) return /\bmotorola\b|\bmoto\b/i;
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
  const [activeAccessory, setActiveAccessory] = useState<AccessoryBucketId>("all");

  const modelProducts = useMemo(
    () => products.filter((p) => matchesModelProduct(p, brand, family, model)),
    [products, brand, family, model],
  );

  useEffect(() => {
    setActiveCategory("all");
    setActiveAccessory("all");
  }, [brand, family, model]);

  useEffect(() => {
    setActiveCategory("all");
  }, [activeAccessory]);

  const accessoryCounts = useMemo(() => countProductsByAccessoryBucket(modelProducts), [modelProducts]);

  const categoryOptions = useMemo(() => {
    const map = new Map<string, { slug: string; label: string; count: number }>();
    for (const p of modelProducts) {
      if (!productMatchesAccessoryBucket(p, activeAccessory)) continue;
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
  }, [modelProducts, activeAccessory]);

  const afterAccessory = useMemo(
    () => modelProducts.filter((p) => productMatchesAccessoryBucket(p, activeAccessory)),
    [modelProducts, activeAccessory],
  );

  const visibleProducts = useMemo(() => {
    if (activeCategory === "all") return afterAccessory;
    return afterAccessory.filter((p) => p.categories?.some((c) => c.slug === activeCategory));
  }, [afterAccessory, activeCategory]);

  const brandName = parseModelName(brand);
  const familyName = parseModelName(family);
  const modelName = model ? parseModelName(model) : null;

  return (
    <div className="bg-background min-h-screen">
      <section className="bg-background border-b border-border">
        <PageVideoHero
          eyebrow={modelName ? `Home / ${brandName} / ${familyName} / ${modelName}` : `Home / ${brandName} / ${familyName}`}
          title={modelName ? `${brandName} ${modelName}` : `${brandName} ${familyName}`}
          description={configured ? t("model_accessories_hint") : "API catalog for selected model with category filters."}
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
          <div className="grid grid-cols-1 md:grid-cols-[minmax(260px,300px)_minmax(0,1fr)] gap-6">
            <aside className="rounded-2xl border border-border bg-card p-4 h-fit space-y-6">
              <div>
                <p className="text-xs font-semibold uppercase tracking-wide text-foreground/60 mb-1">
                  {t("model_accessories_title")}
                </p>
                <p className="text-[11px] text-muted-foreground mb-3">{t("model_accessories_hint")}</p>
                <button
                  type="button"
                  onClick={() => setActiveAccessory("all")}
                  className={`w-full text-left rounded-lg px-3 py-2 text-sm mb-1 ${
                    activeAccessory === "all"
                      ? "bg-primary/10 text-primary"
                      : "text-foreground/75 hover:bg-muted hover:text-foreground"
                  }`}
                >
                  {t("model_filter_all")} ({accessoryCounts.all})
                </button>
                <div className="space-y-1 max-h-[32vh] md:max-h-[28vh] overflow-auto pr-1">
                  {ACCESSORY_BUCKET_IDS.map((id) => {
                    const n = accessoryCounts[id];
                    if (n === 0) return null;
                    return (
                      <button
                        key={id}
                        type="button"
                        onClick={() => setActiveAccessory(id)}
                        className={`w-full flex items-center justify-between rounded-lg px-3 py-2 text-sm ${
                          activeAccessory === id
                            ? "bg-primary/10 text-primary"
                            : "text-foreground/75 hover:bg-muted hover:text-foreground"
                        }`}
                      >
                        <span className="truncate text-left">{t(ACCESSORY_LABEL_KEYS[id])}</span>
                        <span className="text-xs shrink-0 ml-1">{n}</span>
                      </button>
                    );
                  })}
                  {accessoryCounts.other > 0 && (
                    <button
                      type="button"
                      onClick={() => setActiveAccessory("other")}
                      className={`w-full flex items-center justify-between rounded-lg px-3 py-2 text-sm ${
                        activeAccessory === "other"
                          ? "bg-primary/10 text-primary"
                          : "text-foreground/75 hover:bg-muted hover:text-foreground"
                      }`}
                    >
                      <span className="truncate text-left">{t(ACCESSORY_LABEL_KEYS.other)}</span>
                      <span className="text-xs shrink-0 ml-1">{accessoryCounts.other}</span>
                    </button>
                  )}
                </div>
              </div>

              <div className="border-t border-border pt-4">
                <p className="text-xs font-semibold uppercase tracking-wide text-foreground/60 mb-3">
                  {t("model_categories_title")}
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
                  {t("model_filter_all")} ({afterAccessory.length})
                </button>
                <div className="space-y-1 max-h-[28vh] overflow-auto pr-1">
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
                      <span className="text-xs shrink-0 ml-1">{c.count}</span>
                    </button>
                  ))}
                </div>
              </div>
            </aside>

            <section>
              {visibleProducts.length === 0 ? (
                <p className="py-16 text-center text-sm text-muted-foreground">{t("woo_empty")}</p>
              ) : (
                <ul className="grid list-none grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3 md:gap-4 lg:gap-5 p-0">
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
