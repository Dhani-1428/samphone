/** Shared model alias + title matching (Apple, Samsung, Xiaomi, …). */

const BRAND_PREFIXES = [
  "samsung",
  "xiaomi",
  "apple",
  "iphone",
  "huawei",
  "honor",
  "oppo",
  "realme",
  "vivo",
  "motorola",
  "moto",
  "oneplus",
  "alcatel",
  "tcl",
  "zte",
  "nokia",
  "google",
  "pixel",
  "lg",
  "lenovo",
  "galaxy",
  "redmi",
  "poco",
];

const EXTENDERS = ["pro max", "pro plus", "plus", "ultra", "mini", "air", "lite", "fe", "pro", "max"];

export function compactModel(s: string): string {
  return s.toLowerCase().replace(/[^a-z0-9]+/g, "");
}

export function spacedModel(s: string): string {
  return s.toLowerCase().replace(/[^a-z0-9]+/g, " ").replace(/\s+/g, " ").trim();
}

export function slugifyModelLabel(label: string): string {
  return label
    .toLowerCase()
    .replace(/[()]/g, " ")
    .replace(/[/+,]/g, " ")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .replace(/-{2,}/g, "-");
}

function addName(out: Set<string>, value: string): void {
  const v = value.replace(/\s+/g, " ").trim();
  if (v.length >= 2) out.add(v);
}

function stripLeadingPrefixes(value: string): string {
  let rest = value.replace(/\s+/g, " ").trim();
  let changed = true;
  while (changed) {
    changed = false;
    const lower = rest.toLowerCase();
    for (const p of BRAND_PREFIXES) {
      if (lower.startsWith(`${p} `)) {
        rest = rest.slice(p.length).trim();
        changed = true;
        break;
      }
    }
  }
  return rest;
}

export function extractHardwareCodes(value: string): string[] {
  const text = value.toLowerCase().replace(/-/g, " ");
  const codes = new Set<string>();
  for (const match of text.matchAll(/\b([a-z]{1,3}\d{3,4}[a-z]{0,2})\b/g)) {
    const token = match[1];
    if (token && token.length >= 4) codes.add(token);
  }
  return [...codes];
}

/** Full name + Galaxy/Redmi short forms + hardware codes in parentheses. */
export function modelAliases(brand: string, modelName: string): string[] {
  const out = new Set<string>();
  const raw = modelName.replace(/-/g, " ").replace(/\s+/g, " ").trim();
  if (!raw) return [];
  addName(out, raw);

  let stripped = raw;
  const paren = stripped.match(/^(.+?)\s*\(([^)]+)\)\s*$/);
  if (paren) {
    stripped = paren[1].trim();
    addName(out, stripped);
    for (const code of paren[2].split(/[,/]+/)) {
      const c = code.trim();
      if (c.length >= 3) addName(out, c);
    }
  }

  const brandKey = (brand || "").toLowerCase().replace(/-parts$/i, "");
  if (brandKey && stripped.toLowerCase().startsWith(`${brandKey} `)) {
    stripped = stripped.slice(brandKey.length).trim();
    addName(out, stripped);
  }

  const core = stripLeadingPrefixes(stripped);
  addName(out, core);

  if (brandKey === "samsung" || /\bgalaxy\b/i.test(raw)) {
    addName(out, `Galaxy ${core.replace(/^galaxy\s+/i, "")}`);
    addName(out, `Samsung ${core}`);
    addName(out, `Samsung Galaxy ${core.replace(/^galaxy\s+/i, "")}`);
  }
  if (brandKey === "xiaomi" || /\b(redmi|poco|xiaomi)\b/i.test(raw)) {
    addName(out, core);
    if (/\bredmi\b/i.test(raw) || brandKey === "xiaomi") addName(out, `Redmi ${core.replace(/^redmi\s+/i, "")}`);
    if (/\bpoco\b/i.test(raw)) addName(out, `Poco ${core.replace(/^poco\s+/i, "")}`);
    addName(out, `Xiaomi ${core}`);
  }
  if (brandKey === "iphone" || brandKey === "apple" || /^iphone\b/i.test(raw) || /^ipad\b/i.test(raw)) {
    if (/^ipad\b/i.test(raw) || /ipad/i.test(raw)) {
      addName(out, raw.replace(/^ipad\b/i, "iPad"));
    }
    const rest = core.replace(/^iphone\s*/i, "");
    addName(out, `iPhone ${rest}`);
    addName(out, rest);
    if (/^17 air$/i.test(rest)) {
      addName(out, "iPhone Air");
      addName(out, "iPhone 17 Air");
    }
    if (/\d{2}g$/i.test(rest)) {
      addName(out, `iPhone ${rest.replace(/g$/i, "")}`.trim());
    }
  }
  if (brandKey === "google" || brandKey === "google-pixel" || /\bpixel\b/i.test(raw)) {
    addName(out, `Pixel ${core.replace(/^pixel\s+/i, "")}`);
    addName(out, `Google Pixel ${core.replace(/^(google\s+)?pixel\s+/i, "")}`);
  }
  if (brandKey === "huawei" || /\b(mate|nova)\b/i.test(raw)) {
    addName(out, `Huawei ${core}`);
  }
  if (brandKey === "honor" || /^honor\b/i.test(raw)) {
    addName(out, `Honor ${core.replace(/^honor\s+/i, "")}`);
  }
  if (brandKey === "motorola" || /\bmoto\b/i.test(raw)) {
    addName(out, `Moto ${core.replace(/^moto\s+/i, "")}`);
    addName(out, `Motorola ${core.replace(/^motorola\s+/i, "")}`);
  }

  for (const code of extractHardwareCodes(raw)) addName(out, code.toUpperCase());

  return [...out].filter((n) => n.length >= 2);
}

