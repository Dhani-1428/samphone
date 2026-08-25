export const ACCESSORY_NAV_PAGES = [
  { label: "Powerbanks", group: "Powerbanks" },
  { label: "Chargers", group: "Chargers" },
  { label: "Cables", group: "Cables" },
  { label: "Headphones", group: "Headphones" },
  { label: "Speakers", group: "Speakers" },
  { label: "Smartwatch", group: "Smartwatch" },
  { label: "Mobile Car Support", group: "Mobile Car Support" },
  { label: "Laptop", group: "Laptop" },
  { label: "Audio & Microphone", group: "Audio & Microphone" },
  { label: "Electronics", group: "Electronics" },
  { label: "Beautycare", group: "Beautycare" },
  { label: "Cell AA/AAA", group: "Cell AA/AAA" },
  { label: "Original Accessories", group: "Original Accessories" },
  { label: "Cards", group: "Cards" },
  { label: "Repairing Tools", group: "Repairing Tools" },
] as const;

export function accessoryPageHref(group: string): string {
  return `/group/${encodeURIComponent(group)}`;
}
