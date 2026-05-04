import { motion, useInView } from "framer-motion";
import { useRef, useState } from "react";
import { Search, Smartphone } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useLang } from "@/contexts/LanguageContext";

const brands = ["Apple", "Samsung", "Xiaomi", "Huawei", "OnePlus", "Motorola", "Google", "Sony", "Nokia", "Oppo"];

const models: Record<string, string[]> = {
  Apple: ["iPhone 15 Pro Max", "iPhone 15 Pro", "iPhone 15", "iPhone 14 Pro", "iPhone 14", "iPhone 13", "iPhone 12", "iPhone 11"],
  Samsung: ["Galaxy S24 Ultra", "Galaxy S24+", "Galaxy S24", "Galaxy S23", "Galaxy A54", "Galaxy A34", "Galaxy A14"],
  Xiaomi: ["14 Pro", "14", "13T", "13", "Redmi Note 13", "Redmi Note 12"],
  Huawei: ["P60 Pro", "P60", "Mate 60", "Nova 11"],
  OnePlus: ["12", "11", "10 Pro", "Nord CE 3"],
  Motorola: ["Edge 50 Ultra", "Edge 40", "Moto G84", "Moto G54"],
  Google: ["Pixel 8 Pro", "Pixel 8", "Pixel 7a", "Pixel 7"],
  Sony: ["Xperia 1 V", "Xperia 5 V", "Xperia 10 V"],
  Nokia: ["G42", "C32", "X30"],
  Oppo: ["Find X7", "Reno 10 Pro", "A78"],
};

export default function DeviceSearch() {
  const ref = useRef(null);
  const isInView = useInView(ref, { once: true, margin: "-80px" });
  const [selectedBrand, setSelectedBrand] = useState("");
  const [selectedModel, setSelectedModel] = useState("");
  const [searched, setSearched] = useState(false);
  const { lang } = useLang();
  const copy =
    lang === "pt"
      ? {
          badge: "Pesquisa de Compatibilidade",
          title: "Encontre Pecas para o Seu Dispositivo",
          sub: "Selecione a marca e o modelo para ver pecas e acessorios compativeis.",
          selectBrand: "Selecionar Marca",
          chooseBrand: "Escolha a marca...",
          selectModel: "Selecionar Modelo",
          chooseModel: "Escolha o modelo...",
          find: "Encontrar Pecas Compativeis",
          found: "Encontradas",
          forYour: "compativeis para o seu",
          contact: "Contacte-nos no WhatsApp para encomendas em quantidade.",
        }
      : {
          badge: "Compatibility Search",
          title: "Find Parts for Your Device",
          sub: "Select your device brand and model to see all compatible parts and accessories.",
          selectBrand: "Select Brand",
          chooseBrand: "Choose brand...",
          selectModel: "Select Model",
          chooseModel: "Choose model...",
          find: "Find Compatible Parts",
          found: "Found",
          forYour: "compatible parts for your",
          contact: "Contact us on WhatsApp for bulk orders.",
        };

  const handleSearch = () => {
    if (selectedBrand) setSearched(true);
  };

  return (
    <section id="device-search" className="py-20 bg-background">
      <div className="container mx-auto px-4 md:px-6">
        <motion.div
          ref={ref}
          initial={{ opacity: 0, y: 30 }}
          animate={isInView ? { opacity: 1, y: 0 } : {}}
          transition={{ duration: 0.6 }}
          className="max-w-4xl mx-auto"
        >
          <div className="text-center mb-10">
            <span className="inline-block px-3 py-1 rounded-full bg-primary/10 text-primary text-sm font-medium mb-4">
              {copy.badge}
            </span>
            <h2 className="text-4xl md:text-5xl font-display font-bold text-foreground mb-4">
              {copy.title}
            </h2>
            <p className="text-muted-foreground text-lg max-w-xl mx-auto">
              {copy.sub}
            </p>
          </div>

          <motion.div
            initial={{ opacity: 0, scale: 0.97 }}
            animate={isInView ? { opacity: 1, scale: 1 } : {}}
            transition={{ duration: 0.6, delay: 0.2 }}
            className="bg-card border border-border rounded-3xl p-6 md:p-10 shadow-lg"
          >
            <div className="flex flex-col md:flex-row gap-4 mb-6">
              <div className="flex-1">
                <label className="text-sm font-medium text-foreground mb-2 block">{copy.selectBrand}</label>
                <select
                  value={selectedBrand}
                  onChange={(e) => { setSelectedBrand(e.target.value); setSelectedModel(""); setSearched(false); }}
                  className="w-full h-12 px-4 rounded-xl border border-border bg-background text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-primary/50 cursor-pointer"
                  data-testid="select-brand"
                >
                  <option value="">{copy.chooseBrand}</option>
                  {brands.map((b) => <option key={b} value={b}>{b}</option>)}
                </select>
              </div>
              <div className="flex-1">
                <label className="text-sm font-medium text-foreground mb-2 block">{copy.selectModel}</label>
                <select
                  value={selectedModel}
                  onChange={(e) => { setSelectedModel(e.target.value); setSearched(false); }}
                  disabled={!selectedBrand}
                  className="w-full h-12 px-4 rounded-xl border border-border bg-background text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-primary/50 cursor-pointer disabled:opacity-50"
                  data-testid="select-model"
                >
                  <option value="">{copy.chooseModel}</option>
                  {selectedBrand && models[selectedBrand]?.map((m) => <option key={m} value={m}>{m}</option>)}
                </select>
              </div>
            </div>

            <Button
              size="lg"
              onClick={handleSearch}
              disabled={!selectedBrand}
              className="w-full h-13 gap-3 bg-primary hover:bg-primary/90 text-primary-foreground text-base font-semibold rounded-xl"
              data-testid="button-find-parts"
            >
              <Search className="w-5 h-5" />
              {copy.find}
            </Button>

            {searched && (
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.4 }}
                className="mt-6 p-4 rounded-xl bg-primary/5 border border-primary/20 flex items-center gap-3"
              >
                <Smartphone className="w-5 h-5 text-primary shrink-0" />
                <p className="text-sm text-foreground">
                  {copy.found} <span className="font-bold text-primary">47</span> {copy.forYour} {selectedBrand} {selectedModel || (lang === "pt" ? "dispositivo" : "device")}. {copy.contact}
                </p>
              </motion.div>
            )}

            <div className="mt-6 flex flex-wrap gap-2 justify-center">
              {["iPhone 15", "Samsung S24", "Xiaomi 14", "Pixel 8"].map((popular) => (
                <button
                  key={popular}
                  className="px-3 py-1.5 rounded-full border border-border text-sm text-muted-foreground hover:border-primary hover:text-primary transition-colors"
                  data-testid={`button-popular-${popular.replace(/\s/g, "-")}`}
                >
                  {popular}
                </button>
              ))}
            </div>
          </motion.div>
        </motion.div>
      </div>
    </section>
  );
}
