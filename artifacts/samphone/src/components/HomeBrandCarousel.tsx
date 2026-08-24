import { useEffect, useState } from "react";
import { Link } from "wouter";
import { useLang } from "@/contexts/LanguageContext";
import { fetchCloudBrands } from "@/lib/samphone-cloud";
import { allBrands } from "@/data/brands";

const EXTRA = ["OnePlus", "Hoco", "Repairing Tools"];

function brandHref(name: string) {
  if (name.toLowerCase() === "repairing tools") return "/group/Repairing%20Tools";
  return `/brand/${name.toLowerCase().replace(/\s+/g, "-")}`;
}

export default function HomeBrandCarousel() {
  const { t } = useLang();
  const [brands, setBrands] = useState<{ name: string; count: number }[]>([]);

  useEffect(() => {
    let alive = true;
    void fetchCloudBrands()
      .then((rows) => {
        if (!alive) return;
        const seen = new Set(rows.map((b) => b.name.toLowerCase()));
        const extra = EXTRA.filter((n) => !seen.has(n.toLowerCase())).map((name) => ({ name, count: 0 }));
        setBrands([...rows, ...extra]);
      })
      .catch(() => {
        if (alive) setBrands(allBrands.map((b) => ({ name: b.name, count: 0 })));
      });
    return () => {
      alive = false;
    };
  }, []);

  if (brands.length === 0) return null;

  return (
    <section className="py-8 md:py-10">
      <div className="mx-auto w-full max-w-[1600px] px-5 sm:px-8 md:px-10 lg:px-14 xl:px-16">
        <h2 className="mb-5 font-display text-2xl font-bold tracking-tight text-foreground md:text-[2rem]">
          {t("home_brands_title")}
        </h2>
        <div className="flex gap-3 overflow-x-auto pb-2 scrollbar-thin">
          {brands.map((b) => (
            <Link
              key={b.name}
              href={brandHref(b.name)}
              className="flex min-w-[8.5rem] shrink-0 flex-col items-center rounded-xl border border-border bg-card px-4 py-4 text-center shadow-sm transition-colors hover:border-brand/40"
            >
              <span className="font-display text-sm font-bold text-foreground">{b.name}</span>
              {b.count > 0 ? (
                <span className="mt-1 text-xs text-muted-foreground">{b.count}</span>
              ) : null}
            </Link>
          ))}
        </div>
      </div>
    </section>
  );
}
