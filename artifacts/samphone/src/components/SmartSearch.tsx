import { useEffect, useRef, useState } from "react";
import { Link } from "wouter";
import { Search } from "lucide-react";
import { useLang } from "@/contexts/LanguageContext";
import { useAuth } from "@/contexts/AuthContext";
import type { SearchHit } from "@/data/search-index";
import { Popover, PopoverAnchor, PopoverContent } from "@/components/ui/popover";
import ProductCartControls from "@/components/ProductCartControls";
import { cn } from "@/lib/utils";
import { useProductCatalog } from "@/contexts/ProductCatalogContext";
import { getPrimaryImageUrl, searchProductsRemote, wooProductHref, type WooProduct } from "@/lib/woocommerce";
import { catalogUnitPrice, formatEuroAmount } from "@/lib/customer-price";
import CatalogImage from "@/components/CatalogImage";
import { normalizeCatalogImageUrl } from "@/config/samphone";

type Props = {
  className?: string;
  /** When false, render full-width bar (desktop). When true, compact (mobile menu). */
  compact?: boolean;
  /** Utopya-style white search field on the dark header. */
  variant?: "default" | "header";
  /** Hide the internal search button (when the parent provides its own). */
  hideButton?: boolean;
  leadingIcon?: boolean;
  placeholder?: string;
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
  const { t } = useLang();
  const [imgOk, setImgOk] = useState(true);

  const price = hit.priceText ? (
    <span className="whitespace-nowrap text-sm font-bold tabular-nums text-black">{hit.priceText}</span>
  ) : hit.priceNumber != null ? (
    <span className="whitespace-nowrap text-sm font-bold tabular-nums text-black">
      {formatEuroAmount(hit.priceNumber)}
    </span>
  ) : (
    <span className="text-xs font-bold text-black">{t("woo_price_na")}</span>
  );

  const liveSrc = normalizeCatalogImageUrl(hit.imageSrc);
  const thumb = liveSrc && imgOk ? (
    <CatalogImage
      src={liveSrc}
      alt=""
      className="h-12 w-12 shrink-0 rounded-lg bg-[#F3F5F8] object-cover"
      loading="lazy"
      onError={() => setImgOk(false)}
    />
  ) : (
    <span className="h-12 w-12 shrink-0 rounded-lg bg-[#F3F5F8]" aria-hidden />
  );

  const details = (
    <div className="min-w-0 flex-1">
      <span className="line-clamp-2 text-sm font-bold leading-snug text-black">{hit.name}</span>
      {hit.subtitle ? (
        <span className="mt-0.5 block truncate text-xs font-semibold text-neutral-700">{hit.subtitle}</span>
      ) : null}
    </div>
  );

  const productLinkClass =
    "flex min-w-0 flex-1 items-center gap-2.5 rounded-md outline-none focus-visible:ring-2 focus-visible:ring-ring";
  const productHref = resolveHitHref(hit);

  return (
    <li className="flex items-center gap-2 border-b border-black/[0.08] px-2.5 py-2 last:border-0 hover:bg-[#F3F5F8]">
      <Link href={productHref} className={productLinkClass} onClick={onSelect}>
        {thumb}
        {details}
      </Link>
      <div className="flex w-[4.5rem] shrink-0 justify-end">{price}</div>
      <div className="shrink-0" onClick={(e) => e.stopPropagation()}>
        <ProductCartControls
          cartKey={hit.cartKey}
          variant="icon-stepper"
          preview={{ name: hit.name, img: liveSrc }}
        />
      </div>
    </li>
  );
}

