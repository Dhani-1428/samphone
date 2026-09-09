import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from "react";
import en from "@/locales/en.json";
import pt from "@/locales/pt.json";
import fr from "@/locales/fr.json";
import es from "@/locales/es.json";
import nl from "@/locales/nl.json";
import hi from "@/locales/hi.json";
import pa from "@/locales/pa.json";
import ur from "@/locales/ur.json";

export type Lang = "pt" | "en" | "fr" | "es" | "nl" | "hi" | "pa" | "ur";

export const LANG_OPTIONS: { id: Lang; label: string }[] = [
  { id: "pt", label: "Português" },
  { id: "en", label: "English" },
  { id: "fr", label: "Français" },
  { id: "es", label: "Español" },
  { id: "nl", label: "Nederlands" },
  { id: "hi", label: "हिन्दी" },
  { id: "pa", label: "ਪੰਜਾਬੀ" },
  { id: "ur", label: "اردو" },
];

const translations: Record<Lang, Record<string, string>> = { en, pt, fr, es, nl, hi, pa, ur };

export type TranslationKey = keyof typeof en;

interface LangContextValue {
  lang: Lang;
  setLang: (l: Lang) => void;
  t: (key: TranslationKey, vars?: Record<string, string | number>) => string;
}

const LangContext = createContext<LangContextValue>({
  lang: "en",
  setLang: () => {},
  t: (k) => k as string,
});

export function LanguageProvider({ children }: { children: ReactNode }) {
  const [lang, setLangState] = useState<Lang>(() => {
    const stored = localStorage.getItem("samphone-lang");
    return LANG_OPTIONS.some((o) => o.id === stored) ? (stored as Lang) : "pt";
  });

  const setLang = (l: Lang) => {
    setLangState(l);
    localStorage.setItem("samphone-lang", l);
  };

  useEffect(() => {
    document.documentElement.lang = lang;
  }, [lang]);

  const t = useCallback(
    (key: TranslationKey, vars?: Record<string, string | number>) => {
      const table = translations[lang] ?? translations.en;
      let s = table[key] ?? translations.en[key] ?? String(key);
      if (vars) {
        for (const [k, v] of Object.entries(vars)) {
          s = s.replaceAll(`{${k}}`, String(v));
        }
      }
      return s;
    },
    [lang],
  );

  const value = useMemo(() => ({ lang, setLang, t }), [lang, setLang, t]);

  return <LangContext.Provider value={value}>{children}</LangContext.Provider>;
}

export const useLang = () => useContext(LangContext);
