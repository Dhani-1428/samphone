import { FormEvent, useState } from "react";
import { SignIn, useAuth as useClerkAuth, useSignIn } from "@clerk/clerk-react";
import { Link, useLocation, useSearch } from "wouter";
import { useAuth } from "@/contexts/AuthContext";
import { useLang } from "@/contexts/LanguageContext";
import { nextPathFromSearch } from "@/lib/safeRedirect";
import { isClerkEnabled } from "@/lib/clerk-runtime";
import { loginWithSharedIdentity, MfaRequiredError } from "@/lib/shared-identity-auth";
import type { CloudAuthSession } from "@/lib/samphone-cloud";
import { STORE_EMAIL } from "@/config/samphone";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import MfaChallenge from "@/components/MfaChallenge";

function LoginForm({
  clerkHelpers,
}: {
  clerkHelpers?: {
    isLoaded: boolean;
    signIn: ReturnType<typeof useSignIn>["signIn"];
    setActive: ReturnType<typeof useSignIn>["setActive"];
    getToken: () => Promise<string | null>;
  };
}) {
  const { t } = useLang();
  const { login } = useAuth();
  const [, setLocation] = useLocation();
  const search = useSearch();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [mfa, setMfa] = useState<{ token: string; email: string } | null>(null);
  const next = nextPathFromSearch(search);
  const clerkUi = Boolean(clerkHelpers);

  const applySession = (session: CloudAuthSession) => {
    login({
      ...session,
      token: session.token ?? undefined,
    });
    setLocation(next);
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

  return (
    <>
      <h1 className="font-display text-2xl font-bold text-navy">{t("auth_login_title")}</h1>
      <p className="mt-1 text-sm text-muted-foreground">
        {clerkUi ? t("auth_clerk_same") : t("auth_email_login")}
      </p>
      {clerkUi ? (
        <>
          <div className="mt-6">
            <SignIn
              routing="hash"
              forceRedirectUrl={next}
              fallbackRedirectUrl={next}
              appearance={{
                elements: {
                  rootBox: "mx-auto w-full",
                  card: "shadow-none border-0 p-0 bg-transparent",
                },
              }}
            />
          </div>
          <p className="my-6 text-center text-xs font-semibold uppercase tracking-wide text-muted-foreground">
            {t("auth_or_email")}
          </p>
        </>
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
        {error ? <p className="text-sm text-red-600">{error}</p> : null}
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
  const { getToken } = useClerkAuth();
  return (
    <LoginForm
      clerkHelpers={{
        isLoaded,
        signIn,
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
