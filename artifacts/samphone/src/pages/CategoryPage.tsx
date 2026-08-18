import { useEffect, useMemo, useState } from "react";
import { motion } from "framer-motion";
import { ArrowLeft, Loader2, AlertCircle } from "lucide-react";
import { Link, useParams } from "wouter";
import { allSlugs } from "@/data/categories";
import ProductCard from "@/components/ProductCard";
import WooProductCard from "@/components/wc/WooProductCard";
import productCase from "@/assets/product-case.png";
import productCharger from "@/assets/product-charger.png";
import productScreen from "@/assets/product-screen.png";
import { hasWooCommerceConfig } from "@/config/woocommerce";
import { useProductCatalog } from "@/contexts/ProductCatalogContext";
import {
  fetchCategoryBySlug,
  fetchProductsByCategory,
  WooCommerceFetchError,
  type WooProduct,
} from "@/lib/woocommerce";
import { useLang } from "@/contexts/LanguageContext";
import { Button } from "@/components/ui/button";
import PageVideoHero from "@/components/PageVideoHero";

const imgPool = [productCase, productCharger, productScreen];

function generateProducts(slug: string, label: string) {
  const seed = slug.split("").reduce((a, c) => a + c.charCodeAt(0), 0);
  return Array.from({ length: 8 }, (_, i) => ({
    id: i + 1,
    cartKey: `cat:${slug}:${i + 1}`,
    name: `${label} — ${["Model A", "Pro Edition", "Ultra Slim", "Heavy Duty", "Standard", "Premium", "Compact", "Deluxe"][i]}`,
    subtitle: label,
    price: parseFloat((((seed + i * 7) % 80) + 5.99).toFixed(2)),
    oldPrice: i % 3 === 0 ? parseFloat((((seed + i * 7) % 80) + 15.99).toFixed(2)) : null,
    rating: parseFloat((4.5 + ((i * 0.1) % 0.5)).toFixed(1)),
    reviews: ((seed + i * 13) % 300) + 10,
    img: imgPool[(seed + i) % 3],
    badge: i === 0 ? "Bestseller" : i === 2 ? "New" : i === 5 ? "Sale" : null,
  }));
}

const containerVariants = { hidden: { opacity: 0 }, visible: { opacity: 1, transition: { staggerChildren: 0.06 } } };
const cardVariants = { hidden: { opacity: 0, y: 30 }, visible: { opacity: 1, y: 0, transition: { duration: 0.4 } } };

