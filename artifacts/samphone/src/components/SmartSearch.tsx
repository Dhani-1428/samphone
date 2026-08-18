import { useEffect, useRef, useState } from "react";
import { Link } from "wouter";
import { Lock, Search, ScanLine } from "lucide-react";
import { useLang } from "@/contexts/LanguageContext";
import { useAuth } from "@/contexts/AuthContext";
import { searchCatalog, type SearchHit } from "@/data/search-index";
import { Popover, PopoverAnchor, PopoverContent } from "@/components/ui/popover";
import ProductCartControls from "@/components/ProductCartControls";
import { cn } from "@/lib/utils";
import { useProductCatalog } from "@/contexts/ProductCatalogContext";
import { getDisplayPrice, getPrimaryImageUrl, wooProductHref } from "@/lib/woocommerce";

const SEARCH_PLACEHOLDER =
  "data:image/svg+xml," +
  encodeURIComponent(
    `<svg xmlns="http://www.w3.org/2000/svg" width="96" height="96" viewBox="0 0 96 96"><rect fill="#f4f4f5" width="96" height="96"/><path fill="#d4d4d8" d="M34 38h28v20H34z"/><circle fill="#d4d4d8" cx="48" cy="31" r="7"/></svg>`,
  );

type Props = {
  className?: string;
  /** When false, render full-width bar (desktop). When true, compact (mobile menu). */
  compact?: boolean;
  /** Utopya-style white search field on the dark header. */
  variant?: "default" | "header";
};

function resolveHitHref(hit: SearchHit): string {
  if (hit.cartKey.startsWith("woo:")) {
    const id = Number(hit.cartKey.slice(4));
    if (Number.isFinite(id) && id > 0) return wooProductHref(id);
  }
  if (!hit.href.startsWith("http")) return hit.href;
  return "/";
}

function SearchHitRow({ hit, onSelect }: { hit: SearchHit; onSelect: () => void }) {
  const { user } = useAuth();
  const { t } = useLang();
  const [imgOk, setImgOk] = useState(true);
  const currencySymbol = import.meta.env.VITE_WOOCOMMERCE_CURRENCY_SYMBOL ?? "€";

  const price = !user ? (
    <span className="flex max-w-[5.5rem] items-center gap-1 text-[11px] leading-tight text-muted-foreground">
      <Lock className="h-3 w-3 shrink-0" aria-hidden />
      <span className="line-clamp-2">{t("loginToSeePrice")}</span>
    </span>
  ) : hit.priceText ? (
    <span className="whitespace-nowrap text-sm font-semibold tabular-nums">{hit.priceText}</span>
  ) : hit.priceNumber != null ? (
    <span className="whitespace-nowrap text-sm font-semibold tabular-nums">
      {currencySymbol}
      {hit.priceNumber.toFixed(2)}
    </span>
  ) : (
    <span className="text-xs text-muted-foreground">{t("woo_price_na")}</span>
  );

  const thumb = (
    <img
      src={imgOk ? hit.imageSrc : SEARCH_PLACEHOLDER}
      alt=""
      className="h-12 w-12 shrink-0 rounded-lg bg-muted object-cover"
      loading="lazy"
      onError={() => setImgOk(false)}
    />
  );

  const details = (
    <div className="min-w-0 flex-1">
      <span className="line-clamp-2 text-sm font-medium leading-snug text-foreground">{hit.name}</span>
      {hit.subtitle ? (
        <span className="mt-0.5 block truncate text-xs text-muted-foreground">{hit.subtitle}</span>
      ) : null}
    </div>
  );

  const productLinkClass =
    "flex min-w-0 flex-1 items-center gap-2.5 rounded-md outline-none focus-visible:ring-2 focus-visible:ring-ring";
  const productHref = resolveHitHref(hit);

  return (
    <li className="flex items-center gap-2 border-b border-border/40 px-2.5 py-2 last:border-0 hover:bg-muted/80">
      <Link href={productHref} className={productLinkClass} onClick={onSelect}>
        {thumb}
        {details}
      </Link>
      <div className="flex w-[4.5rem] shrink-0 justify-end">{price}</div>
      <div className="shrink-0" onClick={(e) => e.stopPropagation()}>
        <ProductCartControls cartKey={hit.cartKey} variant="icon-stepper" />
      </div>
    </li>
  );
}

