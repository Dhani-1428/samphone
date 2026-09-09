import { useEffect, useMemo, useState } from "react";
import { useParams } from "wouter";
import type { LucideIcon } from "lucide-react";
import {
  Aperture,
  Battery,
  Camera,
  Cable,
  CreditCard,
  Fingerprint,
  LayoutGrid,
  Radio,
  Shield,
  Smartphone,
  Sparkles,
  Volume2,
  Vibrate,
  Wrench,
} from "lucide-react";
import { useLang } from "@/contexts/LanguageContext";
import WooProductCard from "@/components/wc/WooProductCard";
import ModelHeroBanner from "@/components/ModelHeroBanner";
import { CatalogBackLink, CatalogSectionHeading, CatalogTypeChip } from "@/components/CatalogPageChrome";
import CatalogLoading from "@/components/CatalogLoading";
import type { WooProduct } from "@/lib/woocommerce";
import { fetchCloudProductsForModel } from "@/lib/samphone-cloud";
import {
  classifyModelProduct,
  displayBrandName,
  modelSearchNames,
  productBelongsToModel,
  splitModelCatalog,
  typesWithCounts,
} from "@/lib/model-catalog";
import { useProductCatalog } from "@/contexts/ProductCatalogContext";
import { useAuth } from "@/contexts/AuthContext";
import { filterCatalogForCustomer, pricingAudience } from "@/lib/customer-price";

function parseModelName(slug: string): string {
  if (slug === "iphones") return "iPhones";
  if (slug === "ipad") return "iPad";
  if (slug === "iwatch") return "Apple Watch";
  const titled = slug
    .replace(/-/g, " ")
    .replace(/\s+/g, " ")
    .trim()
    .replace(/\b([a-z])/g, (c) => c.toUpperCase());
  return titled
    .replace(/\bIphone\b/g, "iPhone")
    .replace(/\bIpad\b/g, "iPad")
    .replace(/\bIwatch\b/g, "Apple Watch")
    .replace(/\bMacbook\b/g, "MacBook")
    .replace(/\bMatepad\b/g, "MatePad")
    .replace(/\bSe\b/g, "SE")
    .replace(/\bLg\b/g, "LG")
    .replace(/\bTcl\b/g, "TCL");
}

function typeChipIcon(id: string): LucideIcon {
  switch (id) {
    case "screen":
      return Smartphone;
    case "battery":
      return Battery;
    case "back-glass":
    case "back-cover":
    case "housing":
    case "jelly":
    case "antishock":
    case "flip":
    case "ring":
    case "magsafe":
    case "design":
      return Smartphone;
    case "front-cam":
    case "rear-cam":
      return Camera;
    case "cam-lens":
    case "lens-3in1":
      return Aperture;
    case "charging-flex":
    case "main-flex":
    case "side-buttons":
    case "charger":
    case "cable":
      return Cable;
    case "earphones":
      return Volume2;
    case "speaker":
      return Volume2;
    case "fingerprint":
      return Fingerprint;
    case "vibrator":
      return Vibrate;
    case "sim-tray":
    case "sim-reader":
      return CreditCard;
    case "antenna":
      return Radio;
    case "full-glue":
    case "privacy":
    case "normal-glass":
    case "curved-full-glue":
    case "watch-glass":
      return Shield;
    case "other-accessories":
      return Sparkles;
    default:
      return LayoutGrid;
  }
}

