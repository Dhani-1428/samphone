import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { useLang } from "@/contexts/LanguageContext";
import type { AccountAddress } from "@/lib/account-store";

const COUNTRIES = [
  "Portugal",
  "Spain",
  "France",
  "Germany",
  "Austria",
  "Italy",
  "United Kingdom",
  "Netherlands",
  "Belgium",
];

type Props = {
  address: AccountAddress;
  onChange: (next: AccountAddress) => void;
  showCompany?: boolean;
  showDeliveryCheckbox?: boolean;
};

export default function AccountAddressForm({
  address,
  onChange,
  showCompany = false,
  showDeliveryCheckbox = false,
}: Props) {
  const { t } = useLang();
  const set = (patch: Partial<AccountAddress>) => onChange({ ...address, ...patch });

  return (
    <div className="space-y-4">
      {showCompany ? (
        <div className="space-y-2">
          <Label htmlFor="acc-company">{t("account_field_company")}</Label>
          <Input
            id="acc-company"
            value={address.company}
            onChange={(e) => set({ company: e.target.value })}
          />
        </div>
      ) : null}

      <div className="space-y-2">
        <Label htmlFor="acc-street">{t("account_field_street")}</Label>
        <Input id="acc-street" value={address.street} onChange={(e) => set({ street: e.target.value })} />
      </div>

      <div className="space-y-2">
        <Label htmlFor="acc-street2">{t("account_field_street2")}</Label>
        <Input id="acc-street2" value={address.street2} onChange={(e) => set({ street2: e.target.value })} />
      </div>

      <div className="grid sm:grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label htmlFor="acc-zip">{t("account_field_zip")}</Label>
          <Input id="acc-zip" value={address.zip} onChange={(e) => set({ zip: e.target.value })} />
        </div>
        <div className="space-y-2">
          <Label htmlFor="acc-city">{t("account_field_city")}</Label>
          <Input id="acc-city" value={address.city} onChange={(e) => set({ city: e.target.value })} />
        </div>
      </div>

      <div className="grid sm:grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label htmlFor="acc-country">{t("account_field_country")}</Label>
          <select
            id="acc-country"
            value={address.country}
            onChange={(e) => set({ country: e.target.value })}
            className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          >
            {COUNTRIES.map((c) => (
              <option key={c} value={c}>
                {c}
              </option>
            ))}
          </select>
        </div>
        <div className="space-y-2">
          <Label htmlFor="acc-phone">{t("account_field_phone")}</Label>
          <Input
            id="acc-phone"
            type="tel"
            placeholder="01 45 96 32 25"
            value={address.phone}
            onChange={(e) => set({ phone: e.target.value })}
          />
        </div>
      </div>

      {showDeliveryCheckbox ? (
        <label className="flex items-center gap-2 text-sm text-foreground cursor-pointer">
          <Checkbox
            checked={address.useForDelivery}
            onCheckedChange={(v) => set({ useForDelivery: v === true })}
          />
          {t("account_use_delivery_address")}
        </label>
      ) : null}
    </div>
  );
}
