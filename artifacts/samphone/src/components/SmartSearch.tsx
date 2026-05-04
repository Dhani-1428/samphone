import { useEffect, useRef, useState } from "react";
import { Link } from "wouter";
import { Search } from "lucide-react";
import { useLang } from "@/contexts/LanguageContext";
import { searchCatalog, type SearchHit } from "@/data/search-index";
import { Popover, PopoverAnchor, PopoverContent } from "@/components/ui/popover";
import { cn } from "@/lib/utils";
import { useProductCatalog } from "@/contexts/ProductCatalogContext";

type Props = {
  className?: string;
  /** When false, render full-width bar (desktop). When true, compact (mobile menu). */
  compact?: boolean;
};

export default function SmartSearch({ className, compact }: Props) {
  const { t } = useLang();
  const { products, searchProducts } = useProductCatalog();
  const [open, setOpen] = useState(false);
  const [q, setQ] = useState("");
  const [hits, setHits] = useState<SearchHit[]>([]);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (q.trim().length < 1) {
      setHits([]);
      return;
    }
    const id = setTimeout(() => {
      if (products.length > 0) {
        const wooHits: SearchHit[] = searchProducts(q, 10).map((p) => ({
          cartKey: `woo:${p.id}`,
          name: p.name,
          subtitle: p.categories?.[0]?.name,
          href: p.permalink,
        }));
        setHits(wooHits);
        return;
      }
      setHits(searchCatalog(q, 10));
    }, 120);
    return () => clearTimeout(id);
  }, [q, products.length, searchProducts]);

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverAnchor asChild>
        <div
          className={cn(
            "flex items-center border border-border rounded-lg overflow-hidden bg-muted/40 focus-within:border-primary transition-colors",
            compact ? "w-full" : "flex-1",
            className,
          )}
        >
          <input
            ref={inputRef}
            type="search"
            value={q}
            onChange={(e) => {
              setQ(e.target.value);
              setOpen(true);
            }}
            onFocus={() => setOpen(true)}
            placeholder={t("searchPlaceholder")}
            className="flex-1 px-4 py-2.5 bg-transparent text-sm text-foreground placeholder:text-muted-foreground focus:outline-none min-w-0"
            data-testid="input-search"
            autoComplete="off"
            aria-expanded={open}
            aria-controls="search-suggestions"
          />
          <button
            type="button"
            className="px-4 py-2.5 bg-primary text-primary-foreground hover:bg-primary/90 transition-colors shrink-0"
            data-testid="button-search"
            onClick={() => inputRef.current?.focus()}
          >
            <Search className="w-4 h-4" />
          </button>
        </div>
      </PopoverAnchor>
      <PopoverContent
        id="search-suggestions"
        align="start"
        className="w-[var(--radix-popover-trigger-width)] min-w-[280px] max-w-[560px] p-0"
        onOpenAutoFocus={(e) => e.preventDefault()}
      >
        <div className="max-h-80 overflow-y-auto py-1">
          {q.trim().length < 1 ? (
            <p className="px-3 py-2 text-xs text-muted-foreground">{t("search_suggestions")}</p>
          ) : hits.length === 0 ? (
            <p className="px-3 py-2 text-sm text-muted-foreground">{t("search_no_results")}</p>
          ) : (
            <ul className="text-sm">
              {hits.map((h) => (
                <li key={h.cartKey}>
                  {h.href.startsWith("http") ? (
                    <a
                      href={h.href}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="block px-3 py-2.5 hover:bg-muted transition-colors"
                      onClick={() => {
                        setOpen(false);
                        setQ("");
                      }}
                    >
                      <span className="font-medium text-foreground block truncate">{h.name}</span>
                      {h.subtitle && (
                        <span className="text-xs text-muted-foreground truncate block">{h.subtitle}</span>
                      )}
                    </a>
                  ) : (
                    <Link
                      href={h.href}
                      className="block px-3 py-2.5 hover:bg-muted transition-colors"
                      onClick={() => {
                        setOpen(false);
                        setQ("");
                      }}
                    >
                      <span className="font-medium text-foreground block truncate">{h.name}</span>
                      {h.subtitle && (
                        <span className="text-xs text-muted-foreground truncate block">{h.subtitle}</span>
                      )}
                    </Link>
                  )}
                </li>
              ))}
            </ul>
          )}
        </div>
      </PopoverContent>
    </Popover>
  );
}
