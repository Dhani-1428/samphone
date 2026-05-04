import { useMemo } from "react";
import { Link } from "wouter";
import { Trash2, X } from "lucide-react";
import { hrefForCartKey, resolveCatalogProduct } from "@/data/catalog";
import {
  getCompareSpecsForProduct,
  SPEC_LABELS_EN,
  SPEC_LABELS_PT,
  SPEC_ORDER,
  type SpecKey,
} from "@/data/device-specs";
import { useCompare } from "@/contexts/CompareContext";
import { useLang } from "@/contexts/LanguageContext";
import { useProductCatalog } from "@/contexts/ProductCatalogContext";
import { Button } from "@/components/ui/button";
import type { WooProduct } from "@/lib/woocommerce";

const PLACEHOLDER =
  "data:image/svg+xml," +
  encodeURIComponent(
    `<svg xmlns="http://www.w3.org/2000/svg" width="200" height="200" viewBox="0 0 200 200"><rect fill="#f4f4f5" width="200" height="200"/><path fill="#d4d4d8" d="M70 80h60v40H70z"/></svg>`,
  );

export default function Compare() {
  const { keys, remove, clear } = useCompare();
  const { lang, t } = useLang();
  const { products } = useProductCatalog();
  const specLabels = lang === "pt" ? SPEC_LABELS_PT : SPEC_LABELS_EN;

  const columns = useMemo(() => {
    return keys
      .map((cartKey) => {
        if (cartKey.startsWith("woo:")) {
          const id = Number(cartKey.slice(4));
          const woo = Number.isFinite(id) ? products.find((p) => p.id === id) ?? null : null;
          const specs = getCompareSpecsForProduct(cartKey, woo);
          const name = woo?.name ?? (Number.isFinite(id) ? `Product #${id}` : cartKey);
          const img = woo?.images?.[0]?.src ?? PLACEHOLDER;
          return { cartKey, productName: name, img, href: hrefForCartKey(cartKey), specs };
        }
        const catalog = resolveCatalogProduct(cartKey);
        if (!catalog) return null;
        const specs = getCompareSpecsForProduct(cartKey, null);
        return {
          cartKey,
          productName: catalog.name,
          img: catalog.img ?? PLACEHOLDER,
          href: hrefForCartKey(cartKey),
          specs,
        };
      })
      .filter((c): c is NonNullable<typeof c> => c !== null);
  }, [keys, products]);

  return (
    <div className="bg-muted/30 min-h-screen py-10">
      <div className="container mx-auto max-w-6xl px-4 md:px-6">
        <div className="mb-8 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <h1 className="font-display text-3xl font-bold text-foreground md:text-4xl">{t("compare_page_title")}</h1>
            <p className="mt-1 text-muted-foreground">{t("compare_page_sub")}</p>
          </div>
          {keys.length > 0 && (
            <Button variant="outline" size="sm" onClick={clear} className="shrink-0 gap-2">
              <Trash2 className="h-4 w-4" /> {t("compare_clear_all")}
            </Button>
          )}
        </div>

        {columns.length === 0 ? (
          <div className="rounded-2xl border border-border bg-card p-10 text-center text-muted-foreground shadow-sm">
            <p className="mb-4">{t("compare_empty")}</p>
            <p className="mb-6 text-sm">{t("compare_max_note")}</p>
            <Button asChild>
              <Link href="/smartphones">{t("nav_smartphones")}</Link>
            </Button>
          </div>
        ) : (
          <div className="overflow-x-auto rounded-2xl border border-border bg-card shadow-sm">
            <table className="min-w-[640px] w-full text-sm">
              <thead>
                <tr className="border-b border-border bg-muted/50">
                  <th className="w-40 p-4 text-left font-semibold text-foreground">{t("compare_table_feature")}</th>
                  {columns.map(({ cartKey, productName, img, href }) => (
                    <th key={cartKey} className="min-w-[180px] p-4 text-left align-bottom">
                      <div className="flex flex-col gap-2">
                        <div className="relative max-h-32 aspect-square w-full overflow-hidden rounded-lg border border-border bg-muted">
                          <img src={img} alt="" className="h-full w-full object-cover" />
                          <button
                            type="button"
                            onClick={() => remove(cartKey)}
                            className="absolute right-1 top-1 flex h-7 w-7 items-center justify-center rounded-full border border-border bg-background/90 hover:bg-destructive/10"
                            aria-label={t("compare_remove")}
                          >
                            <X className="h-4 w-4" />
                          </button>
                        </div>
                        <Link href={href} className="font-display line-clamp-2 font-semibold leading-tight text-foreground hover:text-primary">
                          {productName}
                        </Link>
                      </div>
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {SPEC_ORDER.map((rowKey: SpecKey) => (
                  <tr key={rowKey} className="border-b border-border last:border-0">
                    <td className="bg-muted/20 p-4 font-medium text-muted-foreground">{specLabels[rowKey]}</td>
                    {columns.map(({ cartKey, specs }) => (
                      <td key={cartKey} className="p-4 text-foreground">
                        {specs?.[rowKey] ?? "—"}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
