import { useMemo, useState } from "react";
import { Link } from "wouter";
import { RefreshCw } from "lucide-react";
import { useLang } from "@/contexts/LanguageContext";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Slider } from "@/components/ui/slider";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { estimateTradeInEuro, generateTradeInCode, saveTradeInVoucher, type TradeCondition } from "@/lib/trade-in";
import { openWhatsApp } from "@/lib/whatsapp";
import { useToast } from "@/hooks/use-toast";

const BRANDS = ["Apple", "Samsung", "Google", "Xiaomi", "OnePlus", "Huawei", "Other"];

const CONDITIONS: { id: TradeCondition; en: string; pt: string }[] = [
  { id: "excellent", en: "Excellent", pt: "Excelente" },
  { id: "good", en: "Good", pt: "Bom" },
  { id: "fair", en: "Fair", pt: "Razoável" },
  { id: "poor", en: "Poor", pt: "Fraco" },
];

export default function TradeIn() {
  const { t, lang } = useLang();
  const { user } = useAuth();
  const { toast } = useToast();
  const [brand, setBrand] = useState("Apple");
  const [model, setModel] = useState("");
  const [name, setName] = useState(user?.name ?? "");
  const [phone, setPhone] = useState(user?.phone ?? "");
  const [age, setAge] = useState([2]);
  const [condition, setCondition] = useState<TradeCondition>("good");
  const [code, setCode] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const estimate = useMemo(
    () => estimateTradeInEuro(brand, age[0] ?? 0, condition),
    [brand, age, condition],
  );

  const generate = () => {
    if (!name.trim() || !phone.trim() || !model.trim()) {
      setError(t("book_need_fields"));
      return;
    }
    setError(null);
    const c = generateTradeInCode();
    setCode(c);
    saveTradeInVoucher(c, estimate);
    const condLabel = CONDITIONS.find((x) => x.id === condition);
    const message = [
      "SAMPHONE — trade-in",
      `${t("checkout_full_name")}: ${name.trim()}`,
      `${t("checkout_phone")}: ${phone.trim()}`,
      `${t("trade_brand")}: ${brand} ${model.trim()}`,
      `${t("trade_age")}: ${age[0]}`,
      `${t("trade_condition")}: ${lang === "pt" ? condLabel?.pt : condLabel?.en}`,
      `${t("trade_estimate")}: €${estimate}`,
      `${t("trade_code_label")}: ${c}`,
    ].join("\n");
    openWhatsApp(message);
    toast({ title: t("trade_code_label"), description: c });
  };

  const copy = () => {
    if (!code) return;
    void navigator.clipboard.writeText(code);
    toast({ title: t("trade_copy") });
  };

  return (
    <div className="bg-muted/30 min-h-[75vh] py-10">
      <div className="container mx-auto px-4 md:px-6 max-w-xl">
        <div className="rounded-xl border border-border bg-card p-6 md:p-8 shadow-sm">
          <div className="flex items-center gap-3 mb-2">
            <RefreshCw className="w-8 h-8 text-primary" />
            <h1 className="font-display text-2xl md:text-3xl font-bold text-foreground">{t("trade_title")}</h1>
          </div>
          <p className="text-muted-foreground text-sm mb-8">{t("trade_sub")}</p>

          <div className="space-y-6">
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label>{t("checkout_full_name")}</Label>
                <Input value={name} onChange={(e) => setName(e.target.value)} />
              </div>
              <div className="space-y-2">
                <Label>{t("checkout_phone")}</Label>
                <Input value={phone} onChange={(e) => setPhone(e.target.value)} />
              </div>
            </div>

            <div className="space-y-2">
              <Label>{t("trade_brand")}</Label>
              <Select value={brand} onValueChange={setBrand}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {BRANDS.map((b) => (
                    <SelectItem key={b} value={b}>
                      {b}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>{t("book_device_hint")}</Label>
              <Input value={model} onChange={(e) => setModel(e.target.value)} placeholder="e.g. iPhone 13" />
            </div>

            <div className="space-y-3">
              <Label>
                {t("trade_age")}: {age[0]}
              </Label>
              <Slider value={age} onValueChange={setAge} min={0} max={8} step={1} />
            </div>

            <div className="space-y-2">
              <Label>{t("trade_condition")}</Label>
              <Select value={condition} onValueChange={(v) => setCondition(v as TradeCondition)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {CONDITIONS.map((c) => (
                    <SelectItem key={c.id} value={c.id}>
                      {lang === "pt" ? c.pt : c.en}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="rounded-lg bg-muted/50 border border-border px-4 py-3">
              <p className="text-sm text-muted-foreground">{t("trade_estimate")}</p>
              <p className="font-display text-2xl font-bold text-foreground">€{estimate}</p>
            </div>

            {error ? <p className="text-sm text-destructive">{error}</p> : null}

            <Button type="button" className="w-full" onClick={generate}>
              {t("trade_whatsapp")}
            </Button>

            {code && (
              <div className="space-y-2 text-center">
                <p className="font-mono text-lg font-semibold tracking-wide">{code}</p>
                <Button type="button" variant="outline" size="sm" onClick={copy}>
                  {t("trade_copy")}
                </Button>
                <p className="text-xs text-muted-foreground">{t("trade_apply")}</p>
                <Button type="button" variant="secondary" asChild>
                  <Link href="/cart">{t("nav_cart")}</Link>
                </Button>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
