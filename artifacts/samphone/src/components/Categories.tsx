import { motion, useInView } from "framer-motion";
import { useEffect, useRef, useState } from "react";
import { Link } from "wouter";
import { ArrowRight } from "lucide-react";
import CatalogImage from "@/components/CatalogImage";
import { useLang } from "@/contexts/LanguageContext";
import {
  fetchCloudProductList,
  firstCatalogImage,
  searchCloudProductsPage,
} from "@/lib/samphone-cloud";
import type { WooProduct } from "@/lib/woocommerce";

type TileDef = {
  key: string;
  href: string;
  name: { en: string; pt: string };
  subtitle: { en: string; pt: string };
};

const TILES: TileDef[] = [
  {
    key: "cases",
    href: "/group/Soft%20Jelly",
    name: { en: "Phone Cases", pt: "Capas" },
    subtitle: { en: "Protection in style", pt: "Proteção com estilo" },
  },
  {
    key: "chargers",
    href: "/group/Chargers",
    name: { en: "Chargers & Cables", pt: "Carregadores e cabos" },
    subtitle: { en: "Fast charging essentials", pt: "Carregamento rápido" },
  },
  {
    key: "audio",
    href: "/group/Headphones",
    name: { en: "Audio Devices", pt: "Áudio" },
    subtitle: { en: "Earphones & speakers", pt: "Auscultadores e colunas" },
  },
  {
    key: "glass",
    href: "/group/Full%20Glue%20Glass",
    name: { en: "Screen Protectors", pt: "Películas" },
    subtitle: { en: "Crystal clear defense", pt: "Proteção cristalina" },
  },
  {
    key: "parts",
    href: "/group/LCD",
    name: { en: "Spare Parts", pt: "Peças" },
    subtitle: { en: "Screens, batteries & more", pt: "Ecrãs, baterias e mais" },
  },
  {
    key: "tablets",
    href: "/tablets",
    name: { en: "Tablet Accessories", pt: "Acessórios para tablets" },
    subtitle: { en: "iPad & Android tablets", pt: "iPad e tablets Android" },
  },
];

type TileData = { img: string | null; count: number };

const containerVariants = {
  hidden: { opacity: 0 },
  visible: { opacity: 1, transition: { staggerChildren: 0.1 } },
};

const cardVariants = {
  hidden: { opacity: 0, y: 50 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.6, ease: "easeOut" as const } },
};

function pickTabletImage(products: WooProduct[]): string | null {
  const ranked = [...products].sort((a, b) => tabletScore(b) - tabletScore(a));
  return firstCatalogImage(ranked.filter((p) => tabletScore(p) >= 0)) ?? firstCatalogImage(products);
}

function tabletScore(p: WooProduct): number {
  const n = p.name.toLowerCase();
  let score = 0;
  if (/\b(stand|holder|case|cover|keyboard|pencil|film)\b/.test(n)) score += 3;
  if (/\btablet\b|ipad/.test(n)) score += 2;
  if (/lcd|touch\s*\+|flex|buzzer|charging board/.test(n)) score -= 4;
  return score;
}

async function loadTile(key: string): Promise<TileData> {
  if (key === "cases") {
    const page = await fetchCloudProductList({ category_group: "Soft Jelly" }, 8);
    return { img: firstCatalogImage(page.items), count: page.total };
  }
  if (key === "chargers") {
    const [chargers, cables] = await Promise.all([
      fetchCloudProductList({ category_group: "Chargers" }, 16),
      fetchCloudProductList({ category_group: "Cables" }, 8),
    ]);
    return {
      img: firstCatalogImage(chargers.items) ?? firstCatalogImage(cables.items),
      count: chargers.total + cables.total,
    };
  }
  if (key === "audio") {
    const page = await fetchCloudProductList({ category_group: "Headphones" }, 8);
    return { img: firstCatalogImage(page.items), count: page.total };
  }
  if (key === "glass") {
    const page = await fetchCloudProductList({ category_group: "Full Glue Glass" }, 8);
    return { img: firstCatalogImage(page.items), count: page.total };
  }
  if (key === "parts") {
    const page = await fetchCloudProductList({ category_group: "LCD" }, 12);
    return { img: firstCatalogImage(page.items), count: page.total };
  }
  const accessories = await searchCloudProductsPage("tablet stand", 24);
  const fallback = accessories.items.length ? accessories : await searchCloudProductsPage("tablet", 24);
  return { img: pickTabletImage(fallback.items), count: fallback.total };
}

