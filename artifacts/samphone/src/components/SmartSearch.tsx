import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { Link } from "wouter";
import { Search } from "lucide-react";
import { useLang } from "@/contexts/LanguageContext";
import { useAuth } from "@/contexts/AuthContext";
import type { SearchHit } from "@/data/search-index";
import ProductCartControls from "@/components/ProductCartControls";
import { cn } from "@/lib/utils";
import { useProductCatalog } from "@/contexts/ProductCatalogContext";
import { getPrimaryImageUrl, searchProductsRemote, wooProductHref, type WooProduct } from "@/lib/woocommerce";
import { catalogUnitPrice, formatEuroAmount } from "@/lib/customer-price";
import CatalogImage from "@/components/CatalogImage";
import { normalizeCatalogImageUrl } from "@/config/samphone";

type Props = {
  className?: string;
  compact?: boolean;
  variant?: "default" | "header";
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

function toHit(p: WooProduct, user: ReturnType<typeof useAuth>["user"]): SearchHit {
  const unit = catalogUnitPrice(p, user);
  return {
    cartKey: `woo:${p.id}`,
    name: p.name,
    subtitle: p.categories?.[0]?.name,
    href: wooProductHref(p.id),
    imageSrc: getPrimaryImageUrl(p) ?? "",
    priceText: unit != null ? formatEuroAmount(unit) : null,
  };
}

function mergeHits(list: SearchHit[]): SearchHit[] {
  const seen = new Set<string>();
  const out: SearchHit[] = [];
  for (const hit of list) {
    if (seen.has(hit.cartKey)) continue;
    seen.add(hit.cartKey);
    out.push(hit);
  }
  return out.slice(0, 40);
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
  const thumb =
    liveSrc && imgOk ? (
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

  return (
    <li className="flex items-center gap-2 border-b border-black/[0.08] px-2.5 py-2 last:border-0 hover:bg-[#F3F5F8]">
      <Link
        href={resolveHitHref(hit)}
        className="flex min-w-0 flex-1 items-center gap-2.5 rounded-md outline-none focus-visible:ring-2 focus-visible:ring-ring"
        onClick={onSelect}
      >
        {thumb}
        <div className="min-w-0 flex-1">
          <span className="line-clamp-2 text-sm font-bold leading-snug text-black">{hit.name}</span>
          {hit.subtitle ? (
            <span className="mt-0.5 block truncate text-xs font-semibold text-neutral-700">{hit.subtitle}</span>
          ) : null}
        </div>
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
  const [searching, setSearching] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const wrapRef = useRef<HTMLDivElement>(null);
  const panelRef = useRef<HTMLDivElement>(null);
  const [panelPos, setPanelPos] = useState<{ top: number; left: number; width: number } | null>(null);

  const placePanel = () => {
    const el = wrapRef.current;
    if (!el) return;
    const r = el.getBoundingClientRect();
    setPanelPos({
      top: r.bottom + 6,
      left: r.left,
      width: Math.max(r.width, Math.min(560, window.innerWidth - 24)),
    });
  };

  useEffect(() => {
    if (!open) return;
    placePanel();
    const on = () => placePanel();
    window.addEventListener("resize", on);
    window.addEventListener("scroll", on, true);
    return () => {
      window.removeEventListener("resize", on);
      window.removeEventListener("scroll", on, true);
    };
  }, [open, hits.length, q]);

  useEffect(() => {
    if (!open) return;
    const onDown = (e: MouseEvent) => {
      const t = e.target as Node;
      if (wrapRef.current?.contains(t) || panelRef.current?.contains(t)) return;
      setOpen(false);
    };
    document.addEventListener("mousedown", onDown);
    return () => document.removeEventListener("mousedown", onDown);
  }, [open]);

  useEffect(() => {
    const trimmed = q.trim();
    let cancelled = false;
    const id = setTimeout(() => {
      if (trimmed.length < 1) {
        setSearching(false);
        setHits(products.slice(0, 10).map((p) => toHit(p, user)));
        return;
      }

      const local = products.length > 0 ? searchProducts(trimmed, 40).map((p) => toHit(p, user)) : [];
      setHits(local);
      setSearching(true);

      void searchProductsRemote(trimmed, 40)
        .then((remote) => {
          if (cancelled) return;
          setHits(mergeHits([...remote.map((p) => toHit(p, user)), ...local]));
        })
        .catch(() => {
          /* keep local hits */
        })
        .finally(() => {
          if (!cancelled) setSearching(false);
        });
    }, 80);
    return () => {
      cancelled = true;
      clearTimeout(id);
    };
  }, [q, products, searchProducts, user]);

  const closeAndClear = () => {
    setOpen(false);
    setQ("");
  };

  const panel =
    open && panelPos && typeof document !== "undefined"
      ? createPortal(
          <div
            ref={panelRef}
            id="search-suggestions"
            role="listbox"
            style={{ top: panelPos.top, left: panelPos.left, width: panelPos.width }}
            className="fixed z-[200] overflow-hidden rounded-md border border-black/[0.08] bg-white text-black shadow-[0_12px_40px_rgba(0,0,0,0.12)]"
          >
            <div className="hide-dropdown-scrollbar max-h-96 overflow-y-auto py-1">
              <p className="px-3 py-2 text-xs font-bold uppercase tracking-wide text-black">
                {q.trim().length < 1 ? t("search_suggestions") : t("searchPlaceholder")}
              </p>
              {hits.length === 0 && !searching ? (
                <p className="px-3 py-2 text-sm font-bold text-black">{t("search_no_results")}</p>
              ) : (
                <ul className="text-sm">
                  {hits.map((h) => (
                    <SearchHitRow key={h.cartKey} hit={h} onSelect={closeAndClear} />
                  ))}
                </ul>
              )}
              {searching ? (
                <p className="px-3 py-2 text-xs font-semibold text-neutral-500">{t("searchPlaceholder")}…</p>
              ) : null}
            </div>
          </div>,
          document.body,
        )
      : null;

  return (
    <>
      <div
        ref={wrapRef}
        className={cn(
          "flex items-center overflow-visible transition-colors",
          variant === "header" && !hideButton
            ? "w-full rounded-md bg-white"
            : variant === "header"
              ? "w-full"
              : "rounded-lg border border-border bg-muted/40 focus-within:border-primary",
          compact && variant !== "header" ? "w-full" : !compact && variant !== "header" ? "flex-1" : null,
          className,
        )}
      >
        {leadingIcon ? <Search className="ml-3 h-4 w-4 shrink-0 text-black" strokeWidth={2} /> : null}
        <input
          ref={inputRef}
          type="search"
          value={q}
          onChange={(e) => {
            setQ(e.target.value);
            setOpen(true);
          }}
          onFocus={() => {
            setOpen(true);
            placePanel();
          }}
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
            onClick={() => {
              inputRef.current?.focus();
              setOpen(true);
            }}
            aria-label={t("searchPlaceholder")}
          >
            <Search className="h-4 w-4" />
          </button>
        )}
      </div>
      {panel}
    </>
  );
}
