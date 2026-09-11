import { Link } from "wouter";
import { LEGAL_LINKS } from "@/config/samphone";
import { useLang } from "@/contexts/LanguageContext";
import { isClerkEnabled } from "@/lib/clerk-runtime";
import { cn } from "@/lib/utils";
import { Smartphone } from "lucide-react";
import { AuthSocialCircles } from "@/components/AuthSocialCircles";
import { ClerkSocialHost } from "@/components/ClerkSocialHost";

export const PHONE_COUNTRIES = [
  { code: "PT", name: "Portugal", dial: "+351", flag: "🇵🇹" },
  { code: "ES", name: "Spain", dial: "+34", flag: "🇪🇸" },
  { code: "FR", name: "France", dial: "+33", flag: "🇫🇷" },
  { code: "DE", name: "Germany", dial: "+49", flag: "🇩🇪" },
  { code: "NL", name: "Netherlands", dial: "+31", flag: "🇳🇱" },
  { code: "BE", name: "Belgium", dial: "+32", flag: "🇧🇪" },
  { code: "IT", name: "Italy", dial: "+39", flag: "🇮🇹" },
  { code: "GB", name: "United Kingdom", dial: "+44", flag: "🇬🇧" },
  { code: "US", name: "United States", dial: "+1", flag: "🇺🇸" },
  { code: "IN", name: "India", dial: "+91", flag: "🇮🇳" },
  { code: "PK", name: "Pakistan", dial: "+92", flag: "🇵🇰" },
  { code: "BR", name: "Brazil", dial: "+55", flag: "🇧🇷" },
] as const;

export function toE164(dial: string, national: string): string | null {
  const digits = national.replace(/\D/g, "").replace(/^0+/, "");
  if (digits.length < 6) return null;
  const d = dial.startsWith("+") ? dial : `+${dial}`;
  return `${d}${digits}`;
}

export function isValidE164(value: string): boolean {
  return /^\+[1-9]\d{7,14}$/.test(value.trim());
}

type SocialProps = {
  accountType: "b2c" | "b2b";
  redirectPath: string;
  onMobileOtp: () => void;
};

function ClerkSocialButtons({ redirectPath, onMobileOtp }: SocialProps) {
  const complete = redirectPath.startsWith("/auth/continue")
    ? redirectPath
    : `/auth/continue?next=${encodeURIComponent(redirectPath)}`;
  return (
    <div className="flex items-center justify-center gap-4">
      <ClerkSocialHost mode="sign-up" completeUrl={complete} />
      <button
        type="button"
        className="flex h-12 w-12 items-center justify-center rounded-full border border-black/[0.12] bg-white shadow-sm hover:bg-neutral-50"
        onClick={onMobileOtp}
        aria-label="Phone"
      >
        <Smartphone className="h-5 w-5 text-[#111]" strokeWidth={1.75} />
      </button>
    </div>
  );
}

function FallbackSocialButtons({ onMobileOtp }: Pick<SocialProps, "onMobileOtp">) {
  return (
    <AuthSocialCircles
      onGoogle={() => {
        window.location.href = "/login";
      }}
      onApple={() => {
        window.location.href = "/login";
      }}
      onPhone={onMobileOtp}
    />
  );
}

export function RegisterSocialButtons(props: SocialProps) {
  if (isClerkEnabled()) return <ClerkSocialButtons {...props} />;
  return <FallbackSocialButtons onMobileOtp={props.onMobileOtp} />;
}

type TermsProps = {
  checked: boolean;
  onChange: (v: boolean) => void;
};

export function RegisterTermsCheckbox({ checked, onChange }: TermsProps) {
  const { t } = useLang();
  return (
    <label className="flex cursor-pointer items-start gap-2.5 text-sm text-[#333333]">
      <input
        type="checkbox"
        checked={checked}
        onChange={(e) => onChange(e.target.checked)}
        className="mt-1 accent-brand"
        required
      />
      <span>
        {t("reg_agree_prefix")}{" "}
        <Link href={LEGAL_LINKS.terms} className="font-semibold text-brand hover:underline">
          {t("footer_terms")}
        </Link>{" "}
        {t("reg_agree_and")}{" "}
        <Link href={LEGAL_LINKS.privacy} className="font-semibold text-brand hover:underline">
          {t("footer_privacy")}
        </Link>
      </span>
    </label>
  );
}

type OtpProps = {
  channel: "email" | "phone";
  destination: string;
  code: string;
  onCode: (v: string) => void;
  onVerify: () => void;
  busy?: boolean;
  error?: string | null;
};

