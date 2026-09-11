import { FormEvent, useCallback, useEffect, useState } from "react";
import { useAuth as useClerkAuth, useSignIn, useSignUp } from "@clerk/clerk-react";
import { Link, useLocation, useSearch } from "wouter";
import { useAuth } from "@/contexts/AuthContext";
import { useLang } from "@/contexts/LanguageContext";
import { postLoginPath, isAdminRole } from "@/lib/admin-access";
import { nextPathFromSearch } from "@/lib/safeRedirect";
import { isClerkEnabled } from "@/lib/clerk-runtime";
import { loginWithSharedIdentity, MfaRequiredError } from "@/lib/shared-identity-auth";
import { clerkSync, type CloudAuthSession } from "@/lib/samphone-cloud";
import { STORE_EMAIL } from "@/config/samphone";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import MfaChallenge from "@/components/MfaChallenge";
import { AuthSocialCircles } from "@/components/AuthSocialCircles";
import { PhoneField, RegisterOtpStep, isValidE164, toE164 } from "@/components/RegisterAuthExtras";

function LoginForm({
  clerkHelpers,
}: {
  clerkHelpers?: {
    isLoaded: boolean;
    signIn: ReturnType<typeof useSignIn>["signIn"];
    signUp: ReturnType<typeof useSignUp>["signUp"];
    setActive: ReturnType<typeof useSignIn>["setActive"];
    getToken: () => Promise<string | null>;
  };
}) {
  const { t } = useLang();
  const { login, user } = useAuth();
  const [, setLocation] = useLocation();
  const search = useSearch();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [mfa, setMfa] = useState<{ token: string; email: string } | null>(null);
  const [phoneOpen, setPhoneOpen] = useState(false);
  const [dial, setDial] = useState("+351");
  const [national, setNational] = useState("");
  const [otpPhone, setOtpPhone] = useState<string | null>(null);
  const [otpCode, setOtpCode] = useState("");
  const [pendingOauth, setPendingOauth] = useState<"oauth_google" | "oauth_apple" | null>(null);
  const next = nextPathFromSearch(search);
  const clerkUi = Boolean(clerkHelpers);
  const clerkContinue = `/auth/continue?next=${encodeURIComponent(next)}`;

  useEffect(() => {
    if (!user || !isAdminRole(user.role)) return;
    setLocation(postLoginPath(user.role, next));
  }, [next, setLocation, user]);

  const applySession = (session: CloudAuthSession) => {
    login({
      ...session,
      token: session.token ?? undefined,
    });
    setLocation(postLoginPath(session.role, next));
  };

  const oauthRedirects = useCallback(() => {
    const origin = window.location.origin;
    return {
      redirectUrl: `${origin}/sso-callback`,
      redirectUrlComplete: `${origin}${clerkContinue}`,
    };
  }, [clerkContinue]);

  const startOauth = useCallback(
    async (strategy: "oauth_google" | "oauth_apple") => {
      const signIn = clerkHelpers?.signIn;
      const signUp = clerkHelpers?.signUp;
      if (!clerkHelpers?.isLoaded || (!signIn && !signUp)) {
        setError(t("auth_social_failed"));
        return;
      }
      setError(null);
      setBusy(true);
      const redirects = oauthRedirects();
      try {
        if (signIn) {
          await signIn.authenticateWithRedirect({ strategy, ...redirects });
          return;
        }
        if (signUp) {
          await signUp.authenticateWithRedirect({
            strategy,
            ...redirects,
            unsafeMetadata: { accountType: "b2c" },
          });
        }
      } catch (err) {
        try {
          if (signUp) {
            await signUp.authenticateWithRedirect({
              strategy,
              ...redirects,
              unsafeMetadata: { accountType: "b2c" },
            });
            return;
          }
        } catch (signUpErr) {
          setBusy(false);
          setError(signUpErr instanceof Error ? signUpErr.message : t("auth_social_failed"));
          return;
        }
        setBusy(false);
        setError(err instanceof Error ? err.message : t("auth_social_failed"));
      }
    },
    [clerkHelpers, oauthRedirects, t],
  );

  useEffect(() => {
    if (!pendingOauth) return;
    if (!clerkHelpers?.isLoaded) return;
    const strategy = pendingOauth;
    setPendingOauth(null);
    void startOauth(strategy);
  }, [clerkHelpers?.isLoaded, pendingOauth, startOauth]);

  const oauth = useCallback(
    (strategy: "oauth_google" | "oauth_apple") => {
      if (!clerkHelpers) {
        setError(t("auth_social_failed"));
        return;
      }
      if (!clerkHelpers.isLoaded) {
        setError(null);
        setBusy(true);
        setPendingOauth(strategy);
        return;
      }
      void startOauth(strategy);
    },
    [clerkHelpers, startOauth, t],
  );

  const sendPhoneCode = async () => {
    const phone = toE164(dial, national);
    if (!phone || !isValidE164(phone)) {
      setError(t("reg_invalid_phone"));
      return;
    }
    if (!clerkHelpers?.isLoaded || (!clerkHelpers.signIn && !clerkHelpers.signUp)) {
      setError(t("auth_social_failed"));
      return;
    }
    setBusy(true);
    setError(null);
    try {
      if (clerkHelpers.signIn) {
        try {
          const attempt = await clerkHelpers.signIn.create({ identifier: phone });
          const factors = (attempt.supportedFirstFactors ?? []) as Array<{
            strategy: string;
            phoneNumberId?: string;
          }>;
          const phoneFactor = factors.find((f) => f.strategy === "phone_code");
          if (phoneFactor?.phoneNumberId) {
            await clerkHelpers.signIn.prepareFirstFactor({
              strategy: "phone_code",
              phoneNumberId: phoneFactor.phoneNumberId,
            });
            setOtpPhone(phone);
            return;
          }
        } catch {
          /* new number — fall through to sign-up */
        }
      }
      if (clerkHelpers.signUp) {
        await clerkHelpers.signUp.create({ phoneNumber: phone });
        await clerkHelpers.signUp.preparePhoneNumberVerification({ strategy: "phone_code" });
        setOtpPhone(phone);
        return;
      }
      setError(t("reg_invalid_phone"));
    } catch (err) {
      setError(err instanceof Error ? err.message : t("auth_social_failed"));
    } finally {
      setBusy(false);
    }
  };

  const verifyPhoneCode = async () => {
    if (!otpPhone || otpCode.length < 4) {
      setError(t("reg_otp_invalid"));
      return;
    }
    setBusy(true);
    setError(null);
    try {
      if (clerkHelpers?.signIn) {
        try {
          const result = await clerkHelpers.signIn.attemptFirstFactor({
            strategy: "phone_code",
            code: otpCode,
          });
          if (result.status === "complete" && result.createdSessionId && clerkHelpers.setActive) {
            await clerkHelpers.setActive({ session: result.createdSessionId });
            const token = await clerkHelpers.getToken();
            if (token && token.length >= 20) {
              applySession(await clerkSync(token, { phone: otpPhone }));
              return;
            }
          }
        } catch {
          /* try sign-up verification */
        }
      }
      if (clerkHelpers?.signUp && clerkHelpers.setActive) {
        const result = await clerkHelpers.signUp.attemptPhoneNumberVerification({ code: otpCode });
        if (result.status === "complete" && result.createdSessionId) {
          await clerkHelpers.setActive({ session: result.createdSessionId });
          const token = await clerkHelpers.getToken();
          if (token && token.length >= 20) {
            applySession(await clerkSync(token, { phone: otpPhone }));
            return;
          }
        }
      }
      setError(t("reg_otp_invalid"));
    } catch (err) {
      setError(err instanceof Error ? err.message : t("reg_otp_invalid"));
    } finally {
      setBusy(false);
    }
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    const trimmed = email.trim();
    if (!trimmed || !password) {
      setError(t("loginForPricing"));
      return;
    }
    setBusy(true);
    setError(null);
    try {
      const result = await loginWithSharedIdentity({
        email: trimmed,
        password,
        clerk: clerkHelpers
          ? {
              isLoaded: clerkHelpers.isLoaded,
              signIn: clerkHelpers.signIn,
              setActive: clerkHelpers.setActive ?? undefined,
              getToken: clerkHelpers.getToken,
            }
          : undefined,
      });
      applySession(result);
    } catch (err) {
      if (err instanceof MfaRequiredError) {
        setMfa({ token: err.mfaToken, email: err.email || trimmed });
        return;
      }
      setError(err instanceof Error ? err.message : t("auth_submit_login"));
    } finally {
      setBusy(false);
    }
  };

  if (mfa) {
    return (
      <MfaChallenge
        mfaToken={mfa.token}
        email={mfa.email}
        onVerified={applySession}
        onCancel={() => setMfa(null)}
      />
    );
  }

  if (otpPhone) {
    return (
      <>
        <RegisterOtpStep
          channel="phone"
          destination={otpPhone}
          code={otpCode}
          onCode={setOtpCode}
          onVerify={() => void verifyPhoneCode()}
          busy={busy}
          error={error}
        />
        <button
          type="button"
          className="mt-4 text-sm text-brand hover:underline"
          onClick={() => {
            setOtpPhone(null);
            setOtpCode("");
            setError(null);
          }}
        >
          {t("auth_mfa_back")}
        </button>
      </>
    );
  }

  return (
    <>
      <h1 className="font-display text-2xl font-bold text-navy">{t("auth_login_title")}</h1>
      <p className="mt-1 text-sm text-muted-foreground">{t("auth_email_login")}</p>

      <p className="mt-6 text-center text-xs font-semibold uppercase tracking-wide text-muted-foreground">
        {t("auth_or_social")}
      </p>
      {busy && pendingOauth ? (
        <p className="mt-2 text-center text-xs text-muted-foreground">{t("auth_social_wait")}</p>
      ) : null}
      <div className="mt-3">
        <AuthSocialCircles
          disabled={busy}
          onGoogle={() => oauth("oauth_google")}
          onApple={() => oauth("oauth_apple")}
          onPhone={() => {
            setError(null);
            setPhoneOpen((v) => !v);
          }}
        />
      </div>

      {phoneOpen ? (
        <div className="mt-5 space-y-3">
          <PhoneField
            dialCode={dial}
            onDialChange={(d) => setDial(d)}
            national={national}
            onNationalChange={setNational}
            id="login-mobile"
          />
          {error && phoneOpen ? <p className="text-sm text-red-600">{error}</p> : null}
          <Button
            type="button"
            disabled={busy}
            className="h-11 w-full bg-brand text-white hover:bg-brand-dark"
            onClick={() => void sendPhoneCode()}
          >
            {busy ? t("woo_loading") : t("auth_phone_send")}
          </Button>
        </div>
      ) : null}

      {clerkUi ? (
        <p className="my-6 text-center text-xs font-semibold uppercase tracking-wide text-muted-foreground">
          {t("auth_or_email")}
        </p>
      ) : (
        <div className="mt-6" />
      )}
      <form onSubmit={(e) => void handleSubmit(e)} className="space-y-4">
        <div className="space-y-2">
          <Label htmlFor="login-email">{t("auth_email")}</Label>
          <Input
            id="login-email"
            type="email"
            autoComplete="email"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="you@example.com"
            className="h-11 bg-[#F4F6F8]"
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="login-password">{t("auth_password")}</Label>
          <Input
            id="login-password"
            type="password"
            autoComplete="current-password"
            required
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="••••••••"
            className="h-11 bg-[#F4F6F8]"
          />
        </div>
        {error && !phoneOpen ? <p className="text-sm text-red-600">{error}</p> : null}
        <Button type="submit" disabled={busy} className="h-11 w-full bg-brand typo-btn-login text-white hover:bg-brand-dark">
          {busy ? t("woo_loading") : t("auth_submit_login")}
        </Button>
        <div className="flex items-center justify-between typo-form-meta text-muted-foreground">
          <label className="inline-flex items-center gap-2">
            <input type="checkbox" className="h-3.5 w-3.5 accent-[#111111]" />
            {t("auth_remember")}
          </label>
          <a href={`mailto:${STORE_EMAIL}`} className="text-brand hover:underline">
            {t("auth_lost_password")}
          </a>
        </div>
        <p className="text-center text-[13px] font-normal leading-5 text-muted-foreground">
          {t("auth_no_account")}{" "}
          <Link href={`/register${search || ""}`} className="font-semibold text-brand hover:underline">
            {t("auth_register_title")}
          </Link>
        </p>
      </form>
    </>
  );
}

function LoginWithClerk() {
  const { isLoaded, signIn, setActive } = useSignIn();
  const { signUp } = useSignUp();
  const { getToken } = useClerkAuth();
  return (
    <LoginForm
      clerkHelpers={{
        isLoaded,
        signIn,
        signUp,
        setActive,
        getToken,
      }}
    />
  );
}

export default function Login() {
  return (
    <div className="flex min-h-[70vh] items-center justify-center px-4 py-16">
      <div className="w-full max-w-md rounded-xl bg-white p-8 shadow-sm ring-1 ring-black/[0.04]">
        {isClerkEnabled() ? <LoginWithClerk /> : <LoginForm />}
      </div>
    </div>
  );
}
