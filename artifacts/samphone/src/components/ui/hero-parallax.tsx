import React from "react";
import {
  motion,
  useScroll,
  useTransform,
  useSpring,
  type MotionValue,
} from "framer-motion";
import {
  SiSamsung, SiApple, SiXiaomi, SiOneplus, SiOppo,
  SiHuawei, SiMotorola, SiNokia, SiLg, SiSony,
  SiVivo, SiGoogle,
} from "react-icons/si";
import type { BrandItem } from "@/data/brands";

export type { BrandItem };

const ICON_MAP: Record<string, React.ElementType> = {
  SiSamsung, SiApple, SiXiaomi, SiOneplus, SiOppo,
  SiHuawei, SiMotorola, SiNokia, SiLg, SiSony,
  SiVivo, SiGoogle,
};

export const HeroParallax = ({
  brands,
  header,
  compact = false,
  backgroundVideoSrc,
}: {
  brands: BrandItem[];
  header: React.ReactNode;
  compact?: boolean;
  /** Full-bleed looping video behind header + parallax rows */
  backgroundVideoSrc?: string;
}) => {
  const firstRow = brands.slice(0, 6);
  const secondRow = brands.slice(6, 13);
  const thirdRow = brands.slice(13, 19);

  const ref = React.useRef(null);
  const { scrollYProgress } = useScroll({
    target: ref,
    offset: ["start start", "end start"],
  });

  const spring = { stiffness: 300, damping: 30, bounce: 100 };
  const translateX = useSpring(useTransform(scrollYProgress, [0, 1], [0, 800]), spring);
  const translateXReverse = useSpring(useTransform(scrollYProgress, [0, 1], [0, -800]), spring);
  const rotateX = useSpring(useTransform(scrollYProgress, [0, 0.2], [15, 0]), spring);
  const opacity = useSpring(useTransform(scrollYProgress, [0, 0.2], [0.2, 1]), spring);
  const rotateZ = useSpring(useTransform(scrollYProgress, [0, 0.2], [20, 0]), spring);
  const translateY = useSpring(
    useTransform(scrollYProgress, [0, 0.2], [compact ? -180 : -300, compact ? 70 : 140]),
    spring
  );

  return (
    <div
      ref={ref}
      className={`${compact ? "h-[140vh]" : "h-[200vh]"} overflow-hidden antialiased relative flex flex-col [perspective:1000px] [transform-style:preserve-3d]`}
    >
      {backgroundVideoSrc && (
        <div className="pointer-events-none absolute inset-0 z-0">
          <video
            className="absolute inset-0 h-full w-full object-cover"
            src={backgroundVideoSrc}
            autoPlay
            muted
            loop
            playsInline
            preload="metadata"
            aria-hidden
          />
          <div className="absolute inset-0 bg-gradient-to-b from-background/75 via-background/45 to-background/85 dark:from-background/80 dark:via-background/55 dark:to-background/90" />
        </div>
      )}
      <div className="relative z-30">
        {header}
      </div>
      <motion.div style={{ rotateX, rotateZ, translateY, opacity }} className="pb-8 pointer-events-none relative z-10">
        <motion.div className="flex flex-row-reverse space-x-reverse space-x-5 mb-5">
          {firstRow.map((brand) => (
            <BrandCard key={brand.name} brand={brand} translate={translateX} />
          ))}
        </motion.div>
        <motion.div className="flex flex-row space-x-5 mb-5">
          {secondRow.map((brand) => (
            <BrandCard key={brand.name} brand={brand} translate={translateXReverse} />
          ))}
        </motion.div>
        <motion.div className="flex flex-row-reverse space-x-reverse space-x-5">
          {thirdRow.map((brand) => (
            <BrandCard key={brand.name} brand={brand} translate={translateX} />
          ))}
        </motion.div>
      </motion.div>
    </div>
  );
};

const BrandCard = ({
  brand,
  translate,
}: {
  brand: BrandItem;
  translate: MotionValue<number>;
}) => {
  const IconComp = ICON_MAP[brand.iconKey];

  return (
    <motion.div
      style={{ x: translate }}
      whileHover={{ y: -12, scale: 1.05, boxShadow: "0 20px 40px rgba(0,0,0,0.12)" }}
      className="group/brand h-36 w-48 md:h-40 md:w-56 relative shrink-0 overflow-hidden cursor-pointer rounded-2xl border border-border/80 bg-card/95 shadow-lg ring-1 ring-black/[0.05] backdrop-blur-sm dark:ring-white/10 md:rounded-[1.35rem] flex flex-col items-center justify-center gap-3 p-5 transition-shadow"
    >
      <div
        className="w-16 h-16 rounded-2xl flex items-center justify-center"
        style={{ backgroundColor: brand.bgColor }}
      >
        {IconComp ? (
          <IconComp style={{ color: brand.iconColor, width: 36, height: 36 }} />
        ) : (
          <span
            className="font-display font-black text-lg leading-none"
            style={{ color: brand.iconColor }}
          >
            {brand.name}
          </span>
        )}
      </div>
      <div className="text-center">
        <p className="font-display font-bold text-foreground text-sm">{brand.name}</p>
        <p className="text-muted-foreground text-xs mt-0.5">{brand.count}</p>
      </div>
      <div className="absolute inset-0 opacity-0 group-hover/brand:opacity-100 bg-primary/5 transition-opacity duration-300 rounded-2xl flex items-end justify-center pb-3 pointer-events-none">
        <span className="text-primary text-xs font-semibold border border-primary/30 bg-background/90 backdrop-blur px-3 py-1 rounded-full">
          View Parts
        </span>
      </div>
    </motion.div>
  );
};