export default function SmartSearch({ className, compact, variant = "default" }: Props) {
  const { t } = useLang();
  const { products, searchProducts } = useProductCatalog();
  const [open, setOpen] = useState(false);
  const [q, setQ] = useState("");
  const [hits, setHits] = useState<SearchHit[]>([]);
  const inputRef = useRef<HTMLInputElement>(null);
  const currencySymbol = import.meta.env.VITE_WOOCOMMERCE_CURRENCY_SYMBOL ?? "€";

  useEffect(() => {
    if (q.trim().length < 1) {
      setHits([]);
      return;
    }
    const id = setTimeout(() => {
      if (products.length > 0) {
        const wooHits: SearchHit[] = searchProducts(q, 10).map((p) => {
          const displayPrice = getDisplayPrice(p);
          return {
            cartKey: `woo:${p.id}`,
            name: p.name,
            subtitle: p.categories?.[0]?.name,
            href: wooProductHref(p.id),
            imageSrc: getPrimaryImageUrl(p) ?? SEARCH_PLACEHOLDER,
            priceText: displayPrice ? `${currencySymbol}${displayPrice}` : null,
          };
        });
        setHits(wooHits);
        return;
      }
      setHits(searchCatalog(q, 10));
    }, 120);
    return () => clearTimeout(id);
  }, [q, products.length, searchProducts, currencySymbol]);

  const closeAndClear = () => {
    setOpen(false);
    setQ("");
  };

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverAnchor asChild>
        <div
          className={cn(
            "flex items-center overflow-hidden transition-colors",
            variant === "header"
              ? "w-full rounded-md bg-white ring-2 ring-[#2F6BFF]"
              : "rounded-lg border border-border bg-muted/40 focus-within:border-primary",
            compact && variant !== "header" ? "w-full" : !compact && variant !== "header" ? "flex-1" : null,
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
            className={cn(
              "min-w-0 flex-1 bg-transparent focus:outline-none",
              variant === "header"
                ? "px-4 py-3 text-[15px] text-neutral-800 placeholder:text-neutral-400"
                : "px-4 py-2.5 text-sm text-foreground placeholder:text-muted-foreground",
            )}
            data-testid="input-search"
            autoComplete="off"
            aria-expanded={open}
            aria-controls="search-suggestions"
          />
          <button
            type="button"
            className={cn(
              "shrink-0 transition-colors",
              variant === "header"
                ? "px-3 py-3 text-neutral-400 hover:text-[#2F6BFF]"
                : "bg-primary px-4 py-2.5 text-primary-foreground hover:bg-primary/90",
            )}
            data-testid="button-search"
            onClick={() => inputRef.current?.focus()}
            aria-label={t("searchPlaceholder")}
          >
            {variant === "header" ? <ScanLine className="h-5 w-5 text-[#2F6BFF]" /> : <Search className="h-4 w-4" />}
          </button>
        </div>
      </PopoverAnchor>
      <PopoverContent
        id="search-suggestions"
        align="start"
        className="z-[70] w-[var(--radix-popover-trigger-width)] min-w-[min(100vw-2rem,420px)] max-w-[min(100vw-2rem,560px)] p-0"
        onOpenAutoFocus={(e) => e.preventDefault()}
      >
        <div className="hide-dropdown-scrollbar max-h-96 overflow-y-auto py-1">
          {q.trim().length < 1 ? (
            <p className="px-3 py-2 text-xs text-muted-foreground">{t("search_suggestions")}</p>
          ) : hits.length === 0 ? (
            <p className="px-3 py-2 text-sm text-muted-foreground">{t("search_no_results")}</p>
          ) : (
            <ul className="text-sm">
              {hits.map((h) => (
                <SearchHitRow key={h.cartKey} hit={h} onSelect={closeAndClear} />
              ))}
            </ul>
          )}
        </div>
      </PopoverContent>
    </Popover>
  );
}
