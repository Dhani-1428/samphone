import { motion, useInView } from "framer-motion";
import { useRef } from "react";
import { ArrowRight } from "lucide-react";
import { useLang } from "@/contexts/LanguageContext";
import categoryCases from "@/assets/category-cases.png";
import categoryChargers from "@/assets/category-chargers.png";
import categoryAudio from "@/assets/category-audio.png";
import categoryScreen from "@/assets/category-screen.png";
import categoryParts from "@/assets/category-parts.png";
import categoryTablets from "@/assets/category-tablets.png";

const categories = [
  { name: "Phone Cases", subtitle: "Protection in style", img: categoryCases, count: "200+ items" },
  { name: "Chargers & Cables", subtitle: "Fast charging essentials", img: categoryChargers, count: "150+ items" },
  { name: "Audio Devices", subtitle: "Earphones & speakers", img: categoryAudio, count: "80+ items" },
  { name: "Screen Protectors", subtitle: "Crystal clear defense", img: categoryScreen, count: "120+ items" },
  { name: "Spare Parts", subtitle: "Screens, batteries & more", img: categoryParts, count: "500+ items" },
  { name: "Tablet Accessories", subtitle: "iPad & Android tablets", img: categoryTablets, count: "90+ items" },
];

const containerVariants = {
  hidden: { opacity: 0 },
  visible: { opacity: 1, transition: { staggerChildren: 0.1 } },
};

const cardVariants = {
  hidden: { opacity: 0, y: 50 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.6, ease: "easeOut" as const } },
};

export default function Categories() {
  const ref = useRef(null);
  const isInView = useInView(ref, { once: true, margin: "-80px" });
  const { lang } = useLang();
  const copy =
    lang === "pt"
      ? {
          badge: "Navegar por Categoria",
          title: "Encontre o Que Precisa",
          sub: "De películas a componentes de motherboard — tudo para cada dispositivo.",
          shopNow: "Comprar agora",
        }
      : {
          badge: "Browse by Category",
          title: "Find What You Need",
          sub: "From screen protectors to motherboard components — everything for every device.",
          shopNow: "Shop now",
        };

  const goToCategory = (name: string) => {
    const slug = name.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "");
    window.location.href = `${import.meta.env.BASE_URL.replace(/\/$/, "")}/category/${slug}`;
  };

  return (
    <section id="categories" className="py-20 bg-background">
      <div className="container mx-auto px-4 md:px-6">
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={isInView ? { opacity: 1, y: 0 } : {}}
          ref={ref}
          transition={{ duration: 0.6 }}
          className="text-center mb-12"
        >
          <span className="inline-block px-3 py-1 rounded-full bg-primary/10 text-primary text-sm font-medium mb-4">
            {copy.badge}
          </span>
          <h2 className="text-4xl md:text-5xl font-display font-bold text-foreground mb-4">
            {copy.title}
          </h2>
          <p className="text-muted-foreground text-lg max-w-xl mx-auto">
            {copy.sub}
          </p>
        </motion.div>

        <motion.div
          variants={containerVariants}
          initial="hidden"
          animate={isInView ? "visible" : "hidden"}
          className="grid grid-cols-2 md:grid-cols-3 gap-4 md:gap-6"
        >
          {categories.map((cat, i) => (
            <motion.div
              key={cat.name}
              variants={cardVariants}
              whileHover={{ y: -6, scale: 1.02 }}
              onClick={() => goToCategory(cat.name)}
              transition={{ duration: 0.25 }}
              className="group relative overflow-hidden rounded-2xl cursor-pointer bg-card border border-border"
              data-testid={`card-category-${i}`}
            >
              <div className="aspect-[4/3] overflow-hidden">
                <img
                  src={cat.img}
                  alt={cat.name}
                  className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/30 to-transparent" />
              </div>
              <div className="absolute bottom-0 left-0 right-0 p-4 md:p-5">
                <p className="text-white/70 text-xs mb-1">{cat.count}</p>
                <h3 className="font-display font-bold text-white text-base md:text-xl leading-tight">{cat.name}</h3>
                <p className="text-white/70 text-xs md:text-sm mt-1 hidden md:block">{cat.subtitle}</p>
                <div className="flex items-center gap-1 mt-2 text-primary text-xs font-semibold opacity-0 group-hover:opacity-100 transition-opacity duration-300">
                  {copy.shopNow} <ArrowRight className="w-3 h-3" />
                </div>
              </div>
            </motion.div>
          ))}
        </motion.div>
      </div>
    </section>
  );
}
