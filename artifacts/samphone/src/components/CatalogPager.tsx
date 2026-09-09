import { useEffect, useMemo, useState } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { useLang } from "@/contexts/LanguageContext";
import { cn } from "@/lib/utils";

export const CATALOG_PAGE_SIZE = 24;

export function usePagedItems<T>(items: T[], resetKey: string, pageSize = CATALOG_PAGE_SIZE) {
  const [page, setPage] = useState(1);
  const pageCount = Math.max(1, Math.ceil(items.length / pageSize) || 1);

  useEffect(() => {
    setPage(1);
  }, [resetKey]);

  useEffect(() => {
    setPage((p) => Math.min(p, pageCount));
  }, [pageCount]);

  const slice = useMemo(() => {
    const start = (page - 1) * pageSize;
    return items.slice(start, start + pageSize);
  }, [items, page, pageSize]);

  return { page, setPage, pageCount, slice, pageSize };
}

function pageWindow(page: number, pageCount: number): (number | "…")[] {
  if (pageCount <= 7) return Array.from({ length: pageCount }, (_, i) => i + 1);
  const set = new Set([1, pageCount, page - 1, page, page + 1]);
  const nums = [...set].filter((n) => n >= 1 && n <= pageCount).sort((a, b) => a - b);
  const out: (number | "…")[] = [];
  for (const n of nums) {
    const last = out[out.length - 1];
    if (typeof last === "number" && n - last > 1) out.push("…");
    out.push(n);
  }
  return out;
}

export default function CatalogPager({
  page,
  pageCount,
  onPage,
}: {
  page: number;
  pageCount: number;
  onPage: (n: number) => void;
}) {
  const { t } = useLang();
  if (pageCount <= 1) return null;

  const go = (n: number) => {
    const next = Math.min(pageCount, Math.max(1, n));
    onPage(next);
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  return (
    <nav className="mt-8 flex flex-col items-center gap-3" aria-label={t("catalog_page_status", { page, pages: pageCount })}>
      <p className="text-sm font-medium text-muted-foreground">
        {t("catalog_page_status", { page, pages: pageCount })}
      </p>
      <div className="flex flex-wrap items-center justify-center gap-1.5">
        <button
          type="button"
          disabled={page <= 1}
          onClick={() => go(page - 1)}
          className="inline-flex h-10 items-center gap-1 rounded-lg border border-brand/20 bg-white px-3 text-sm font-bold text-brand disabled:cursor-not-allowed disabled:opacity-40"
        >
          <ChevronLeft className="h-4 w-4" />
          {t("catalog_page_prev")}
        </button>
        {pageWindow(page, pageCount).map((n, i) =>
          n === "…" ? (
            <span key={`e-${i}`} className="px-1 text-muted-foreground">
              …
            </span>
          ) : (
            <button
              key={n}
              type="button"
              onClick={() => go(n)}
              className={cn(
                "h-10 min-w-10 rounded-lg px-2.5 text-sm font-bold",
                n === page ? "bg-brand text-white" : "border border-brand/20 bg-white text-brand hover:border-sam",
              )}
            >
              {n}
            </button>
          ),
        )}
        <button
          type="button"
          disabled={page >= pageCount}
          onClick={() => go(page + 1)}
          className="inline-flex h-10 items-center gap-1 rounded-lg border border-brand/20 bg-white px-3 text-sm font-bold text-brand disabled:cursor-not-allowed disabled:opacity-40"
        >
          {t("catalog_page_next")}
          <ChevronRight className="h-4 w-4" />
        </button>
      </div>
    </nav>
  );
}