export default function SmartSearch({
  className,
  compact,
  variant = "default",
  hideButton = false,
  leadingIcon = false,
  placeholder,
}: Props) {
  const { t } = useLang();
  const { user } = useAuth();
  const { products, searchProducts } = useProductCatalog();
  const [open, setOpen] = useState(false);
  const [q, setQ] = useState("");
  const [hits, setHits] = useState<SearchHit[]>([]);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const trimmed = q.trim();
    if (trimmed.length < 1) {
      setHits([]);
      return;
    }
    let cancelled = false;
    const id = setTimeout(() => {
      const toHit = (p: WooProduct): SearchHit => {
        const unit = catalogUnitPrice(p, user);
        return {
          cartKey: `woo:${p.id}`,
          name: p.name,
          subtitle: p.categories?.[0]?.name,
          href: wooProductHref(p.id),
          imageSrc: getPrimaryImageUrl(p) ?? "",
          priceText: unit != null ? formatEuroAmount(unit) : null,
        };
      };

      const mergeHits = (list: SearchHit[]) => {
        const seen = new Set<string>();
        const out: SearchHit[] = [];
        for (const hit of list) {
          if (seen.has(hit.cartKey)) continue;
          seen.add(hit.cartKey);
          out.push(hit);
        }
        return out.slice(0, 40);
      };

      const local = products.length > 0 ? searchProducts(trimmed, 40).map(toHit) : [];
      setHits(local);

      void searchProductsRemote(trimmed, 40)
        .then((remote) => {
          if (cancelled) return;
          setHits(mergeHits([...remote.map(toHit), ...local]));
        })
        .catch(() => {
          /* keep local hits */
        });
    }, 120);
    return () => {
      cancelled = true;
      clearTimeout(id);
    };
  }, [q, products.length, searchProducts, user]);

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
            variant === "header" && !hideButton
              ? "w-full rounded-md bg-white"
              : variant === "header"
              ? "w-full"
              : "rounded-lg border border-border bg-muted/40 focus-within:border-primary",
            compact && variant !== "header" ? "w-full" : !compact && variant !== "header" ? "flex-1" : null,
            className,
          )}
        >
          {leadingIcon ? (
            <Search className="ml-3 h-4 w-4 shrink-0 text-black" strokeWidth={2} />
          ) : null}
          <input
            ref={inputRef}
            type="search"
            value={q}
            onChange={(e) => {
              setQ(e.target.value);
              setOpen(true);
            }}
            onFocus={() => setOpen(true)}
            placeholder={placeholder ?? t("searchPlaceholder")}
            className={cn(
              "min-w-0 flex-1 bg-transparent focus:outline-none [&::-webkit-search-cancel-button]:appearance-none",
              variant === "header"
                ? "py-2.5 typo-search text-black placeholder:text-neutral-500"
                : "py-2.5 text-sm text-foreground placeholder:text-muted-foreground",
              leadingIcon ? "px-2" : "px-4",
            )}
            data-testid="input-search"
            autoComplete="off"
            aria-expanded={open}
            aria-controls="search-suggestions"
          />
          {!hideButton && (
            <button
              type="button"
              className={cn(
                "shrink-0 transition-colors",
                variant === "header"
                  ? "px-3 py-2.5 font-bold text-black hover:text-black"
                  : "bg-primary px-4 py-2.5 text-primary-foreground hover:bg-primary/90",
              )}
              data-testid="button-search"
              onClick={() => inputRef.current?.focus()}
              aria-label={t("searchPlaceholder")}
            >
              {variant === "header" ? <Search className="h-4 w-4" /> : <Search className="h-4 w-4" />}
            </button>
          )}
        </div>
      </PopoverAnchor>
      <PopoverContent
        id="search-suggestions"
        align="start"
        className="z-[90] w-[var(--radix-popover-trigger-width)] min-w-[min(100vw-2rem,420px)] max-w-[min(100vw-2rem,560px)] border-black/[0.08] !bg-white p-0 !text-black shadow-[0_12px_40px_rgba(0,0,0,0.12)]"
        onOpenAutoFocus={(e) => e.preventDefault()}
      >
        <div className="hide-dropdown-scrollbar max-h-96 overflow-y-auto py-1">
          {q.trim().length < 1 ? (
            <p className="px-3 py-2 text-xs font-bold text-black">{t("search_suggestions")}</p>
          ) : hits.length === 0 ? (
            <p className="px-3 py-2 text-sm font-bold text-black">{t("search_no_results")}</p>
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
