import { useMemo, useState } from "react";
import { Link } from "wouter";
import { RefreshCw } from "lucide-react";
import { useLang } from "@/contexts/LanguageContext";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Slider } from "@/components/ui/slider";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { estimateTradeInEuro, generateTradeInCode, type TradeCondition } from "@/lib/trade-in";
import { useToast } from "@/hooks/use-toast";

const BRANDS = ["Apple", "Samsung", "Google", "Xiaomi", "OnePlus", "Other"];

export default function TradeIn() {
  const { t } = useLang();
  const { toast } = useToast();
  const [brand, setBrand] = useState("Apple");
  const [age, setAge] = useState([2]);
  const [condition, setCondition] = useState<TradeCondition>("good");
  const [code, setCode] = useState<string | null>(null);

  const estimate = useMemo(
    () => estimateTradeInEuro(brand, age[0] ?? 0, condition),
    [brand, age, condition],
  );

  const generate = () => {
    const c = generateTradeInCode();
    setCode(c);
    localStorage.setItem("samphone-tradein-code", c);
    localStorage.setItem("samphone-tradein-value", String(estimate));
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
        <nav className="text-sm text-muted-foreground mb-6">
          <Link href="/" className="hover:text-primary">
            {t("breadcrumb_home")}
          </Link>
          <span className="mx-2">/</span>
          <span className="text-foreground font-medium">{t("nav_trade_in")}</span>
        </nav>

        <div className="rounded-xl border border-border bg-card p-6 md:p-8 shadow-sm">
          <div className="flex items-center gap-3 mb-2">
            <RefreshCw className="w-8 h-8 text-primary" />
            <h1 className="font-display text-2xl md:text-3xl font-bold text-foreground">{t("trade_title")}</h1>
          </div>
          <p className="text-muted-foreground text-sm mb-8">{t("trade_sub")}</p>

          <div className="space-y-6">
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

            <div className="space-y-3">
              <Label>{t("trade_age")}: {age[0]}</Label>
              <Slider value={age} onValueChange={setAge} min={0} max={8} step={1} />
            </div>

            <div className="space-y-2">
              <Label>{t("trade_condition")}</Label>
              <Select value={condition} onValueChange={(v) => setCondition(v as TradeCondition)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="excellent">Excellent</SelectItem>
                  <SelectItem value="good">Good</SelectItem>
                  <SelectItem value="fair">Fair</SelectItem>
                  <SelectItem value="poor">Poor</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="rounded-lg bg-muted/50 border border-border px-4 py-3">
              <p className="text-sm text-muted-foreground">{t("trade_estimate")}</p>
              <p className="font-display text-2xl font-bold text-foreground">€{estimate}</p>
            </div>

            <Button type="button" className="w-full" onClick={generate}>
              {t("trade_generate")}
            </Button>

            {code && (
              <div className="space-y-2 text-center">
                <p className="font-mono text-lg font-semibold tracking-wide">{code}</p>
                <Button type="button" variant="outline" size="sm" onClick={copy}>
                  {t("trade_copy")}
                </Button>
                <p className="text-xs text-muted-foreground">{t("trade_apply")}</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
