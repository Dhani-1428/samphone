import { FormEvent, useState } from "react";
import { Link, useLocation } from "wouter";
import { useAuth } from "@/contexts/AuthContext";
import { useLang } from "@/contexts/LanguageContext";
import { safeRedirectPath } from "@/lib/safeRedirect";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";

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
    <div className="min-h-[70vh] flex items-center justify-center px-4 py-12 bg-muted/30">
      <Card className="w-full max-w-md border-border shadow-lg">
        <CardHeader>
          <CardTitle className="font-display text-2xl">{t("auth_register_title")}</CardTitle>
          <CardDescription>{t("loginForPricing")}</CardDescription>
        </CardHeader>
        <form onSubmit={handleSubmit}>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="reg-name">{t("auth_name")}</Label>
              <Input
                id="reg-name"
                type="text"
                autoComplete="name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Jane Doe"
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
              />
            </div>
          </CardContent>
          <CardFooter className="flex flex-col gap-4 sm:flex-col">
            <Button type="submit" className="w-full">
              {t("auth_submit_register")}
            </Button>
            <p className="text-sm text-muted-foreground text-center">
              {t("auth_has_account")}{" "}
              <Link
                href={`/login${typeof window !== "undefined" ? window.location.search : ""}`}
                className="text-primary font-medium hover:underline"
              >
                {t("login")}
              </Link>
            </p>
          </CardFooter>
        </form>
      </Card>
    </div>
  );
}
