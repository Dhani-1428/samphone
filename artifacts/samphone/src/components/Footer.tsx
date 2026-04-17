import { motion, useInView } from "framer-motion";
import { useRef, useState } from "react";
import { MapPin, Phone, Mail, ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { SiInstagram, SiFacebook, SiWhatsapp } from "react-icons/si";

const categories = ["Phone Cases", "Chargers & Cables", "Screen Protectors", "Audio Devices", "Spare Parts", "Tablet Accessories"];
const quickLinks = ["Home", "Shop", "About Us", "Contact", "Track Order", "FAQ"];

export default function Footer() {
  const ref = useRef(null);
  const isInView = useInView(ref, { once: true, margin: "-50px" });
  const [email, setEmail] = useState("");
  const [subscribed, setSubscribed] = useState(false);

  const handleSubscribe = (e: React.FormEvent) => {
    e.preventDefault();
    if (email) setSubscribed(true);
  };

  return (
    <footer id="footer" className="bg-foreground text-background pt-16 pb-8" ref={ref}>
      <div className="container mx-auto px-4 md:px-6">
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={isInView ? { opacity: 1, y: 0 } : {}}
          transition={{ duration: 0.6 }}
          className="grid grid-cols-2 md:grid-cols-4 gap-10 mb-14"
        >
          <div className="col-span-2 md:col-span-1">
            <div className="flex items-center gap-2 mb-5">
              <div className="w-8 h-8 bg-primary rounded-lg flex items-center justify-center text-primary-foreground font-display font-bold text-xl">
                S
              </div>
              <span className="font-display font-bold text-2xl tracking-tight">
                SAM<span className="text-primary">PHONE</span>
              </span>
            </div>
            <p className="text-background/60 text-sm leading-relaxed mb-5">
              Lisbon's premier mobile accessories and spare parts store. Serving customers across Portugal since 2018.
            </p>
            <div className="flex gap-3">
              <a href="https://wa.me/351937119295" target="_blank" rel="noopener noreferrer" className="w-9 h-9 rounded-full bg-background/10 hover:bg-primary/20 flex items-center justify-center transition-colors" data-testid="link-whatsapp">
                <SiWhatsapp className="w-4 h-4" />
              </a>
              <a href="#" className="w-9 h-9 rounded-full bg-background/10 hover:bg-primary/20 flex items-center justify-center transition-colors" data-testid="link-instagram">
                <SiInstagram className="w-4 h-4" />
              </a>
              <a href="#" className="w-9 h-9 rounded-full bg-background/10 hover:bg-primary/20 flex items-center justify-center transition-colors" data-testid="link-facebook">
                <SiFacebook className="w-4 h-4" />
              </a>
            </div>
          </div>

          <div>
            <h4 className="font-display font-bold text-base mb-5">Quick Links</h4>
            <ul className="space-y-2.5">
              {quickLinks.map((link) => (
                <li key={link}>
                  <a href="#" className="text-background/60 hover:text-background text-sm transition-colors">{link}</a>
                </li>
              ))}
            </ul>
          </div>

          <div>
            <h4 className="font-display font-bold text-base mb-5">Categories</h4>
            <ul className="space-y-2.5">
              {categories.map((cat) => (
                <li key={cat}>
                  <a href="#categories" className="text-background/60 hover:text-background text-sm transition-colors">{cat}</a>
                </li>
              ))}
            </ul>
          </div>

          <div>
            <h4 className="font-display font-bold text-base mb-5">Contact Us</h4>
            <div className="space-y-3 mb-6">
              <div className="flex items-start gap-2.5">
                <MapPin className="w-4 h-4 text-primary shrink-0 mt-0.5" />
                <p className="text-background/60 text-sm">Rua da Palma N.221–223,<br />1100-391 Lisboa, Portugal</p>
              </div>
              <div className="flex items-center gap-2.5">
                <Phone className="w-4 h-4 text-primary shrink-0" />
                <a href="tel:+351937119295" className="text-background/60 hover:text-background text-sm transition-colors">+351 937 119 295</a>
              </div>
              <div className="flex items-center gap-2.5">
                <Mail className="w-4 h-4 text-primary shrink-0" />
                <a href="mailto:hello@samphone.pt" className="text-background/60 hover:text-background text-sm transition-colors">hello@samphone.pt</a>
              </div>
            </div>

            <h4 className="font-display font-bold text-sm mb-3">Newsletter</h4>
            {subscribed ? (
              <p className="text-primary text-sm font-medium">You're subscribed!</p>
            ) : (
              <form onSubmit={handleSubscribe} className="flex gap-2">
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="Your email"
                  className="flex-1 h-10 px-3 rounded-xl bg-background/10 border border-background/20 text-background placeholder:text-background/40 text-sm focus:outline-none focus:ring-2 focus:ring-primary/50"
                  data-testid="input-newsletter"
                />
                <Button type="submit" size="icon" className="h-10 w-10 bg-primary hover:bg-primary/90 rounded-xl shrink-0" data-testid="button-subscribe">
                  <ArrowRight className="w-4 h-4" />
                </Button>
              </form>
            )}
          </div>
        </motion.div>

        <div className="border-t border-background/10 pt-6 flex flex-col md:flex-row items-center justify-between gap-3">
          <p className="text-background/40 text-xs text-center">
            2025 SAMPHONE. All rights reserved. Rua da Palma N.221–223, Lisboa, Portugal.
          </p>
          <p className="text-background/40 text-xs text-center">
            Powered by SAMPHONE eCommerce
          </p>
        </div>
      </div>
    </footer>
  );
}