export default function Categories() {
  const ref = useRef(null);
  const isInView = useInView(ref, { once: true, margin: "-80px" });
  const { lang } = useLang();
  const [tiles, setTiles] = useState<Record<string, TileData>>({});
  const copy =
    lang === "pt"
      ? {
          badge: "Navegar por Categoria",
          title: "Encontre o Que Precisa",
          sub: "De películas a componentes de motherboard — tudo para cada dispositivo.",
          shopNow: "Comprar agora",
          items: "artigos",
        }
      : {
          badge: "Browse by Category",
          title: "Find What You Need",
          sub: "From screen protectors to motherboard components — everything for every device.",
          shopNow: "Shop now",
          items: "items",
        };

  useEffect(() => {
    let alive = true;
    void Promise.all(
      TILES.map(async (tile) => {
        try {
          const data = await loadTile(tile.key);
          if (alive) setTiles((prev) => ({ ...prev, [tile.key]: data }));
        } catch {
          if (alive) setTiles((prev) => ({ ...prev, [tile.key]: { img: null, count: 0 } }));
        }
      }),
    );
    return () => {
      alive = false;
    };
  }, []);

  return (
    <section id="categories" className="py-8 md:py-10">
      <div className="mx-auto w-full max-w-[1600px] px-5 sm:px-8 md:px-10 lg:px-14 xl:px-16">
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={isInView ? { opacity: 1, y: 0 } : {}}
          ref={ref}
          transition={{ duration: 0.6 }}
          className="mb-6 text-left"
        >
          <h2 className="font-display text-2xl font-bold tracking-tight text-foreground md:text-[2rem] mb-2">
            {copy.title}
          </h2>
          <p className="text-muted-foreground text-sm max-w-xl">
            {copy.sub}
          </p>
        </motion.div>

        <motion.div
          variants={containerVariants}
          initial="hidden"
          animate={isInView ? "visible" : "hidden"}
          className="grid grid-cols-2 md:grid-cols-3 gap-4 md:gap-6"
        >
          {TILES.map((tile, i) => {
            const data = tiles[tile.key];
            const name = lang === "pt" ? tile.name.pt : tile.name.en;
            const subtitle = lang === "pt" ? tile.subtitle.pt : tile.subtitle.en;
            const countLabel =
              data && data.count > 0 ? `${data.count} ${copy.items}` : "\u00a0";
            return (
              <motion.div key={tile.key} variants={cardVariants} whileHover={{ y: -6, scale: 1.02 }} transition={{ duration: 0.25 }}>
                <Link
                  href={tile.href}
                  className="group relative block overflow-hidden rounded-2xl cursor-pointer bg-card border border-border"
                  data-testid={`card-category-${i}`}
                >
                  <div className="aspect-[4/3] overflow-hidden bg-white dark:bg-neutral-900">
                    {data?.img ? (
                      <CatalogImage
                        src={data.img}
                        alt={name}
                        className="h-full w-full object-contain p-6 transition-transform duration-500 group-hover:scale-105"
                        loading="lazy"
                      />
                    ) : (
                      <div className="h-full w-full animate-pulse bg-muted" />
                    )}
                    <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-black/80 via-black/25 to-transparent" />
                  </div>
                  <div className="absolute bottom-0 left-0 right-0 p-4 md:p-5">
                    <p className="text-white/70 text-xs mb-1">{countLabel}</p>
                    <h3 className="font-display font-bold text-white text-base md:text-xl leading-tight">{name}</h3>
                    <p className="text-white/70 text-xs md:text-sm mt-1 hidden md:block">{subtitle}</p>
                    <div className="flex items-center gap-1 mt-2 text-primary text-xs font-semibold opacity-0 group-hover:opacity-100 transition-opacity duration-300">
                      {copy.shopNow} <ArrowRight className="w-3 h-3" />
                    </div>
                  </div>
                </Link>
              </motion.div>
            );
          })}
        </motion.div>
      </div>
    </section>
  );
}
