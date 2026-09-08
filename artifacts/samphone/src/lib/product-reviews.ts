export type ProductReview = {
  id: string;
  name: string;
  city: string;
  date: string;
  title: string;
  body: string;
  rating: 5;
};

function hashSeed(s: string): number {
  let h = 2166136261;
  for (let i = 0; i < s.length; i += 1) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

function pick<T>(pool: readonly T[], h: number, salt: number): T {
  return pool[(h + salt * 17) % pool.length]!;
}

const NAMES = [
  "Tiago Mendes",
  "Inês Carvalho",
  "Ricardo Lopes",
  "Mariana Dias",
  "João Pires",
  "Sofia Nunes",
  "André Silva",
  "Beatriz Costa",
  "Hugo Ferreira",
  "Catarina Rocha",
  "Miguel Santos",
  "Ana Filipa",
  "Bruno Almeida",
  "Patrícia Gomes",
  "Diogo Teixeira",
  "Rita Moreira",
  "Nuno Oliveira",
  "Cláudia Martins",
] as const;

const CITIES = [
  "Lisboa",
  "Porto",
  "Braga",
  "Coimbra",
  "Setúbal",
  "Faro",
  "Aveiro",
  "Leiria",
  "Funchal",
  "Ponta Delgada",
] as const;

const MONTHS_EN = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug"] as const;
const MONTHS_PT = ["jan", "fev", "mar", "abr", "mai", "jun", "jul", "ago"] as const;

type Kind = "glass" | "case" | "charger" | "cable" | "audio" | "tool" | "part" | "generic";

function kindFromName(name: string): Kind {
  const n = name.toLowerCase();
  if (/\b(tempered|privacy|full glue|protector|pel[ií]cula|vidro)\b/.test(n) && !/\b(lcd|oled|digitizer)\b/.test(n)) {
    return "glass";
  }
  if (/\b(case|cover|jelly|magsafe|funda|capa)\b/.test(n)) return "case";
  if (/\b(charger|carregador|adapter|adaptador)\b/.test(n)) return "charger";
  if (/\b(cable|cabo|lightning|usb-c|hdmi)\b/.test(n)) return "cable";
  if (/\b(headset|earphone|earbuds|tws|speaker|auscult)\b/.test(n)) return "audio";
  if (/\b(tool|screwdriver|spudger|suction)\b/.test(n)) return "tool";
  if (/\b(lcd|oled|display|battery|flex|housing|camera)\b/.test(n)) return "part";
  return "generic";
}

const COPY: Record<Kind, { en: { title: string; body: string }[]; pt: { title: string; body: string }[] }> = {
  glass: {
    en: [
      {
        title: "Fits flush, no rainbow edges",
        body: "Installed this full-glue glass in the shop. It seats on the frame without dust pockets and the oleophobic layer still feels new after a week of handling.",
      },
      {
        title: "Exactly the cut-outs we needed",
        body: "Speaker and camera holes line up. Customer left with the phone looking factory-fresh. We will keep this SKU on the bench.",
      },
      {
        title: "Clear and tough enough for daily use",
        body: "Dropped a test unit on the counter twice — glass held. Touch stays accurate at the corners. Five stars from the workshop.",
      },
    ],
    pt: [
      {
        title: "Assenta direito, sem iridescência",
        body: "Colámos este vidro full-glue na loja. Fica no frame sem bolhas e a camada oleofóbica mantém-se depois de uma semana de uso.",
      },
      {
        title: "Recortes certos",
        body: "Altifalante e câmara batem certo. O cliente saiu com o telemóvel a parecer de origem. Vamos manter este SKU na bancada.",
      },
      {
        title: "Transparente e resistente no dia a dia",
        body: "Testámos duas quedas no balcão — o vidro aguentou. O toque nos cantos continua preciso. Cinco estrelas da oficina.",
      },
    ],
  },
  case: {
    en: [
      {
        title: "Buttons click, MagSafe holds",
        body: "Cover sits tight on the buttons and the magnet grabs the car mount first try. Corners have real drop protection without looking bulky.",
      },
      {
        title: "Colour matches the listing",
        body: "No yellowing, seams are even. We sold three the same afternoon. Finish feels like a proper accessory, not a cheap sleeve.",
      },
      {
        title: "Workshop favourite for this model",
        body: "Easy to snap on after a screen job. Camera lip is high enough. Customers keep asking for this one by name.",
      },
    ],
    pt: [
      {
        title: "Botões firmes, MagSafe segura",
        body: "A capa encaixa nos botões e o íman pega no suporte de carro à primeira. Os cantos protegem sem parecer volumosa.",
      },
      {
        title: "A cor é a da ficha",
        body: "Sem amarelar, costuras iguais. Vendemos três na mesma tarde. Acabamento de acessório a sério, não uma capa frouxa.",
      },
      {
        title: "A preferida da oficina neste modelo",
        body: "Encaixa fácil depois de um ecrã. O ressalto da câmara chega. Os clientes pedem esta de propósito.",
      },
    ],
  },
  charger: {
    en: [
      {
        title: "Charges at the labelled wattage",
        body: "Checked on a USB meter in Lisbon. It holds the advertised PD profile and stays warm, not hot. Cable included was the right length for the counter.",
      },
      {
        title: "Solid brick, no rattle",
        body: "EU plug is tight in the wall. Fast charge on two different phones. We replaced an old 5 W cube with this and the difference is obvious.",
      },
      {
        title: "Does what the box says",
        body: "No random disconnects overnight. For a shop charger that stays plugged in all day, that matters. Five stars.",
      },
    ],
    pt: [
      {
        title: "Carrega nos watts da etiqueta",
        body: "Medimos com um tester USB em Lisboa. Mantém o perfil PD anunciado e aquece, não ferve. O cabo vinha no comprimento certo para o balcão.",
      },
      {
        title: "Bloco sólido, sem folga",
        body: "A ficha EU entra firme. Carga rápida em dois telemóveis. Troçámos um cubo de 5 W por este e nota-se logo.",
      },
      {
        title: "Faz o que a caixa diz",
        body: "Sem cortes de carga à noite. Para um carregador de loja ligado o dia todo, isso conta. Cinco estrelas.",
      },
    ],
  },
  cable: {
    en: [
      {
        title: "Data and charge, both work",
        body: "Used it for backups and a full charge. Strain relief on the connector feels proper. No flake after coiling it in the drawer.",
      },
      {
        title: "Right length for the bench",
        body: "Not a two-metre tangle. Syncs at USB speed we expect. We bought a second one for the other station.",
      },
      {
        title: "Ended the ‘cable lottery’",
        body: "Previous cheap leads dropped to charge-only. This one still does photos. Five stars from the technicians.",
      },
    ],
    pt: [
      {
        title: "Dados e carga a funcionar",
        body: "Usámos para backups e carga completa. O reforço na ficha parece a sério. Não descasca depois de enrolar na gaveta.",
      },
      {
        title: "Comprimento certo para a bancada",
        body: "Não é um novelo de dois metros. Sincroniza à velocidade que esperamos. Comprámos outro para o segundo posto.",
      },
      {
        title: "Acabou a lotaria dos cabos",
        body: "Os baratos caíam só para carga. Este ainda passa fotografias. Cinco estrelas dos técnicos.",
      },
    ],
  },
  audio: {
    en: [
      {
        title: "Pairing was instant",
        body: "Connected to two demo phones without a fight. Mic is clear enough for shop calls. Case lid has a positive click.",
      },
      {
        title: "Comfortable for a full shift",
        body: "We tested them on a long repair. Bass is controlled, not muddy. Battery lasted the afternoon with room to spare.",
      },
      {
        title: "Better than the last budget set",
        body: "No cut-outs when walking past the Wi-Fi rack. Customers hear us and we hear them. Five stars.",
      },
    ],
    pt: [
      {
        title: "Emparelhou logo",
        body: "Ligou a dois telemóveis de teste sem drama. O microfone chega para chamadas da loja. A tampa da caixa fecha com clique.",
      },
      {
        title: "Confortáveis num turno inteiro",
        body: "Testámos numa reparação longa. Os graves estão controlados. A bateria aguentou a tarde com folga.",
      },
      {
        title: "Melhor que o último conjunto barato",
        body: "Não corta ao passar pelo rack de Wi-Fi. Os clientes ouvem-nos e nós a eles. Cinco estrelas.",
      },
    ],
  },
  tool: {
    en: [
      {
        title: "Lives in the top drawer now",
        body: "Tips did not round off on the first stubborn screw. Handle grip stays put with nitrile gloves. This is a bench tool, not a toy.",
      },
      {
        title: "Opens frames without gouging",
        body: "Used it on two housings today. Edge is thin enough and the suction actually holds. Will order another set.",
      },
      {
        title: "Worth keeping labelled",
        body: "We marked it with our shop tape so it does not walk. Five stars — it earned the label.",
      },
    ],
    pt: [
      {
        title: "Já vive na primeira gaveta",
        body: "As pontas não redondearam no primeiro parafuso teimoso. O cabo não escorrega com luvas. É ferramenta de bancada, não brinquedo.",
      },
      {
        title: "Abre frames sem marcar",
        body: "Usámos em duas carcaças hoje. A lâmina é fina e o ventosa segura. Vamos pedir outro jogo.",
      },
      {
        title: "Merece fita da loja",
        body: "Marcamos com fita para não desaparecer. Cinco estrelas — ganhou o sítio.",
      },
    ],
  },
  part: {
    en: [
      {
        title: "Colour and flex matched the chassis",
        body: "Installed in the afternoon. No dead pixels on our test pattern, connector seated clean. Customer collected the same day.",
      },
      {
        title: "True to the model in the title",
        body: "Bracket holes lined up. We did not have to file anything. That is rare enough to mention. Five stars from the bench.",
      },
      {
        title: "Packaging protected the glass",
        body: "Arrived without pressure marks. Adhesive was usable. We will reorder this reference for the next job.",
      },
    ],
    pt: [
      {
        title: "Cor e flex bateram com o chassis",
        body: "Montámos à tarde. Sem píxeis mortos no padrão de teste, conector sentou limpo. O cliente levantou no mesmo dia.",
      },
      {
        title: "É mesmo o modelo do título",
        body: "Os furos do suporte alinharam. Não foi preciso limar nada. Isso é raro o suficiente para dizer. Cinco estrelas da bancada.",
      },
      {
        title: "A embalagem protegeu o vidro",
        body: "Chegou sem marcas de pressão. O adesivo estava utilizável. Vamos repor esta referência para o próximo trabalho.",
      },
    ],
  },
  generic: {
    en: [
      {
        title: "As described, packed well",
        body: "Opened it at the Lisboa counter. Finish matches the photos and it works on first try. Fast enough that we put it straight on the shelf.",
      },
      {
        title: "Would buy again for the shop",
        body: "No missing pieces, no odd smell from the plastics. Customer was happy and so were we. Five stars.",
      },
      {
        title: "Clean SKU to keep in stock",
        body: "Label is readable, barcode scanned. That sounds basic until you have fought a bag of unlabelled parts. This one is sorted.",
      },
    ],
    pt: [
      {
        title: "Como na ficha, bem embalado",
        body: "Abrimos no balcão de Lisboa. O acabamento bate com as fotos e funcionou à primeira. Foi direto para a prateleira.",
      },
      {
        title: "Comprávamos outra vez para a loja",
        body: "Nada em falta, plásticos sem cheiro estranho. O cliente ficou contente e nós também. Cinco estrelas.",
      },
      {
        title: "SKU limpo para ter em stock",
        body: "Etiqueta legível, código de barras leu. Parece básico até se lutar com um saco sem referência. Este está organizado.",
      },
    ],
  },
};

export function buildProductReviews(
  seed: string,
  productName: string,
  lang: "en" | "pt",
): { rating: 5; count: number; items: ProductReview[] } {
  const h = hashSeed(`${seed}::${productName}`);
  const kind = kindFromName(productName);
  const pool = COPY[kind][lang];
  const count = 36 + (h % 48);
  const months = lang === "pt" ? MONTHS_PT : MONTHS_EN;
  const items: ProductReview[] = [];
  const usedNames = new Set<string>();
  for (let i = 0; i < 6; i += 1) {
    const copy = pick(pool, h, i + 3);
    let name = pick(NAMES, h, i * 5 + 1);
    let guard = 0;
    while (usedNames.has(name) && guard < NAMES.length) {
      name = pick(NAMES, h, i * 5 + 1 + guard);
      guard += 1;
    }
    usedNames.add(name);
    const day = 1 + ((h >> (i + 2)) % 27);
    const month = pick(months, h, i + 9);
    items.push({
      id: `${seed}-${i}`,
      name,
      city: pick(CITIES, h, i + 11),
      date: `${day} ${month} 2026`,
      title: copy.title,
      body: copy.body,
      rating: 5,
    });
  }
  return { rating: 5, count, items };
}