function humanizeSlug(slug: string) {
  return slug.replace(/-/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
}

function parseSyntheticBrandCategory(slug: string): { kind: "accessories" | "chargers" | "screens"; brandSlug: string } | null {
  const m = slug.match(/^(accessories|chargers|screens)-(.+)$/);
  if (!m) return null;
  const kind = m[1] as "accessories" | "chargers" | "screens";
  const brandSlug = m[2];
  if (!brandSlug) return null;
  return { kind, brandSlug };
}

function filterSyntheticProducts(products: WooProduct[], parsed: { kind: "accessories" | "chargers" | "screens"; brandSlug: string }): WooProduct[] {
  const baseBrand = parsed.brandSlug.replace(/-parts$/i, "").trim();
  const brandTokens = baseBrand.split("-").filter(Boolean);
  const kindPatterns: Record<string, RegExp> = {
    accessories: /(accessor|case|cover|glass|protector|lens|housing|back cover|frame|wallet)/i,
    chargers: /(charg|cable|usb|adapter|power|magsafe|pd\b|qc\b)/i,
    screens: /(screen|display|lcd|oled|digitizer|touch)/i,
  };
  const kindRe = kindPatterns[parsed.kind];

  return products.filter((p) => {
    const hay = `${p.name} ${p.categories?.map((c) => `${c.name} ${c.slug}`).join(" ") ?? ""}`.toLowerCase();
    const brandOk = brandTokens.every((t) => hay.includes(t.toLowerCase()));
    if (!brandOk) return false;
    return kindRe.test(hay);
  });
}

export default function CategoryPage() {
  const params = useParams<{ slug: string }>();
  const slug = params.slug ?? "";
  const { t, lang } = useLang();
  const configured = hasWooCommerceConfig();
  const { products, categories, loading: catalogLoading, error: catalogError, refreshNow } = useProductCatalog();
  const synthetic = parseSyntheticBrandCategory(slug);

  const fromCatalog = useMemo(
    () =>
      synthetic
        ? filterSyntheticProducts(products, synthetic)
        : products.filter((p) => p.categories?.some((c) => c.slug === slug)),
    [products, slug, synthetic],
  );

  const [remote, setRemote] = useState<{ loading: boolean; items: WooProduct[] | null }>({
    loading: false,
    items: null,
  });

  useEffect(() => {
    setRemote({ loading: false, items: null });
  }, [slug]);

  useEffect(() => {
    if (!configured || catalogLoading) return;
    if (fromCatalog.length > 0) return;
    if (synthetic) {
      setRemote({ loading: false, items: [] });
      return;
    }

    let alive = true;
    setRemote({ loading: true, items: null });

    (async () => {
      try {
        const cat = await fetchCategoryBySlug(slug);
        if (!alive) return;
        if (!cat) {
          setRemote({ loading: false, items: [] });
          return;
        }
        const list = await fetchProductsByCategory(cat.id);
        if (alive) setRemote({ loading: false, items: list });
      } catch (e) {
        if (!alive) return;
        const msg = e instanceof WooCommerceFetchError ? e.message : "Request failed";
        setRemote({ loading: false, items: [] });
        console.warn("[CategoryPage]", msg); // network / CORS / invalid slug
      }
    })();

    return () => {
      alive = false;
    };
  }, [configured, catalogLoading, slug, fromCatalog.length, synthetic]);

  const wooList: WooProduct[] = fromCatalog.length > 0 ? fromCatalog : remote.items ?? [];
  const wooLoading =
    configured && (catalogLoading || (fromCatalog.length === 0 && remote.loading && remote.items === null));

  const wooMeta = categories.find((c) => c.slug === slug);
  const staticMeta = allSlugs[slug];
  const parentFromWoo =
    wooMeta && wooMeta.parent ? categories.find((p) => p.id === wooMeta.parent)?.name : undefined;

  const syntheticBrandName = synthetic ? humanizeSlug(synthetic.brandSlug.replace(/-parts$/i, "")) : null;
  const syntheticLabel =
    synthetic && syntheticBrandName
      ? `${syntheticBrandName} ${humanizeSlug(synthetic.kind)}`
      : null;
  const label = syntheticLabel ?? wooMeta?.name ?? staticMeta?.label ?? humanizeSlug(slug);
  const parent = syntheticBrandName ?? parentFromWoo ?? staticMeta?.parent ?? "Shop";

  const useMock = !configured && Boolean(staticMeta);
  const mockProducts = useMock ? generateProducts(slug, label) : [];

  const showWooGrid = configured && wooList.length > 0;
  const showWooEmpty =
    configured && !wooLoading && !catalogError && wooList.length === 0;
  const showNotFound = !configured && !staticMeta && !wooLoading;

  return (
    <div className="min-h-screen">
      <PageVideoHero
        eyebrow={`Home / ${parent}`}
        title={label}
        description={
          showWooGrid
            ? `${wooList.length} products`
            : useMock
              ? `${mockProducts.length} products available`
              : ""
        }
      />

      <div className="mx-auto w-full max-w-[1600px] px-5 py-8 sm:px-8 md:px-10 lg:px-14">
        <Link
          href="/"
          className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-primary transition-colors mb-7"
        >
          <ArrowLeft className="w-4 h-4" /> Back to Home
        </Link>

        {configured && catalogError && (
          <div className="mb-8 flex max-w-lg flex-col gap-3 rounded-2xl border border-destructive/30 bg-destructive/5 p-5" role="alert">
            <div className="flex items-center gap-2 text-destructive">
              <AlertCircle className="h-5 w-5 shrink-0" />
              <p className="text-sm font-medium">{t("woo_error")}</p>
            </div>
            <p className="text-xs text-muted-foreground">{catalogError}</p>
            <Button type="button" variant="outline" size="sm" className="w-fit" onClick={() => void refreshNow({ silent: true })}>
              {t("woo_retry")}
            </Button>
          </div>
        )}

        {wooLoading && (
          <div className="flex flex-col items-center justify-center gap-3 py-20 text-muted-foreground">
            <Loader2 className="h-10 w-10 animate-spin text-primary" aria-hidden />
            <p className="text-sm font-medium">{t("woo_loading")}</p>
          </div>
        )}

        {!wooLoading && showWooGrid && (
          <motion.ul
            variants={containerVariants}
            initial="hidden"
            animate="visible"
            className="grid list-none grid-cols-2 gap-4 p-0 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 md:gap-5"
          >
            {wooList.map((p) => (
              <motion.li key={p.id} variants={cardVariants}>
                <WooProductCard product={p} priceUnavailableLabel={t("woo_price_na")} />
              </motion.li>
            ))}
          </motion.ul>
        )}

        {!wooLoading && showWooEmpty && (
          <p className="py-16 text-center text-sm text-muted-foreground">
            {lang === "pt"
              ? "Sem produtos nesta categoria na loja."
              : "No products are listed in this category on the store yet."}
          </p>
        )}

        {!wooLoading && showNotFound && (
          <p className="py-16 text-center text-sm text-muted-foreground">
            {lang === "pt" ? "Categoria não encontrada." : "Category not found."}
          </p>
        )}

        {useMock && (
          <motion.div
            variants={containerVariants}
            initial="hidden"
            animate="visible"
            className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4 md:gap-5"
          >
            {mockProducts.map((p) => (
              <motion.div key={p.id} variants={cardVariants}>
                <ProductCard {...p} testPrefix="cat" />
              </motion.div>
            ))}
          </motion.div>
        )}
      </div>
    </div>
  );
}
