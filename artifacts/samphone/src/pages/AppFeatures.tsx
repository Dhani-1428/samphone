import PageVideoHero from "@/components/PageVideoHero";
import { useLang } from "@/contexts/LanguageContext";
import { STORE_ADDRESS, STORE_EMAIL, STORE_PHONE } from "@/config/samphone";

type Section = { title: string; intro?: string; items: string[] };

const COPY = {
  en: {
    eyebrow: "Home / App",
    title: "What’s in the Samphone app",
    description:
      "The Samphone app is the mobile shop for phone parts and accessories in Portugal. Same catalog as samphone.pt, with login, prices, cart, and checkout built for customers and repair businesses.",
    websiteNote:
      "samphone.pt is the same store in the browser, with extra tools such as compare, trade-in, book a repair, and device diagnostics.",
    sections: [
      {
        title: "Shopping",
        items: [
          "Home storefront with promotional banners, featured brands, accessory categories, Best Sellers, and New Arrivals",
          "Product collections: silicon covers, MagSafe covers, full-glue glass, chargers, cables, headphones, powerbanks, speakers",
          "Recently viewed products",
          "Shop by brand — Apple, Samsung, Xiaomi, Oppo, Realme, Huawei, OnePlus, Motorola, Alcatel, TCL, ZTE, Vivo, Nokia, Google Pixel, LG, plus repair tools",
          "Parts by phone model — screens / LCD, batteries, back glass, front and rear cameras, charging-port flex, speakers / earpiece, vibrator, SIM tray, side-button flex",
          "Accessories by category: Powerbanks; Chargers (adapters, Lightning, USB-C, Micro-USB, wireless); Cables (Lightning, USB-C, Micro, Ethernet, HDMI); Headphones, earphones, wireless headsets, neck earphones; Speakers; Smartwatches and watch accessories; Car holders and car chargers; Laptop / PC (chargers, keyboards, mice, hubs, holders, storage, cables, tools); Microphones and audio cables; Fans, Hoco beauty care, AA/AAA cells; Original accessories; SIM and memory cards; Repairing tools",
          "Search by name, brand, model, or category",
          "Voice search — speak what you need (works across languages)",
          "Filters by brand, category, model, and price",
          "Side menu to browse the full catalog quickly",
        ],
      },
      {
        title: "Product pages",
        items: [
          "Multiple photos and colour variants",
          "Price, stock status, and specifications",
          "Add to cart, choose quantity, or buy now",
          "Save to wishlist",
          "Share a product",
          "Notify me when an out-of-stock item is back",
          "Related products, similar parts, and matching accessories",
        ],
      },
      {
        title: "Cart and checkout",
        items: [
          "Cart with quantity changes and item removal",
          "Cart saved to your account when you are logged in",
          "Checkout with name, phone, and delivery address",
          "Shipping: home delivery (mainland Portugal), store pickup in Lisboa (R. da Palma N.221–223), business delivery",
          "Payment: card (Visa, Mastercard, American Express), Apple Pay and Google Pay, MB WAY, Multibanco, cash on delivery, pay in store",
          "Secure checkout (Stripe)",
          "Order confirmation on screen and by email",
        ],
      },
      {
        title: "Orders",
        items: [
          "Order history",
          "Track an order (placed → processing → shipped → out for delivery → delivered)",
          "Store-pickup tracking (ready for pickup → collected)",
          "Cancel an order",
          "Reorder from past purchases",
          "Order confirmation and cancellation emails",
        ],
      },
      {
        title: "Account",
        items: [
          "Create a personal or business account",
          "Log in with email, verification code, or Google / social login",
          "Existing website customers can use the same account",
          "Profile, delivery addresses, language, and notification settings",
          "Payment-methods overview",
          "Help, FAQs, about Samphone, privacy and terms",
          "Download my data / delete my account (GDPR)",
          "Log out",
        ],
      },
      {
        title: "Business (B2B / wholesale)",
        items: [
          "Apply with company name, VAT / NIF, address, and business type (Personal B2C accounts are ready immediately with retail prices)",
          "Status: pending, approved, rejected, or suspended — pending/rejected/suspended stay on public prices",
          "Approve in Admin → Wholesale; emails go out from samphone.cloud (not WordPress)",
          "Approved accounts see wholesale / API prices; public retail is still stored for admin toggle",
          "Dealer tiers (extra % off wholesale): Bronze 10%, Standard 12%, Silver 15%, Gold 18%, Platinum 22%",
          "Extra customer-specific discounts when assigned by Samphone",
          "Personal shoppers see normal retail prices",
        ],
      },
      {
        title: "Languages and appearance",
        items: [
          "Portuguese (Portugal), English, French, Spanish, Dutch, Hindi, Punjabi, Urdu",
          "Product names and descriptions translated; brand names stay in English",
          "Light and dark mode",
        ],
      },
      {
        title: "Notifications and support",
        items: [
          "Push notifications for order updates and optional offers",
          "Email alerts (orders, stock, abandoned cart)",
          "Help & support: FAQs, contact, store hours",
          "Track order, returns/refunds, B2B application, warranty claim",
          "Trust messages: original products, nationwide delivery, warranty, support",
          "Links to privacy, terms, refunds, shipping policy, and Livro de Reclamações",
          `Store: Lisboa · ${STORE_ADDRESS}`,
          `Email: ${STORE_EMAIL} · Phone: ${STORE_PHONE}`,
        ],
      },
      {
        title: "Also on samphone.pt",
        intro: "The website includes everything you shop for in the app, plus:",
        items: [
          "Compare up to three products",
          "Trade-in estimate for your current device",
          "Book a repair in Lisboa",
          "Device diagnostics guidance",
          "360° product view on selected items",
          "Login to see price (retail and wholesale by account type)",
        ],
      },
    ] satisfies Section[],
  },
  pt: {
    eyebrow: "Início / App",
    title: "O que tem na app Samphone",
    description:
      "A app Samphone é a loja móvel de peças e acessórios em Portugal. O mesmo catálogo de samphone.pt, com login, preços, carrinho e checkout para clientes e oficinas.",
    websiteNote:
      "samphone.pt é a mesma loja no browser, com ferramentas extra como comparar, trade-in, marcar reparação e diagnóstico.",
    sections: [
      {
        title: "Compras",
        items: [
          "Página inicial com banners, marcas, categorias de acessórios, Mais vendidos e Novidades",
          "Coleções: capas silicon, MagSafe, vidro full glue, carregadores, cabos, auscultadores, powerbanks, colunas",
          "Produtos vistos recentemente",
          "Comprar por marca — Apple, Samsung, Xiaomi, Oppo, Realme, Huawei, OnePlus, Motorola, Alcatel, TCL, ZTE, Vivo, Nokia, Google Pixel, LG, e ferramentas de reparação",
          "Peças por modelo — ecrãs / LCD, baterias, vidro traseiro, câmaras, flex de carga, altifalantes / auricular, vibrador, tabuleiro SIM, flex de botões",
          "Acessórios por categoria: Powerbanks; Carregadores (adaptadores, Lightning, USB-C, Micro-USB, wireless); Cabos (Lightning, USB-C, Micro, Ethernet, HDMI); Auscultadores e headsets; Colunas; Smartwatches; Suportes e carregadores de carro; Portátil / PC; Microfones; Ventoinhas, Hoco beauty care, pilhas AA/AAA; Acessórios originais; Cartões SIM e memória; Ferramentas de reparação",
          "Pesquisa por nome, marca, modelo ou categoria",
          "Pesquisa por voz — diga o que precisa (vários idiomas)",
          "Filtros por marca, categoria, modelo e preço",
          "Menu lateral para percorrer o catálogo",
        ],
      },
      {
        title: "Páginas de produto",
        items: [
          "Várias fotos e variantes de cor",
          "Preço, stock e especificações",
          "Adicionar ao carrinho, quantidade ou comprar já",
          "Guardar nos favoritos",
          "Partilhar um produto",
          "Avisar quando um artigo esgotado volta",
          "Produtos relacionados, peças semelhantes e acessórios a condizer",
        ],
      },
      {
        title: "Carrinho e checkout",
        items: [
          "Carrinho com alteração de quantidade e remoção",
          "Carrinho guardado na conta quando está autenticado",
          "Checkout com nome, telefone e morada",
          "Envio: entrega ao domicílio (Portugal continental), levantamento em Lisboa (R. da Palma N.221–223), entrega empresarial",
          "Pagamento: cartão (Visa, Mastercard, American Express), Apple Pay e Google Pay, MB WAY, Multibanco, pagamento na entrega, pagar na loja",
          "Checkout seguro (Stripe)",
          "Confirmação no ecrã e por email",
        ],
      },
      {
        title: "Encomendas",
        items: [
          "Histórico de encomendas",
          "Seguir encomenda (colocada → em processamento → enviada → em distribuição → entregue)",
          "Levantamento em loja (pronta a levantar → recolhida)",
          "Cancelar uma encomenda",
          "Voltar a encomendar",
          "Emails de confirmação e de cancelamento",
        ],
      },
      {
        title: "Conta",
        items: [
          "Criar conta pessoal ou empresarial",
          "Entrar com email, código de verificação ou Google / login social",
          "Clientes do site usam a mesma conta",
          "Perfil, moradas, idioma e notificações",
          "Métodos de pagamento",
          "Ajuda, FAQs, sobre a Samphone, privacidade e termos",
          "Descarregar os meus dados / apagar a conta (RGPD)",
          "Terminar sessão",
        ],
      },
      {
        title: "Empresas (B2B / grossista)",
        items: [
          "Candidatura com nome da empresa, NIF/IVA, morada e tipo de negócio (contas particulares B2C ficam prontas de imediato com preços de retalho)",
          "Estado: pendente, aprovada, rejeitada ou suspensa — pendente/rejeitada/suspensa mantêm preços públicos",
          "Aprovar em Admin → Wholesale; emails saem de samphone.cloud (não do WordPress)",
          "Contas aprovadas veem preços grossista / API; o retalho público fica guardado para o admin",
          "Níveis (extra % sobre o grossista): Bronze 10%, Standard 12%, Silver 15%, Gold 18%, Platinum 22%",
          "Descontos extra atribuídos pela Samphone",
          "Clientes particulares veem preços de retalho",
        ],
      },
      {
        title: "Idiomas e aparência",
        items: [
          "Português (Portugal), inglês, francês, espanhol, neerlandês, hindi, punjabi, urdu",
          "Nomes e descrições traduzidos; marcas ficam em inglês",
          "Modo claro e escuro",
        ],
      },
      {
        title: "Notificações e apoio",
        items: [
          "Notificações push de encomendas e ofertas opcionais",
          "Alertas por email (encomendas, stock, carrinho abandonado)",
          "Ajuda: FAQs, contacto, horário da loja",
          "Seguir encomenda, devoluções, candidatura B2B, garantia",
          "Mensagens de confiança: produtos originais, entrega nacional, garantia, apoio",
          "Ligações a privacidade, termos, reembolsos, envios e Livro de Reclamações",
          `Loja: Lisboa · ${STORE_ADDRESS}`,
          `Email: ${STORE_EMAIL} · Telefone: ${STORE_PHONE}`,
        ],
      },
      {
        title: "Também em samphone.pt",
        intro: "O site tem o mesmo catálogo da app, e ainda:",
        items: [
          "Comparar até três produtos",
          "Estimativa de trade-in",
          "Marcar reparação em Lisboa",
          "Guia de diagnóstico",
          "Vista 360° em produtos selecionados",
          "Login para ver preço (retalho ou grossista conforme a conta)",
        ],
      },
    ] satisfies Section[],
  },
} as const;

export default function AppFeatures() {
  const { lang } = useLang();
  const copy = lang === "pt" ? COPY.pt : COPY.en;

  return (
    <div>
      <PageVideoHero eyebrow={copy.eyebrow} title={copy.title} description={copy.description} />
      <div className="mx-auto w-full max-w-[960px] px-5 py-10 sm:px-8 md:px-10 lg:px-0">
        <p className="mb-10 text-[15px] leading-relaxed text-[#6B7280]">{copy.websiteNote}</p>
        <div className="space-y-10">
          {copy.sections.map((section) => (
            <section key={section.title}>
              <h2 className="font-display text-xl font-extrabold text-[#1A2B48] md:text-2xl">{section.title}</h2>
              {section.intro ? <p className="mt-2 text-[15px] text-[#6B7280]">{section.intro}</p> : null}
              <ul className="mt-4 list-disc space-y-2 pl-5 text-[15px] leading-relaxed text-[#333333]">
                {section.items.map((item) => (
                  <li key={item}>{item}</li>
                ))}
              </ul>
            </section>
          ))}
        </div>
      </div>
    </div>
  );
}
