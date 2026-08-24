import { useMemo, useState } from "react";
import { Link } from "wouter";
import { Loader2, Stethoscope } from "lucide-react";
import { useLang } from "@/contexts/LanguageContext";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import WooProductCard from "@/components/wc/WooProductCard";
import { searchCloudProducts } from "@/lib/samphone-cloud";
import type { WooProduct } from "@/lib/woocommerce";
import type { RepairServiceId } from "@/lib/repair-pricing";

export default function DeviceDiagnostics() {
  const { t, lang } = useLang();
  const [device, setDevice] = useState("");
  const [water, setWater] = useState(false);
  const [drop, setDrop] = useState(false);
  const [battery, setBattery] = useState(false);
  const [screen, setScreen] = useState(false);
  const [sound, setSound] = useState(false);
  const [result, setResult] = useState<string | null>(null);
  const [parts, setParts] = useState<WooProduct[] | null>(null);
  const [busy, setBusy] = useState(false);

  const serviceIds = useMemo(() => {
    const ids: RepairServiceId[] = [];
    if (water) ids.push("water_damage_diag");
    if (screen || drop) ids.push("screen_oled");
    if (battery) ids.push("battery");
    if (sound) ids.push("charging_port");
    return ids;
  }, [water, drop, battery, screen, sound]);

  const bookHref = `/book-repair?device=${encodeURIComponent(device.trim())}&services=${encodeURIComponent(serviceIds.join(","))}`;

  const analyze = async () => {
    const partsText: string[] = [];
    if (water)
      partsText.push(
        lang === "pt"
          ? "Contacto com líquidos: recomendamos diagnóstico em loja o mais cedo possível."
          : "Liquid contact: book in-store diagnostics as soon as possible.",
      );
    if (drop)
      partsText.push(
        lang === "pt"
          ? "Após impacto: pode haver danos internos — sugerimos inspeção e teste de ecrã/câmara."
          : "After a drop: internal damage is possible — we suggest inspection and display/camera checks.",
      );
    if (battery)
      partsText.push(
        lang === "pt"
          ? "Bateria: substituição costuma resolver; confirme saúde da bateria no diagnóstico."
          : "Battery: replacement often fixes this; we’ll confirm battery health on check-in.",
      );
    if (screen)
      partsText.push(
        lang === "pt"
          ? "Ecrã: orçamento para conjunto de ecrã ou reparação localizada."
          : "Display: we’ll quote a full assembly or localized repair.",
      );
    if (sound)
      partsText.push(
        lang === "pt"
          ? "Áudio: pode ser altifalante, microfone ou placa — teste em bancada."
          : "Audio: speaker, mic, or board-level — bench test recommended.",
      );
    if (partsText.length === 0) {
      setResult(
        lang === "pt"
          ? "Selecione pelo menos um sintoma ou visite-nos para um diagnóstico completo."
          : "Select at least one symptom, or visit us for a full diagnostic.",
      );
      setParts([]);
      return;
    }
    setResult(partsText.join(" "));
    const query = [device.trim(), screen || drop ? "lcd" : "", battery ? "battery" : "", sound ? "speaker" : ""]
      .filter(Boolean)
      .join(" ");
    if (!query) {
      setParts([]);
      return;
    }
    setBusy(true);
    try {
      setParts(await searchCloudProducts(query, 8));
    } catch {
      setParts([]);
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="bg-muted/30 min-h-[75vh] py-10">
      <div className="container mx-auto px-4 md:px-6 max-w-3xl">
        <nav className="text-sm text-muted-foreground mb-6">
          <Link href="/" className="hover:text-primary">
            {t("breadcrumb_home")}
          </Link>
          <span className="mx-2">/</span>
          <span className="text-foreground font-medium">{t("nav_diagnostics")}</span>
        </nav>

        <div className="rounded-xl border border-border bg-card p-6 md:p-8 shadow-sm">
          <div className="flex items-center gap-3 mb-2">
            <Stethoscope className="w-8 h-8 text-primary" />
            <h1 className="font-display text-2xl md:text-3xl font-bold text-foreground">{t("diag_title")}</h1>
          </div>
          <p className="text-muted-foreground text-sm mb-8">{t("diag_sub")}</p>

          <div className="space-y-2 mb-6">
            <Label htmlFor="diag-device">{t("book_device_hint")}</Label>
            <Input
              id="diag-device"
              value={device}
              onChange={(e) => setDevice(e.target.value)}
              placeholder="e.g. Samsung A54"
            />
          </div>

          <div className="space-y-4 mb-6">
            <Label>{t("diag_symptoms")}</Label>
            <label className="flex items-center gap-3 text-sm">
              <Checkbox checked={water} onCheckedChange={(c) => setWater(!!c)} />
              {t("diag_water")}
            </label>
            <label className="flex items-center gap-3 text-sm">
              <Checkbox checked={drop} onCheckedChange={(c) => setDrop(!!c)} />
              {t("diag_drop")}
            </label>
            <label className="flex items-center gap-3 text-sm">
              <Checkbox checked={battery} onCheckedChange={(c) => setBattery(!!c)} />
              {t("diag_battery")}
            </label>
            <label className="flex items-center gap-3 text-sm">
              <Checkbox checked={screen} onCheckedChange={(c) => setScreen(!!c)} />
              {t("diag_screen")}
            </label>
            <label className="flex items-center gap-3 text-sm">
              <Checkbox checked={sound} onCheckedChange={(c) => setSound(!!c)} />
              {t("diag_sound")}
            </label>
          </div>

          <Button type="button" className="w-full mb-6" onClick={() => void analyze()} disabled={busy}>
            {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : t("diag_submit")}
          </Button>

          {result && (
            <div className="rounded-lg border border-primary/30 bg-primary/5 p-4 text-sm space-y-3">
              <p className="font-semibold text-foreground">{t("diag_result_title")}</p>
              <p className="text-muted-foreground">{result}</p>
              <Button asChild>
                <Link href={bookHref}>{t("diag_book")}</Link>
              </Button>
            </div>
          )}

          {parts && parts.length > 0 && (
            <div className="mt-8">
              <h2 className="font-display text-lg font-bold mb-4">{t("diag_parts")}</h2>
              <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
                {parts.map((p) => (
                  <WooProductCard key={p.cloudId || p.id} product={p} priceUnavailableLabel={t("woo_price_na")} />
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
