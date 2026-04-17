import { motion, useInView } from "framer-motion";
import { useRef } from "react";
import { Cpu, Truck, Shield, MessageCircle } from "lucide-react";

const reasons = [
  {
    icon: Cpu,
    title: "700+ Device Models",
    desc: "One of the widest selections in Portugal. From Apple to Xiaomi, we have parts and accessories for virtually every device.",
  },
  {
    icon: Truck,
    title: "Fast Lisbon Delivery",
    desc: "Order before 3PM and get same-day delivery within Lisbon. Nationwide shipping available across Portugal.",
  },
  {
    icon: Shield,
    title: "Quality Guaranteed",
    desc: "Every part is tested and verified before shipping. We back our products with a full quality guarantee.",
  },
  {
    icon: MessageCircle,
    title: "Expert Support",
    desc: "Our technicians are available via WhatsApp to help you find the exact part or accessory you need.",
  },
];

const containerVariants = {
  hidden: { opacity: 0 },
  visible: { opacity: 1, transition: { staggerChildren: 0.15 } },
};

const itemVariants = {
  hidden: { opacity: 0, x: -30 },
  visible: { opacity: 1, x: 0, transition: { duration: 0.6, ease: "easeOut" } },
};

export default function WhyChooseUs() {
  const ref = useRef(null);
  const isInView = useInView(ref, { once: true, margin: "-80px" });

  return (
    <section id="why-us" className="py-20 bg-foreground text-background">
      <div className="container mx-auto px-4 md:px-6">
        <motion.div
          ref={ref}
          initial={{ opacity: 0, y: 30 }}
          animate={isInView ? { opacity: 1, y: 0 } : {}}
          transition={{ duration: 0.6 }}
          className="text-center mb-14"
        >
          <span className="inline-block px-3 py-1 rounded-full bg-primary/20 text-primary text-sm font-medium mb-4">
            Why SAMPHONE
          </span>
          <h2 className="text-4xl md:text-5xl font-display font-bold mb-4">
            The Smart Choice for <br className="hidden md:block" />Mobile Accessories
          </h2>
          <p className="text-background/70 text-lg max-w-xl mx-auto">
            Over 600 customers have rated us 4.9/5. Here's why they keep coming back.
          </p>
        </motion.div>

        <motion.div
          variants={containerVariants}
          initial="hidden"
          animate={isInView ? "visible" : "hidden"}
          className="grid md:grid-cols-2 lg:grid-cols-4 gap-6 lg:gap-8"
        >
          {reasons.map((reason, i) => (
            <motion.div
              key={i}
              variants={itemVariants}
              className="group p-6 rounded-2xl border border-background/10 hover:border-primary/40 bg-background/5 hover:bg-background/10 transition-colors"
              data-testid={`card-reason-${i}`}
            >
              <div className="w-12 h-12 rounded-xl bg-primary/20 flex items-center justify-center mb-5 text-primary group-hover:bg-primary group-hover:text-primary-foreground transition-colors">
                <reason.icon className="w-6 h-6" />
              </div>
              <h3 className="font-display font-bold text-xl mb-3">{reason.title}</h3>
              <p className="text-background/70 text-sm leading-relaxed">{reason.desc}</p>
            </motion.div>
          ))}
        </motion.div>
      </div>
    </section>
  );
}
