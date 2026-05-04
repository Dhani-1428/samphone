import { FormEvent, useState } from "react";
import { Link, useLocation } from "wouter";
import { useAuth } from "@/contexts/AuthContext";
import { useLang } from "@/contexts/LanguageContext";
import { safeRedirectPath } from "@/lib/safeRedirect";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";

export default function Login() {
  const { t } = useLang();
  const { login } = useAuth();
  const [, setLocation] = useLocation();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault();
    const trimmed = email.trim();
    if (!trimmed) return;
    login({ email: trimmed, name: trimmed.split("@")[0] });
    const params = new URLSearchParams(window.location.search);
    const next = safeRedirectPath(params.get("next"));
    setLocation(next);
  };

  return (
    <div className="min-h-[70vh] flex items-center justify-center px-4 py-12 bg-muted/30">
      <Card className="w-full max-w-md border-border shadow-lg">
        <CardHeader>
          <CardTitle className="font-display text-2xl">{t("auth_login_title")}</CardTitle>
          <CardDescription>{t("loginForPricing")}</CardDescription>
        </CardHeader>
        <form onSubmit={handleSubmit}>
          <CardContent className="space-y-4">
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
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="login-password">{t("auth_password")}</Label>
              <Input
                id="login-password"
                type="password"
                autoComplete="current-password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
              />
            </div>
          </CardContent>
          <CardFooter className="flex flex-col gap-4 sm:flex-col">
            <Button type="submit" className="w-full">
              {t("auth_submit_login")}
            </Button>
            <p className="text-sm text-muted-foreground text-center">
              {t("auth_no_account")}{" "}
              <Link
                href={`/register${typeof window !== "undefined" ? window.location.search : ""}`}
                className="text-primary font-medium hover:underline"
              >
                {t("auth_register_title")}
              </Link>
            </p>
          </CardFooter>
        </form>
      </Card>
    </div>
  );
}
