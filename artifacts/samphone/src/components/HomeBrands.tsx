import { Link } from "wouter";
import { useLang } from "@/contexts/LanguageContext";

const brands = [
  { label: "Apple", slug: "apple" },
  { label: "Samsung", slug: "samsung" },
  { label: "Xiaomi", slug: "xiaomi" },
  { label: "Honor", slug: "honor" },
  { label: "Motorola", slug: "motorola" },
  { label: "OnePlus", slug: "oneplus" },
  { label: "Oppo", slug: "oppo" },
  { label: "Realme", slug: "realme" },
  { label: "Vivo", slug: "vivo" },
  { label: "Google", slug: "google-pixel" },
  { label: "Huawei", slug: "huawei" },
  { label: "Asus", slug: "asus" },
] as const;

export default function HomeBrands() {
  const { t } = useLang();

  return (
    <section className="py-8 md:py-10">
      <div className="mx-auto w-full max-w-[1600px] px-5 sm:px-8 md:px-10 lg:px-14 xl:px-16">
        <div className="mb-5 flex items-end justify-between gap-4">
          <div>
            <h2 className="font-display text-2xl font-bold tracking-tight text-foreground md:text-[2rem]">
              {t("home_brands_title")}
            </h2>
            <p className="mt-1 text-sm text-muted-foreground">{t("home_brands_sub")}</p>
          </div>
          <Link href="/multi-brand" className="shrink-0 text-sm font-semibold text-brand hover:underline">
            {t("nav_view_all_brands")}
          </Link>
        </div>
        <div className="grid grid-cols-3 gap-2 sm:grid-cols-4 md:grid-cols-6">
          {brands.map((brand) => (
            <Link
              key={brand.slug}
              href={`/brand/${brand.slug}`}
              className="flex h-12 items-center justify-center rounded-lg border border-border bg-card px-2 text-center text-[13px] font-semibold text-foreground transition-colors hover:border-brand hover:text-brand"
            >
              {brand.label}
            </Link>
          ))}
        </div>
      </div>
    </section>
  );
}
