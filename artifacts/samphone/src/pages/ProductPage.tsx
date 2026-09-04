import type { ReactNode } from "react";
import { Link, useLocation } from "wouter";
import { useEffect, useMemo, useState } from "react";
import CatalogLoading from "@/components/CatalogLoading";
import { resolveCatalogProduct } from "@/data/catalog";
import { useAuth } from "@/contexts/AuthContext";
import { useLang } from "@/contexts/LanguageContext";
import { useRecentlyViewed } from "@/contexts/RecentlyViewedContext";
import { useProductCatalog } from "@/contexts/ProductCatalogContext";
import { useCustomerProductPrice } from "@/contexts/CustomerPricingContext";
import { buildProductGallery, productSupports360View } from "@/data/product-media";
import { Button } from "@/components/ui/button";
import { fetchProductById, fetchRelatedProducts, type WooProduct } from "@/lib/woocommerce";
import { catalogCompareAtPrice, seesWholesalePrices } from "@/lib/customer-price";
import { notifyStock } from "@/lib/samphone-cloud";
import { buildProductCopy } from "@/lib/product-copy";
import ColorSwatches from "@/components/wc/ColorSwatches";
import WooRelatedAccessoriesSlider from "@/components/wc/WooRelatedAccessoriesSlider";
import PeopleAlsoBought from "@/components/PeopleAlsoBought";
import ProductDetailLayout from "@/components/product/ProductDetailLayout";
import type { ProductCrumb } from "@/components/product/ProductDetailLayout";
import Product360Viewer from "@/components/product/Product360Viewer";

function parseProductCartKey(pathname: string): string | null {
  const segs = pathname.split("/").filter(Boolean);
  if (segs[0] !== "product") return null;
  if (segs[1] === "cat" && segs.length >= 4) return `cat:${segs[2]}:${segs[3]}`;
  if (segs.length === 3) return `${segs[1]}:${segs[2]}`;
  return null;
}

function normalizePathname(location: string): string {
  const base = import.meta.env.BASE_URL.replace(/\/$/, "");
  if (!base) return location;
  return location.startsWith(base) ? location.slice(base.length) || "/" : location;
}

function formatEuro(value: string | number | null | undefined): string | null {
  if (value == null || value === "") return null;
  const n = typeof value === "number" ? value : Number.parseFloat(value);
  if (!Number.isFinite(n) || n <= 0) return null;
  return new Intl.NumberFormat("pt-PT", { style: "currency", currency: "EUR" }).format(n);
}

function groupHref(group?: string | null): string | undefined {
  const g = (group ?? "").toLowerCase();
  if (!g) return undefined;
  if (g.includes("accessor")) return "/accessories";
  if (g.includes("repair") || g.includes("tool") || g.includes("ferrament")) return "/tools";
  if (g.includes("phone part") || g.includes("smartphone")) return "/smartphones";
  if (g.includes("card")) return "/cards";
  if (g.includes("hoco")) return "/group/Hoco";
  return undefined;
}

