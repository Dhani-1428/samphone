import { motion } from "framer-motion";
import { ArrowRight, ShieldCheck, Truck, Sparkles } from "lucide-react";

interface PageVideoHeroProps {
  eyebrow: string;
  title: string;
  description: string;
  /** When set, hero uses a split layout: text left, video right (no overlay) */
  videoSrc?: string;
}

/** Outer padding so the hero sits inside a light “frame” on every page */
const HERO_GUTTER = "px-4 sm:px-6 md:px-10 lg:px-12 py-6 md:py-8 lg:py-10";
const FRAME_ROUNDED = "rounded-[1.75rem] md:rounded-[2rem]";

export default function PageVideoHero({ eyebrow, title, description, videoSrc }: PageVideoHeroProps) {
  if (videoSrc) {
    return (
      <section className="bg-white dark:bg-background border-b border-border">
        <div className={`mx-auto max-w-[1600px] ${HERO_GUTTER}`}>
          <div
            className={`grid w-full grid-cols-1 overflow-hidden border border-border/80 bg-card shadow-xl ring-1 ring-black/[0.06] dark:ring-white/10 lg:grid-cols-2 lg:items-stretch lg:min-h-[min(520px,52vh)] ${FRAME_ROUNDED}`}
          >
            {/* Copy + CTAs — left; drives row height on large screens */}
            <div className="flex min-h-0 flex-col justify-center px-6 py-10 sm:px-8 sm:py-12 md:px-10 md:py-14 lg:min-h-full lg:pl-12 lg:pr-8 xl:pl-14">
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5 }}
              >
                <motion.div
                  initial={{ opacity: 0, scale: 0.95 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ duration: 0.4, delay: 0.05 }}
                  className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-primary/10 text-primary border border-primary/20 mb-4 md:mb-5"
                >
                  <Sparkles className="w-4 h-4" />
                  <span className="text-sm font-medium uppercase tracking-wider">{eyebrow}</span>
                </motion.div>

                <motion.h1
                  initial={{ opacity: 0, y: 16 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.5, delay: 0.1 }}
                  className="text-4xl sm:text-5xl md:text-6xl lg:text-6xl xl:text-7xl font-display font-bold text-foreground mb-3 md:mb-4 leading-[1.06] max-w-xl lg:max-w-none"
                >
                  {title}
                </motion.h1>

                <motion.p
                  initial={{ opacity: 0, y: 14 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.5, delay: 0.15 }}
                  className="text-foreground/70 text-base md:text-lg lg:text-xl max-w-xl"
                >
                  {description}
                </motion.p>

                <motion.div
                  initial={{ opacity: 0, y: 14 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.45, delay: 0.22 }}
                  className="flex flex-wrap gap-3 mt-6 md:mt-8"
                >
                  <a
                    href="#products"
                    className="inline-flex items-center gap-2 px-5 h-11 rounded-xl bg-primary text-primary-foreground hover:bg-primary/90 transition-colors font-semibold text-sm shadow-md"
                  >
                    Shop Highlights <ArrowRight className="w-4 h-4" />
                  </a>
                  <a
                    href="#categories"
                    className="inline-flex items-center gap-2 px-5 h-11 rounded-xl border border-border bg-background hover:bg-muted transition-colors font-semibold text-sm text-foreground"
                  >
                    Explore Categories
                  </a>
                </motion.div>
              </motion.div>
            </div>

            {/* Video — right column, stretches to match text column height */}
            <div className="relative min-h-[240px] h-full w-full border-t border-border/60 bg-zinc-950 sm:min-h-[280px] lg:min-h-full lg:border-l lg:border-t-0">
              <video
                className="absolute inset-0 h-full w-full object-cover"
                src={videoSrc}
                autoPlay
                muted
                loop
                playsInline
                preload="metadata"
              />
            </div>
          </div>
        </div>
      </section>
    );
  }

  return (
    <section className="relative overflow-hidden bg-white dark:bg-background border-b border-border">
      <div className={`mx-auto max-w-[1600px] ${HERO_GUTTER} relative`}>
        <div
          className={`relative overflow-hidden border border-border/80 bg-gradient-to-br from-primary/[0.06] via-background to-blue-500/[0.06] shadow-xl ring-1 ring-black/[0.06] dark:ring-white/10 ${FRAME_ROUNDED}`}
        >
          <div className="absolute inset-0 bg-gradient-to-br from-primary/[0.08] via-transparent to-blue-500/[0.08]" />
          <div className="absolute -top-16 -left-20 w-64 h-64 bg-primary/15 blur-3xl rounded-full pointer-events-none" />
          <div className="absolute -bottom-20 right-0 w-72 h-72 bg-cyan-400/15 blur-3xl rounded-full pointer-events-none" />

          <div className="relative px-5 py-12 md:px-10 md:py-16 lg:py-20">
            <div className="grid lg:grid-cols-2 gap-10 lg:gap-14 items-center">
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5 }}
              >
                <motion.div
                  initial={{ opacity: 0, scale: 0.95 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ duration: 0.4, delay: 0.05 }}
                  className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-primary/10 text-primary border border-primary/20 mb-5"
                >
                  <Sparkles className="w-4 h-4" />
                  <span className="text-sm font-medium uppercase tracking-wider">{eyebrow}</span>
                </motion.div>

                <motion.h1
                  initial={{ opacity: 0, y: 16 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.5, delay: 0.1 }}
                  className="text-5xl md:text-7xl font-display font-bold text-foreground mb-4 leading-[1.06]"
                >
                  {title}
                </motion.h1>

                <motion.p
                  initial={{ opacity: 0, y: 14 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.5, delay: 0.15 }}
                  className="text-foreground/70 text-lg md:text-xl max-w-xl"
                >
                  {description}
                </motion.p>

                <motion.div
                  initial={{ opacity: 0, y: 14 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.45, delay: 0.22 }}
                  className="flex flex-wrap gap-3 mt-7"
                >
                  <a
                    href="#products"
                    className="inline-flex items-center gap-2 px-5 h-11 rounded-xl bg-primary text-primary-foreground hover:bg-primary/90 transition-colors font-semibold text-sm"
                  >
                    Shop Highlights <ArrowRight className="w-4 h-4" />
                  </a>
                  <a
                    href="#categories"
                    className="inline-flex items-center gap-2 px-5 h-11 rounded-xl border border-border bg-background hover:bg-muted transition-colors font-semibold text-sm text-foreground"
                  >
                    Explore Categories
                  </a>
                </motion.div>
              </motion.div>

              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5, delay: 0.12 }}
                className="relative"
              >
                <div className="rounded-3xl border border-border bg-card/85 backdrop-blur p-5 md:p-6 shadow-xl">
                  <div className="grid grid-cols-2 gap-4">
                    <motion.div
                      animate={{ y: [0, -6, 0] }}
                      transition={{ duration: 3, repeat: Infinity, ease: "easeInOut" }}
                      className="rounded-2xl border border-border bg-background p-4"
                    >
                      <p className="text-2xl font-display font-bold text-foreground">700+</p>
                      <p className="text-xs text-muted-foreground mt-1">Supported Models</p>
                    </motion.div>
                    <motion.div
                      animate={{ y: [0, 6, 0] }}
                      transition={{ duration: 3.4, repeat: Infinity, ease: "easeInOut" }}
                      className="rounded-2xl border border-border bg-background p-4"
                    >
                      <p className="text-2xl font-display font-bold text-foreground">4.9/5</p>
                      <p className="text-xs text-muted-foreground mt-1">Customer Rating</p>
                    </motion.div>
                    <motion.div
                      animate={{ x: [0, -4, 0] }}
                      transition={{ duration: 3.2, repeat: Infinity, ease: "easeInOut" }}
                      className="col-span-2 rounded-2xl border border-border bg-background p-4 flex items-center justify-between"
                    >
                      <div className="flex items-center gap-2 text-sm text-foreground">
                        <ShieldCheck className="w-4 h-4 text-primary" />
                        Quality Assured Products
                      </div>
                      <div className="flex items-center gap-2 text-sm text-foreground">
                        <Truck className="w-4 h-4 text-primary" />
                        Fast Delivery
                      </div>
                    </motion.div>
                  </div>
                </div>
              </motion.div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
