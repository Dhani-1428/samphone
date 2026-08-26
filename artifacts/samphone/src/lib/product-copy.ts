import type { WooProduct } from "@/lib/woocommerce";

const ALLOWED = new Set([
  "P",
  "BR",
  "UL",
  "OL",
  "LI",
  "STRONG",
  "B",
  "EM",
  "I",
  "H2",
  "H3",
  "H4",
  "A",
  "TABLE",
  "THEAD",
  "TBODY",
  "TR",
  "TD",
  "TH",
  "IMG",
  "SPAN",
  "DIV",
]);

function normKey(s: string): string {
  return s.toLowerCase().replace(/[^a-z0-9]+/g, "");
}

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

export function stripHtml(raw: string): string {
  return raw
    .replace(/<br\s*\/?>/gi, " ")
    .replace(/<\/(p|div|li|h[1-6])>/gi, " ")
    .replace(/<[^>]+>/g, " ")
    .replace(/&nbsp;/gi, " ")
    .replace(/&amp;/gi, "&")
    .replace(/\s+/g, " ")
    .trim();
}

export function sanitizeProductHtml(raw: string): string {
  const input = raw.trim();
  if (!input) return "";
  if (typeof DOMParser === "undefined") {
    return input.replace(/<script[\s\S]*?<\/script>/gi, "").replace(/<style[\s\S]*?<\/style>/gi, "");
  }
  const doc = new DOMParser().parseFromString(input, "text/html");
  doc.querySelectorAll("script,style,iframe,object,form,link,meta").forEach((n) => n.remove());
  const walk = (node: Node) => {
    const children = [...node.childNodes];
    for (const child of children) {
      if (child.nodeType !== Node.ELEMENT_NODE) continue;
      const el = child as HTMLElement;
      walk(el);
      if (!ALLOWED.has(el.tagName)) {
        el.replaceWith(...el.childNodes);
        continue;
      }
      for (const attr of [...el.attributes]) {
        const name = attr.name.toLowerCase();
        if (name.startsWith("on") || name === "style" || name === "class" || name === "id") {
          el.removeAttribute(attr.name);
        }
      }
      if (el.tagName === "A") {
        const href = el.getAttribute("href") ?? "";
        if (!/^(https?:|mailto:|\/)/i.test(href)) el.removeAttribute("href");
        el.setAttribute("rel", "noopener noreferrer");
        el.setAttribute("target", "_blank");
      }
      if (el.tagName === "IMG") {
        const src = el.getAttribute("src") ?? "";
        if (!/^https?:\/\//i.test(src)) el.remove();
        else {
          el.setAttribute("alt", el.getAttribute("alt") || "");
          el.removeAttribute("srcset");
        }
      }
    }
  };
  walk(doc.body);
  return doc.body.innerHTML.replace(/\s+(style|class|id)="[^"]*"/gi, "").trim();
}

function looksLikeTitleOnly(desc: string, title: string): boolean {
  const a = normKey(stripHtml(desc));
  const b = normKey(title);
  if (!a) return true;
  if (a === b) return true;
  return a.length < 24;
}

function article(lang: "pt" | "en", type: string): { excerpt: string; lead: string } {
  const t = type.toLowerCase();
  if (lang === "pt") {
    if (/\blens\b|película|sticker/.test(t)) {
      return {
        excerpt:
          "Película protectora para lente de câmara, com tecnologia de luz azul sem danos — para trabalho de reparação preciso.",
        lead: "Película protectora para lente de câmara, com filme de luz azul sem danos. Pensada para proteger a óptica durante a reparação e o manuseamento.",
      };
    }
    if (t.includes("screen") || t.includes("lcd") || t.includes("ecr") || t.includes("display")) {
      return {
        excerpt: "Ecrã / conjunto LCD de substituição para reparação profissional — peça nova, pronta a instalar.",
        lead: "Conjunto de ecrã de substituição para técnicos. Fornecido novo e adequado a reparação em oficina.",
      };
    }
    if (t.includes("battery") || t.includes("bater")) {
      return {
        excerpt: "Bateria de substituição nova, para restauro de autonomia em reparação profissional.",
        lead: "Bateria de substituição para reparação profissional. Fornecida nova e pronta a instalar.",
      };
    }
    if (t.includes("charg") || t.includes("cable") || t.includes("usb") || t.includes("carreg")) {
      return {
        excerpt: "Acessório de carregamento para uso diário, com ligação estável e envio rápido a partir de Lisboa.",
        lead: "Acessório de carregamento para smartphones e dispositivos compatíveis. Ideal para oficina e retalho.",
      };
    }
    if (t.includes("cover") || t.includes("case") || t.includes("jelly") || t.includes("glass") || t.includes("capa")) {
      return {
        excerpt: "Acessório de proteção para o dispositivo — ajuste ao modelo e acabamento de qualidade.",
        lead: "Acessório de proteção para o telemóvel. Escolha o modelo certo e instale com cuidado para um ajuste correcto.",
      };
    }
    if (t.includes("repair") || t.includes("tool") || t.includes("ferrament")) {
      return {
        excerpt: "Ferramenta de reparação profissional para oficina — uso preciso, fornecida nova.",
        lead: "Ferramenta de reparação para técnicos. Pensada para trabalho em oficina com peças e dispositivos móveis.",
      };
    }
    return {
      excerpt: "Artigo de catálogo Samphone, fornecido novo e enviado a partir de Lisboa.",
      lead: "Produto do catálogo Samphone para reparação e acessórios. Fornecido novo e preparado para envio rápido em Portugal.",
    };
  }
  if (/\blens\b|sticker/.test(t)) {
    return {
      excerpt:
        "Camera-lens protective sticker with no-damage blue-light film — made for precise repair work.",
      lead: "Camera-lens protective sticker with a no-damage blue-light film. Designed to shield optics during repair and handling.",
    };
  }
  if (t.includes("screen") || t.includes("lcd") || t.includes("display")) {
    return {
      excerpt: "Replacement screen / LCD assembly for professional repair — supplied new and ready to fit.",
      lead: "Replacement display assembly for technicians. Supplied new and suitable for workshop installation.",
    };
  }
  if (t.includes("battery")) {
    return {
      excerpt: "New replacement battery to restore capacity during professional repair.",
      lead: "Replacement battery for professional repair. Supplied new and ready to install.",
    };
  }
  if (t.includes("charg") || t.includes("cable") || t.includes("usb")) {
    return {
      excerpt: "Charging accessory for everyday use, with stable connection and fast dispatch from Lisbon.",
      lead: "Charging accessory for compatible phones and devices. Suitable for workshop and retail.",
    };
  }
  if (t.includes("cover") || t.includes("case") || t.includes("jelly") || t.includes("glass")) {
    return {
      excerpt: "Protective accessory for the device — model-specific fit and clean finish.",
      lead: "Protective accessory for the phone. Confirm the model and fit it carefully for a correct match.",
    };
  }
  if (t.includes("repair") || t.includes("tool")) {
    return {
      excerpt: "Professional repair tool for workshop use — precise, supplied new.",
      lead: "Repair tool for technicians. Designed for mobile-device work in the workshop.",
    };
  }
  return {
    excerpt: "Samphone catalog item, supplied new and shipped from Lisbon.",
    lead: "Samphone catalog product for repair and accessories. Supplied new and prepared for fast dispatch in Portugal.",
  };
}

export function buildProductCopy(
  product: Pick<WooProduct, "name" | "brand" | "partType" | "modelLabel" | "sku" | "specs" | "description" | "short_description" | "categories">,
  lang: "pt" | "en",
): { excerpt: string; html: string } {
  const title = product.name.trim();
  const type = product.partType || product.specs?.Type || product.categories?.[0]?.name || "";
  const brand = product.brand || product.specs?.Brand || "";
  const model = product.modelLabel || product.specs?.Model || "";
  const raw = (product.description || product.short_description || "").trim();
  const usableHtml = raw && !looksLikeTitleOnly(raw, title) ? sanitizeProductHtml(raw) : "";
  const { excerpt: typeExcerpt, lead } = article(lang, `${type} ${title}`);

  const bits: string[] = [];
  if (brand) bits.push(lang === "pt" ? `Marca ${brand}` : `${brand}`);
  if (model) bits.push(lang === "pt" ? `modelo ${model}` : `model ${model}`);
  const who = bits.length ? (lang === "pt" ? `${bits.join(", ")}. ` : `${bits.join(", ")}. `) : "";

  const excerpt = usableHtml
    ? stripHtml(usableHtml).slice(0, 220).replace(/\s+\S*$/, "") + (stripHtml(usableHtml).length > 220 ? "…" : "")
    : `${who}${typeExcerpt}`;

  if (usableHtml) {
    return { excerpt, html: usableHtml };
  }

  const rows: [string, string][] = [];
  const spec = product.specs ?? {};
  const condition = spec.Condition || spec.condition;
  if (condition) rows.push([lang === "pt" ? "Condição" : "Condition", condition]);
  if (brand) rows.push([lang === "pt" ? "Marca" : "Brand", brand]);
  if (product.sku || spec.SKU) rows.push(["SKU", product.sku || spec.SKU]);
  if (type) rows.push([lang === "pt" ? "Tipo" : "Type", type]);
  if (model) rows.push([lang === "pt" ? "Modelo" : "Model", model]);
  const cat = product.categories?.[0]?.name;
  if (cat && cat.toLowerCase() !== type.toLowerCase()) {
    rows.push([lang === "pt" ? "Categoria" : "Category", cat]);
  }

  const lis = rows
    .map(([k, v]) => `<li><strong>${escapeHtml(k)}:</strong> ${escapeHtml(v)}</li>`)
    .join("");

  const closing =
    lang === "pt"
      ? "Enviado a partir de Lisboa. Confirme a compatibilidade com o modelo antes de instalar."
      : "Shipped from Lisbon. Confirm compatibility with the device model before fitting.";

  const html = [
    `<p>${escapeHtml(lead)}</p>`,
    lis ? `<h3>${lang === "pt" ? "Detalhes do produto" : "Product details"}</h3><ul>${lis}</ul>` : "",
    `<p>${escapeHtml(closing)}</p>`,
  ]
    .filter(Boolean)
    .join("");

  return { excerpt, html };
}
