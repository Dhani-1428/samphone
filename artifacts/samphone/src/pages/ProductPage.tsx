import { ArrowLeft, Star, GitCompare } from "lucide-react";
import { Link, useLocation } from "wouter";
import { useEffect, useMemo, useState } from "react";
import { resolveCatalogProduct } from "@/data/catalog";
import ProductCartControls from "@/components/ProductCartControls";
import GuestPriceGate from "@/components/GuestPriceGate";
import { useAuth } from "@/contexts/AuthContext";
import { useLang } from "@/contexts/LanguageContext";
import { useRecentlyViewed } from "@/contexts/RecentlyViewedContext";
import { useCompare } from "@/contexts/CompareContext";
import { buildProductGallery, productSupports360View } from "@/data/product-media";
import { hasCompareSpecs } from "@/data/device-specs";
import ProductImageGallery from "@/components/product/ProductImageGallery";
import Product360Viewer from "@/components/product/Product360Viewer";
import StockBadge from "@/components/StockBadge";
import DeliveryEstimator from "@/components/DeliveryEstimator";
import PeopleAlsoBought from "@/components/PeopleAlsoBought";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { fetchProductById, getDisplayPrice, type WooProduct } from "@/lib/woocommerce";

function parseProductCartKey(pathname: string): string | null {
  const segs = pathname.split("/").filter(Boolean);
  if (segs[0] !== "product") return null;
  if (segs[1] === "cat" && segs.length >= 4) {
    const slug = segs[2];
    const id = segs[3];
    return `cat:${slug}:${id}`;
  }
  if (segs.length === 3) {
    return `${segs[1]}:${segs[2]}`;
  }
  return null;
}

const badgeColors: Record<string, string> = {
  Bestseller: "bg-amber-500 text-white",
  New: "bg-emerald-500 text-white",
  Sale: "bg-red-500 text-white",
  Hot: "bg-orange-500 text-white",
};

function normalizePathname(location: string): string {
  const base = import.meta.env.BASE_URL.replace(/\/$/, "");
  if (!base) return location;
  return location.startsWith(base) ? location.slice(base.length) || "/" : location;
}

