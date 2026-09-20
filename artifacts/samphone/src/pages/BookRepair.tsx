import { useEffect, useMemo, useState, type FormEvent } from "react";
import { useSearch } from "wouter";
import { Wrench } from "lucide-react";
import { useLang } from "@/contexts/LanguageContext";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { REPAIR_SERVICES, type RepairServiceId } from "@/lib/repair-pricing";
import {
  OTHER_MODEL,
  REPAIR_BRANDS,
  brandNameForSlug,
  guessBrandAndModel,
  modelsForRepairBrand,
  type RepairBrandSlug,
} from "@/lib/repair-devices";
import { openWhatsApp } from "@/lib/whatsapp";
import { submitRepairLead } from "@/lib/samphone-cloud";
import { useToast } from "@/hooks/use-toast";

function parseServices(raw: string | null): RepairServiceId[] {
  if (!raw) return [];
  const allowed = new Set(REPAIR_SERVICES.map((s) => s.id));
  return raw
    .split(",")
    .map((x) => x.trim())
    .filter((x): x is RepairServiceId => allowed.has(x as RepairServiceId));
}

const selectClass =
  "flex h-11 w-full rounded-md border border-input bg-background px-3 py-2 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50";

export default function BookRepair() {
  const { t, lang } = useLang();
  const { user } = useAuth();
  const { toast } = useToast();
  const search = useSearch();
  const [selected, setSelected] = useState<RepairServiceId[]>([]);
  const [urgency, setUrgency] = useState<"standard" | "same_day">("standard");
  const [brand, setBrand] = useState<RepairBrandSlug | "">("");
  const [model, setModel] = useState("");
  const [otherDevice, setOtherDevice] = useState("");
  const [name, setName] = useState(user?.name ?? "");
  const [phone, setPhone] = useState(user?.phone ?? "");
  const [notes, setNotes] = useState("");
  const [error, setError] = useState<string | null>(null);

  const modelOptions = useMemo(() => (brand ? modelsForRepairBrand(brand) : []), [brand]);
  const needsOtherDevice = brand === "other" || model === OTHER_MODEL || (Boolean(brand) && modelOptions.length === 0);

  useEffect(() => {
    const q = new URLSearchParams(search);
    const d = q.get("device");
    if (d) {
      const guessed = guessBrandAndModel(d);
      setBrand(guessed.brand);
      setModel(guessed.model);
      if (guessed.model === OTHER_MODEL) setOtherDevice(d);
    }
    const services = parseServices(q.get("services"));
    if (services.length) setSelected(services);
    const n = q.get("notes");
    if (n) setNotes(n);
  }, [search]);

  const deviceLabel = useMemo(() => {
    if (needsOtherDevice) return otherDevice.trim();
    if (!brand || !model) return "";
    const brandName = brandNameForSlug(brand);
    return `${brandName} ${model}`.trim();
  }, [brand, model, needsOtherDevice, otherDevice]);

  const toggle = (id: RepairServiceId) => {
    setSelected((prev) => (prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]));
  };

  const onBrandChange = (next: RepairBrandSlug | "") => {
    setBrand(next);
    setOtherDevice("");
    if (next && next !== "other" && modelsForRepairBrand(next).length === 0) {
      setModel(OTHER_MODEL);
    } else {
      setModel("");
    }
  };

  const submit = (e: FormEvent) => {
    e.preventDefault();
    if (!name.trim() || !phone.trim() || !deviceLabel || selected.length === 0) {
      setError(t("book_need_fields"));
      return;
    }
    setError(null);
    const labels = selected
      .map((id) => REPAIR_SERVICES.find((s) => s.id === id))
      .filter(Boolean)
      .map((s) => (lang === "pt" ? s!.labelPt : s!.labelEn));
    const urgencyLabel = urgency === "same_day" ? t("book_urgency_same_day") : t("book_urgency_standard");
    const message = [
      "SAMPHONE — repair booking",
      `${t("checkout_full_name")}: ${name.trim()}`,
      `${t("checkout_phone")}: ${phone.trim()}`,
      `${t("book_brand")}: ${brand ? brandNameForSlug(brand) : "—"}`,
      `${t("book_model")}: ${needsOtherDevice ? otherDevice.trim() : model}`,
      `${t("book_services_label")}: ${labels.join(", ")}`,
      urgencyLabel,
      notes.trim() ? `${t("book_notes")}: ${notes.trim()}` : "",
    ]
      .filter(Boolean)
      .join("\n");
    openWhatsApp(message);
    void submitRepairLead({
      name: name.trim(),
      phone: phone.trim(),
      device: deviceLabel,
      brand: brand ? brandNameForSlug(brand) : "",
      model: needsOtherDevice ? otherDevice.trim() : model,
      services: selected,
      urgency,
      notes: notes.trim(),
    }).catch(() => {
      /* WhatsApp is the primary booking path */
    });
    toast({ title: t("book_ok") });
  };

  return (
    <div className="bg-muted/30 min-h-[75vh] py-10">
      <div className="container mx-auto px-4 md:px-6 max-w-3xl">
        <form className="rounded-xl border border-border bg-card p-6 md:p-8 shadow-sm" onSubmit={submit}>
          <div className="flex items-center gap-3 mb-2">
            <Wrench className="w-8 h-8 text-primary" />
            <h1 className="font-display text-2xl md:text-3xl font-bold text-foreground">{t("book_repair_title")}</h1>
          </div>
          <p className="text-muted-foreground text-sm mb-8">{t("book_repair_sub")}</p>

          <div className="space-y-6">
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="book-name">{t("checkout_full_name")}</Label>
                <Input id="book-name" value={name} onChange={(e) => setName(e.target.value)} required />
              </div>
              <div className="space-y-2">
                <Label htmlFor="book-phone">{t("checkout_phone")}</Label>
                <Input id="book-phone" value={phone} onChange={(e) => setPhone(e.target.value)} required />
              </div>
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="book-brand">{t("book_brand")}</Label>
                <select
                  id="book-brand"
                  className={selectClass}
                  value={brand}
                  required
                  onChange={(e) => onBrandChange(e.target.value as RepairBrandSlug | "")}
                >
                  <option value="">{t("book_brand_placeholder")}</option>
                  {REPAIR_BRANDS.map((item) => (
                    <option key={item.slug} value={item.slug}>
                      {item.name}
                    </option>
                  ))}
                </select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="book-model">{t("book_model")}</Label>
                {brand && brand !== "other" && modelOptions.length > 0 ? (
                  <select
                    id="book-model"
                    className={selectClass}
                    value={model}
                    required
                    disabled={!brand}
                    onChange={(e) => setModel(e.target.value)}
                  >
                    <option value="">{t("book_model_placeholder")}</option>
                    {modelOptions.map((item) => (
                      <option key={item} value={item}>
                        {item}
                      </option>
                    ))}
                    <option value={OTHER_MODEL}>{t("book_other")}</option>
                  </select>
                ) : (
                  <Input
                    id="book-model"
                    value={otherDevice}
                    onChange={(e) => {
                      setModel(OTHER_MODEL);
                      setOtherDevice(e.target.value);
                    }}
                    placeholder={t("book_model_placeholder")}
                    required={Boolean(brand)}
                    disabled={!brand}
                  />
                )}
              </div>
            </div>

            {brand && brand !== "other" && model === OTHER_MODEL ? (
              <div className="space-y-2">
                <Label htmlFor="book-other-model">{t("book_other_device")}</Label>
                <Input
                  id="book-other-model"
                  value={otherDevice}
                  onChange={(e) => setOtherDevice(e.target.value)}
                  placeholder={t("book_model_placeholder")}
                  required
                />
              </div>
            ) : null}

            <div className="space-y-3">
              <Label>{t("book_services_label")}</Label>
              <div className="grid gap-3">
                {REPAIR_SERVICES.map((s) => (
                  <label
                    key={s.id}
                    className="flex items-start gap-3 rounded-lg border border-border p-3 cursor-pointer hover:bg-muted/40"
                  >
                    <Checkbox checked={selected.includes(s.id)} onCheckedChange={() => toggle(s.id)} />
                    <span className="text-sm font-medium text-foreground">
                      {lang === "pt" ? s.labelPt : s.labelEn}
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

            {error ? <p className="text-sm text-destructive">{error}</p> : null}

            <Button className="w-full" size="lg" type="submit">
              {t("book_whatsapp")}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}