export default function ProductPage() {
  const [location] = useLocation();
  const { user } = useAuth();
  const { t, lang } = useLang();
  const { recordView } = useRecentlyViewed();
  const { products: wooCatalogProducts } = useProductCatalog();

  const cartKey = parseProductCartKey(normalizePathname(location));
  const product = cartKey ? resolveCatalogProduct(cartKey) : null;
  const isWooProduct = cartKey?.startsWith("woo:") ?? false;
  const wooId = useMemo(() => {
    if (!isWooProduct || !cartKey) return null;
    const id = Number(cartKey.split(":")[1]);
    return Number.isFinite(id) && id > 0 ? id : null;
  }, [cartKey, isWooProduct]);
  const [wooProduct, setWooProduct] = useState<WooProduct | null>(null);
  const [wooLoading, setWooLoading] = useState(() => Boolean(isWooProduct));
  const [related, setRelated] = useState<WooProduct[]>([]);
  const [notifyEmail, setNotifyEmail] = useState("");
  const [notifyMsg, setNotifyMsg] = useState<string | null>(null);
  const [colorIdx, setColorIdx] = useState(0);

  useEffect(() => {
    if (cartKey) recordView(cartKey);
  }, [cartKey, recordView]);

  useEffect(() => {
    if (!wooId) {
      setWooProduct(null);
      setWooLoading(false);
      return;
    }
    let alive = true;
    setWooLoading(true);
    setWooProduct(null);
    void fetchProductById(wooId)
      .then((p) => {
        if (!alive) return;
        setWooProduct(p);
        setColorIdx(0);
        if (p?.cloudId) {
          void fetchRelatedProducts(p.cloudId).then((rows) => {
            if (alive) setRelated(rows);
          });
        }
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
      return <CatalogLoading />;
    }
    if (!wooProduct || !cartKey) {
      return (
        <div className="container mx-auto px-4 py-20 text-center">
          <p className="mb-4 text-muted-foreground">{t("productNotFound")}</p>
          <Link href="/" className="font-medium text-primary hover:underline">
            {t("backToHome")}
          </Link>
        </div>
      );
    }
    return (
      <WooProductView
        cartKey={cartKey}
        wooProduct={wooProduct}
        related={related}
        catalog={wooCatalogProducts}
        colorIdx={colorIdx}
        setColorIdx={setColorIdx}
        notifyEmail={notifyEmail}
        setNotifyEmail={setNotifyEmail}
        notifyMsg={notifyMsg}
        setNotifyMsg={setNotifyMsg}
        userEmail={user?.email}
      />
    );
  }

  if (!product || !cartKey) {
    return (
      <div className="container mx-auto px-4 py-20 text-center">
        <p className="mb-4 text-muted-foreground">{t("productNotFound")}</p>
        <Link href="/" className="font-medium text-primary hover:underline">
          {t("backToHome")}
        </Link>
      </div>
    );
  }

  const copy = buildProductCopy(
    {
      name: product.name,
      brand: product.brand || product.subtitle,
      partType: product.subtitle,
      specs: { Condition: t("pdp_new"), Brand: product.brand || product.subtitle || "" },
      categories: product.subtitle ? [{ id: 0, name: product.subtitle, slug: "" }] : [],
    },
    lang === "pt" ? "pt" : "en",
  );
  const gallery = buildProductGallery(product.img);
  const show360 = productSupports360View(cartKey, product.name);

  return (
    <ProductDetailLayout
      crumbs={[
        { label: t("breadcrumb_home"), href: "/" },
        { label: product.subtitle || t("home_accessories_title"), href: "/accessories" },
        { label: product.name },
      ]}
      badge={product.subtitle || product.badge}
      title={product.name}
      rating={product.rating}
      reviewCount={product.reviews}
      excerpt={copy.excerpt}
      specRows={[
        { label: t("pdp_condition"), value: t("pdp_new") },
        ...(product.brand || product.subtitle
          ? [{ label: t("pdp_brand"), value: product.brand || product.subtitle || "" }]
          : []),
      ]}
      gallery={gallery}
      cartKey={cartKey}
      inStock
      priceLabel={formatEuro(product.price)}
      oldPriceLabel={!seesWholesalePrices(user) && product.oldPrice != null ? formatEuro(product.oldPrice) : null}
      vatNote
      descriptionHtml={copy.html}
      below={
        <>
          {show360 ? (
            <section className="mt-8 rounded-2xl border border-black/[0.08] bg-white p-5">
              <Product360Viewer imageSrc={product.img} productName={product.name} />
            </section>
          ) : null}
          <PeopleAlsoBought cartKey={cartKey} />
        </>
      }
    />
  );
}

function specLabel(
  key: string,
  t: (k: "pdp_condition" | "pdp_brand" | "woo_sku" | "pdp_type" | "pdp_model" | "woo_categories_label") => string,
): string {
  const k = key.toLowerCase();
  if (k === "condition") return t("pdp_condition");
  if (k === "brand") return t("pdp_brand");
  if (k === "sku") return t("woo_sku");
  if (k === "type" || k === "product type") return t("pdp_type");
  if (k === "model") return t("pdp_model");
  if (k === "category" || k === "categories") return t("woo_categories_label");
  return key;
}

function WooProductView({
  cartKey,
  wooProduct,
  related,
  catalog,
  colorIdx,
  setColorIdx,
  notifyEmail,
  setNotifyEmail,
  notifyMsg,
  setNotifyMsg,
  userEmail,
}: {
  cartKey: string;
  wooProduct: WooProduct;
  related: WooProduct[];
  catalog: WooProduct[];
  colorIdx: number;
  setColorIdx: (n: number) => void;
  notifyEmail: string;
  setNotifyEmail: (s: string) => void;
  notifyMsg: string | null;
  setNotifyMsg: (s: string | null) => void;
  userEmail?: string;
}) {
  const { t, lang } = useLang();
  const { user } = useAuth();
  const { displayFormatted } = useCustomerProductPrice(wooProduct);
  const swatches = wooProduct.colorSwatches ?? [];
  const preferredSrc = swatches[colorIdx]?.image || null;
  const gallery = (wooProduct.images ?? [])
    .map((img) => img.src)
    .filter((src): src is string => Boolean(src) && !/woocommerce-placeholder/i.test(src));
  if (preferredSrc && !gallery.includes(preferredSrc) && !/woocommerce-placeholder/i.test(preferredSrc)) {
    gallery.unshift(preferredSrc);
  }
  const catalogPrice = displayFormatted;
  const compareAt = catalogCompareAtPrice(wooProduct, user);
  const inStock = wooProduct.stock_status !== "outofstock";
  const primaryCat = wooProduct.categories?.[0];
  const copy = useMemo(() => buildProductCopy(wooProduct, lang === "pt" ? "pt" : "en"), [wooProduct, lang]);

  const specRows: { label: string; value: ReactNode }[] = [];
  const seen = new Set<string>();
  const push = (label: string, value: ReactNode) => {
    const key = label.toLowerCase();
    if (seen.has(key) || value == null || value === "") return;
    seen.add(key);
    specRows.push({ label, value });
  };

  const specs = wooProduct.specs ?? {};
  push(t("pdp_condition"), specs.Condition || specs.condition || t("pdp_new"));
  push(t("pdp_brand"), wooProduct.brand || specs.Brand);
  push(t("woo_sku"), wooProduct.sku || specs.SKU);
  push(t("pdp_type"), wooProduct.partType || specs.Type || primaryCat?.name);
  push(t("pdp_model"), wooProduct.modelLabel || specs.Model);
  if (primaryCat) {
    push(
      t("woo_categories_label"),
      primaryCat.slug ? (
        <Link href={`/category/${primaryCat.slug}`} className="text-[#111111] hover:underline">
          {primaryCat.name}
        </Link>
      ) : (
        primaryCat.name
      ),
    );
  }
  for (const [k, v] of Object.entries(specs)) {
    if (!v) continue;
    push(specLabel(k, t), v);
  }
  for (const a of wooProduct.attributes ?? []) {
    if (a.visible === false || !a.name || !a.options?.length) continue;
    push(a.name, a.options.join(", "));
  }

  const group = wooProduct.catalogGroup;
  const crumbs: ProductCrumb[] = [{ label: t("breadcrumb_home"), href: "/" }];
  if (group) crumbs.push({ label: group, href: groupHref(group) });
  if (wooProduct.subcategory && wooProduct.subcategory !== group) {
    crumbs.push({ label: wooProduct.subcategory });
  }
  if (wooProduct.partType && wooProduct.partType !== wooProduct.subcategory && wooProduct.partType !== group) {
    crumbs.push({
      label: wooProduct.partType,
      href: primaryCat?.slug ? `/category/${primaryCat.slug}` : undefined,
    });
  }
  crumbs.push({ label: wooProduct.name });

  const compatibility: { label: string; href?: string }[] = [];
  if (wooProduct.modelLabel) compatibility.push({ label: wooProduct.modelLabel });
  if (wooProduct.partType && wooProduct.partType !== wooProduct.modelLabel) {
    compatibility.push({
      label: wooProduct.partType,
      href: primaryCat?.slug ? `/category/${primaryCat.slug}` : groupHref(group),
    });
  } else if (primaryCat && primaryCat.name !== wooProduct.modelLabel) {
    compatibility.push({
      label: primaryCat.name,
      href: primaryCat.slug ? `/category/${primaryCat.slug}` : groupHref(group),
    });
  }

  const notifyForm = !inStock ? (
    <form
      className="space-y-2"
      onSubmit={(e) => {
        e.preventDefault();
        const email = notifyEmail.trim() || userEmail || "";
        if (!email || !wooProduct.cloudId) return;
        void notifyStock(wooProduct.cloudId, email)
          .then(() => setNotifyMsg(t("notify_stock_ok")))
          .catch((err) => setNotifyMsg(err instanceof Error ? err.message : t("notify_stock")));
      }}
    >
      <input
        type="email"
        required
        value={notifyEmail}
        onChange={(e) => setNotifyEmail(e.target.value)}
        placeholder={userEmail || "email"}
        className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm"
      />
      <Button type="submit" variant="outline" className="w-full">
        {t("notify_stock")}
      </Button>
      {notifyMsg ? <p className="text-xs text-muted-foreground">{notifyMsg}</p> : null}
    </form>
  ) : null;

  return (
    <ProductDetailLayout
      crumbs={crumbs}
      badge={wooProduct.partType || primaryCat?.name}
      title={wooProduct.name}
      rating={wooProduct.rating ?? 0}
      reviewCount={wooProduct.reviewCount ?? 0}
      excerpt={copy.excerpt}
      specRows={specRows}
      compatibility={compatibility}
      gallery={gallery}
      preferredSrc={preferredSrc}
      cartKey={cartKey}
      inStock={inStock}
      priceLabel={catalogPrice}
      oldPriceLabel={compareAt != null ? formatEuro(compareAt) : null}
      vatNote
      swatches={
        swatches.length > 0 ? (
          <div className="mt-4 space-y-2">
            <p className="text-sm font-medium text-navy">{swatches[colorIdx]?.label}</p>
            <ColorSwatches swatches={swatches} selected={colorIdx} onSelect={setColorIdx} max={16} size="md" />
          </div>
        ) : null
      }
      descriptionHtml={copy.html}
      buyExtra={notifyForm}
      below={
        <WooRelatedAccessoriesSlider
          currentProductId={wooProduct.id}
          categoryIds={(wooProduct.categories ?? []).map((c) => c.id)}
          products={related.length > 0 ? related : catalog}
          priceUnavailableLabel={t("woo_price_na")}
        />
      }
    />
  );
}
