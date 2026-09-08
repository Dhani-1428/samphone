import { Star } from "lucide-react";
import { useLang } from "@/contexts/LanguageContext";
import { buildProductReviews, type ProductReview } from "@/lib/product-reviews";

function Stars5({ className = "h-4 w-4" }: { className?: string }) {
  return (
    <span className="inline-flex items-center gap-0.5" aria-label="5 / 5">
      {Array.from({ length: 5 }).map((_, i) => (
        <Star key={i} className={`${className} fill-amber-400 text-amber-400`} />
      ))}
    </span>
  );
}

function initials(name: string): string {
  return name
    .split(" ")
    .slice(0, 2)
    .map((p) => p[0])
    .join("")
    .toUpperCase();
}

function ReviewCard({ review, verified }: { review: ProductReview; verified: string }) {
  return (
    <article className="product-page-copy border border-black/[0.08] bg-[#FAFBFC] p-4 sm:p-5">
      <div className="flex items-start gap-3">
        <span className="flex h-11 w-11 shrink-0 items-center justify-center bg-[#2050B3] text-[13px] font-medium uppercase tracking-wide text-white">
          {initials(review.name)}
        </span>
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <p className="text-[15px] font-medium text-black">{review.name}</p>
            <time className="text-xs text-[#5B6B86]">{review.date}</time>
          </div>
          <p className="mt-0.5 text-xs text-[#5B6B86]">
            {review.city} · {verified}
          </p>
          <div className="mt-2">
            <Stars5 />
          </div>
          <h3 className="mt-2 text-[15px] font-medium uppercase tracking-[0.06em] text-black">{review.title}</h3>
          <p className="mt-1.5 text-sm font-medium leading-relaxed text-[#222222]">{review.body}</p>
        </div>
      </div>
    </article>
  );
}

export default function ProductReviews({ seed, productName }: { seed: string; productName: string }) {
  const { t, lang } = useLang();
  const { rating, count, items } = buildProductReviews(seed, productName, lang === "pt" ? "pt" : "en");

  return (
    <div className="product-page-copy">
      <div className="mb-6 grid gap-6 border border-black/[0.08] bg-[#F4F6F8] p-5 sm:grid-cols-[auto_1fr] sm:items-center sm:p-6">
        <div className="text-center sm:px-6">
          <p className="text-5xl font-medium tabular-nums leading-none text-black">{rating}.0</p>
          <div className="mt-2 flex justify-center">
            <Stars5 className="h-5 w-5" />
          </div>
          <p className="mt-2 text-sm font-medium text-[#333333]">
            {t("pdp_reviews_out_of")} · {count} {t("reviewsLabel")}
          </p>
        </div>
        <div className="space-y-2">
          {[5, 4, 3, 2, 1].map((star) => (
            <div key={star} className="flex items-center gap-3 text-sm">
              <span className="w-8 tabular-nums text-[#333333]">{star}★</span>
              <div className="h-2 flex-1 bg-black/[0.08]">
                <div className="h-2 bg-amber-400" style={{ width: star === 5 ? "100%" : "0%" }} />
              </div>
              <span className="w-10 text-right tabular-nums text-[#5B6B86]">{star === 5 ? "100%" : "0%"}</span>
            </div>
          ))}
        </div>
      </div>
      <div className="grid gap-3">
        {items.map((review) => (
          <ReviewCard key={review.id} review={review} verified={t("pdp_review_verified")} />
        ))}
      </div>
    </div>
  );
}

export function ProductRatingRow({ seed, productName }: { seed: string; productName: string }) {
  const { t, lang } = useLang();
  const { rating, count } = buildProductReviews(seed, productName, lang === "pt" ? "pt" : "en");
  return (
    <span className="product-page-copy inline-flex items-center gap-1">
      <Stars5 />
      <span className="ml-1 text-sm font-medium text-[#333333]">
        {rating}.0 ({count} {t("reviewsLabel")})
      </span>
    </span>
  );
}
