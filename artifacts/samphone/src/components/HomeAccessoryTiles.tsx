import { Link } from "wouter";
import { useLang } from "@/contexts/LanguageContext";

export const ACCESSORY_GROUPS = [
  { title: "Powerbanks", group: "Powerbanks" },
  { title: "Chargers", group: "Chargers" },
  { title: "Cables", group: "Cables" },
  { title: "Headphones", group: "Headphones" },
  { title: "Speakers", group: "Speakers" },
  { title: "Smartwatch", group: "Smartwatch" },
  { title: "Car", group: "Car" },
  { title: "Laptop", group: "Laptop" },
  { title: "Audio", group: "Audio" },
  { title: "Tools", group: "Repairing Tools" },
] as const;

export default function HomeAccessoryTiles() {
  const { t } = useLang();
  return (
    <section className="py-8 md:py-10">
      <div className="mx-auto w-full max-w-[1600px] px-5 sm:px-8 md:px-10 lg:px-14 xl:px-16">
        <h2 className="mb-5 font-display text-2xl font-bold tracking-tight text-foreground md:text-[2rem]">
          {t("home_accessory_groups_title")}
        </h2>
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-5">
          {ACCESSORY_GROUPS.map((g) => (
            <Link
              key={g.group}
              href={`/group/${encodeURIComponent(g.group)}`}
              className="rounded-xl border border-border bg-card px-4 py-5 text-center font-display text-sm font-bold text-foreground shadow-sm transition-colors hover:border-brand/40"
            >
              {g.title}
            </Link>
          ))}
        </div>
      </div>
    </section>
  );
}
