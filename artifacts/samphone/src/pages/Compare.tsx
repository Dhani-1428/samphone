import { Link } from "wouter";
import { Trash2, X } from "lucide-react";
import { resolveCatalogProduct } from "@/data/catalog";
import {
  DEVICE_SPECS,
  SPEC_LABELS_EN,
  SPEC_LABELS_PT,
  SPEC_ORDER,
  type SpecKey,
} from "@/data/device-specs";
import { hrefForCartKey } from "@/data/catalog";
import { useCompare } from "@/contexts/CompareContext";
import { useLang } from "@/contexts/LanguageContext";
import { Button } from "@/components/ui/button";

export default function Compare() {
  const { keys, remove, clear } = useCompare();
  const { lang, t } = useLang();
  const specLabels = lang === "pt" ? SPEC_LABELS_PT : SPEC_LABELS_EN;

  const columns = keys
    .map((k) => {
      const p = resolveCatalogProduct(k);
      if (!p) return null;
      return { cartKey: k, product: p, specs: DEVICE_SPECS[k] };
    })
    .filter((c): c is NonNullable<typeof c> => c !== null);

  return (
    <div className="bg-muted/30 min-h-screen py-10">
      <div className="container mx-auto px-4 md:px-6 max-w-6xl">
        <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-4 mb-8">
          <div>
            <h1 className="font-display text-3xl md:text-4xl font-bold text-foreground">
              {t("compare_page_title")}
            </h1>
            <p className="text-muted-foreground mt-1">{t("compare_page_sub")}</p>
          </div>
          {keys.length > 0 && (
            <Button variant="outline" size="sm" onClick={clear} className="gap-2 shrink-0">
              <Trash2 className="w-4 h-4" /> {t("compare_clear_all")}
            </Button>
          )}
        </div>

        {columns.length === 0 ? (
          <div className="rounded-xl border border-border bg-card p-10 text-center text-muted-foreground">
            <p className="mb-4">{t("compare_empty")}</p>
            <p className="text-sm mb-6">{t("compare_max_note")}</p>
            <Button asChild>
              <Link href="/smartphones">{t("nav_smartphones")}</Link>
            </Button>
          </div>
        ) : (
          <div className="overflow-x-auto rounded-xl border border-border bg-card shadow-sm">
            <table className="w-full text-sm min-w-[640px]">
              <thead>
                <tr className="border-b border-border bg-muted/50">
                  <th className="text-left p-4 font-semibold text-foreground w-40">
                    {t("compare_table_feature")}
                  </th>
                  {columns.map(({ cartKey, product }) => (
                    <th key={cartKey} className="p-4 align-bottom text-left min-w-[180px]">
                      <div className="flex flex-col gap-2">
                        <div className="relative aspect-square rounded-lg overflow-hidden bg-muted border border-border max-h-32">
                          <img
                            src={product.img}
                            alt=""
                            className="w-full h-full object-cover"
                          />
                          <button
                            type="button"
                            onClick={() => remove(cartKey)}
                            className="absolute top-1 right-1 w-7 h-7 rounded-full bg-background/90 border border-border flex items-center justify-center hover:bg-destructive/10"
                            aria-label={t("compare_remove")}
                          >
                            <X className="w-4 h-4" />
                          </button>
                        </div>
                        <Link
                          href={hrefForCartKey(cartKey)}
                          className="font-display font-semibold text-foreground hover:text-primary line-clamp-2 leading-tight"
                        >
                          {product.name}
                        </Link>
                      </div>
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {SPEC_ORDER.map((rowKey: SpecKey) => (
                  <tr key={rowKey} className="border-b border-border last:border-0">
                    <td className="p-4 font-medium text-muted-foreground bg-muted/20">
                      {specLabels[rowKey]}
                    </td>
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
