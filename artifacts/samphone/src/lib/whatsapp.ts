import { STORE_PHONE } from "@/config/samphone";

export const WHATSAPP_E164 = STORE_PHONE.replace(/\D/g, "");

export function whatsappHref(text: string): string {
  return `https://wa.me/${WHATSAPP_E164}?text=${encodeURIComponent(text)}`;
}

export function openWhatsApp(text: string): void {
  window.open(whatsappHref(text), "_blank", "noopener,noreferrer");
}
