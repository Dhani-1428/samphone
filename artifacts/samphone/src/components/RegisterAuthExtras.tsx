import { useCallback } from "react";
import { Link } from "wouter";
import { useSignUp } from "@clerk/clerk-react";
import { LEGAL_LINKS } from "@/config/samphone";
import { useLang } from "@/contexts/LanguageContext";
import { isClerkEnabled } from "@/lib/clerk-runtime";
import { cn } from "@/lib/utils";

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

const socialBtn =
  "flex h-11 w-full items-center justify-center gap-2 rounded-md border border-black/[0.14] bg-white text-sm font-semibold text-[#111111] hover:bg-neutral-50 disabled:opacity-60";

type SocialProps = {
  accountType: "b2c" | "b2b";
  redirectPath: string;
  onMobileOtp: () => void;
};

function ClerkSocialButtons({ accountType, redirectPath, onMobileOtp }: SocialProps) {
  const { t } = useLang();
  const { isLoaded, signUp } = useSignUp();

  const oauth = useCallback(
    async (strategy: "oauth_google" | "oauth_apple") => {
      if (!isLoaded || !signUp) return;
      const complete = `${window.location.origin}${redirectPath}`;
      try {
        await signUp.authenticateWithRedirect({
          strategy,
          redirectUrl: `${window.location.origin}/login`,
          redirectUrlComplete: complete,
          unsafeMetadata: { accountType },
        });
      } catch {
        window.location.href = "/login";
      }
    },
    [accountType, isLoaded, redirectPath, signUp],
  );

  return (
    <div className="space-y-2">
      <button type="button" className={socialBtn} onClick={() => void oauth("oauth_apple")}>
        <svg viewBox="0 0 24 24" className="h-4 w-4" aria-hidden>
          <path
            fill="currentColor"
            d="M16.4 12.6c0-2 1.1-3.1 1.2-3.2-0.6-0.9-1.6-1.1-2-1.1-0.8-0.1-1.6.5-2 .5s-1.1-0.5-1.8-0.5c-0.9 0-1.8.6-2.2 1.4-1 .1.7 3.3.3 5.1-0.4 1.1.7 2.4 1.7 2.4.7 0 1-.4 1.8-0.4s1.1.4 1.8.4c1.1 0 1.6-1.1 2.1-2.2-1.8-0.8-1.9-2.6-1.9-2.4zM14.6 6.8c.5-0.6.8-1.4.7-2.2-0.7 0-1.6.5-2.1 1.1-0.5.5-0.9 1.3-0.8 2.1.8.1 1.6-0.4 2.2-1z"
          />
        </svg>
        {t("reg_continue_apple")}
      </button>
      <button type="button" className={socialBtn} onClick={() => void oauth("oauth_google")}>
        <span className="text-base font-bold text-[#4285F4]" aria-hidden>
          G
        </span>
        {t("reg_continue_google")}
      </button>
      <button type="button" className={socialBtn} onClick={onMobileOtp}>
        {t("reg_continue_mobile")}
      </button>
    </div>
  );
}

function FallbackSocialButtons({ onMobileOtp }: Pick<SocialProps, "onMobileOtp">) {
  const { t } = useLang();
  return (
    <div className="space-y-2">
      <Link href="/login" className={socialBtn}>
        {t("reg_continue_apple")}
      </Link>
      <Link href="/login" className={socialBtn}>
        {t("reg_continue_google")}
      </Link>
      <button type="button" className={socialBtn} onClick={onMobileOtp}>
        {t("reg_continue_mobile")}
      </button>
    </div>
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
        <a href={LEGAL_LINKS.terms} target="_blank" rel="noreferrer" className="font-semibold text-brand hover:underline">
          {t("footer_terms")}
        </a>{" "}
        {t("reg_agree_and")}{" "}
        <a href={LEGAL_LINKS.privacy} target="_blank" rel="noreferrer" className="font-semibold text-brand hover:underline">
          {t("footer_privacy")}
        </a>
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

export function RegisterShell({
  title,
  children,
  switchHref,
  switchLabel,
}: {
  title: string;
  children: React.ReactNode;
  switchHref: string;
  switchLabel: string;
}) {
  const { t } = useLang();
  return (
    <div className="bg-white">
      <div className="mx-auto flex min-h-[calc(100dvh-var(--site-header-h,9rem))] w-full max-w-lg flex-col justify-center px-5 py-10 sm:px-8">
        <h1 className="font-display text-2xl font-bold text-navy sm:text-3xl">{title}</h1>
        <p className="mt-2 text-sm text-muted-foreground">
          <Link href={switchHref} className="font-semibold text-brand hover:underline">
            {switchLabel}
          </Link>
        </p>
        <div className="mt-8 space-y-5">{children}</div>
        <p className="mt-8 text-center text-sm text-muted-foreground">
          {t("auth_has_account")}{" "}
          <Link href="/login" className="font-semibold text-brand hover:underline">
            {t("login")}
          </Link>
        </p>
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