export default function ProductPage() {
  const [location] = useLocation();
  const { user } = useAuth();
  const { t } = useLang();
  const { recordView } = useRecentlyViewed();
  const { toggle, has, keys: compareKeys } = useCompare();

  const cartKey = parseProductCartKey(normalizePathname(location));
  const product = cartKey ? resolveCatalogProduct(cartKey) : null;
  const isWooProduct = cartKey?.startsWith("woo:") ?? false;
  const wooId = useMemo(() => {
    if (!isWooProduct || !cartKey) return null;
    const raw = cartKey.split(":")[1];
    const id = Number(raw);
    return Number.isFinite(id) && id > 0 ? id : null;
  }, [cartKey, isWooProduct]);
  const [wooProduct, setWooProduct] = useState<WooProduct | null>(null);
  const [wooLoading, setWooLoading] = useState(false);

  useEffect(() => {
    if (cartKey) recordView(cartKey);
  }, [cartKey, recordView]);

  useEffect(() => {
    if (!wooId) {
      setWooProduct(null);
      return;
    }
    let alive = true;
    setWooLoading(true);
    void fetchProductById(wooId)
      .then((p) => {
        if (!alive) return;
        setWooProduct(p);
      })
      .finally(() => {
        if (alive) setWooLoading(false);
      });
    return () => {
      alive = false;
    };
  }, [wooId]);

  if (isWooProduct) {
    if (wooLoading) {
      return (
        <div className="container mx-auto px-4 py-20 text-center">
          <p className="text-muted-foreground">{t("woo_loading")}</p>
        </div>
      );
    }
    if (!wooProduct) {
      return (
        <div className="container mx-auto px-4 py-20 text-center">
          <p className="text-muted-foreground mb-4">{t("productNotFound")}</p>
          <Link href="/" className="text-primary font-medium hover:underline">
            {t("backToHome")}
          </Link>
        </div>
      );
    }
    const gallery = (wooProduct.images ?? [])
      .map((img) => img.src)
      .filter((src): src is string => Boolean(src));
    const displayPrice = getDisplayPrice(wooProduct);
    return (
      <div className="bg-background min-h-screen">
        <div className="container mx-auto px-4 md:px-6 py-8">
          <Link
            href="/"
            className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-primary transition-colors mb-8"
          >
            <ArrowLeft className="w-4 h-4" /> {t("backToShopping")}
          </Link>
          <div className="grid md:grid-cols-2 gap-10 lg:gap-14">
            <ProductImageGallery images={gallery} productName={wooProduct.name} />
            <div className="flex flex-col">
              <h1 className="text-3xl md:text-4xl font-display font-bold text-foreground mb-4">{wooProduct.name}</h1>
              {wooProduct.categories?.length > 0 && (
                <p className="text-sm text-muted-foreground mb-4">
                  {wooProduct.categories.map((c) => c.name).join(" • ")}
                </p>
              )}
              {user ? (
                <div className="flex items-baseline gap-3 mb-8">
                  {displayPrice ? (
                    <span className="font-display font-bold text-3xl text-foreground">
                      €{Number(displayPrice).toFixed(2)}
                    </span>
                  ) : (
                    <span className="text-muted-foreground">Price not available</span>
                  )}
                </div>
              ) : (
                <GuestPriceGate variant="hero" />
              )}
              <div className="mt-6 max-w-md rounded-xl border border-border bg-card/80 p-4 shadow-sm">
                <DeliveryEstimator />
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (!product || !cartKey) {
    return (
      <div className="container mx-auto px-4 py-20 text-center">
        <p className="text-muted-foreground mb-4">{t("productNotFound")}</p>
        <Link href="/" className="text-primary font-medium hover:underline">
          {t("backToHome")}
        </Link>
      </div>
    );
  }

  const { name, subtitle, price, oldPrice, rating, reviews, img, badge } = product;
  const gallery = buildProductGallery(img);
  const show360 = productSupports360View(cartKey, name);
  const canCompare = hasCompareSpecs(cartKey);
  const badgeChipClass = badge ? badgeColors[badge] ?? "bg-gray-500 text-white" : "";

  return (
    <div className="bg-background min-h-screen">
      <div className="container mx-auto px-4 md:px-6 py-8">
        <Link
          href="/"
          className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-primary transition-colors mb-8"
        >
          <ArrowLeft className="w-4 h-4" /> {t("backToShopping")}
        </Link>

        <div className="grid md:grid-cols-2 gap-10 lg:gap-14">
          <div>
            {show360 ? (
              <Tabs defaultValue="gallery" className="w-full">
                <TabsList className="grid w-full grid-cols-2 mb-4 h-10">
                  <TabsTrigger value="gallery">{t("product_gallery_tab")}</TabsTrigger>
                  <TabsTrigger value="360">{t("product360_tab")}</TabsTrigger>
                </TabsList>
                <TabsContent value="gallery" className="mt-0">
                  <ProductImageGallery
                    images={gallery}
                    productName={name}
                    badge={badge ?? undefined}
                    badgeClassName={badgeChipClass}
                  />
                </TabsContent>
                <TabsContent value="360" className="mt-0">
                  <Product360Viewer imageSrc={img} productName={name} />
                </TabsContent>
              </Tabs>
            ) : (
              <ProductImageGallery
                images={gallery}
                productName={name}
                badge={badge ?? undefined}
                badgeClassName={badgeChipClass}
              />
            )}
          </div>

          <div className="flex flex-col">
            {subtitle && <p className="text-sm text-muted-foreground mb-2">{subtitle}</p>}
            <h1 className="text-3xl md:text-4xl font-display font-bold text-foreground mb-4">{name}</h1>
            <StockBadge cartKey={cartKey} className="mb-4" />

            <div className="flex items-center gap-1 mb-4">
              {Array.from({ length: 5 }).map((_, i) => (
                <Star
                  key={i}
                  className={`w-5 h-5 ${i < Math.floor(rating) ? "fill-amber-400 text-amber-400" : "text-muted"}`}
                />
              ))}
              <span className="text-sm text-muted-foreground ml-2">
                {rating} ({reviews} {t("reviewsLabel")})
              </span>
            </div>

            {canCompare && (
              <div className="flex flex-wrap gap-2 mb-6">
                <Button
                  type="button"
                  variant={has(cartKey) ? "secondary" : "outline"}
                  size="sm"
                  className="gap-2"
                  onClick={() => toggle(cartKey)}
                >
                  <GitCompare className="w-4 h-4" />
                  {has(cartKey) ? t("compare_remove") : t("compare_add")}
                </Button>
                {compareKeys.length >= 2 && (
                  <Button type="button" size="sm" asChild>
                    <Link href="/compare">{t("compare_view")}</Link>
                  </Button>
                )}
              </div>
            )}

            {user ? (
              <>
                <div className="flex items-baseline gap-3 mb-8">
                  <span className="font-display font-bold text-3xl text-foreground">€{price.toFixed(2)}</span>
                  {oldPrice != null && (
                    <span className="text-lg text-muted-foreground line-through">€{oldPrice.toFixed(2)}</span>
                  )}
                </div>
                <div className="max-w-md">
                  <ProductCartControls cartKey={cartKey} size="md" />
                </div>
                <div className="mt-6 max-w-md rounded-xl border border-border bg-card/80 p-4 shadow-sm">
                  <DeliveryEstimator />
                </div>
              </>
            ) : (
              <>
                <GuestPriceGate variant="hero" />
                <div className="mt-6 max-w-md rounded-xl border border-border bg-card/80 p-4 shadow-sm">
                  <DeliveryEstimator />
                </div>
              </>
            )}
          </div>
        </div>

        <PeopleAlsoBought cartKey={cartKey} />
      </div>
    </div>
  );
}
