import { Link } from "wouter";
import { useAuth } from "@/contexts/AuthContext";
import { useLang } from "@/contexts/LanguageContext";
import { dealerTierDiscountPercent, seesWholesalePrices } from "@/lib/customer-price";

export default function WholesaleStatusBanner() {
  const { user } = useAuth();
  const { t } = useLang();
  if (!user || (user.accountType || "").toLowerCase() !== "b2b") return null;
  if (seesWholesalePrices(user)) {
    const tier = user.dealerTier || "Bronze";
    const pct = dealerTierDiscountPercent(tier);
    return (
      <div className="bg-[#F3F3F3] px-4 py-2 text-center text-sm text-[#111111]">
        {t("wholesale_approved_banner", { tier: `${tier} (−${pct}%)` })}
      </div>
    );
  }
  const status = (user.wholesaleStatus || "pending").toLowerCase();
  const key =
    status === "rejected" ? "wholesale_rejected_banner" : status === "suspended" ? "wholesale_suspended_banner" : "wholesale_pending_banner";
  return (
    <div className="bg-amber-50 px-4 py-2 text-center text-sm text-amber-900">
      {t(key)}{" "}
      <Link href="/account?section=vat" className="font-semibold underline">
        {t("account_nav_vat")}
      </Link>
    </div>
  );
}
