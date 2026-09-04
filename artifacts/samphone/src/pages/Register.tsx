import { FormEvent, useState } from "react";
import { useLocation, useSearch } from "wouter";
import { Eye, EyeOff } from "lucide-react";
import {
  isValidE164,
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
  phone: string;
};

export default function Register() {
  const { t } = useLang();
  const { login } = useAuth();
  const [, setLocation] = useLocation();
  const search = useSearch();
  const next = nextPathFromSearch(search);

  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [dial, setDial] = useState("+351");
  const [national, setNational] = useState("");
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [agreed, setAgreed] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [mobileFocus, setMobileFocus] = useState(false);
  const [otpStep, setOtpStep] = useState(false);
  const [otpCode, setOtpCode] = useState("");
  const [pending, setPending] = useState<PendingAuth | null>(null);

  const finish = (auth: PendingAuth) => {
    login({
      ...auth.result,
      token: auth.result.token ?? undefined,
      accountType: "b2c",
      isWholesale: false,
    });
    setLocation(next);
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    const em = email.trim();
    const name = fullName.trim();
    const phone = toE164(dial, national);
    if (!em || !name || !password) {
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
        name,
        account_type: "b2c",
        phone,
      });
      await patchCloudProfile({
        name,
        phone,
        account_type: "b2c",
      }).catch(() => null);
      const auth = { result, email: em, phone };
      setPending(auth);
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
    // API sends email/phone OTP; storefront completes session after code entry.
    finish(pending);
  };

  if (otpStep && pending) {
    return (
      <RegisterShell
        title={t("reg_otp_title")}
        switchHref="/register/business"
        switchLabel={t("reg_switch_business")}
      >
        <RegisterOtpStep
          channel="email"
          destination={pending.email}
          code={otpCode}
          onCode={setOtpCode}
          onVerify={verifyOtp}
          busy={busy}
          error={error}
        />
        <p className="text-center text-xs text-muted-foreground">{t("reg_b2c_after_hint")}</p>
      </RegisterShell>
    );
  }

  return (
    <RegisterShell
      title={t("reg_b2c_title")}
      switchHref="/register/business"
      switchLabel={t("reg_switch_business")}
    >
      <RegisterSocialButtons
        accountType="b2c"
        redirectPath={`/register${search || ""}`}
        onMobileOtp={() => setMobileFocus(true)}
      />

      <p className="text-center text-xs font-semibold uppercase tracking-wide text-muted-foreground">
        {t("auth_or_email")}
      </p>

      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="space-y-1.5">
          <Label htmlFor="reg-name" className="typo-form-label text-[#111111]">
            {t("checkout_full_name")} <span className="text-red-500">*</span>
          </Label>
          <Input
            id="reg-name"
            required
            value={fullName}
            onChange={(e) => setFullName(e.target.value)}
            placeholder={t("reg_fullname_placeholder")}
            autoComplete="name"
            className="h-11 rounded-md border-black/[0.14] bg-white shadow-none"
          />
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="reg-email" className="typo-form-label text-[#111111]">
            {t("reg_user_email")} <span className="text-red-500">*</span>
          </Label>
          <Input
            id="reg-email"
            type="email"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder={t("reg_email_placeholder")}
            autoComplete="email"
            className="h-11 rounded-md border-black/[0.14] bg-white shadow-none"
          />
        </div>

        <div className={cn(mobileFocus && "rounded-md ring-2 ring-sam/40")}>
          <PhoneField
            dialCode={dial}
            onDialChange={(d) => setDial(d)}
            national={national}
            onNationalChange={setNational}
          />
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

        {error ? <p className="text-sm text-red-600">{error}</p> : null}

        <button
          type="submit"
          disabled={busy}
          className="h-12 w-full rounded-md bg-brand text-sm font-extrabold uppercase tracking-wide text-white hover:bg-brand-dark disabled:opacity-60"
        >
          {busy ? t("woo_loading") : t("reg_b2c_submit")}
        </button>
      </form>
    </RegisterShell>
  );
}
