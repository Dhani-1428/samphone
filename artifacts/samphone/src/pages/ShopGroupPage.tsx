import { useEffect, useState } from "react";
import { Link, useParams } from "wouter";
import { ArrowLeft, Loader2 } from "lucide-react";
import WooProductCard from "@/components/wc/WooProductCard";
import PageVideoHero from "@/components/PageVideoHero";
import { useLang } from "@/contexts/LanguageContext";
import { fetchCloudProductsByGroup } from "@/lib/samphone-cloud";
import type { WooProduct } from "@/lib/woocommerce";

export default function ShopGroupPage() {
  const params = useParams<{ group: string }>();
  const group = decodeURIComponent(params.group ?? "").trim();
  const { t } = useLang();
  const [items, setItems] = useState<WooProduct[] | null>(null);

  useEffect(() => {
    let alive = true;
    setItems(null);
    if (!group) {
      setItems([]);
      return;
    }
    void fetchCloudProductsByGroup(group, 48)
      .then((list) => {
        if (alive) setItems(list);
      })
      .catch(() => {
        if (alive) setItems([]);
      });
    return () => {
      alive = false;
    };
  }, [group]);

  return (
    <div className="min-h-screen">
      <PageVideoHero eyebrow={t("nav_accessories")} title={group || t("nav_all_accessories")} description="" />
      <div className="mx-auto w-full max-w-[1600px] px-5 py-8 sm:px-8 md:px-10 lg:px-14 xl:px-16">
        <Link href="/" className="mb-6 inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-primary">
          <ArrowLeft className="h-4 w-4" />
          {t("backToHome")}
        </Link>
        {items == null ? (
          <div className="flex justify-center py-16 text-muted-foreground">
            <Loader2 className="h-6 w-6 animate-spin" />
          </div>
        ) : items.length === 0 ? (
          <p className="text-sm text-muted-foreground">{t("productNotFound")}</p>
        ) : (
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5">
            {items.map((p) => (
              <WooProductCard key={p.cloudId || p.id} product={p} priceUnavailableLabel={t("woo_price_na")} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
