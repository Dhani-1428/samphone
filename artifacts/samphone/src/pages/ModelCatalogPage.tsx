import { useEffect, useMemo, useState } from "react";
import { Link, useParams } from "wouter";
import { ArrowLeft, Loader2 } from "lucide-react";
import { useLang } from "@/contexts/LanguageContext";
import WooProductCard from "@/components/wc/WooProductCard";
import PageVideoHero from "@/components/PageVideoHero";
import type { WooProduct } from "@/lib/woocommerce";
import { fetchCloudProductsForModel } from "@/lib/samphone-cloud";
import {
  classifyModelProduct,
  modelSearchNames,
  productBelongsToModel,
  splitModelCatalog,
  typesWithCounts,
} from "@/lib/model-catalog";
import { useProductCatalog } from "@/contexts/ProductCatalogContext";
import { cn } from "@/lib/utils";

function parseModelName(slug: string): string {
  if (slug === "iphones") return "iPhones";
  if (slug === "ipad") return "iPad";
  if (slug === "iwatch") return "iWatch";
  if (slug.toLowerCase().startsWith("iphone-")) {
    return slug.replace(/-/g, " ").replace(/^iphone/i, "iPhone");
  }
  return slug.replace(/-/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
}

function ProductGrid({ items, empty, priceLabel }: { items: WooProduct[]; empty: string; priceLabel: string }) {
  if (items.length === 0) {
    return <p className="py-8 text-sm text-muted-foreground">{empty}</p>;
  }
  return (
    <ul className="grid list-none grid-cols-2 gap-3 p-0 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 md:gap-4">
      {items.map((p) => (
        <li key={p.cloudId || p.id}>
          <WooProductCard product={p} priceUnavailableLabel={priceLabel} />
        </li>
      ))}
    </ul>
  );
}

function TypeChips({
  allLabel,
  selected,
  onSelect,
  chips,
}: {
  allLabel: string;
  selected: string | null;
  onSelect: (id: string | null) => void;
  chips: { id: string; label: string; count: number }[];
}) {
  if (chips.length === 0) return null;
  return (
    <div className="mb-5 flex flex-wrap gap-x-5 gap-y-2 border-b border-black/[0.06]">
      <button
        type="button"
        onClick={() => onSelect(null)}
        className={cn(
          "border-b-2 pb-2 text-sm transition-colors",
          !selected ? "border-[#5A73A8] font-semibold text-navy" : "border-transparent text-muted-foreground hover:text-navy",
        )}
      >
        {allLabel}
      </button>
      {chips.map((c) => (
        <button
          key={c.id}
          type="button"
          onClick={() => onSelect(c.id)}
          className={cn(
            "border-b-2 pb-2 text-sm transition-colors",
            selected === c.id
              ? "border-[#5A73A8] font-semibold text-navy"
              : "border-transparent text-muted-foreground hover:text-navy",
          )}
        >
          {c.label}
        </button>
      ))}
    </div>
  );
}

export default function ModelCatalogPage() {
  const params = useParams<{ brand: string; family?: string; model: string }>();
  const brand = params.brand ?? "iphone";
  const family = params.family ?? params.model ?? "iphones";
  const model = params.family ? params.model : undefined;
  const { t } = useLang();
  const { products, loading: catalogLoading, error: catalogError } = useProductCatalog();
  const [remote, setRemote] = useState<WooProduct[] | null>(null);
  const [partType, setPartType] = useState<string | null>(null);
  const [accType, setAccType] = useState<string | null>(null);

  const modelLabel = model ? parseModelName(model) : null;

  useEffect(() => {
    setPartType(null);
    setAccType(null);
  }, [brand, model, family]);

  useEffect(() => {
    if (!model) {
      setRemote(null);
      return;
    }
    let alive = true;
    setRemote(null);
    const names = modelSearchNames(brand, model);
    void fetchCloudProductsForModel(names)
      .then((list) => {
        if (!alive) return;
        const strict = list.filter((p) => names.some((n) => productBelongsToModel(p, n)));
        setRemote(strict);
      })
      .catch(() => {
        if (alive) setRemote([]);
      });
    return () => {
      alive = false;
    };
  }, [brand, model]);

  const modelProducts = useMemo(() => {
    if (model) return remote ?? [];
    const familyLabel = parseModelName(family);
    const brandLabel = parseModelName(brand);
    return products.filter(
      (p) => productBelongsToModel(p, familyLabel) || productBelongsToModel(p, `${brandLabel} ${familyLabel}`),
    );
  }, [model, remote, products, brand, family]);

  const { parts, accessories } = useMemo(() => splitModelCatalog(modelProducts), [modelProducts]);
  const partChips = useMemo(() => typesWithCounts(parts, "part"), [parts]);
  const accChips = useMemo(() => typesWithCounts(accessories, "accessory"), [accessories]);

  const visibleParts = useMemo(
    () => (partType ? parts.filter((p) => classifyModelProduct(p).typeId === partType) : parts),
    [parts, partType],
  );
  const visibleAccessories = useMemo(
    () => (accType ? accessories.filter((p) => classifyModelProduct(p).typeId === accType) : accessories),
    [accessories, accType],
  );

  const brandName = parseModelName(brand);
  const familyName = parseModelName(family);
  const title = modelLabel ?? `${brandName} ${familyName}`;
  const loading = model ? remote == null : catalogLoading;
  const error = model ? null : catalogError;
  const priceLabel = t("woo_price_na");

  return (
    <div className="min-h-screen">
      <PageVideoHero
        eyebrow={modelLabel ? `Home / ${brandName} / ${modelLabel}` : `Home / ${brandName} / ${familyName}`}
        title={title}
        description={model ? t("model_page_hint") : t("model_accessories_hint")}
      />

      <div className="mx-auto w-full max-w-[1600px] px-5 py-8 sm:px-8 md:px-10 lg:px-14">
        <Link
          href="/"
          className="mb-7 inline-flex items-center gap-1.5 text-sm text-muted-foreground transition-colors hover:text-primary"
        >
          <ArrowLeft className="h-4 w-4" /> {t("backToHome")}
        </Link>

        {loading ? (
          <div className="flex flex-col items-center justify-center gap-3 py-20 text-muted-foreground">
            <Loader2 className="h-10 w-10 animate-spin text-primary" aria-hidden />
            <p className="text-sm font-medium">{t("woo_loading")}</p>
          </div>
        ) : null}

        {error && !loading ? <p className="py-8 text-sm text-destructive">{error}</p> : null}

        {!loading && !error ? (
          modelProducts.length === 0 ? (
            <p className="py-16 text-center text-sm text-muted-foreground">{t("woo_empty")}</p>
          ) : (
            <div className="space-y-10">
              {parts.length > 0 ? (
                <section>
                  <h2 className="mb-1 font-display text-xl font-bold text-foreground">{t("model_parts_title")}</h2>
                  <p className="mb-4 text-sm text-muted-foreground">{t("model_parts_hint")}</p>
                  <TypeChips allLabel={t("model_filter_all")} selected={partType} onSelect={setPartType} chips={partChips} />
                  <ProductGrid items={visibleParts} empty={t("woo_empty")} priceLabel={priceLabel} />
                </section>
              ) : null}
              {accessories.length > 0 ? (
                <section>
                  <h2 className="mb-1 font-display text-xl font-bold text-foreground">{t("model_accessories_section")}</h2>
                  <p className="mb-4 text-sm text-muted-foreground">{t("model_accessories_section_hint")}</p>
                  <TypeChips allLabel={t("model_filter_all")} selected={accType} onSelect={setAccType} chips={accChips} />
                  <ProductGrid items={visibleAccessories} empty={t("woo_empty")} priceLabel={priceLabel} />
                </section>
              ) : null}
            </div>
          )
        ) : null}
      </div>
    </div>
  );
}