export function RegisterOtpStep({ channel, destination, code, onCode, onVerify, busy, error }: OtpProps) {
  const { t } = useLang();
  return (
    <div className="space-y-4">
      <div>
        <h2 className="font-display text-xl font-bold text-navy">{t("reg_otp_title")}</h2>
        <p className="mt-1 text-sm text-muted-foreground">
          {t("reg_otp_sent", {
            channel: channel === "email" ? t("auth_email") : t("reg_mobile"),
            to: destination,
          })}
        </p>
      </div>
      <input
        type="text"
        inputMode="numeric"
        autoComplete="one-time-code"
        value={code}
        onChange={(e) => onCode(e.target.value.replace(/\D/g, "").slice(0, 8))}
        placeholder={t("reg_otp_placeholder")}
        className="h-11 w-full rounded-md border border-black/[0.14] px-3 text-center text-lg tracking-[0.35em]"
      />
      {error ? <p className="text-sm text-red-600">{error}</p> : null}
      <button
        type="button"
        disabled={busy || code.length < 4}
        onClick={onVerify}
        className={cn(
          "h-12 w-full rounded-md bg-brand text-sm font-extrabold uppercase tracking-wide text-white hover:bg-brand-dark disabled:opacity-60",
        )}
      >
        {busy ? t("woo_loading") : t("reg_otp_verify")}
      </button>
    </div>
  );
}

export function RegisterAccountToggle({ mode }: { mode: "personal" | "business" }) {
  const { t } = useLang();
  return (
    <div className="grid grid-cols-2 rounded-lg border border-black/[0.12] bg-[#F4F6F8] p-1">
      <Link
        href="/register"
        className={cn(
          "flex h-10 items-center justify-center rounded-md text-sm font-bold",
          mode === "personal" ? "bg-white text-brand shadow-sm" : "text-[#5B6B86] hover:text-navy",
        )}
      >
        {t("reg_toggle_personal")}
      </Link>
      <Link
        href="/register/business"
        className={cn(
          "flex h-10 items-center justify-center rounded-md text-sm font-bold",
          mode === "business" ? "bg-white text-brand shadow-sm" : "text-[#5B6B86] hover:text-navy",
        )}
      >
        {t("reg_toggle_business")}
      </Link>
    </div>
  );
}

export function RegisterShell({
  title,
  children,
  accountType,
}: {
  title: string;
  children: React.ReactNode;
  accountType: "personal" | "business";
}) {
  const { t } = useLang();
  return (
    <div className="bg-white">
      <div className="mx-auto grid min-h-[calc(100dvh-var(--site-header-h,9rem))] w-full max-w-[1400px] lg:grid-cols-2">
        <div className="relative hidden min-h-full flex-col overflow-hidden bg-[#F7F8FA] lg:flex">
          <div className="relative min-h-0 flex-1 overflow-hidden">
            <video
              src="/video/register-boy.mp4"
              autoPlay
              loop
              muted
              playsInline
              preload="metadata"
              aria-hidden
              className="absolute left-0 top-0 h-full w-[220%] max-w-none origin-left object-cover object-left"
            />
          </div>
          <p className="shrink-0 px-8 pb-8 pt-2 text-center text-sm font-medium text-neutral-500">
            {t("reg_hero_line")}
          </p>
        </div>

        <div className="relative mx-auto mt-4 aspect-[4/5] w-full max-w-sm overflow-hidden bg-[#F7F8FA] lg:hidden">
          <video
            src="/video/register-boy.mp4"
            autoPlay
            loop
            muted
            playsInline
            preload="metadata"
            aria-hidden
            className="absolute left-0 top-0 h-full w-[220%] max-w-none object-cover object-left"
          />
        </div>

        <div className="flex items-start justify-center px-5 py-10 sm:px-10 lg:px-14 lg:py-12">
          <div className="w-full max-w-md">
            <h1 className="font-display text-2xl font-bold text-navy sm:text-3xl">{title}</h1>
            <div className="mt-5">
              <RegisterAccountToggle mode={accountType} />
            </div>
            <div className="mt-8 space-y-5">{children}</div>
            <p className="mt-8 text-center text-sm text-muted-foreground">
              {t("auth_has_account")}{" "}
              <Link href="/login" className="font-semibold text-brand hover:underline">
                {t("login")}
              </Link>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

export function PhoneField({
  dialCode,
  onDialChange,
  national,
  onNationalChange,
  id = "reg-mobile",
}: {
  dialCode: string;
  onDialChange: (dial: string, countryCode: string) => void;
  national: string;
  onNationalChange: (v: string) => void;
  id?: string;
}) {
  const { t } = useLang();
  const selected = PHONE_COUNTRIES.find((c) => c.dial === dialCode) ?? PHONE_COUNTRIES[0];
  return (
    <div className="space-y-1.5">
      <label htmlFor={id} className="typo-form-label text-[#111111]">
        {t("reg_mobile")} <span className="text-red-500">*</span>
      </label>
      <div className="flex gap-2">
        <select
          aria-label={t("reg_country")}
          value={selected.code}
          onChange={(e) => {
            const c = PHONE_COUNTRIES.find((x) => x.code === e.target.value) ?? PHONE_COUNTRIES[0];
            onDialChange(c.dial, c.code);
          }}
          className="h-11 w-[7.5rem] shrink-0 rounded-md border border-black/[0.14] bg-white px-2 text-sm"
        >
          {PHONE_COUNTRIES.map((c) => (
            <option key={c.code} value={c.code}>
              {c.flag} {c.dial}
            </option>
          ))}
        </select>
        <input
          id={id}
          type="tel"
          required
          value={national}
          onChange={(e) => onNationalChange(e.target.value)}
          placeholder={t("reg_mobile_placeholder")}
          className="h-11 w-full rounded-md border border-black/[0.14] bg-white px-3 text-sm"
        />
      </div>
    </div>
  );
}
