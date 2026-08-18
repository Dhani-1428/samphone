import { FormEvent, useState } from "react";
import { Link, useLocation } from "wouter";
import { useAuth } from "@/contexts/AuthContext";
import { useLang } from "@/contexts/LanguageContext";
import { safeRedirectPath } from "@/lib/safeRedirect";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export default function Register() {
  const { t } = useLang();
  const { login } = useAuth();
  const [, setLocation] = useLocation();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault();
    const em = email.trim();
    if (!em) return;
    login({
      email: em,
      name: name.trim() || em.split("@")[0],
    });
    const params = new URLSearchParams(window.location.search);
    const next = safeRedirectPath(params.get("next"));
    setLocation(next);
  };

  return (
    <div className="flex min-h-[70vh] items-center justify-center px-4 py-16">
      <div className="w-full max-w-md rounded-xl bg-white p-8 shadow-sm ring-1 ring-black/[0.04]">
        <h1 className="font-display text-2xl font-bold text-navy">{t("auth_register_title")}</h1>
        <p className="mt-1 text-sm text-muted-foreground">{t("loginForPricing")}</p>
        <form onSubmit={handleSubmit} className="mt-6 space-y-4">
          <div className="space-y-2">
            <Label htmlFor="reg-name">{t("auth_name")}</Label>
            <Input
              id="reg-name"
              type="text"
              autoComplete="name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Jane Doe"
              className="h-11 bg-[#F4F6F8]"
            />
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
              placeholder="you@example.com"
              className="h-11 bg-[#F4F6F8]"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="reg-password">{t("auth_password")}</Label>
            <Input
              id="reg-password"
              type="password"
              autoComplete="new-password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
              className="h-11 bg-[#F4F6F8]"
            />
          </div>
          <Button type="submit" className="h-11 w-full bg-[#2F6BFF] text-white hover:bg-[#2458d6]">
            {t("auth_submit_register")}
          </Button>
          <p className="text-center text-sm text-muted-foreground">
            {t("auth_has_account")}{" "}
            <Link
              href={`/login${typeof window !== "undefined" ? window.location.search : ""}`}
              className="font-semibold text-[#2F6BFF] hover:underline"
            >
              {t("login")}
            </Link>
          </p>
        </form>
      </div>
    </div>
  );
}