function ProductGrid({ items, empty, priceLabel }: { items: WooProduct[]; empty: string; priceLabel: string }) {
  if (items.length === 0) {
    return <p className="py-8 text-sm text-muted-foreground">{empty}</p>;
  }
  return (
    <ul className="catalog-product-grid">
      {items.map((p) => (
        <li key={p.cloudId || p.id}>
          <WooProductCard product={p} priceUnavailableLabel={priceLabel} compact />
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
  const items: { id: string | null; label: string; Icon: LucideIcon }[] = [
    { id: null, label: allLabel, Icon: LayoutGrid },
    ...chips.map((c) => ({ id: c.id, label: c.label, Icon: typeChipIcon(c.id) })),
  ];
  return (
    <div className="mb-4 flex flex-wrap gap-2">
      {items.map((c) => {
        const active = selected === c.id;
        const Icon = c.Icon;
        return (
          <CatalogTypeChip
            key={c.id ?? "all"}
            active={active}
            onClick={() => onSelect(c.id)}
            icon={Icon}
          >
            {c.label}
          </CatalogTypeChip>
        );
      })}
    </div>
  );
}

function SectionHeading({
  icon,
  title,
  highlight,
}: {
  icon: LucideIcon;
  title: string;
  highlight: string;
}) {
  return <CatalogSectionHeading icon={icon} title={title} highlight={highlight} />;
}

export default function ModelCatalogPage() {
  const params = useParams<{ brand: string; family?: string; model: string }>();
  const brand = params.brand ?? "iphone";
  const family = params.family ?? params.model ?? "iphones";
  const model = params.family ? params.model : undefined;
  const { t } = useLang();
  const { user } = useAuth();
  const audience = pricingAudience(user);
  const { products, loading: catalogLoading, error: catalogError } = useProductCatalog();
  const [remote, setRemote] = useState<WooProduct[] | null>(null);
  const [modelFetching, setModelFetching] = useState(() => Boolean(params.family && params.model));
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
      setModelFetching(false);
      return;
    }
    let alive = true;
    setRemote(null);
    setModelFetching(true);
    const names = modelSearchNames(brand, model);
    const belongs = (p: WooProduct) =>
      names.some((n) => productBelongsToModel(p, n, brand)) || productBelongsToModel(p, parseModelName(model), brand);
    void fetchCloudProductsForModel(names, brand)
      .then((list) => {
        if (!alive) return;
        const strict = list.filter(belongs);
        setRemote(strict.length > 0 ? strict : list);
      })
      .catch(() => {
        if (alive) setRemote([]);
      })
      .finally(() => {
        if (alive) setModelFetching(false);
      });
    return () => {
      alive = false;
    };
  }, [brand, model, audience]);

  const modelProducts = useMemo(() => {
    const raw = (() => {
      const familyLabel = parseModelName(family);
      const brandLabel = displayBrandName(brand);
      if (model) {
        const names = modelSearchNames(brand, model);
        const label = parseModelName(model);
        const belongs = (p: WooProduct) =>
          names.some((n) => productBelongsToModel(p, n, brand)) || productBelongsToModel(p, label, brand);
        const remoteList = remote ?? [];
        const remoteKeys = new Set(remoteList.map((p) => String(p.cloudId || p.id)));
        const seen = new Set<string>();
        const out: WooProduct[] = [];
        for (const p of [...remoteList, ...products.filter(belongs)]) {
          const key = String(p.cloudId || p.id);
          if (seen.has(key)) continue;
          seen.add(key);
          if (remoteKeys.has(key) || belongs(p)) out.push(p);
        }
        return out;
      }
      return products.filter(
        (p) =>
          productBelongsToModel(p, familyLabel, brand) ||
          productBelongsToModel(p, `${brandLabel} ${familyLabel}`, brand),
      );
    })();
    return filterCatalogForCustomer(raw, user);
  }, [model, remote, products, brand, family, user]);

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

  const brandName = displayBrandName(brand);
  const familyName = parseModelName(family);
  const title = modelLabel ?? `${brandName} ${familyName}`;
  const crumbBrand =
    brand === "iphone" && /^(ipad|iwatch|macbook)/i.test(family) ? "Apple" : brandName;
  const loading = model
    ? modelFetching && modelProducts.length === 0 && (remote == null || remote.length === 0)
    : catalogLoading && modelProducts.length === 0;
  const error = model ? null : catalogError;
  const priceLabel = t("woo_price_na");

  return (
    <div className="min-h-screen bg-[#F4F6F8]">
      <div className="mx-auto w-full max-w-[1600px] px-5 py-8 sm:px-8 md:px-10 lg:px-14">
        <ModelHeroBanner
          crumbs={[t("breadcrumb_home"), crumbBrand, title]}
          title={title}
          description={model ? t("model_page_hint") : t("model_accessories_hint")}
        />

        <CatalogBackLink />

        {loading && modelProducts.length === 0 ? (
          <CatalogLoading className="mb-8 rounded-xl border border-black/[0.06] bg-white shadow-sm" />
        ) : null}

        {error ? <p className="py-8 text-sm text-destructive">{error}</p> : null}

        {!error ? (
          <div className="space-y-12">
            <section
              data-catalog-section="parts"
              className="rounded-2xl border border-black/[0.06] bg-white p-5 shadow-sm sm:p-6"
            >
              <p className="mb-2 text-[11px] font-bold uppercase tracking-[0.2em] text-sam">{t("model_parts_title")}</p>
              <SectionHeading icon={Wrench} title={t("model_parts_of")} highlight={title} />
              <p className="mb-4 -mt-2 text-sm font-semibold text-neutral-600">{t("model_parts_hint")}</p>
              <TypeChips
                allLabel={t("model_filter_all")}
                selected={partType}
                onSelect={setPartType}
                chips={partChips}
              />
              <ProductGrid items={visibleParts} empty={t("woo_empty")} priceLabel={priceLabel} />
            </section>
            <section
              data-catalog-section="accessories"
              className="rounded-2xl border border-black/[0.06] bg-white p-5 shadow-sm sm:p-6"
            >
              <p className="mb-2 text-[11px] font-bold uppercase tracking-[0.2em] text-sam">
                {t("model_accessories_section")}
              </p>
              <SectionHeading icon={Sparkles} title={t("model_accessories_of")} highlight={title} />
              <p className="mb-4 -mt-2 text-sm font-semibold text-neutral-600">{t("model_accessories_section_hint")}</p>
              <TypeChips
                allLabel={t("model_filter_all")}
                selected={accType}
                onSelect={setAccType}
                chips={accChips}
              />
              <ProductGrid items={visibleAccessories} empty={t("woo_empty")} priceLabel={priceLabel} />
            </section>
          </div>
        ) : null}
      </div>
    </div>
  );
}
