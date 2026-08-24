/** Rule-based FAQ answers (no external API). */

const FAQ_EN: { keys: string[]; answer: string }[] = [
  {
    keys: ["hours", "open", "when", "schedule", "time"],
    answer:
      "We are open Mon–Sat 10:00–19:30 (Lisbon store). Online orders ship same day if placed before 14:00 on business days.",
  },
  {
    keys: ["ship", "delivery", "portugal", "lisbon", "how long"],
    answer:
      "Standard delivery is typically 2–6 business days in mainland Portugal; Lisbon metro is often faster. Express options are shown at checkout.",
  },
  {
    keys: ["return", "refund", "warranty"],
    answer:
      "Unopened items can be returned within 14 days. Repair parts carry a limited warranty — ask in store or WhatsApp with your order number.",
  },
  {
    keys: ["repair", "fix", "screen", "battery"],
    answer:
      "Book a repair online from the Repairs menu. You’ll get a price estimate before confirming. Same-day service may be available for common models.",
  },
  {
    keys: ["track", "order", "where"],
    answer:
      "Use Track order in the footer with your order ID (e.g. SP-LIS-…). Demo order: SP-DEMO-TRACK.",
  },
  {
    keys: ["trade", "discount", "old phone"],
    answer:
      "Trade-in estimates are on the Trade-in page. You’ll receive a voucher code to apply toward your purchase.",
  },
  {
    keys: ["pay", "payment", "card"],
    answer: "We accept common cards and local payment methods in store; online checkout options are shown when you complete your order.",
  },
];

const FAQ_PT: { keys: string[]; answer: string }[] = [
  {
    keys: ["horário", "aberto", "quando", "tempo"],
    answer:
      "Estamos abertos seg–sáb 10:00–19:30 (loja em Lisboa). Encomendas online enviadas no próprio dia se confirmadas antes das 14:00 em dias úteis.",
  },
  {
    keys: ["envio", "entrega", "portugal", "lisboa", "quanto tempo"],
    answer:
      "Entrega standard: tipicamente 2–6 dias úteis em Portugal continental; Lisboa costuma ser mais rápido. Opções expresso aparecem no checkout.",
  },
  {
    keys: ["devolução", "reembolso", "garantia"],
    answer:
      "Artigos selados podem ser devolvidos em 14 dias. Peças de reparação têm garantia limitada — contacte-nos com o número de encomenda.",
  },
  {
    keys: ["reparação", "ecrã", "bateria", "arranjar"],
    answer:
      "Marque reparação no menu. Recebe uma estimativa de preço antes de confirmar. Serviço no próprio dia pode estar disponível para modelos comuns.",
  },
  {
    keys: ["encomenda", "seguimento", "onde está"],
    answer:
      "Use Acompanhar encomenda no rodapé com o ID (ex.: SP-LIS-…). Demo: SP-DEMO-TRACK.",
  },
  {
    keys: ["troca", "desconto", "telefone antigo"],
    answer:
      "Estimativas de trade-in na página Troca. Recebe um código de voucher para usar na compra.",
  },
  {
    keys: ["pagamento", "cartão", "mb"],
    answer: "Aceitamos cartões e métodos locais na loja; online verá as opções ao finalizar.",
  },
];

export function answerFaq(question: string, lang: string): string {
  const q = question.trim().toLowerCase();
  if (!q) return lang === "pt" ? "Escreva uma pergunta." : "Ask a question about shipping, repairs, or orders.";
  const table = lang === "pt" ? FAQ_PT : FAQ_EN;
  for (const row of table) {
    if (row.keys.some((k) => q.includes(k))) return row.answer;
  }
  return lang === "pt"
    ? "Não encontrei uma resposta exata. Fale connosco no WhatsApp ou peça um contacto telefónico no separador Chamada."
    : "I couldn’t match that to a FAQ. Try WhatsApp or use the Callback tab for a quick call.";
}
