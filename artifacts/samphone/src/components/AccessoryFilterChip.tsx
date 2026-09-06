import type { LucideIcon } from "lucide-react";
import {
  Battery,
  BatteryCharging,
  Cable,
  Car,
  CreditCard,
  Cpu,
  Fan,
  Headphones,
  Keyboard,
  Laptop,
  LayoutGrid,
  Mic,
  Mouse,
  Plug,
  Smartphone,
  Sparkles,
  Speaker,
  Usb,
  Watch,
  Wifi,
  Wrench,
  Zap,
} from "lucide-react";
import { CatalogTypeChip } from "@/components/CatalogPageChrome";

export function subtypeIcon(label: string): LucideIcon {
  const k = label.toLowerCase();
  if (k.includes("adapter")) return Plug;
  if (k.includes("lightning")) return Zap;
  if (k.includes("wireless") && k.includes("charg")) return Wifi;
  if (k.includes("type-c") || k.includes("usb-c") || k.includes("hdmi")) return Cable;
  if (k.includes("micro")) return Usb;
  if (k.includes("power bank") || k.includes("powerbank")) return BatteryCharging;
  if (k.includes("headphone") || k.includes("earphone") || k.includes("headset") || k.includes("audio")) return Headphones;
  if (k.includes("speaker")) return Speaker;
  if (k.includes("watch")) return Watch;
  if (k.includes("car")) return Car;
  if (k.includes("laptop")) return Laptop;
  if (k.includes("keyboard")) return Keyboard;
  if (k.includes("mice") || k.includes("mouse")) return Mouse;
  if (k.includes("mic")) return Mic;
  if (k.includes("fan") || k.includes("electronic")) return Fan;
  if (k.includes("beauty")) return Sparkles;
  if (k.includes("sim") || k.includes("memory") || k.includes("card") || k.includes("cell")) return CreditCard;
  if (k.includes("screw") || k.includes("opener") || k.includes("kit") || k.includes("tool")) return Wrench;
  if (k.includes("case") || k.includes("cover") || k.includes("jelly")) return Smartphone;
  if (k.includes("charger")) return Plug;
  if (k.includes("cable")) return Cable;
  return LayoutGrid;
}

export function groupIcon(group: string): LucideIcon {
  const k = group.toLowerCase();
  if (k.includes("powerbank") || k.includes("power bank")) return Zap;
  if (k.includes("charger")) return Plug;
  if (k.includes("cable")) return Cable;
  if (k.includes("headphone")) return Headphones;
  if (k.includes("speaker")) return Speaker;
  if (k.includes("watch")) return Watch;
  if (k.includes("car")) return Car;
  if (k.includes("laptop")) return Laptop;
  if (k.includes("audio") || k.includes("mic")) return Mic;
  if (k.includes("electronic")) return Cpu;
  if (k.includes("beauty")) return Sparkles;
  if (k.includes("cell")) return Battery;
  if (k.includes("card")) return CreditCard;
  if (k.includes("tool")) return Wrench;
  if (k.includes("hoco") || k.includes("original")) return Watch;
  return subtypeIcon(group);
}

export const FilterChip = CatalogTypeChip;
