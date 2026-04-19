import React from "react";
import {
  motion,
  useScroll,
  useTransform,
  useSpring,
  type MotionValue,
} from "framer-motion";

export interface BrandItem {
  name: string;
  slug: string;
  count: string;
  color: string;
  letter: string;
}

export const HeroParallax = ({
  brands,
  header,
  compact = false,
}: {
  brands: BrandItem[];
  header: React.ReactNode;
  compact?: boolean;
}) => {
  const firstRow = brands.slice(0, 6);
  const secondRow = brands.slice(6, 12);
  const thirdRow = brands.slice(12, 19);

  const ref = React.useRef(null);
  const { scrollYProgress } = useScroll({
    target: ref,
    offset: ["start start", "end start"],
  });

  const spring = { stiffness: 300, damping: 30, bounce: 100 };

  const translateX = useSpring(useTransform(scrollYProgress, [0, 1], [0, 900]), spring);
  const translateXReverse = useSpring(useTransform(scrollYProgress, [0, 1], [0, -900]), spring);
  const rotateX = useSpring(useTransform(scrollYProgress, [0, 0.2], [15, 0]), spring);
  const opacity = useSpring(useTransform(scrollYProgress, [0, 0.2], [0.2, 1]), spring);
  const rotateZ = useSpring(useTransform(scrollYProgress, [0, 0.2], [20, 0]), spring);
  const translateY = useSpring(
    useTransform(scrollYProgress, [0, 0.2], [compact ? -400 : -700, compact ? 300 : 500]),
    spring
  );

  return (
    <div
      ref={ref}
      className={`${compact ? "h-[220vh]" : "h-[300vh]"} overflow-hidden antialiased relative flex flex-col [perspective:1000px] [transform-style:preserve-3d]`}
    >
      {header}
      <motion.div style={{ rotateX, rotateZ, translateY, opacity }}>
        <motion.div className="flex flex-row-reverse space-x-reverse space-x-6 mb-10">
          {firstRow.map((brand) => (
            <BrandCard key={brand.name} brand={brand} translate={translateX} />
          ))}
        </motion.div>
        <motion.div className="flex flex-row space-x-6 mb-10">
          {secondRow.map((brand) => (
            <BrandCard key={brand.name} brand={brand} translate={translateXReverse} />
          ))}
        </motion.div>
        <motion.div className="flex flex-row-reverse space-x-reverse space-x-6">
          {thirdRow.map((brand) => (
            <BrandCard key={brand.name} brand={brand} translate={translateX} />
          ))}
        </motion.div>
      </motion.div>
    </div>
  );
};

export const BrandCard = ({
  brand,
  translate,
}: {
  brand: BrandItem;
  translate: MotionValue<number>;
}) => {
  return (
    <motion.div
      style={{ x: translate }}
      whileHover={{ y: -16, scale: 1.03 }}
      className="group/brand h-44 w-52 md:h-52 md:w-64 relative shrink-0 rounded-2xl overflow-hidden cursor-pointer shadow-lg"
    >
      <div className={`absolute inset-0 bg-gradient-to-br ${brand.color} opacity-90`} />
      <div className="absolute inset-0 flex flex-col items-center justify-center p-4 text-center z-10">
        <div className="w-14 h-14 rounded-2xl bg-white/20 backdrop-blur flex items-center justify-center mb-3 shadow-inner">
          <span className="text-white font-display font-black text-2xl">{brand.letter}</span>
        </div>
        <h3 className="text-white font-display font-bold text-base leading-tight">{brand.name}</h3>
        <p className="text-white/70 text-xs mt-1">{brand.count}</p>
      </div>
      <div className="absolute inset-0 opacity-0 group-hover/brand:opacity-100 bg-black/30 transition-opacity duration-300 z-20 flex items-end justify-center pb-4">
        <span className="text-white text-xs font-semibold bg-white/20 backdrop-blur px-3 py-1 rounded-full">
          View Parts
        </span>
      </div>
    </motion.div>
  );
};
