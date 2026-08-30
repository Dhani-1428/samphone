import { FormEvent, useState } from "react";
import { Link, useLocation, useSearch } from "wouter";
import { Eye, EyeOff } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { useLang } from "@/contexts/LanguageContext";
import { nextPathFromSearch } from "@/lib/safeRedirect";
import { cloudAuth, patchCloudProfile } from "@/lib/samphone-cloud";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";

const REGISTER_BOY_VIDEO = "/video/register-boy.mp4";

function RequiredLabel({ htmlFor, children }: { htmlFor: string; children: string }) {
  return (
    <Label htmlFor={htmlFor} className="typo-form-label text-[#111111]">
      {children} <span className="text-red-500">*</span>
    </Label>
  );
}

function PasswordField({
  id,
  label,
  value,
  onChange,
  autoComplete,
}: {
  id: string;
  label: string;
  value: string;
  onChange: (v: string) => void;
  autoComplete: string;
}) {
  const [show, setShow] = useState(false);
  return (
    <div className="space-y-1.5">
      <RequiredLabel htmlFor={id}>{label}</RequiredLabel>
      <div className="relative">
        <Input
          id={id}
          type={show ? "text" : "password"}
          autoComplete={autoComplete}
          required
          minLength={8}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          className="h-11 rounded-md border-black/[0.14] bg-white pr-11 shadow-none"
        />
        <button
          type="button"
          onClick={() => setShow((v) => !v)}
          className="absolute right-2.5 top-1/2 -translate-y-1/2 text-neutral-400 hover:text-neutral-700"
          aria-label={show ? "Hide password" : "Show password"}
        >
          {show ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
        </button>
      </div>
    </div>
  );
}

export default function Register() {
  const { t } = useLang();
  const { login } = useAuth();
  const [, setLocation] = useLocation();
  const search = useSearch();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [phone, setPhone] = useState("");
  const [vatNumber, setVatNumber] = useState("");
  const [businessName, setBusinessName] = useState("");
  const [address, setAddress] = useState("");
  const [postal, setPostal] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const next = nextPathFromSearch(search);

  const fieldClass = "h-11 rounded-md border-black/[0.14] bg-white shadow-none";

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    const em = email.trim();
    if (!em || !password || !phone.trim() || !vatNumber.trim() || !businessName.trim() || !address.trim() || !postal.trim()) {
      setError(t("loginForPricing"));
      return;
    }
    if (password !== confirm) {
      setError(t("reg_password_mismatch"));
      return;
    }
    setBusy(true);
    setError(null);
    try {
      const result = await cloudAuth("/auth/register", {
        email: em,
        password,
        name: businessName.trim(),
        account_type: "b2b",
        phone: phone.trim(),
        address: address.trim(),
        postal_code: postal.trim(),
        business_name: businessName.trim(),
        vat_number: vatNumber.trim(),
        nif: vatNumber.trim(),
        vat: vatNumber.trim(),
        business_type: "repair_shop",
        company_address: address.trim(),
      });
      login({
        ...result,
        token: result.token ?? undefined,
        accountType: "b2b",
      });
      await patchCloudProfile({
        name: businessName.trim(),
        phone: phone.trim(),
        address: address.trim(),
        postal_code: postal.trim(),
        account_type: "b2b",
        business_name: businessName.trim(),
        vat_number: vatNumber.trim(),
        business_type: "repair_shop",
        company_address: address.trim(),
      }).catch(() => null);
      setLocation(next);
    } catch (err) {
      setError(err instanceof Error ? err.message : t("auth_submit_register"));
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="bg-white">
      <div className="mx-auto grid min-h-[calc(100dvh-var(--site-header-h,9rem))] w-full max-w-[1400px] lg:grid-cols-2">
        <div className="relative hidden overflow-hidden bg-white lg:block">
          <div className="absolute inset-0">
            <video
              src={REGISTER_BOY_VIDEO}
              autoPlay
              loop
              muted
              playsInline
              preload="metadata"
              aria-hidden
              className="pointer-events-none absolute left-0 top-1/2 h-[130%] w-[210%] max-w-none -translate-y-1/2 object-cover object-[0%_48%]"
            />
          </div>
          <p className="absolute bottom-10 left-10 max-w-sm text-sm font-medium text-neutral-400">
            {t("reg_hero_line")}
          </p>
        </div>

        <div className="relative mx-auto mt-6 aspect-[4/3] w-[min(22rem,80vw)] overflow-hidden lg:hidden">
          <video
            src={REGISTER_BOY_VIDEO}
            autoPlay
            loop
            muted
            playsInline
            preload="metadata"
            aria-hidden
            className="pointer-events-none absolute left-0 top-0 h-[140%] w-[200%] max-w-none object-cover object-[0%_42%]"
          />
        </div>

        <div className="flex items-start justify-center px-5 py-10 sm:px-10 lg:px-14 lg:py-12">
          <form onSubmit={handleSubmit} className="w-full max-w-md space-y-4">
            <div className="space-y-1.5">
              <RequiredLabel htmlFor="reg-email">{t("reg_user_email")}</RequiredLabel>
              <Input
                id="reg-email"
                type="email"
                autoComplete="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className={fieldClass}
              />
            </div>
            <PasswordField
              id="reg-password"
              label={t("reg_user_password")}
              value={password}
              onChange={setPassword}
              autoComplete="new-password"
            />
            <PasswordField
              id="reg-confirm"
              label={t("reg_confirm_password")}
              value={confirm}
              onChange={setConfirm}
              autoComplete="new-password"
            />
            <div className="space-y-1.5">
              <RequiredLabel htmlFor="reg-phone">{t("reg_mobile")}</RequiredLabel>
              <Input
                id="reg-phone"
                required
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                placeholder="e.g. +351 912 345 678"
                className={fieldClass}
              />
            </div>
            <div className="space-y-1.5">
              <RequiredLabel htmlFor="reg-nif">{t("reg_nif")}</RequiredLabel>
              <Input
                id="reg-nif"
                required
                value={vatNumber}
                onChange={(e) => setVatNumber(e.target.value)}
                className={fieldClass}
              />
            </div>
            <div className="space-y-1.5">
              <RequiredLabel htmlFor="reg-company">{t("reg_company_shop")}</RequiredLabel>
              <Input
                id="reg-company"
                required
                value={businessName}
                onChange={(e) => setBusinessName(e.target.value)}
                placeholder={t("reg_company_placeholder")}
                className={fieldClass}
              />
            </div>
            <div className="space-y-1.5">
              <RequiredLabel htmlFor="reg-address">{t("reg_shop_address")}</RequiredLabel>
              <Input
                id="reg-address"
                required
                value={address}
                onChange={(e) => setAddress(e.target.value)}
                placeholder={t("reg_address_placeholder")}
                className={fieldClass}
              />
            </div>
            <div className="space-y-1.5">
              <RequiredLabel htmlFor="reg-postal">{t("reg_postal")}</RequiredLabel>
              <Input
                id="reg-postal"
                required
                value={postal}
                onChange={(e) => setPostal(e.target.value)}
                className={fieldClass}
              />
            </div>
            {error ? <p className="text-sm text-red-600">{error}</p> : null}
            <button
              type="submit"
              disabled={busy}
              className={cn(
                "h-12 w-full rounded-md bg-[#1F4E9E] text-sm font-extrabold uppercase tracking-wide text-white hover:bg-[#1A4286] disabled:opacity-60",
              )}
            >
              {busy ? t("woo_loading") : t("auth_submit_register")}
            </button>
            <p className="text-center text-sm text-muted-foreground">
              {t("auth_has_account")}{" "}
              <Link href={`/login${search || ""}`} className="font-semibold text-[#1F4E9E] hover:underline">
                {t("login")}
              </Link>
            </p>
          </form>
        </div>
      </div>
    </div>
  );
}
