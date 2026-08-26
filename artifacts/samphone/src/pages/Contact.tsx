import { useState } from "react";
import { motion } from "framer-motion";
import { MapPin, Phone, Mail, Clock, Send, MessageCircle, CheckCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { SiWhatsapp, SiInstagram, SiFacebook } from "react-icons/si";
import PageVideoHero from "@/components/PageVideoHero";

const contactInfo = [
  { icon: MapPin, label: "Address", value: "Rua da Palma N.221–223, 1100-391 Lisboa, Portugal", link: "https://maps.google.com/?q=Rua+da+Palma+221+Lisboa+Portugal" },
  { icon: Phone, label: "Phone", value: "+351 937 119 295", link: "tel:+351937119295" },
  { icon: Mail, label: "Email", value: "hello@samphone.pt", link: "mailto:hello@samphone.pt" },
  { icon: Clock, label: "Hours", value: "Mon–Sat: 9:00 AM – 7:00 PM", link: null },
];

const faqs = [
  { q: "How long does delivery take in Lisbon?", a: "Orders placed before 3PM are eligible for same-day delivery within Lisbon. Standard delivery is 1-2 business days." },
  { q: "Do you offer bulk/wholesale pricing?", a: "Yes! We have special pricing for repair shops and bulk buyers. Contact us via WhatsApp or email to discuss your needs." },
  { q: "Can I return a part that doesn't fit?", a: "Absolutely. We offer a 30-day hassle-free return policy for all unused parts in original condition." },
  { q: "Do your parts come with a warranty?", a: "Yes, all parts come with a minimum 3-month warranty. Premium OEM parts have a 12-month warranty." },
];

function ContactHeader() {
  return (
    <PageVideoHero
      eyebrow="Home / Contact"
      title="Contact Us"
      description="We're here to help with parts, accessories and support."
    />
  );
}

export default function Contact() {
  const [form, setForm] = useState({ name: "", email: "", subject: "", message: "" });
  const [submitted, setSubmitted] = useState(false);
  const [openFaq, setOpenFaq] = useState<number | null>(null);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (form.name && form.email && form.message) setSubmitted(true);
  };

  return (
    <div>
      <ContactHeader />

      <div className="mx-auto w-full max-w-[1600px] px-5 py-10 sm:px-8 md:px-10 lg:px-14">
        <div className="grid lg:grid-cols-2 gap-10 mb-14">
          <motion.div initial={{ opacity: 0, x: -30 }} animate={{ opacity: 1, x: 0 }} transition={{ duration: 0.6 }}>
            <h2 className="text-2xl font-display font-bold text-foreground mb-6">Send us a Message</h2>
            {submitted ? (
              <motion.div initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} className="flex flex-col items-center justify-center py-16 text-center">
                <CheckCircle className="w-16 h-16 text-[#111111] mb-4" />
                <h3 className="text-xl font-display font-bold text-foreground mb-2">Message Sent!</h3>
                <p className="text-muted-foreground">We'll get back to you within 24 hours.</p>
              </motion.div>
            ) : (
              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="text-sm font-medium text-foreground mb-1.5 block">Your Name</label>
                    <input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="Ana Rodrigues" className="w-full h-11 px-4 rounded-xl border border-border bg-background text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-primary/30" required />
                  </div>
                  <div>
                    <label className="text-sm font-medium text-foreground mb-1.5 block">Email Address</label>
                    <input type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} placeholder="ana@example.com" className="w-full h-11 px-4 rounded-xl border border-border bg-background text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-primary/30" required />
                  </div>
                </div>
                <div>
                  <label className="text-sm font-medium text-foreground mb-1.5 block">Subject</label>
                  <select value={form.subject} onChange={(e) => setForm({ ...form, subject: e.target.value })} className="w-full h-11 px-4 rounded-xl border border-border bg-background text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-primary/30">
                    <option value="">Select a subject...</option>
                    <option>Order Inquiry</option><option>Wholesale / Bulk Order</option><option>Product Question</option><option>Returns & Warranty</option><option>Other</option>
                  </select>
                </div>
                <div>
                  <label className="text-sm font-medium text-foreground mb-1.5 block">Message</label>
                  <textarea value={form.message} onChange={(e) => setForm({ ...form, message: e.target.value })} placeholder="How can we help you?" rows={5} className="w-full px-4 py-3 rounded-xl border border-border bg-background text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-primary/30 resize-none" required />
                </div>
                <Button type="submit" size="lg" className="w-full gap-2 bg-primary hover:bg-primary/90 text-primary-foreground h-12"><Send className="w-4 h-4" /> Send Message</Button>
              </form>
            )}
          </motion.div>

          <motion.div initial={{ opacity: 0, x: 30 }} animate={{ opacity: 1, x: 0 }} transition={{ duration: 0.6, delay: 0.15 }}>
            <h2 className="text-2xl font-display font-bold text-foreground mb-6">Get in Touch</h2>
            <div className="space-y-4 mb-6">
              {contactInfo.map((item, i) => (
                <div key={i} className="flex items-start gap-4 p-4 bg-white ring-1 ring-black/[0.04] rounded-xl">
                  <div className="w-10 h-10 bg-primary/10 rounded-xl flex items-center justify-center text-primary shrink-0"><item.icon className="w-5 h-5" /></div>
                  <div>
                    <p className="text-xs text-muted-foreground mb-0.5">{item.label}</p>
                    {item.link ? (
                      <a href={item.link} target={item.link.startsWith("http") ? "_blank" : undefined} rel="noopener noreferrer" className="text-sm font-medium text-foreground hover:text-primary transition-colors">{item.value}</a>
                    ) : (
                      <p className="text-sm font-medium text-foreground">{item.value}</p>
                    )}
                  </div>
                </div>
              ))}
            </div>
            <a href="https://wa.me/351937119295" target="_blank" rel="noopener noreferrer" className="flex items-center gap-3 p-4 bg-white ring-1 ring-black/[0.04] rounded-xl hover:shadow-sm transition-colors mb-6">
              <SiWhatsapp className="w-8 h-8 text-[#25D366]" />
              <div>
                <p className="font-semibold text-foreground text-sm">Chat on WhatsApp</p>
                <p className="text-muted-foreground text-xs">Typical reply in under 10 min</p>
              </div>
            </a>
            <div className="flex gap-3">
              <a href="#" className="flex-1 flex items-center justify-center gap-2 p-3 bg-card border border-border rounded-xl text-sm font-medium text-foreground hover:border-primary hover:text-primary transition-colors"><SiInstagram className="w-4 h-4" /> Instagram</a>
              <a href="#" className="flex-1 flex items-center justify-center gap-2 p-3 bg-card border border-border rounded-xl text-sm font-medium text-foreground hover:border-primary hover:text-primary transition-colors"><SiFacebook className="w-4 h-4" /> Facebook</a>
            </div>
          </motion.div>
        </div>

        <div className="max-w-3xl mx-auto">
          <h2 className="text-2xl font-display font-bold text-foreground mb-6 text-center">Frequently Asked Questions</h2>
          <div className="space-y-3">
            {faqs.map((faq, i) => (
              <motion.div key={i} initial={{ opacity: 0, y: 15 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.1 }} className="border border-border rounded-2xl overflow-hidden">
                <button onClick={() => setOpenFaq(openFaq === i ? null : i)} className="w-full flex items-center justify-between p-5 text-left hover:bg-muted/50 transition-colors">
                  <span className="font-semibold text-foreground text-sm md:text-base">{faq.q}</span>
                  <MessageCircle className={`w-5 h-5 text-muted-foreground shrink-0 ml-4 transition-colors ${openFaq === i ? "text-primary" : ""}`} />
                </button>
                {openFaq === i && (
                  <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: "auto" }} className="px-5 pb-5 text-muted-foreground text-sm leading-relaxed border-t border-border">
                    <div className="pt-4">{faq.a}</div>
                  </motion.div>
                )}
              </motion.div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
