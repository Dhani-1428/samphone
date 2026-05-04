import { useMemo, useState } from "react";
import { Link } from "wouter";
import { Wrench } from "lucide-react";
import { useLang } from "@/contexts/LanguageContext";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { REPAIR_SERVICES, estimateRepairTotal, type RepairServiceId } from "@/lib/repair-pricing";
import { useToast } from "@/hooks/use-toast";

export default function BookRepair() {
  const { t, lang } = useLang();
  const { toast } = useToast();
  const [selected, setSelected] = useState<RepairServiceId[]>([]);
  const [urgency, setUrgency] = useState<"standard" | "same_day">("standard");
  const [device, setDevice] = useState("");
  const [notes, setNotes] = useState("");

  const total = useMemo(
    () => estimateRepairTotal(selected, urgency),
    [selected, urgency],
  );

  const toggle = (id: RepairServiceId) => {
    setSelected((prev) => (prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]));
  };

  const submit = () => {
    if (selected.length === 0 || !device.trim()) return;
    toast({ title: t("book_ok") });
  };

  return (
    <div className="bg-muted/30 min-h-[75vh] py-10">
      <div className="container mx-auto px-4 md:px-6 max-w-3xl">
        <nav className="text-sm text-muted-foreground mb-6">
          <Link href="/" className="hover:text-primary">
            {t("breadcrumb_home")}
          </Link>
          <span className="mx-2">/</span>
          <span className="text-foreground font-medium">{t("nav_book_repair")}</span>
        </nav>

        <div className="rounded-xl border border-border bg-card p-6 md:p-8 shadow-sm">
          <div className="flex items-center gap-3 mb-2">
            <Wrench className="w-8 h-8 text-primary" />
            <h1 className="font-display text-2xl md:text-3xl font-bold text-foreground">{t("book_repair_title")}</h1>
          </div>
          <p className="text-muted-foreground text-sm mb-8">{t("book_repair_sub")}</p>

          <div className="space-y-6">
            <div className="space-y-2">
              <Label htmlFor="device">{t("book_device_hint")}</Label>
              <Input id="device" value={device} onChange={(e) => setDevice(e.target.value)} placeholder="e.g. iPhone 15 Pro" />
            </div>

            <div className="space-y-3">
              <Label>{t("book_services_label")}</Label>
              <div className="grid gap-3">
                {REPAIR_SERVICES.map((s) => (
                  <label
                    key={s.id}
                    className="flex items-start gap-3 rounded-lg border border-border p-3 cursor-pointer hover:bg-muted/40"
                  >
                    <Checkbox
                      checked={selected.includes(s.id)}
                      onCheckedChange={() => toggle(s.id)}
                    />
                    <span className="text-sm">
                      <span className="font-medium text-foreground block">
                        {lang === "pt" ? s.labelPt : s.labelEn}
                      </span>
                      <span className="text-muted-foreground">€{s.baseEuro.toFixed(2)}</span>
                    </span>
                  </label>
                ))}
              </div>
            </div>

            <div className="space-y-2">
              <Label>{t("book_notes")}</Label>
              <Textarea value={notes} onChange={(e) => setNotes(e.target.value)} rows={3} className="resize-none" />
            </div>

            <div className="flex flex-wrap gap-4">
              <label className="flex items-center gap-2 text-sm cursor-pointer">
                <input
                  type="radio"
                  name="urgency"
                  checked={urgency === "standard"}
                  onChange={() => setUrgency("standard")}
                  className="accent-primary"
                />
                {t("book_urgency_standard")}
              </label>
              <label className="flex items-center gap-2 text-sm cursor-pointer">
                <input
                  type="radio"
                  name="urgency"
                  checked={urgency === "same_day"}
                  onChange={() => setUrgency("same_day")}
                  className="accent-primary"
                />
                {t("book_urgency_same_day")}
              </label>
            </div>

            <div className="rounded-lg bg-primary/10 border border-primary/20 px-4 py-3 flex justify-between items-center">
              <span className="font-medium">{t("book_total")}</span>
              <span className="font-display text-xl font-bold text-foreground">€{total.toFixed(2)}</span>
            </div>

            <Button className="w-full" size="lg" type="button" onClick={submit}>
              {t("book_submit")}
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
