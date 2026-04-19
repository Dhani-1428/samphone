import { createContext, useContext, useState, type ReactNode } from "react";

export type Lang = "en" | "pt";

const translations = {
  en: {
    welcome: "Welcome to Samphone's online store",
    phone: "+351-937119295",
    registration: "Registration",
    login: "Log In",
    searchPlaceholder: "To Search For...",
    compare: "Compare",
    wishlist: "Wishlist",
    allCategories: "All Categories",
    nav_home: "HOME",
    nav_accessories: "ACCESSORIES",
    nav_smartphones: "SMARTPHONES",
    nav_cards: "CARDS",
    nav_new: "NEW",
    nav_multibrand: "MULTI BRAND",
    nav_contact: "CONTACT US",
    hero_badge: "Lisbon's #1 Tech Boutique",
    hero_line1: "Your Phone.",
    hero_line2: "Your Parts.",
    hero_line3: "Delivered Fast.",
    hero_sub: "Premium accessories and pro-grade repair parts for over 700+ device models. Fast delivery across Lisbon and Portugal.",
    hero_shop: "Shop Now",
    hero_browse: "Browse Categories",
    hero_scroll: "Scroll to explore brands",
    hero_rating: "4.9/5 Rating",
    hero_rating_sub: "from 600+ happy customers",
    addToCart: "Add to Cart",
    viewParts: "View Parts",
    products_title: "Top Picks This Week",
    products_sub: "Thousands of products. Competitive prices. Shipped fast from Lisbon.",
    viewAll: "View All Products",
    popularProducts: "Popular Products",
  },
  pt: {
    welcome: "Bem-vindo à loja online da Samphone",
    phone: "+351-937119295",
    registration: "Registo",
    login: "Entrar",
    searchPlaceholder: "Pesquisar...",
    compare: "Comparar",
    wishlist: "Favoritos",
    allCategories: "Todas as Categorias",
    nav_home: "INÍCIO",
    nav_accessories: "ACESSÓRIOS",
    nav_smartphones: "SMARTPHONES",
    nav_cards: "CARTÕES",
    nav_new: "NOVIDADES",
    nav_multibrand: "MULTI MARCA",
    nav_contact: "CONTACTE-NOS",
    hero_badge: "Loja Nº 1 de Tech em Lisboa",
    hero_line1: "O Seu Telemóvel.",
    hero_line2: "As Suas Peças.",
    hero_line3: "Entregue Rápido.",
    hero_sub: "Acessórios premium e peças de reparação profissional para mais de 700+ modelos. Entrega rápida em Lisboa e Portugal.",
    hero_shop: "Comprar Agora",
    hero_browse: "Ver Categorias",
    hero_scroll: "Role para explorar marcas",
    hero_rating: "Classificação 4.9/5",
    hero_rating_sub: "de 600+ clientes satisfeitos",
    addToCart: "Adicionar ao Carrinho",
    viewParts: "Ver Peças",
    products_title: "Destaques da Semana",
    products_sub: "Milhares de produtos. Preços competitivos. Enviados rapidamente de Lisboa.",
    viewAll: "Ver Todos os Produtos",
    popularProducts: "Produtos Populares",
  },
} as const;

export type TranslationKey = keyof typeof translations.en;

interface LangContextValue {
  lang: Lang;
  setLang: (l: Lang) => void;
  t: (key: TranslationKey) => string;
}

const LangContext = createContext<LangContextValue>({
  lang: "en",
  setLang: () => {},
  t: (k) => k,
});

export function LanguageProvider({ children }: { children: ReactNode }) {
  const [lang, setLangState] = useState<Lang>(() => {
    const stored = localStorage.getItem("samphone-lang");
    return stored === "pt" ? "pt" : "en";
  });

  const setLang = (l: Lang) => {
    setLangState(l);
    localStorage.setItem("samphone-lang", l);
  };

  const t = (key: TranslationKey): string => translations[lang][key] as string;

  return <LangContext.Provider value={{ lang, setLang, t }}>{children}</LangContext.Provider>;
}

export const useLang = () => useContext(LangContext);
