import { motion, useInView } from "framer-motion";
import { useRef } from "react";
import { Star, CheckCircle, Smartphone, Truck, ShieldCheck } from "lucide-react";

export default function TrustBadges() {
  const ref = useRef(null);
  const isInView = useInView(ref, { once: true, margin: "-50px" });

  const badges = [
    { icon: Star, text: "4.9/5 Rating", subtext: "600+ Reviews" },
    { icon: Smartphone, text: "700+ Models", subtext: "Extensive Compatibility" },
    { icon: Truck, text: "Fast Delivery", subtext: "Lisbon & Nationwide" },
    { icon: ShieldCheck, text: "Secure Checkout", subtext: "100% Protected" },
    { icon: CheckCircle, text: "Quality Guaranteed", subtext: "Tested Parts" },
  ];

  const containerVariants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: {
        staggerChildren: 0.1,
      },
    },
  };

  const itemVariants = {
    hidden: { opacity: 0, y: 20 },
    visible: { opacity: 1, y: 0, transition: { duration: 0.5 } },
  };

  return (
    <div className="w-full py-8">
      <div className="mx-auto w-full max-w-[1600px] px-5 sm:px-8 md:px-10 lg:px-14 xl:px-16">
        <motion.div
          ref={ref}
          variants={containerVariants}
          initial="hidden"
          animate={isInView ? "visible" : "hidden"}
          className="grid grid-cols-2 gap-3 md:grid-cols-3 lg:grid-cols-5 md:gap-4"
        >
          {badges.map((badge, index) => (
            <motion.div
              key={index}
              variants={itemVariants}
              className="flex flex-col items-center justify-center rounded-xl bg-white px-4 py-5 text-center shadow-sm ring-1 ring-black/[0.04]"
            >
              <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center mb-3 text-primary">
                <badge.icon className="w-6 h-6" />
              </div>
              <h3 className="font-semibold text-foreground text-sm md:text-base">{badge.text}</h3>
              <p className="text-xs text-muted-foreground mt-1">{badge.subtext}</p>
            </motion.div>
          ))}
        </motion.div>
      </div>
    </div>
  );
}
