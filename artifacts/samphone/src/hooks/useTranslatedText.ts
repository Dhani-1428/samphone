import { useEffect, useState } from "react";
import { useLang, type Lang } from "@/contexts/LanguageContext";
import { translateCloudTexts } from "@/lib/samphone-cloud";

const memory = new Map<string, string>();

type Waiter = {
  text: string;
  lang: Lang;
  resolve: (v: string) => void;
};

let queue: Waiter[] = [];
let timer: ReturnType<typeof setTimeout> | null = null;

function cacheKey(lang: Lang, text: string) {
  return `${lang}\0${text}`;
}

async function translateViaGoogle(texts: string[], lang: Lang): Promise<string[]> {
  const out: string[] = [];
  for (const text of texts) {
    try {
      const url = `https://translate.googleapis.com/translate_a/single?client=gtx&sl=auto&tl=${encodeURIComponent(lang)}&dt=t&q=${encodeURIComponent(text)}`;
      const res = await fetch(url);
      if (!res.ok) {
        out.push(text);
        continue;
      }
      const data: unknown = await res.json();
      const chunks = Array.isArray(data) && Array.isArray(data[0]) ? data[0] : [];
      const joined = chunks
        .map((row) => (Array.isArray(row) && typeof row[0] === "string" ? row[0] : ""))
        .join("");
      out.push(joined.trim() ? joined : text);
    } catch {
      out.push(text);
    }
  }
  return out;
}

async function translateBatch(texts: string[], lang: Lang): Promise<string[]> {
  let translated: string[] = texts;
  try {
    translated = await translateCloudTexts(texts, lang);
  } catch {
    translated = texts;
  }
  const needFallback: number[] = [];
  translated.forEach((dst, i) => {
    const src = texts[i];
    if (dst && dst !== src) return;
    if (lang !== "pt") {
      needFallback.push(i);
      return;
    }
    if (/^[\x00-\x7F]+$/.test(src) && /[A-Za-z]{4,}/.test(src)) needFallback.push(i);
  });
  if (needFallback.length === 0) return translated;
  const fallbackSrc = needFallback.map((i) => texts[i]);
  const fallbackDst = await translateViaGoogle(fallbackSrc, lang);
  const next = [...translated];
  needFallback.forEach((i, j) => {
    if (fallbackDst[j]) next[i] = fallbackDst[j];
  });
  return next;
}

function flush() {
  timer = null;
  const batch = queue;
  queue = [];
  const byLang = new Map<Lang, Waiter[]>();
  for (const w of batch) {
    const list = byLang.get(w.lang) ?? [];
    list.push(w);
    byLang.set(w.lang, list);
  }
  for (const [lang, waiters] of byLang) {
    const unique: string[] = [];
    const seen = new Set<string>();
    for (const w of waiters) {
      if (seen.has(w.text)) continue;
      seen.add(w.text);
      unique.push(w.text);
    }
    void (async () => {
      const chunks: string[] = [];
      for (let i = 0; i < unique.length; i += 30) {
        const slice = unique.slice(i, i + 30).map((s) => s.slice(0, 4000));
        try {
          chunks.push(...(await translateBatch(slice, lang)));
        } catch {
          chunks.push(...slice);
        }
      }
      const map = new Map<string, string>();
      unique.forEach((src, i) => {
        const dst = chunks[i] || src;
        map.set(src, dst);
        memory.set(cacheKey(lang, src), dst);
      });
      for (const w of waiters) {
        w.resolve(map.get(w.text) || w.text);
      }
    })();
  }
}

function translateLater(text: string, lang: Lang): Promise<string> {
  const key = cacheKey(lang, text);
  const hit = memory.get(key);
  if (hit) return Promise.resolve(hit);
  return new Promise((resolve) => {
    queue.push({ text, lang, resolve });
    if (timer) clearTimeout(timer);
    timer = setTimeout(flush, 50);
  });
}

function skipTranslate(text: string): boolean {
  const t = text.trim();
  if (!t) return true;
  if (t.length < 2) return true;
  if (/^[\d\s.,+\-€$£#/]+$/.test(t)) return true;
  return false;
}

/** Live catalog titles/descriptions follow the selected site language. */
export function useTranslatedText(text: string | null | undefined): string {
  const { lang } = useLang();
  const raw = (text ?? "").trim();
  const [value, setValue] = useState(raw);

  useEffect(() => {
    if (!raw || skipTranslate(raw)) {
      setValue(raw);
      return;
    }
    const key = cacheKey(lang, raw);
    const hit = memory.get(key);
    if (hit) {
      setValue(hit);
      return;
    }
    setValue(raw);
    let alive = true;
    void translateLater(raw, lang).then((next) => {
      if (alive) setValue(next);
    });
    return () => {
      alive = false;
    };
  }, [raw, lang]);

  return value;
}

function htmlToPlain(html: string): string {
  return html
    .replace(/<br\s*\/?>/gi, " ")
    .replace(/<\/p>/gi, " ")
    .replace(/<[^>]+>/g, " ")
    .replace(/&nbsp;/gi, " ")
    .replace(/&amp;/gi, "&")
    .replace(/&lt;/gi, "<")
    .replace(/&gt;/gi, ">")
    .replace(/&quot;/gi, '"')
    .replace(/\s+/g, " ")
    .trim();
}

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

/** Catalog HTML descriptions follow the selected site language. */
export function useTranslatedHtml(html: string | null | undefined): string | null | undefined {
  const source = html ?? "";
  const plain = htmlToPlain(source);
  const translated = useTranslatedText(plain || null);
  if (!html) return html;
  if (!plain) return html;
  if (!translated || translated === plain) return html;
  return translated
    .split(/\n+/)
    .map((p) => p.trim())
    .filter(Boolean)
    .map((p) => `<p>${escapeHtml(p)}</p>`)
    .join("");
}
