import type { ReactNode } from "react";
import { useState } from "react";
import { Link, useLocation } from "wouter";
import {
  BadgeCheck,
  Clock,
  Heart,
  Lock,
  MessageCircle,
  ShieldCheck,
  Star,
  Truck,
  UserRound,
} from "lucide-react";
import ProductImageGallery from "@/components/product/ProductImageGallery";
import ProductCartControls from "@/components/ProductCartControls";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/contexts/AuthContext";
import { useLang } from "@/contexts/LanguageContext";
import { useWishlist } from "@/contexts/WishlistContext";
import { whatsappChatHref } from "@/lib/whatsapp";
import { cn } from "@/lib/utils";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

export type ProductCrumb = { label: string; href?: string };

export default function ProductDetailLayout({
  crumbs: _crumbs,
  badge,
  title,
  rating = 0,
  reviewCount = 0,
  excerpt,
  specRows,
  compatibility,
  gallery,
  preferredSrc,
  cartKey,
  inStock,
  priceLabel,
  oldPriceLabel,
  vatNote,
  swatches,
  descriptionHtml,
  extraInfo,
  below,
  buyExtra,
}: {
  crumbs: ProductCrumb[];
  badge?: string | null;
  title: string;
  rating?: number;
  reviewCount?: number;
  excerpt?: string;
  specRows: { label: string; value: ReactNode }[];
  compatibility?: { label: string; href?: string }[];
  gallery: string[];
  preferredSrc?: string | null;
  cartKey: string;
  inStock: boolean;
  priceLabel?: string | null;
  oldPriceLabel?: string | null;
  vatNote?: boolean;
  swatches?: ReactNode;
  descriptionHtml?: string | null;
  extraInfo?: ReactNode;
  below?: ReactNode;
  buyExtra?: ReactNode;
}) {
  const { t } = useLang();
  const { user } = useAuth();
  const { toggle: wishToggle, has: wishHas } = useWishlist();
  const [loc] = useLocation();
  const [tab, setTab] = useState<"desc" | "info" | "reviews">("desc");
  const [ship, setShip] = useState("portugal");
  const loginHref = `/login?next=${encodeURIComponent(loc)}`;
  const wished = wishHas(cartKey);

  const eta =
    ship === "lisbon" ? t("pdp_eta_lisbon") : ship === "islands" ? t("pdp_eta_islands") : t("pdp_eta_portugal");

  return (
    <div className="min-h-screen bg-[#F4F6F8] pb-16">
      <div className="mx-auto w-full max-w-[1400px] px-4 py-6 sm:px-6 md:px-8 md:py-8">
        <div className="grid items-start gap-8 lg:grid-cols-12 lg:gap-8 xl:gap-10">
          <div className="lg:col-span-5">
            {gallery.length === 0 ? (
              <div className="flex aspect-square items-center justify-center rounded-xl border border-black/[0.08] bg-white text-sm text-muted-foreground">
                —
              </div>
            ) : (
              <ProductImageGallery images={gallery} productName={title} preferredSrc={preferredSrc} />
            )}
          </div>

          <div className="min-w-0 lg:col-span-4">
            {badge ? (
              <span className="mb-3 inline-flex rounded-full bg-[#F3F3F3] px-3 py-1 text-[11px] font-bold uppercase tracking-wide text-[#111111]">
                {badge}
              </span>
            ) : null}
            <h1 className="font-display text-2xl font-bold leading-tight tracking-tight text-navy md:text-[1.75rem] lg:text-[2rem]">
              {title}
            </h1>

            <div className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-2 text-sm">
              <span className="inline-flex items-center gap-1">
                {Array.from({ length: 5 }).map((_, i) => (
                  <Star
                    key={i}
                    className={cn(
                      "h-4 w-4",
                      i < Math.round(rating) ? "fill-amber-400 text-amber-400" : "text-neutral-300",
                    )}
                  />
                ))}
                <span className="ml-1 text-[#5B6B86]">
                  {rating.toFixed(1)} ({reviewCount} {t("reviewsLabel")})
                </span>
              </span>
              <button
                type="button"
                onClick={() => wishToggle(cartKey)}
                className="inline-flex items-center gap-1.5 text-sm text-[#111111] hover:underline"
              >
                <Heart className={cn("h-4 w-4", wished ? "fill-red-500 text-red-500" : "")} />
                {wished ? t("wishlist_remove") : t("pdp_add_favorites")}
              </button>
            </div>

            {excerpt ? <p className="mt-4 text-[15px] leading-relaxed text-[#5B6B86]">{excerpt}</p> : null}

            {swatches}

            {specRows.length > 0 ? (
              <div className="mt-6 overflow-hidden rounded-xl border border-black/[0.08] bg-white">
                <p className="border-b border-black/[0.06] px-4 py-2.5 text-[11px] font-bold uppercase tracking-[0.12em] text-navy">
                  {t("product_details_title")}
                </p>
                <dl>
                  {specRows.map((row, idx) => (
                    <div
                      key={`${idx}-${row.label}`}
                      className="grid grid-cols-[8.5rem_1fr] gap-3 border-b border-black/[0.05] px-4 py-2.5 text-sm last:border-0"
                    >
                      <dt className="text-[#333333]">{row.label}</dt>
                      <dd className="font-medium text-navy">{row.value}</dd>
                    </div>
                  ))}
                </dl>
              </div>
            ) : null}

            {compatibility && compatibility.length > 0 ? (
              <div className="mt-6">
                <h3 className="text-sm font-semibold text-navy">{t("product_compatibility")}</h3>
                <div className="mt-1.5 flex flex-wrap gap-2">
                  {compatibility.map((c) =>
                    c.href ? (
                      <Link key={c.label} href={c.href} className="text-sm font-medium text-[#111111] hover:underline">
                        {c.label}
                      </Link>
                    ) : (
                      <span key={c.label} className="text-sm text-[#5B6B86]">
                        {c.label}
                      </span>
                    ),
                  )}
                </div>
              </div>
            ) : null}
          </div>

          <aside className="lg:col-span-3">
            <div className="space-y-4 rounded-2xl border border-black/[0.08] bg-white p-5 shadow-sm lg:sticky lg:top-24">
              {priceLabel ? (
                <div>
                  <p className="font-display text-3xl font-bold tabular-nums text-[#111111]">{priceLabel}</p>
                  {oldPriceLabel ? (
                    <p className="mt-0.5 text-sm text-muted-foreground line-through">{oldPriceLabel}</p>
                  ) : null}
                  {vatNote ? <p className="mt-1 text-xs text-[#333333]">{t("pdp_vat_included")}</p> : null}
                </div>
              ) : null}

              {user ? (
                inStock ? (
                  <ProductCartControls
                    cartKey={cartKey}
                    size="md"
                    buttonClassName="h-12 rounded-lg bg-[#111111] hover:bg-[#000000]"
                    preview={{ name: title, img: preferredSrc || gallery[0] || null }}
                  />
                ) : (
                  <p className="rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-800">
                    {t("notify_stock")}
                  </p>
                )
              ) : (
                <>
                  <Button asChild className="h-12 w-full rounded-lg bg-[#111111] text-white hover:bg-[#000000]">
                    <Link href={loginHref} className="inline-flex items-center justify-center gap-2">
                      <Lock className="h-4 w-4" />
                      {t("login_to_buy")}
                    </Link>
                  </Button>
                  <p className="text-center text-sm text-[#5B6B86]">
                    {t("pdp_no_account")}{" "}
                    <Link href={`/register?next=${encodeURIComponent(loc)}`} className="font-semibold text-[#111111] hover:underline">
                      {t("pdp_create_account")}
                    </Link>
                  </p>
                </>
              )}

              <div className="space-y-3 border-t border-black/[0.06] pt-4 text-sm">
                <div className="flex items-center justify-between gap-3">
                  <span className="text-[#333333]">{t("pdp_availability")}</span>
                  <span className="inline-flex items-center gap-1.5 font-medium text-navy">
                    <span className={cn("h-2 w-2 rounded-full", inStock ? "bg-emerald-500" : "bg-amber-500")} />
                    {inStock ? t("product_in_stock") : t("pdp_out_of_stock")}
                  </span>
                </div>
                <div className="flex items-center justify-between gap-3">
                  <span className="text-[#333333]">{t("pdp_ship_to")}</span>
                  <Select value={ship} onValueChange={setShip}>
                    <SelectTrigger className="h-8 w-[9.5rem] border-black/[0.1] text-sm">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="lisbon">{t("delivery_zone_lisbon")}</SelectItem>
                      <SelectItem value="portugal">{t("delivery_zone_portugal")}</SelectItem>
                      <SelectItem value="islands">{t("delivery_zone_islands")}</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="flex items-center justify-between gap-3">
                  <span className="text-[#333333]">{t("pdp_eta")}</span>
                  <span className="font-medium text-navy">{eta}</span>
                </div>
              </div>

              {!user ? (
                <div className="flex items-start gap-2.5 rounded-xl border border-black/[0.08] bg-neutral-100 p-3 text-sm text-[#5B6B86]">
                  <Lock className="mt-0.5 h-4 w-4 shrink-0 text-[#111111]" />
                  <span>{t("pdp_login_cart_hint")}</span>
                </div>
              ) : null}

              {buyExtra}

              <ul className="space-y-2.5 border-t border-black/[0.06] pt-4 text-[13px] text-[#5B6B86]">
                <li className="flex items-center gap-2.5">
                  <ShieldCheck className="h-4 w-4 shrink-0 text-[#111111]" />
                  {t("pdp_secure")}
                </li>
                <li className="flex items-center gap-2.5">
                  <BadgeCheck className="h-4 w-4 shrink-0 text-[#111111]" />
                  {t("pdp_quality")}
                </li>
                <li>
                  <a
                    href={whatsappChatHref(`Olá, tenho uma dúvida sobre: ${title}`)}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-2.5 hover:text-[#111111]"
                  >
                    <MessageCircle className="h-4 w-4 shrink-0 text-emerald-600" />
                    {t("pdp_whatsapp_help")}
                  </a>
                </li>
              </ul>
            </div>
          </aside>
        </div>

        <div className="mt-10 grid grid-cols-2 gap-4 rounded-2xl border border-black/[0.08] bg-white px-4 py-5 sm:grid-cols-4 sm:px-8">
          {[
            { icon: Truck, label: t("pdp_ship_fast") },
            { icon: Clock, label: t("pdp_returns") },
            { icon: Star, label: t("pdp_originals") },
            { icon: UserRound, label: t("pdp_support") },
          ].map(({ icon: Icon, label }) => (
            <div key={label} className="flex items-start gap-3">
              <span className="mt-0.5 inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-[#F3F3F3] text-[#111111]">
                <Icon className="h-4 w-4" />
              </span>
              <p className="text-[13px] font-medium leading-snug text-navy">{label}</p>
            </div>
          ))}
        </div>

        <section className="mt-10 rounded-2xl border border-black/[0.08] bg-white px-5 py-6 sm:px-8 sm:py-8">
          <div className="mb-6 flex flex-wrap gap-6 border-b border-black/[0.08]">
            {(
              [
                ["desc", t("pdp_tab_desc")],
                ["info", t("pdp_tab_info")],
                ["reviews", `${t("pdp_tab_reviews")} (${reviewCount})`],
              ] as const
            ).map(([id, label]) => (
              <button
                key={id}
                type="button"
                onClick={() => setTab(id)}
                className={cn(
                  "-mb-px border-b-2 pb-3 text-sm font-semibold transition-colors",
                  tab === id ? "border-[#111111] text-navy" : "border-transparent text-[#333333] hover:text-navy",
                )}
              >
                {label}
              </button>
            ))}
          </div>

          {tab === "desc" ? (
            descriptionHtml ? (
              <div
                className="prose prose-neutral max-w-none text-[15px] leading-relaxed text-black prose-headings:font-display prose-headings:text-navy prose-a:text-[#111111] prose-li:marker:text-[#111111]"
                dangerouslySetInnerHTML={{ __html: descriptionHtml }}
              />
            ) : (
              <p className="text-sm text-muted-foreground">{t("pdp_no_description")}</p>
            )
          ) : null}

          {tab === "info" ? (
            extraInfo ??
            (specRows.length > 0 ? (
              <table className="w-full max-w-xl text-sm">
                <tbody>
                  {specRows.map((row, idx) => (
                    <tr key={`info-${idx}`} className="border-b border-black/[0.06]">
                      <th className="w-[40%] py-2.5 pr-4 text-left font-medium text-[#333333]">{row.label}</th>
                      <td className="py-2.5 text-navy">{row.value}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            ) : (
              <p className="text-sm text-muted-foreground">{t("pdp_no_description")}</p>
            ))
          ) : null}

          {tab === "reviews" ? (
            <p className="py-8 text-center text-sm text-[#333333]">{t("pdp_no_reviews")}</p>
          ) : null}
        </section>

        {below}
      </div>
    </div>
  );
}
