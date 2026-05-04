import { useMemo, useState } from "react";
import { CalendarRange } from "lucide-react";
import { useLang } from "@/contexts/LanguageContext";
import {
  estimateDeliveryRange,
  formatDeliveryRange,
  type ShippingSpeed,
  type ShippingZone,
} from "@/lib/delivery-estimate";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

export default function DeliveryEstimator({ className }: { className?: string }) {
  const { t, lang } = useLang();
  const [zone, setZone] = useState<ShippingZone>("portugal");
  const [speed, setSpeed] = useState<ShippingSpeed>("standard");

  const label = useMemo(() => {
    const { start, end } = estimateDeliveryRange(zone, speed);
    const locale = lang === "pt" ? "pt-PT" : "en-GB";
    return formatDeliveryRange(start, end, locale);
  }, [zone, speed, lang]);

  return (
    <div className={className}>
      <div className="flex items-center gap-2 mb-3">
        <CalendarRange className="w-4 h-4 text-primary shrink-0" />
        <h3 className="text-sm font-semibold text-foreground">{t("delivery_title")}</h3>
      </div>
      <div className="grid gap-3 sm:grid-cols-2">
        <div className="space-y-1.5">
          <Label className="text-xs text-muted-foreground">{t("delivery_region")}</Label>
          <Select value={zone} onValueChange={(v) => setZone(v as ShippingZone)}>
            <SelectTrigger className="h-9 text-sm">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="lisbon">{t("delivery_zone_lisbon")}</SelectItem>
              <SelectItem value="portugal">{t("delivery_zone_portugal")}</SelectItem>
              <SelectItem value="islands">{t("delivery_zone_islands")}</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-1.5">
          <Label className="text-xs text-muted-foreground">{t("delivery_speed_label")}</Label>
          <Select value={speed} onValueChange={(v) => setSpeed(v as ShippingSpeed)}>
            <SelectTrigger className="h-9 text-sm">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="standard">{t("delivery_speed_standard")}</SelectItem>
              <SelectItem value="express">{t("delivery_speed_express")}</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>
      <p className="mt-3 text-sm text-muted-foreground">
        <span className="text-foreground font-medium">{t("delivery_arrives")}: </span>
        {label}
      </p>
    </div>
  );
}
