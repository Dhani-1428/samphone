import { FormEvent, useState } from "react";
import { Link, useLocation, useSearch } from "wouter";
import { useAuth } from "@/contexts/AuthContext";
import { useLang } from "@/contexts/LanguageContext";
import { nextPathFromSearch } from "@/lib/safeRedirect";
import { cloudAuth } from "@/lib/samphone-cloud";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export default function Register() {
  const { t } = useLang();
  const { login } = useAuth();
  const [, setLocation] = useLocation();
  const search = useSearch();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [accountType, setAccountType] = useState<"b2c" | "b2b">("b2c");
  const [businessName, setBusinessName] = useState("");
  const [vatNumber, setVatNumber] = useState("");
  const [businessType, setBusinessType] = useState("");
  const [phone, setPhone] = useState("");
  const [address, setAddress] = useState("");
  const [city, setCity] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    const em = email.trim();
    if (!em || !password) {
      setError(t("loginForPricing"));
      return;
    }
    setBusy(true);
    setError(null);
    try {
      const result = await cloudAuth("/auth/register", {
        email: em,
        password,
        name: name.trim() || em.split("@")[0],
        accountType: accountType,
        account_type: accountType,
        ...(accountType === "b2b"
          ? {
              businessName: businessName.trim(),
              vatNumber: vatNumber.trim(),
              vat: vatNumber.trim(),
              nif: vatNumber.trim(),
              businessType: businessType.trim() || "retailer",
              phone: phone.trim(),
              address: address.trim(),
              city: city.trim(),
              company_name: businessName.trim(),
            }
          : {}),
      });
      login({
        email: result.email || em,
        name: result.name,
        token: result.token ?? undefined,
        isWholesale: result.isWholesale,
        wholesaleStatus: result.wholesaleStatus,
        accountType: result.accountType || accountType,
        dealerTier: result.dealerTier,
        phone: result.phone,
      });
      setLocation(nextPathFromSearch(search));
    } catch (err) {
      setError(err instanceof Error ? err.message : t("auth_submit_register"));
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="flex min-h-[70vh] items-center justify-center px-4 py-16">
      <div className="w-full max-w-md rounded-xl bg-white p-8 shadow-sm ring-1 ring-black/[0.04]">
        <h1 className="font-display text-2xl font-bold text-navy">{t("auth_register_title")}</h1>
        <p className="mt-1 text-sm text-muted-foreground">{t("loginForPricing")}</p>
        <form onSubmit={handleSubmit} className="mt-6 space-y-4">
          <div className="space-y-2">
            <Label>{t("register_account_type")}</Label>
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                className={`h-10 rounded-md text-sm font-semibold ${accountType === "b2c" ? "bg-[#5A73A8] text-white" : "bg-[#F4F6F8] text-navy"}`}
                onClick={() => setAccountType("b2c")}
              >
                {t("register_personal")}
              </button>
              <button
                type="button"
                className={`h-10 rounded-md text-sm font-semibold ${accountType === "b2b" ? "bg-[#5A73A8] text-white" : "bg-[#F4F6F8] text-navy"}`}
                onClick={() => setAccountType("b2b")}
              >
                {t("register_business")}
              </button>
            </div>
          </div>
          <div className="space-y-2">
            <Label htmlFor="reg-name">{t("auth_name")}</Label>
            <Input id="reg-name" value={name} onChange={(e) => setName(e.target.value)} className="h-11 bg-[#F4F6F8]" />
          </div>
          <div className="space-y-2">
            <Label htmlFor="reg-email">{t("auth_email")}</Label>
            <Input
              id="reg-email"
              type="email"
              autoComplete="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="h-11 bg-[#F4F6F8]"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="reg-password">{t("auth_password")}</Label>
            <Input
              id="reg-password"
              type="password"
              autoComplete="new-password"
              required
              minLength={8}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="h-11 bg-[#F4F6F8]"
            />
          </div>
          {accountType === "b2b" ? (
            <>
              <div className="space-y-2">
                <Label htmlFor="reg-company">{t("register_company")}</Label>
                <Input id="reg-company" required value={businessName} onChange={(e) => setBusinessName(e.target.value)} className="h-11 bg-[#F4F6F8]" />
              </div>
              <div className="space-y-2">
                <Label htmlFor="reg-vat">{t("register_vat")}</Label>
                <Input id="reg-vat" required value={vatNumber} onChange={(e) => setVatNumber(e.target.value)} className="h-11 bg-[#F4F6F8]" />
              </div>
              <div className="space-y-2">
                <Label htmlFor="reg-btype">{t("register_business_type")}</Label>
                <Input id="reg-btype" value={businessType} onChange={(e) => setBusinessType(e.target.value)} placeholder="retailer" className="h-11 bg-[#F4F6F8]" />
              </div>
              <div className="space-y-2">
                <Label htmlFor="reg-phone">{t("checkout_phone")}</Label>
                <Input id="reg-phone" required value={phone} onChange={(e) => setPhone(e.target.value)} className="h-11 bg-[#F4F6F8]" />
              </div>
              <div className="space-y-2">
                <Label htmlFor="reg-address">{t("checkout_address")}</Label>
                <Input id="reg-address" required value={address} onChange={(e) => setAddress(e.target.value)} className="h-11 bg-[#F4F6F8]" />
              </div>
              <div className="space-y-2">
                <Label htmlFor="reg-city">{t("checkout_city")}</Label>
                <Input id="reg-city" required value={city} onChange={(e) => setCity(e.target.value)} className="h-11 bg-[#F4F6F8]" />
              </div>
              <p className="text-xs text-muted-foreground">{t("register_pending_wholesale")}</p>
            </>
          ) : null}
          {error ? <p className="text-sm text-red-600">{error}</p> : null}
          <Button type="submit" disabled={busy} className="h-11 w-full bg-[#5A73A8] text-white hover:bg-[#4A6494]">
            {busy ? t("woo_loading") : t("auth_submit_register")}
          </Button>
          <p className="text-center text-sm text-muted-foreground">
            {t("auth_has_account")}{" "}
            <Link
              href={`/login${search || ""}`}
              className="font-semibold text-[#5A73A8] hover:underline"
            >
              {t("login")}
            </Link>
          </p>
        </form>
      </div>
    </div>
  );
}
