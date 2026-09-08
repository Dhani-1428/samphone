import {
  classifyCatalogProduct,
  type CatalogSubcategory,
  type CatalogTopCategory,
  type TaxonomyProduct,
} from "./catalog-taxonomy.ts";
import { hayMatchesModel } from "./model-aliases.ts";
import { buildNavSearchModels } from "./nav-search-models.ts";

export type CanonicalModel = {
  id: string;
  brand: string;
  family: string;
  slug: string;
  label: string;
  aliases: string[];
  href: string;
};

export function compact(s: string): string {
  return s.toLowerCase().replace(/[^a-z0-9]+/g, "");
}

export function spaced(s: string): string {
  return s.toLowerCase().replace(/[^a-z0-9]+/g, " ").replace(/\s+/g, " ").trim();
}

const PRIORITY_MODELS: CanonicalModel[] = [
  {
    id: "iphone-17-pro-max",
    brand: "iphone",
    family: "iphones",
    slug: "iphone-17-pro-max",
    label: "iPhone 17 Pro Max",
    href: "/model/iphone/iphones/iphone-17-pro-max",
    aliases: [
      "17 pro max",
      "17promax",
      "17pm",
      "17 promax",
      "iphone 17 pro max",
      "iphone17promax",
      "pro max 17",
      "promax 17",
      "17 pro max iphone",
    ],
  },
  {
    id: "iphone-17-pro",
    brand: "iphone",
    family: "iphones",
    slug: "iphone-17-pro",
    label: "iPhone 17 Pro",
    href: "/model/iphone/iphones/iphone-17-pro",
    aliases: ["17 pro", "17pro", "iphone 17 pro", "iphone17pro", "pro 17"],
  },
  {
    id: "iphone-16-pro-max",
    brand: "iphone",
    family: "iphones",
    slug: "iphone-16-pro-max",
    label: "iPhone 16 Pro Max",
    href: "/model/iphone/iphones/iphone-16-pro-max",
    aliases: ["16 pro max", "16promax", "16pm", "iphone 16 pro max", "iphone16promax", "pro max 16"],
  },
  {
    id: "iphone-15",
    brand: "iphone",
    family: "iphones",
    slug: "iphone-15",
    label: "iPhone 15",
    href: "/model/iphone/iphones/iphone-15",
    aliases: ["iphone 15", "iphone15"],
  },
  {
    id: "galaxy-s24-ultra",
    brand: "samsung",
    family: "galaxy-s",
    slug: "galaxy-s24-ultra",
    label: "Galaxy S24 Ultra",
    href: "/model/samsung/galaxy-s/galaxy-s24-ultra",
    aliases: ["s24 ultra", "s24ultra", "galaxy s24 ultra", "samsung s24 ultra"],
  },
  {
    id: "redmi-note-13",
    brand: "xiaomi",
    family: "redmi",
    slug: "redmi-note-13",
    label: "Redmi Note 13",
    href: "/model/xiaomi/redmi/redmi-note-13",
    aliases: ["note 13", "redmi note 13", "redminote13", "xiaomi note 13"],
  },
];

let cachedCanonical: CanonicalModel[] | null = null;

export function getCanonicalModels(): CanonicalModel[] {
  if (cachedCanonical) return cachedCanonical;
  const seen = new Set(PRIORITY_MODELS.map((m) => m.id));
  cachedCanonical = [
    ...PRIORITY_MODELS,
    ...buildNavSearchModels().filter((m) => {
      if (seen.has(m.id)) return false;
      seen.add(m.id);
      return true;
    }),
  ];
  return cachedCanonical;
}

export const CANONICAL_MODELS: CanonicalModel[] = PRIORITY_MODELS;

export type ProductTypeSynonym = {
  id: CatalogSubcategory;
  category: CatalogTopCategory;
  tokens: string[];
};