export function modelSearchNames(brand: string, modelSlug: string): string[] {
  const raw = modelSlug.replace(/-/g, " ").replace(/\s+/g, " ").trim();
  if (!raw) return [];
  const titled = raw.replace(/\b([a-z])/g, (c) => c.toUpperCase());
  const names = new Set<string>(modelAliases(brand, titled));
  for (const n of modelAliases(brand, raw)) names.add(n);
  return [...names].filter((n) => n.length >= 3);
}

function hasExtenderBeyond(hay: string, matched: string, model: string): boolean {
  const h = spacedModel(hay);
  const best = spacedModel(matched);
  const m = spacedModel(model);
  for (const extra of EXTENDERS) {
    if (m.endsWith(` ${extra}`) || m.endsWith(extra) || m.includes(` ${extra} `)) continue;
    if (h.includes(`${best} ${extra}`)) return true;
  }
  return false;
}

function missingRequiredExtender(hayRaw: string, modelName: string): boolean {
  const m = spacedModel(modelName);
  const h = spacedModel(hayRaw);
  const hc = compactModel(hayRaw);
  for (const extra of EXTENDERS) {
    if (!(m.endsWith(` ${extra}`) || m.endsWith(extra))) continue;
    const need = spacedModel(extra);
    if (!h.includes(need) && !hc.includes(compactModel(extra))) return true;
  }
  return false;
}

/** True when a product title/fields belong to this model (short Galaxy/Redmi titles included). */
export function hayMatchesModel(hayRaw: string, brand: string, modelName: string): boolean {
  if (missingRequiredExtender(hayRaw, modelName)) return false;
  const hay = spacedModel(hayRaw);
  const hc = compactModel(hayRaw);
  if (!hay) return false;
  const aliases = modelAliases(brand, modelName).sort((a, b) => compactModel(b).length - compactModel(a).length);
  let best: string | null = null;
  for (const alias of aliases) {
    const a = spacedModel(alias);
    const ac = compactModel(alias);
    if (ac.length < 4 && !/^[a-z]{1,3}\d{3}/i.test(ac)) continue;
    if (hay.includes(a) || (ac.length >= 5 && hc.includes(ac))) {
      best = alias;
      break;
    }
  }
  if (!best) return false;
  if (hasExtenderBeyond(hayRaw, best, modelName)) return false;
  const bestL = spacedModel(best);
  let idx = hay.indexOf(bestL);
  while (idx >= 0) {
    const end = idx + bestL.length;
    const next = hay[end];
    if (next && /[a-z0-9]/.test(next)) return false;
    idx = hay.indexOf(bestL, end);
  }
  return true;
}
