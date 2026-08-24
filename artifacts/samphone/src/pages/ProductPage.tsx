import type { ReactNode } from "react";
import { ArrowLeft, Star, GitCompare, Heart } from "lucide-react";
import { Link, useLocation } from "wouter";
import { useEffect, useMemo, useState } from "react";
import { resolveCatalogProduct } from "@/data/catalog";
import ProductCartControls from "@/components/ProductCartControls";
import GuestPriceGate from "@/components/GuestPriceGate";
import { useAuth } from "@/contexts/AuthContext";
import { useLang } from "@/contexts/LanguageContext";
import { useRecentlyViewed } from "@/contexts/RecentlyViewedContext";
import { useCompare } from "@/contexts/CompareContext";
import { useWishlist } from "@/contexts/WishlistContext";
import { buildProductGallery, productSupports360View } from "@/data/product-media";
import { hasCompareSpecs } from "@/data/device-specs";
import ProductImageGallery from "@/components/product/ProductImageGallery";
import CatalogImage from "@/components/CatalogImage";
import Product360Viewer from "@/components/product/Product360Viewer";
import StockBadge from "@/components/StockBadge";
import DeliveryEstimator from "@/components/DeliveryEstimator";
import PeopleAlsoBought from "@/components/PeopleAlsoBought";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { fetchProductById, getDisplayPrice, type WooProduct } from "@/lib/woocommerce";
import { getWooProductDescriptionHtml } from "@/lib/woo-product-html";
import { useProductCatalog } from "@/contexts/ProductCatalogContext";
import WooRelatedAccessoriesSlider from "@/components/wc/WooRelatedAccessoriesSlider";
import { getStockLevel } from "@/data/inventory";
import { cn } from "@/lib/utils";

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
  New: "bg-[#5A73A8] text-white",
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
  const { toggle: wishToggle, has: wishHas } = useWishlist();
  const { products: wooCatalogProducts } = useProductCatalog();

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
    const descHtml = getWooProductDescriptionHtml(wooProduct);
    const primaryCat = wooProduct.categories?.[0];
    const stock = cartKey ? getStockLevel(cartKey) : { count: 0, isLow: true };
    const categoryIds = (wooProduct.categories ?? []).map((c) => c.id);

    const specRows: { label: string; value: ReactNode }[] = [];
    const attrs = (wooProduct.attributes ?? []).filter(
      (a) => a.visible !== false && a.name && Array.isArray(a.options) && a.options.length > 0,
    );
    for (const a of attrs) {
      specRows.push({ label: a.name, value: a.options.join(", ") });
    }
    if (wooProduct.sku?.trim()) {
      specRows.push({ label: t("woo_sku"), value: wooProduct.sku.trim() });
    }
    if (wooProduct.categories?.length) {
      specRows.push({
        label: t("woo_categories_label"),
        value: (
          <>
            {wooProduct.categories.map((c, i) => (
              <span key={c.id}>
                {i > 0 ? " · " : null}
                <Link href={`/category/${c.slug}`} className="text-primary hover:underline">
                  {c.name}
                </Link>
              </span>
            ))}
          </>
        ),
      });
    }
    if (specRows.length === 0 && primaryCat) {
      specRows.push({ label: t("woo_product_type"), value: primaryCat.name });
    }

    return (
      <div className="min-h-screen">
        <div className="container mx-auto max-w-[1400px] px-4 py-6 md:px-6 md:py-8">
          <Link
            href="/"
            className="mb-6 inline-flex items-center gap-1.5 text-sm text-muted-foreground transition-colors hover:text-primary md:mb-8"
          >
            <ArrowLeft className="h-4 w-4" /> {t("backToShopping")}
          </Link>

          <div className="grid gap-8 lg:grid-cols-12 lg:gap-10 xl:gap-12">
            {/* Gallery */}
            <div className="lg:col-span-5">
              {gallery.length === 0 ? (
                <div className="flex aspect-square items-center justify-center rounded-2xl border border-border bg-muted text-sm text-muted-foreground">
                  —
                </div>
              ) : gallery.length === 2 ? (
                <div className="grid grid-cols-2 gap-3">
                  {gallery.map((src, i) => (
                    <div
                      key={src}
                      className="relative aspect-square overflow-hidden rounded-2xl border border-border bg-muted"
                    >
                      <CatalogImage
                        src={src}
                        alt=""
                        className="h-full w-full object-contain p-3"
                        loading={i === 0 ? "eager" : "lazy"}
                      />
                    </div>
                  ))}
                </div>
              ) : (
                <ProductImageGallery images={gallery} productName={wooProduct.name} />
              )}
            </div>

            {/* Details + specs */}
            <div className="flex flex-col lg:col-span-4">
              <h1 className="font-display text-2xl font-bold leading-tight tracking-tight text-foreground md:text-3xl lg:text-4xl">
                {wooProduct.name}
              </h1>
              {primaryCat && (
                <span className="mt-3 inline-flex w-fit rounded-full bg-primary/10 px-3 py-1 text-xs font-semibold text-primary">
                  {primaryCat.name}
                </span>
              )}

              {cartKey && (
                <div className="mt-4 flex flex-wrap gap-2">
                  <Button
                    type="button"
                    variant={has(cartKey) ? "secondary" : "outline"}
                    size="sm"
                    className="gap-2"
                    onClick={() => toggle(cartKey)}
                  >
                    <GitCompare className="h-4 w-4" />
                    {has(cartKey) ? t("compare_remove") : t("compare_add")}
                  </Button>
                  {compareKeys.length >= 2 && (
                    <Button type="button" size="sm" asChild>
                      <Link href="/compare">{t("compare_view")}</Link>
                    </Button>
                  )}
                  <Button
                    type="button"
                    variant={wishHas(cartKey) ? "secondary" : "outline"}
                    size="sm"
                    className="gap-2"
                    onClick={() => wishToggle(cartKey)}
                  >
                    <Heart className={`h-4 w-4 ${wishHas(cartKey) ? "fill-red-500 text-red-500" : ""}`} />
                    {wishHas(cartKey) ? t("wishlist_remove") : t("wishlist_save")}
                  </Button>
                </div>
              )}

              <h2 className="mt-8 text-sm font-semibold uppercase tracking-wide text-foreground/70">
                {t("product_details_title")}
              </h2>
              {specRows.length > 0 && (
                <div className="mt-3 overflow-hidden rounded-xl border border-border">
                  <table className="w-full text-sm">
                    <tbody>
                      {specRows.map((row, idx) => (
                        <tr key={`${idx}-${row.label}`} className="border-b border-border last:border-0">
                          <th className="w-[40%] bg-muted/40 px-4 py-3 text-left font-semibold text-foreground">
                            {row.label}
                          </th>
                          <td className="px-4 py-3 text-foreground/90">{row.value}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}

              {primaryCat && (
                <div className="mt-8">
                  <h3 className="text-sm font-semibold text-foreground">{t("product_compatibility")}</h3>
                  <Link
                    href={`/category/${primaryCat.slug}`}
                    className="mt-1 inline-block text-sm font-medium text-primary hover:underline"
                  >
                    {primaryCat.name}
                  </Link>
                </div>
              )}
            </div>

            {/* Purchase card */}
            <div className="lg:col-span-3">
              <div className="lg:sticky lg:top-24 space-y-5 rounded-2xl border border-border bg-card p-5 shadow-sm md:p-6">
                {user ? (
                  displayPrice ? (
                    <p className="font-display text-3xl font-bold tabular-nums text-foreground md:text-4xl">
                      €{Number(displayPrice).toFixed(2)}
                    </p>
                  ) : (
                    <p className="text-muted-foreground">{t("woo_price_na")}</p>
                  )
                ) : (
                  <GuestPriceGate variant="hero" />
                )}

                <div
                  className={cn(
                    "inline-flex items-center gap-2 rounded-full px-3 py-1.5 text-xs font-semibold",
                    stock.isLow
                      ? "border border-amber-500/40 bg-amber-50 text-amber-800"
                      : "bg-[#E8F0FF] text-[#5A73A8]",
                  )}
                >
                  <span className={cn("h-2 w-2 shrink-0 rounded-full", stock.isLow ? "bg-amber-500" : "bg-[#5A73A8]")} />
                  {stock.isLow ? t("stock_low", { count: stock.count }) : t("product_in_stock")}
                </div>

                <div className="rounded-xl bg-[#F4F6F8] p-4 text-sm text-navy">
                  <DeliveryEstimator />
                </div>

                {cartKey && (
                  <div className="pt-1">
                    <ProductCartControls cartKey={cartKey} size="md" />
                  </div>
                )}
              </div>
            </div>
          </div>

          {descHtml && (
            <section className="mt-12 border-t border-border pt-10 md:mt-16 md:pt-12" aria-labelledby="woo-desc-heading">
              <h2 id="woo-desc-heading" className="font-display text-2xl font-bold text-foreground md:text-3xl">
                {t("product_description_title")}
              </h2>
              <div
                className="prose prose-neutral dark:prose-invert mt-6 max-w-none text-foreground/90 prose-headings:font-display prose-a:text-primary prose-img:rounded-xl"
                dangerouslySetInnerHTML={{ __html: descHtml }}
              />
            </section>
          )}

          <WooRelatedAccessoriesSlider
            currentProductId={wooProduct.id}
            categoryIds={categoryIds}
            products={wooCatalogProducts}
            priceUnavailableLabel={t("woo_price_na")}
          />
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
    <div className="min-h-screen">
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

            {(canCompare || cartKey) && (
              <div className="mb-6 flex flex-wrap gap-2">
                {canCompare && (
                  <>
                    <Button
                      type="button"
                      variant={has(cartKey) ? "secondary" : "outline"}
                      size="sm"
                      className="gap-2"
                      onClick={() => toggle(cartKey)}
                    >
                      <GitCompare className="h-4 w-4" />
                      {has(cartKey) ? t("compare_remove") : t("compare_add")}
                    </Button>
                    {compareKeys.length >= 2 && (
                      <Button type="button" size="sm" asChild>
                        <Link href="/compare">{t("compare_view")}</Link>
                      </Button>
                    )}
                  </>
                )}
                <Button
                  type="button"
                  variant={wishHas(cartKey) ? "secondary" : "outline"}
                  size="sm"
                  className="gap-2"
                  onClick={() => wishToggle(cartKey)}
                >
                  <Heart className={`h-4 w-4 ${wishHas(cartKey) ? "fill-red-500 text-red-500" : ""}`} />
                  {wishHas(cartKey) ? t("wishlist_remove") : t("wishlist_save")}
                </Button>
                <Button type="button" variant="outline" size="sm" asChild>
                  <Link href="/wishlist">{t("wishlist_page_title")}</Link>
                </Button>
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