/** Cases and covers stay distinct subcategories. */
export const PRODUCT_TYPE_SYNONYMS: ProductTypeSynonym[] = [
  { id: "back-cover", category: "accessories", tokens: ["back cover", "back covers", "covers", "cover", "tampa", "tampas"] },
  { id: "case", category: "accessories", tokens: ["magsafe", "jelly", "cases", "case", "capa", "capas", "funda", "fundas"] },
  {
    id: "screen-protector",
    category: "accessories",
    tokens: ["screen protector", "tempered glass", "full glue", "tempered", "protectors", "protector", "vidro"],
  },
  { id: "charger", category: "accessories", tokens: ["chargers", "charger", "carregador", "adapter"] },
  { id: "cable", category: "accessories", tokens: ["cables", "cable", "cabos", "cabo", "lightning"] },
  { id: "earphones", category: "accessories", tokens: ["earphones", "earphone", "headset", "earbuds", "tws"] },
  { id: "screen", category: "parts", tokens: ["digitizer", "display", "oled", "lcd", "screen"] },
  { id: "battery", category: "parts", tokens: ["batteries", "battery", "bateria"] },
  { id: "charging-port", category: "parts", tokens: ["charging port", "charge flex", "charging flex"] },
  { id: "camera", category: "parts", tokens: ["rear camera", "front camera", "camera"] },
  { id: "speaker", category: "parts", tokens: ["earpiece", "speaker"] },
  { id: "flex-cable", category: "parts", tokens: ["flex cable", "flex"] },
];

export function levenshtein(a: string, b: string): number {
  if (a === b) return 0;
  const m = a.length;
  const n = b.length;
  if (!m) return n;
  if (!n) return m;
  const row = Array.from({ length: n + 1 }, (_, i) => i);
  for (let i = 1; i <= m; i += 1) {
    let prev = row[0];
    row[0] = i;
    for (let j = 1; j <= n; j += 1) {
      const cur = row[j];
      const cost = a[i - 1] === b[j - 1] ? 0 : 1;
      row[j] = Math.min(row[j] + 1, row[j - 1] + 1, prev + cost);
      prev = cur;
    }
  }
  return row[n];
}

function hasPhrase(query: string, phrase: string): boolean {
  const qn = spaced(query);
  const tn = spaced(phrase);
  if (!tn) return false;
  if (qn === tn) return true;
  if (` ${qn} `.includes(` ${tn} `)) return true;
  const words = qn.split(" ");
  const parts = tn.split(" ");
  if (parts.length === 1) {
    const stem = parts[0];
    return words.some((w) => w === stem || w === `${stem}s` || (stem.endsWith("s") && w === stem.slice(0, -1)));
  }
  return false;
}

function aliasHits(query: string): { model: CanonicalModel; exact: boolean } | null {
  const qn = spaced(query);
  const qc = compact(query);
  const models = getCanonicalModels();
  let best: { model: CanonicalModel; exact: boolean; spec: number } | null = null;
  for (const model of models) {
    for (const alias of [model.label, ...model.aliases]) {
      const an = spaced(alias);
      const ac = compact(alias);
      if (ac.length < 4) continue;
      const exact = qn === an || qc === ac;
      const hit = exact || hasPhrase(qn, an) || qc.includes(ac);
      if (!hit) continue;
      const spec = ac.length + (exact ? 100 : 0);
      if (!best || spec > best.spec) best = { model, exact, spec };
    }
  }
  if (best) return { model: best.model, exact: best.exact };
  let fuzzy: { model: CanonicalModel; dist: number } | null = null;
  for (const model of models) {
    for (const alias of [model.label, ...model.aliases]) {
      const ac = compact(alias);
      if (ac.length < 6 || Math.abs(ac.length - qc.length) > 3) continue;
      const dist = levenshtein(qc, ac);
      if (dist > 0 && dist <= 2 && (!fuzzy || dist < fuzzy.dist)) fuzzy = { model, dist };
    }
  }
  return fuzzy ? { model: fuzzy.model, exact: false } : null;
}

