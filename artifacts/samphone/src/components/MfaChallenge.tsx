import { FormEvent, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useLang } from "@/contexts/LanguageContext";
import { verifySharedMfa } from "@/lib/shared-identity-auth";
import type { CloudAuthSession } from "@/lib/samphone-cloud";

export default function MfaChallenge({
  mfaToken,
  email,
  onVerified,
  onCancel,
}: {
  mfaToken: string;
  email: string;
  onVerified: (session: CloudAuthSession) => void;
  onCancel: () => void;
}) {
  const { t } = useLang();
  const [code, setCode] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    if (code.trim().length < 4) {
      setError(t("auth_mfa_invalid"));
      return;
    }
    setBusy(true);
    setError(null);
    try {
      const session = await verifySharedMfa({ mfaToken, code, email });
      onVerified(session);
    } catch (err) {
      setError(err instanceof Error ? err.message : t("auth_mfa_invalid"));
    } finally {
      setBusy(false);
    }
  };

  return (
    <form onSubmit={(e) => void submit(e)} className="space-y-4">
      <div>
        <h2 className="font-display text-xl font-bold text-navy">{t("auth_mfa_title")}</h2>
        <p className="mt-1 text-sm text-muted-foreground">{t("auth_mfa_hint")}</p>
      </div>
      <div className="space-y-2">
        <Label htmlFor="mfa-code">{t("auth_mfa_code")}</Label>
        <Input
          id="mfa-code"
          inputMode="numeric"
          autoComplete="one-time-code"
          value={code}
          onChange={(e) => setCode(e.target.value)}
          className="h-11 bg-[#F4F6F8]"
          placeholder="123456"
        />
      </div>
      {error ? <p className="text-sm text-red-600">{error}</p> : null}
      <Button type="submit" disabled={busy} className="h-11 w-full bg-brand text-white hover:bg-brand-dark">
        {busy ? t("woo_loading") : t("auth_mfa_verify")}
      </Button>
      <button type="button" className="w-full text-sm text-muted-foreground hover:underline" onClick={onCancel}>
        {t("auth_mfa_back")}
      </button>
    </form>
  );
}
