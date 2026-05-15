import type { LucideIcon } from "lucide-react";
import type { TranslationKey } from "@/contexts/LanguageContext";
import {
  LayoutDashboard,
  User,
  ShieldCheck,
  FileText,
  Bell,
  Building2,
  ShoppingBag,
  Receipt,
  Landmark,
  Settings2,
  BellRing,
  Undo2,
  Coins,
  Wallet,
} from "lucide-react";

export type AccountSectionId =
  | "dashboard"
  | "information"
  | "2fa"
  | "vat"
  | "notifications"
  | "payment"
  | "orders"
  | "invoices"
  | "payments-pending"
  | "ocadia"
  | "restock"
  | "warranty"
  | "credit-notes"
  | "ewallet";

export interface AccountNavItem {
  id: AccountSectionId;
  labelKey: TranslationKey;
  icon: LucideIcon;
}

export interface AccountNavGroup {
  titleKey?: TranslationKey;
  items: AccountNavItem[];
}

export const ACCOUNT_NAV: AccountNavGroup[] = [
  {
    titleKey: "account_nav_my_account",
    items: [
      { id: "dashboard", labelKey: "account_dashboard", icon: LayoutDashboard },
      { id: "information", labelKey: "account_nav_information", icon: User },
      { id: "2fa", labelKey: "account_nav_2fa", icon: ShieldCheck },
      { id: "vat", labelKey: "account_nav_vat", icon: FileText },
      { id: "notifications", labelKey: "account_nav_notifications", icon: Bell },
      { id: "payment", labelKey: "account_nav_payment", icon: Building2 },
    ],
  },
  {
    titleKey: "account_nav_my_orders",
    items: [
      { id: "orders", labelKey: "account_nav_orders", icon: ShoppingBag },
      { id: "invoices", labelKey: "account_nav_invoices", icon: Receipt },
      { id: "payments-pending", labelKey: "account_nav_payments_pending", icon: Landmark },
      { id: "ocadia", labelKey: "account_nav_ocadia", icon: Settings2 },
      { id: "restock", labelKey: "account_nav_restock", icon: BellRing },
    ],
  },
  {
    titleKey: "account_nav_my_returns",
    items: [
      { id: "warranty", labelKey: "account_nav_warranty", icon: Undo2 },
      { id: "credit-notes", labelKey: "account_nav_credit_notes", icon: Coins },
      { id: "ewallet", labelKey: "account_nav_ewallet", icon: Wallet },
    ],
  },
];

export function parseAccountSection(raw: string | null): AccountSectionId {
  const valid = ACCOUNT_NAV.flatMap((g) => g.items.map((i) => i.id));
  if (raw && valid.includes(raw as AccountSectionId)) return raw as AccountSectionId;
  return "dashboard";
}