function typeHits(query: string): { type: ProductTypeSynonym; exact: boolean } | null {
  const qn = spaced(query);
  let best: { type: ProductTypeSynonym; exact: boolean; spec: number } | null = null;
  for (const syn of PRODUCT_TYPE_SYNONYMS) {
    for (const tok of syn.tokens) {
      if (!hasPhrase(qn, tok) && !compact(qn).includes(compact(tok))) continue;
      if (compact(tok).length < 4 && !hasPhrase(qn, tok)) continue;
      const spec = spaced(tok).length;
      const exact = hasPhrase(qn, tok);
      if (!best || spec > best.spec || (spec === best.spec && exact && !best.exact)) {
        best = { type: syn, exact, spec };
      }
    }
  }
  if (best) return { type: best.type, exact: best.exact };
  const words = qn.split(" ").filter((w) => w.length >= 4);
  let fuzzy: { type: ProductTypeSynonym; dist: number } | null = null;
  for (const syn of PRODUCT_TYPE_SYNONYMS) {
    for (const tok of syn.tokens) {
      if (tok.includes(" ")) continue;
      for (const w of words) {
        const dist = levenshtein(w, tok);
        if (dist > 0 && dist <= 1 && (!fuzzy || dist < fuzzy.dist)) fuzzy = { type: syn, dist };
      }
    }
  }
  return fuzzy ? { type: fuzzy.type, exact: false } : null;
}

export type ParsedSearchQuery = {
  raw: string;
  model: CanonicalModel | null;
  modelExact: boolean;
  type: ProductTypeSynonym | null;
  typeExact: boolean;
};

export function parseSearchQuery(raw: string): ParsedSearchQuery {
  const q = raw.trim();
  const modelHit = q ? aliasHits(q) : null;
  const typeHit = q ? typeHits(q) : null;
  return {
    raw: q,
    model: modelHit?.model ?? null,
    modelExact: modelHit?.exact ?? false,
    type: typeHit?.type ?? null,
    typeExact: typeHit?.exact ?? false,
  };
}

export function productNameMatchesModel(name: string, model: CanonicalModel): boolean {
  return hayMatchesModel(name, model.brand, model.label);
}

export function productTypeMatchesParsed(p: TaxonomyProduct, parsed: ParsedSearchQuery): boolean {
  if (!parsed.type) return true;
  const cls = classifyCatalogProduct(p);
  if (cls.subcategory === parsed.type.id) return true;
  if (parsed.type.id === "back-cover" && cls.subcategory === "case" && /\bcovers?\b/i.test(p.name)) return true;
  return false;
}

export function productMatchesParsedQuery(p: TaxonomyProduct, parsed: ParsedSearchQuery): boolean {
  if (!parsed.raw) return true;
  if (!productTypeMatchesParsed(p, parsed)) return false;
  if (parsed.model && !productNameMatchesModel(p.name, parsed.model)) return false;
  return true;
}

export function rankSearchResults<T extends TaxonomyProduct>(query: string, products: T[]): T[] {
  const parsed = parseSearchQuery(query);
  const scored = products
    .filter((p) => productMatchesParsedQuery(p, parsed))
    .map((p) => {
      const cls = classifyCatalogProduct(p);
      const modelOk = parsed.model ? productNameMatchesModel(p.name, parsed.model) : false;
      const typeOk = parsed.type ? cls.subcategory === parsed.type.id : false;
      let rank = 80;
      if (parsed.model && parsed.type && modelOk && typeOk && parsed.modelExact && parsed.typeExact) rank = 1;
      else if (parsed.model && parsed.type && modelOk && typeOk && parsed.modelExact) rank = 2;
      else if (parsed.model && parsed.type && modelOk && typeOk) rank = 3;
      else if (parsed.model && modelOk && parsed.modelExact && !parsed.type) rank = 4;
      else if (parsed.model && parsed.type && modelOk && parsed.modelExact) rank = 5;
      else if (parsed.model && parsed.type && typeOk && parsed.typeExact) rank = 6;
      else if (parsed.model && modelOk) rank = 10;
      else if (parsed.type && typeOk) rank = 20;
      else rank = 50;
      return { p, rank };
    });
  return scored.sort((a, b) => a.rank - b.rank).map((r) => r.p);
}
