import { FormEvent, useMemo, useState } from "react";
import { useLocation, useSearch } from "wouter";
import { Eye, EyeOff } from "lucide-react";
import {
  isValidE164,
  PHONE_COUNTRIES,
  PhoneField,
  RegisterOtpStep,
  RegisterShell,
  RegisterSocialButtons,
  RegisterTermsCheckbox,
  toE164,
} from "@/components/RegisterAuthExtras";
import { useAuth } from "@/contexts/AuthContext";
import { useLang } from "@/contexts/LanguageContext";
import { nextPathFromSearch } from "@/lib/safeRedirect";
import { cloudAuth, patchCloudProfile } from "@/lib/samphone-cloud";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";

function PasswordField({
  id,
  label,
  placeholder,
  value,
  onChange,
  autoComplete,
}: {
  id: string;
  label: string;
  placeholder: string;
  value: string;
  onChange: (v: string) => void;
  autoComplete: string;
}) {
  const [show, setShow] = useState(false);
  return (
    <div className="space-y-1.5">
      <Label htmlFor={id} className="typo-form-label text-[#111111]">
        {label} <span className="text-red-500">*</span>
      </Label>
      <div className="relative">
        <Input
          id={id}
          type={show ? "text" : "password"}
          autoComplete={autoComplete}
          required
          minLength={8}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={placeholder}
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

type PendingAuth = {
  result: Awaited<ReturnType<typeof cloudAuth>>;
  email: string;
};

export default function RegisterBusiness() {
  const { t } = useLang();
  const { login } = useAuth();
  const [, setLocation] = useLocation();
  const search = useSearch();
  const next = nextPathFromSearch(search);

  const [countryCode, setCountryCode] = useState("PT");
  const [vatDigits, setVatDigits] = useState("");
  const [businessName, setBusinessName] = useState("");
  const [email, setEmail] = useState("");
  const [dial, setDial] = useState("+351");
  const [national, setNational] = useState("");
  const [businessType, setBusinessType] = useState("");
  const [street, setStreet] = useState("");
  const [postal, setPostal] = useState("");
  const [city, setCity] = useState("");
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [agreed, setAgreed] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [mobileFocus, setMobileFocus] = useState(false);
  const [otpStep, setOtpStep] = useState(false);
  const [otpCode, setOtpCode] = useState("");
  const [pending, setPending] = useState<PendingAuth | null>(null);

  const country = useMemo(
    () => PHONE_COUNTRIES.find((c) => c.code === countryCode) ?? PHONE_COUNTRIES[0],
    [countryCode],
  );

  const finish = (auth: PendingAuth) => {
    login({
      ...auth.result,
      token: auth.result.token ?? undefined,
      accountType: "b2b",
      wholesaleStatus: auth.result.wholesaleStatus || "pending",
      isWholesale: Boolean(auth.result.isWholesale),
    });
    setLocation(next === "/" ? "/account" : next);
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    const em = email.trim();
    const company = businessName.trim();
    const phone = toE164(dial, national);
    const vat = `${country.code}${vatDigits.replace(/\D/g, "")}`;

    if (!em || !company || !street.trim() || !postal.trim() || !city.trim() || !vatDigits.trim() || !businessType) {
      setError(t("reg_required_fields"));
      return;
    }
    if (!phone || !isValidE164(phone)) {
      setError(t("reg_invalid_phone"));
      return;
    }
    if (password.length < 8) {
      setError(t("reg_password_min"));
      return;
    }
    if (password !== confirm) {
      setError(t("reg_password_mismatch"));
      return;
    }
    if (!agreed) {
      setError(t("reg_agree_required"));
      return;
    }

    setBusy(true);
    setError(null);
    try {
      const result = await cloudAuth("/auth/register", {
        email: em,
        password,
        name: company,
        account_type: "b2b",
        phone,
        country: country.code,
        address: street.trim(),
        city: city.trim(),
        postal_code: postal.trim(),
        business_name: company,
        vat_number: vat,
        nif: vat,
        vat,
        business_type: businessType,
        company_address: `${street.trim()}, ${postal.trim()} ${city.trim()}, ${country.name}`,
      });
      await patchCloudProfile({
        name: company,
        phone,
        address: street.trim(),
        city: city.trim(),
        postal_code: postal.trim(),
        country: country.code,
        account_type: "b2b",
        business_name: company,
        vat_number: vat,
        business_type: businessType,
        company_address: street.trim(),
      }).catch(() => null);
      setPending({ result, email: em });
      setOtpStep(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : t("auth_submit_register"));
    } finally {
      setBusy(false);
    }
  };

  const verifyOtp = () => {
    if (!pending || otpCode.length < 4) {
      setError(t("reg_otp_invalid"));
      return;
    }
    finish(pending);
  };

  if (otpStep && pending) {
    return (
      <RegisterShell title={t("reg_otp_title")} switchHref="/register" switchLabel={t("reg_switch_personal")}>
        <RegisterOtpStep
          channel="email"
          destination={pending.email}
          code={otpCode}
          onCode={setOtpCode}
          onVerify={verifyOtp}
          busy={busy}
          error={error}
        />
        <p className="text-center text-xs text-muted-foreground">{t("register_pending_wholesale")}</p>
      </RegisterShell>
    );
  }

  return (
    <RegisterShell title={t("reg_b2b_title")} switchHref="/register" switchLabel={t("reg_switch_personal")}>
      <RegisterSocialButtons
        accountType="b2b"
        redirectPath={`/register/business${search || ""}`}
        onMobileOtp={() => setMobileFocus(true)}
      />

      <p className="text-center text-xs font-semibold uppercase tracking-wide text-muted-foreground">
        {t("auth_or_email")}
      </p>

      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="space-y-1.5">
          <Label htmlFor="reg-country" className="typo-form-label text-[#111111]">
            {t("reg_country")} <span className="text-red-500">*</span>
          </Label>
          <select
            id="reg-country"
            required
            value={countryCode}
            onChange={(e) => {
              const c = PHONE_COUNTRIES.find((x) => x.code === e.target.value) ?? PHONE_COUNTRIES[0];
              setCountryCode(c.code);
              setDial(c.dial);
            }}
            className="h-11 w-full rounded-md border border-black/[0.14] bg-white px-3 text-sm"
          >
            {PHONE_COUNTRIES.map((c) => (
              <option key={c.code} value={c.code}>
                {c.flag} {c.name}
              </option>
            ))}
          </select>
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="reg-nif" className="typo-form-label text-[#111111]">
            {t("reg_nif")} <span className="text-red-500">*</span>
          </Label>
          <div className="flex gap-2">
            <span className="inline-flex h-11 w-16 shrink-0 items-center justify-center rounded-md border border-black/[0.14] bg-neutral-50 text-sm font-semibold">
              {country.code}
            </span>
            <Input
              id="reg-nif"
              required
              value={vatDigits}
              onChange={(e) => setVatDigits(e.target.value)}
              placeholder={t("reg_nif_placeholder")}
              className="h-11 rounded-md border-black/[0.14] bg-white shadow-none"
            />
          </div>
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="reg-company" className="typo-form-label text-[#111111]">
            {t("register_company")} <span className="text-red-500">*</span>
          </Label>
          <Input
            id="reg-company"
            required
            value={businessName}
            onChange={(e) => setBusinessName(e.target.value)}
            placeholder={t("reg_business_name_placeholder")}
            className="h-11 rounded-md border-black/[0.14] bg-white shadow-none"
          />
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="reg-biz-email" className="typo-form-label text-[#111111]">
            {t("reg_business_email")} <span className="text-red-500">*</span>
          </Label>
          <Input
            id="reg-biz-email"
            type="email"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder={t("reg_business_email_placeholder")}
            autoComplete="email"
            className="h-11 rounded-md border-black/[0.14] bg-white shadow-none"
          />
        </div>

        <div className={cn(mobileFocus && "rounded-md ring-2 ring-sam/40")}>
          <PhoneField
            dialCode={dial}
            onDialChange={(d, code) => {
              setDial(d);
              setCountryCode(code);
            }}
            national={national}
            onNationalChange={setNational}
          />
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="reg-category" className="typo-form-label text-[#111111]">
            {t("register_business_type")} <span className="text-red-500">*</span>
          </Label>
          <select
            id="reg-category"
            required
            value={businessType}
            onChange={(e) => setBusinessType(e.target.value)}
            className="h-11 w-full rounded-md border border-black/[0.14] bg-white px-3 text-sm"
          >
            <option value="">{t("reg_category_placeholder")}</option>
            <option value="repair_shop">{t("register_type_repair")}</option>
            <option value="reseller">{t("register_type_reseller")}</option>
            <option value="distributor">{t("register_type_distributor")}</option>
            <option value="other">{t("register_type_other")}</option>
          </select>
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="reg-street" className="typo-form-label text-[#111111]">
            {t("reg_street")} <span className="text-red-500">*</span>
          </Label>
          <Input
            id="reg-street"
            required
            value={street}
            onChange={(e) => setStreet(e.target.value)}
            placeholder={t("reg_street_placeholder")}
            className="h-11 rounded-md border-black/[0.14] bg-white shadow-none"
          />
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div className="space-y-1.5">
            <Label htmlFor="reg-postal" className="typo-form-label text-[#111111]">
              {t("reg_postal")} <span className="text-red-500">*</span>
            </Label>
            <Input
              id="reg-postal"
              required
              value={postal}
              onChange={(e) => setPostal(e.target.value)}
              placeholder={t("reg_postal_placeholder")}
              className="h-11 rounded-md border-black/[0.14] bg-white shadow-none"
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="reg-city" className="typo-form-label text-[#111111]">
              {t("reg_city")} <span className="text-red-500">*</span>
            </Label>
            <Input
              id="reg-city"
              required
              value={city}
              onChange={(e) => setCity(e.target.value)}
              placeholder={t("reg_city_placeholder")}
              className="h-11 rounded-md border-black/[0.14] bg-white shadow-none"
            />
          </div>
        </div>

        <PasswordField
          id="reg-password"
          label={t("reg_user_password")}
          placeholder={t("reg_password_placeholder")}
          value={password}
          onChange={setPassword}
          autoComplete="new-password"
        />
        <PasswordField
          id="reg-confirm"
          label={t("reg_confirm_password")}
          placeholder={t("reg_confirm_placeholder")}
          value={confirm}
          onChange={setConfirm}
          autoComplete="new-password"
        />

        <RegisterTermsCheckbox checked={agreed} onChange={setAgreed} />
        <p className="text-sm text-muted-foreground">{t("register_pending_wholesale")}</p>

        {error ? <p className="text-sm text-red-600">{error}</p> : null}

        <button
          type="submit"
          disabled={busy}
          className="h-12 w-full rounded-md bg-brand text-sm font-extrabold uppercase tracking-wide text-white hover:bg-brand-dark disabled:opacity-60"
        >
          {busy ? t("woo_loading") : t("reg_b2b_submit")}
        </button>
      </form>
    </RegisterShell>
  );
}
