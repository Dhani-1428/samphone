/** Legal copy taken from the live samphone.pt WordPress pages (April 2026 snapshot). */

export type LegalBlock =
  | { type: "p"; text: string }
  | { type: "h"; text: string }
  | { type: "ul"; items: string[] };

export type LegalDoc = {
  slug: string;
  path: string;
  eyebrowEn: string;
  eyebrowPt: string;
  titleEn: string;
  titlePt: string;
  descriptionEn: string;
  descriptionPt: string;
  blocks: LegalBlock[];
};

export const LEGAL_PAGES: LegalDoc[] = [
  {
    slug: "terms",
    path: "/terms-conditions",
    eyebrowEn: "Home / Terms",
    eyebrowPt: "Início / Termos",
    titleEn: "Terms & conditions",
    titlePt: "Termos e condições",
    descriptionEn: "Please read these terms before using Samphone.",
    descriptionPt: "Leia estes termos antes de utilizar a Samphone.",
    blocks: [
      {
        type: "p",
        text: "Welcome to Samphone.pt, we are committed to protecting your privacy and ensuring the security of your personal data. This Privacy Policy explains how we collect, use, disclose, and safeguard your information when you visit our website samphone.pt or purchase our products, including mobile parts, mobile accessories, and smartphones.",
      },
      {
        type: "p",
        text: "By using our website, you agree to the terms of this Privacy Policy. If you do not agree, please do not access or use our website.",
      },
      { type: "h", text: "1. Information We Collect" },
      { type: "p", text: "We may collect the following types of personal data:" },
      {
        type: "ul",
        items: [
          "Personal Identification Information: Name, email address, phone number, shipping address, and billing address.",
          "Payment Information: Credit/debit card details, PayPal information, or other payment details (processed securely by third-party payment processors).",
          "Technical Data: IP address, browser type, operating system, device information, and browsing behavior on our website.",
          "Cookies and Tracking Data: Information collected via cookies, web beacons, and similar technologies to enhance your user experience.",
        ],
      },
      { type: "h", text: "2. How We Use Your Information" },
      { type: "p", text: "We use your personal data for the following purposes:" },
      {
        type: "ul",
        items: [
          "To process and fulfill your orders for mobile parts, accessories, and smartphones.",
          "To communicate with you about your orders, account, or inquiries.",
          "To improve our website, products, and services.",
          "To send promotional offers, newsletters, and updates (only with your consent).",
          "To comply with legal obligations and protect against fraudulent activities.",
        ],
      },
      { type: "h", text: "3. Legal Basis for Processing" },
      {
        type: "p",
        text: "Under the GDPR and LPDP, we process your personal data based on the following legal grounds:",
      },
      {
        type: "ul",
        items: [
          "Performance of a Contract: To fulfill orders and provide the products you purchase.",
          "Consent: For marketing communications and cookies (you may withdraw consent at any time).",
          "Legitimate Interests: To improve our services and prevent fraud.",
          "Legal Obligations: To comply with applicable laws and regulations.",
        ],
      },
      { type: "h", text: "4. Sharing Your Information" },
      { type: "p", text: "We may share your personal data with:" },
      {
        type: "ul",
        items: [
          "Service Providers: Payment processors, shipping companies, and IT service providers.",
          "Legal Authorities: When required by law or to protect our rights and safety.",
          "Business Transfers: In the event of a merger, acquisition, or sale of assets.",
        ],
      },
      {
        type: "p",
        text: "We do not sell or rent your personal data to third parties for marketing purposes.",
      },
      { type: "h", text: "5. Data Retention" },
      {
        type: "p",
        text: "We retain your personal data only for as long as necessary to fulfill the purposes outlined in this Privacy Policy or as required by law. For example:",
      },
      {
        type: "ul",
        items: [
          "Order information is retained for 2 days to comply with tax and accounting regulations.",
          "Marketing data is retained until you withdraw your consent or opt out.",
        ],
      },
      { type: "h", text: "6. Your Rights Under GDPR and LPDP" },
      { type: "p", text: "As a data subject in Portugal, you have the following rights:" },
      {
        type: "ul",
        items: [
          "Access: Request a copy of your personal data.",
          "Rectification: Correct inaccurate or incomplete data.",
          "Erasure: Request deletion of your data under certain conditions.",
          "Restriction: Limit the processing of your data.",
          "Portability: Receive your data in a structured, commonly used format.",
          "Objection: Object to processing based on legitimate interests or for direct marketing.",
          "Withdraw Consent: Withdraw consent for marketing communications at any time.",
        ],
      },
      {
        type: "p",
        text: "To exercise these rights, please contact us at samphone.pt@gmail.com.",
      },
      { type: "h", text: "7. International Data Transfers" },
      {
        type: "p",
        text: "If we transfer your data outside the European Economic Area (EEA), we will ensure adequate protection measures are in place, such as Standard Contractual Clauses (SCCs).",
      },
      { type: "h", text: "8. Data Security" },
      {
        type: "p",
        text: "We implement technical and organizational measures to protect your personal data from unauthorized access, loss, or misuse. However, no method of transmission over the internet is 100% secure.",
      },
      { type: "h", text: "9. Changes to This Privacy Policy" },
      {
        type: "p",
        text: "We may update this Privacy Policy periodically. Any changes will be posted on this page with an updated revision date.",
      },
      { type: "h", text: "10. Contact Us" },
      {
        type: "p",
        text: "If you have any questions or concerns about this Privacy Policy or your personal data, please contact us at:",
      },
      {
        type: "ul",
        items: [
          "SAMPHONE",
          "Email: samphone.pt@gmail.com",
          "Address: R. da Palma N.221–223, 1100-391 Lisbon",
          "Phone: +351 937 119 295",
        ],
      },
    ],
  },
  {
    slug: "privacy",
    path: "/privacy-policy",
    eyebrowEn: "Home / Privacy",
    eyebrowPt: "Início / Privacidade",
    titleEn: "Privacy policy",
    titlePt: "Política de privacidade",
    descriptionEn: "How Samphone collects, uses, and protects your personal data.",
    descriptionPt: "Como a Samphone recolhe, utiliza e protege os seus dados pessoais.",
    blocks: [
      {
        type: "p",
        text: "Welcome to Samphone.pt, we are committed to protecting your privacy and ensuring the security of your personal data. This Privacy Policy explains how we collect, use, disclose, and safeguard your information when you visit our website samphone.pt or purchase our products, including mobile parts, mobile accessories, and smartphones.",
      },
      {
        type: "p",
        text: "By using our website, you agree to the terms of this Privacy Policy. If you do not agree, please do not access or use our website.",
      },
      { type: "h", text: "1. Information We Collect" },
      { type: "p", text: "We may collect the following types of personal data:" },
      {
        type: "ul",
        items: [
          "Personal Identification Information: Name, email address, phone number, shipping address, and billing address.",
          "Payment Information: Bank account details, or other payment details (processed securely by third-party payment processors).",
          "Technical Data: IP address, browser type, operating system, device information, and browsing behavior on our website.",
          "Cookies and Tracking Data: Information collected via cookies, web beacons, and similar technologies to enhance your user experience.",
        ],
      },
      { type: "h", text: "2. How We Use Your Information" },
      { type: "p", text: "We use your personal data for the following purposes:" },
      {
        type: "ul",
        items: [
          "To process and fulfill your orders for mobile parts, accessories, and smartphones.",
          "To communicate with you about your orders, account, or inquiries.",
          "To improve our website, products, and services.",
          "To send promotional offers, newsletters, and updates (only with your consent).",
          "To comply with legal obligations and protect against fraudulent activities.",
        ],
      },
      { type: "h", text: "3. Legal Basis for Processing" },
      {
        type: "p",
        text: "Under the GDPR and LPDP, we process your personal data based on the following legal grounds:",
      },
      {
        type: "ul",
        items: [
          "Performance of a Contract: To fulfill orders and provide the products you purchase.",
          "Consent: For marketing communications and cookies (you may withdraw consent at any time).",
          "Legitimate Interests: To improve our services and prevent fraud.",
          "Legal Obligations: To comply with applicable laws and regulations.",
        ],
      },
      { type: "h", text: "4. Sharing Your Information" },
      { type: "p", text: "We may share your personal data with:" },
      {
        type: "ul",
        items: [
          "Service Providers: Payment processors, shipping companies, and IT service providers.",
          "Legal Authorities: When required by law or to protect our rights and safety.",
          "Business Transfers: In the event of a merger, acquisition, or sale of assets.",
        ],
      },
      {
        type: "p",
        text: "We do not sell or rent your personal data to third parties for marketing purposes.",
      },
      { type: "h", text: "5. Data Retention" },
      {
        type: "p",
        text: "We retain your personal data only for as long as necessary to fulfill the purposes outlined in this Privacy Policy or as required by law. For example:",
      },
      {
        type: "ul",
        items: [
          "Order information is retained for few days to comply with tax and accounting regulations.",
          "Marketing data is retained until you withdraw your consent or opt out.",
        ],
      },
      { type: "h", text: "6. Your Rights Under GDPR and LPDP" },
      { type: "p", text: "As a data subject in Portugal, you have the following rights:" },
      {
        type: "ul",
        items: [
          "Access: Request a copy of your personal data.",
          "Rectification: Correct inaccurate or incomplete data.",
          "Erasure: Request deletion of your data under certain conditions.",
          "Restriction: Limit the processing of your data.",
          "Portability: Receive your data in a structured, commonly used format.",
          "Objection: Object to processing based on legitimate interests or for direct marketing.",
          "Withdraw Consent: Withdraw consent for marketing communications at any time.",
        ],
      },
      {
        type: "p",
        text: "To exercise these rights, please contact us at samphone.pt@gmail.com.",
      },
      { type: "h", text: "7. International Data Transfers" },
      {
        type: "p",
        text: "If we transfer your data outside the European Economic Area (EEA), we will ensure adequate protection measures are in place, such as Standard Contractual Clauses (SCCs).",
      },
      { type: "h", text: "8. Data Security" },
      {
        type: "p",
        text: "We implement technical and organizational measures to protect your personal data from unauthorized access, loss, or misuse. However, no method of transmission over the internet is 100% secure.",
      },
      { type: "h", text: "9. Changes to This Privacy Policy" },
      {
        type: "p",
        text: "We may update this Privacy Policy periodically. Any changes will be posted on this page with an updated revision date.",
      },
      { type: "h", text: "10. Contact Us" },
      {
        type: "p",
        text: "If you have any questions or concerns about this Privacy Policy or your personal data, please contact us at:",
      },
      {
        type: "ul",
        items: [
          "SAMPHONE",
          "Email: samphone.pt@gmail.com",
          "Address: R. da Palma N.221–223, 1100-391 Lisbon",
          "Phone: +351 937 119 295",
        ],
      },
    ],
  },
  {
    slug: "refunds",
    path: "/refund-return-policy",
    eyebrowEn: "Home / Refunds",
    eyebrowPt: "Início / Reembolsos",
    titleEn: "Refund and return policy",
    titlePt: "Política de reembolso e devolução",
    descriptionEn: "How to return an order and request a refund.",
    descriptionPt: "Como devolver uma encomenda e pedir reembolso.",
    blocks: [
      {
        type: "p",
        text: "At samphone.pt, we strive to ensure your complete satisfaction with every purchase. If you are not entirely happy with your order, we offer a straightforward refund and return process. Please read this policy carefully to understand your rights and obligations.",
      },
      { type: "h", text: "1. Eligibility for Returns" },
      { type: "p", text: "1.1. To be eligible for a return, the item must be:" },
      {
        type: "ul",
        items: [
          "Unused, in its original condition, and in the original packaging.",
          "Accompanied by a valid proof of purchase (e.g., order number or receipt).",
        ],
      },
      { type: "p", text: "1.2. The following items are not eligible for return:" },
      {
        type: "ul",
        items: [
          "Products that have been used, damaged, or altered.",
          "Items without original packaging or tags.",
          "Products purchased more than 15 days ago.",
        ],
      },
      { type: "h", text: "2. How to Initiate a Return" },
      { type: "p", text: "2.1. To initiate a return, please follow these steps:" },
      {
        type: "ul",
        items: [
          "Contact our customer support team at samphone.pt@gmail.com or +351 937 119 295 within 15 days of receiving your order.",
          "Provide your order number, the reason for the return, and any supporting photos if applicable.",
          "Once your return request is approved, you will receive instructions on how to return the item.",
        ],
      },
      { type: "p", text: "2.2. Return Shipping:" },
      {
        type: "ul",
        items: [
          "Customers are responsible for return shipping costs unless the return is due to an error on our part (e.g., wrong item shipped or defective product).",
          "We recommend using a trackable shipping method to ensure your return is received.",
        ],
      },
      { type: "h", text: "3. Refund Process" },
      {
        type: "p",
        text: "3.1. Once we receive and inspect your returned item, we will notify you of the status of your refund.",
      },
      {
        type: "p",
        text: "3.2. If your return is approved, your refund will be processed within 2 days.",
      },
      {
        type: "p",
        text: "3.3. Refunds will be issued to the original payment method used for the purchase. Please note that it may take additional time for the refund to appear in your account, depending on your bank or payment provider.",
      },
      { type: "h", text: "4. Exchanges" },
      {
        type: "p",
        text: "4.1. If you need to exchange an item for a different size, color, or model, please contact our customer support team.",
      },
      {
        type: "p",
        text: "4.2. Exchanges are subject to product availability. If the desired item is not available, we will issue a refund instead.",
      },
      { type: "h", text: "5. Damaged or Defective Items" },
      {
        type: "p",
        text: "5.1. If you receive a damaged or defective item, please contact us immediately at samphone.pt@gmail.com or +351 937 119 295.",
      },
      {
        type: "p",
        text: "5.2. We may request photos or a detailed description of the issue to assist with your claim.",
      },
      {
        type: "p",
        text: "5.3. If the claim is approved, we will provide a prepaid return label and either replace the item or issue a full refund.",
      },
      { type: "h", text: "6. Non-Returnable Items" },
      { type: "p", text: "6.1. The following items are non-returnable:" },
      {
        type: "ul",
        items: ['Products marked as “final sale” or “non-returnable” at the time of purchase.'],
      },
      { type: "h", text: "7. Cancellations" },
      {
        type: "p",
        text: "7.1. If you wish to cancel your order, please contact us as soon as possible.",
      },
      {
        type: "p",
        text: "7.2. Orders that have already been shipped cannot be cancelled but may be returned under this policy once received.",
      },
      { type: "h", text: "8. Contact Us" },
      {
        type: "p",
        text: "If you have any questions about our Refund and Return Policy, please contact us at:",
      },
      {
        type: "ul",
        items: [
          "Email: samphone.pt@gmail.com",
          "Phone: +351 937 119 295",
          "Address: R. da Palma N.221–223, 1100-391 Lisbon",
        ],
      },
    ],
  },
  {
    slug: "shipping",
    path: "/shipping-policy",
    eyebrowEn: "Home / Shipping",
    eyebrowPt: "Início / Envio",
    titleEn: "Shipping policy",
    titlePt: "Política de envio",
    descriptionEn: "Delivery times, costs, and tracking for Samphone orders.",
    descriptionPt: "Prazos, custos e tracking das encomendas Samphone.",
    blocks: [
      {
        type: "p",
        text: "At samphone.pt, we are committed to delivering your orders quickly and efficiently. This Shipping Policy outlines the details of our shipping process, including delivery times, costs, and other important information. Please read this policy carefully before placing your order.",
      },
      { type: "h", text: "1. Shipping Locations" },
      { type: "p", text: "1.1. We currently ship within Portugal." },
      { type: "h", text: "2. Processing Time" },
      {
        type: "p",
        text: "2.1. Orders are processed within the same day after payment is confirmed.",
      },
      {
        type: "p",
        text: "2.2. Processing times may be longer during holidays, promotions, or periods of high order volume.",
      },
      { type: "h", text: "3. Shipping Methods and Costs" },
      {
        type: "p",
        text: "3.1. We offer the standard shipping option which delivers the order the very next day.",
      },
      { type: "p", text: "3.2. Shipping costs would be 4.90€." },
      { type: "h", text: "4. Delivery Times" },
      { type: "p", text: "4.1. Estimated delivery times depend on your location." },
      {
        type: "p",
        text: "4.2. Delivery times are provided by our shipping partners and are not guaranteed by samphone.pt.",
      },
      {
        type: "p",
        text: "4.3. Delays may occur due to unforeseen circumstances such as customs clearance, weather conditions, or carrier delays.",
      },
      { type: "h", text: "5. Order Tracking" },
      {
        type: "p",
        text: "5.1. Once your order has been shipped, you will receive a confirmation email with a tracking number.",
      },
      {
        type: "p",
        text: "5.2. Use the tracking number to monitor the status of your delivery through the carrier’s website.",
      },
      { type: "h", text: "6. Incorrect or Incomplete Addresses" },
      {
        type: "p",
        text: "6.1. Please ensure that your shipping address is accurate and complete before placing your order.",
      },
      {
        type: "p",
        text: "6.2. If an order is returned to us due to an incorrect or incomplete address, you will be responsible for the cost of reshipping.",
      },
      { type: "h", text: "7. Lost or Stolen Packages" },
      {
        type: "p",
        text: "7.1. If your tracking information indicates that your package was delivered but you have not received it, please contact your local post office or carrier first.",
      },
      {
        type: "p",
        text: "7.2. If the package cannot be located, contact us at samphone.pt@gmail.com within 2 days of the reported delivery date, and we will assist you in resolving the issue.",
      },
      { type: "h", text: "8. Shipping Restrictions" },
      {
        type: "p",
        text: "8.1. Some products may have shipping restrictions due to size, weight, or regulatory requirements.",
      },
      {
        type: "p",
        text: "8.2. If your order includes restricted items, we will notify you and provide alternative solutions.",
      },
      { type: "h", text: "9. Contact Us" },
      {
        type: "p",
        text: "If you have any questions about our Shipping Policy, please contact us at:",
      },
      {
        type: "ul",
        items: [
          "Email: samphone.pt@gmail.com",
          "Phone: +351 937 119 295",
          "Address: R. da Palma N.221–223, 1100-391 Lisbon",
        ],
      },
      {
        type: "p",
        text: "Thank you for choosing samphone.pt. We appreciate your trust and look forward to serving you with fast and reliable shipping.",
      },
    ],
  },
  {
    slug: "cookie-policy",
    path: "/cookie-policy",
    eyebrowEn: "Home / Cookies",
    eyebrowPt: "Início / Cookies",
    titleEn: "Cookie policy",
    titlePt: "Política de cookies",
    descriptionEn:
      "This page describes cookies and similar technologies actually used on this Samphone.eu storefront. It is an informational draft — have it reviewed by a qualified Portuguese/EU professional before relying on it as legal advice.",
    descriptionPt:
      "Esta página descreve cookies e tecnologias semelhantes realmente usadas nesta loja Samphone.eu. É um rascunho informativo — deve ser revisto por um profissional qualificado em Portugal/UE.",
    blocks: [
      {
        type: "p",
        text: "This website is a React storefront (samphone.eu) that talks to Samphone Cloud / WooCommerce APIs. We did not find Google Analytics, Google Tag Manager, Meta Pixel, Google Ads, or similar advertising pixels in this codebase. Optional analytics/marketing categories in the consent banner are stored for a future tool — they do not currently load extra tracking scripts.",
      },
      { type: "h", text: "Necessary" },
      {
        type: "ul",
        items: [
          "samphone_cookie_consent_v1 (localStorage) — stores your cookie preference, categories, timestamp, and policy version.",
          "samphone-lang (localStorage) — language.",
          "samphone-theme / similar theme keys — display preference.",
          "samphone-cart-items-v1 — shopping cart.",
          "samphone-orders — local order tracking fallback.",
          "samphone-api-jwt (session/local storage) — API session after login.",
          "Clerk authentication cookies/storage — sign-in session (clerk.samphone.cloud) when Clerk is enabled.",
          "Stripe — payment fields and checkout are processed by Stripe; card numbers are not stored on this website.",
        ],
      },
      { type: "h", text: "Preferences / analytics / marketing" },
      {
        type: "p",
        text: "No first-party analytics or marketing pixels are installed in this project at the time this page was written. If those tools are added later, they must only load after the matching consent category is accepted.",
      },
      { type: "h", text: "Change your choice" },
      {
        type: "p",
        text: "Use Cookie Settings in the footer at any time. Consent is stored locally in your browser (status, categories, timestamp, version). We do not send that record to an extra logging server from this storefront.",
      },
    ],
  },
  {
    slug: "warranty",
    path: "/warranty",
    eyebrowEn: "Home / Warranty",
    eyebrowPt: "Início / Garantia",
    titleEn: "Warranty & legal guarantee",
    titlePt: "Garantia e garantia legal",
    descriptionEn:
      "Draft information only. Consumer guarantee periods and remedies under Portuguese/EU law must be confirmed by a qualified lawyer. This page does not add extra commercial warranty months unless they are written on a specific product.",
    descriptionPt:
      "Informação em rascunho. Prazos e direitos da garantia legal em Portugal/UE devem ser confirmados por um jurista. Esta página não acrescenta meses de garantia comercial extra, salvo se constarem no produto.",
    blocks: [
      { type: "h", text: "B2C — consumers" },
      {
        type: "p",
        text: "If you buy as a consumer, Portuguese and EU rules on legal conformity (legal guarantee) may apply to the goods. Those rights do not depend on this website’s marketing copy. Keep your proof of purchase. Contact us with the order number, product, and a description of the defect.",
      },
      { type: "h", text: "Commercial warranty" },
      {
        type: "p",
        text: "Any extra commercial warranty applies only if it is stated on the product, packing, or a written confirmation from Samphone. Do not assume a duration that is not written there.",
      },
      { type: "h", text: "B2B — businesses" },
      {
        type: "p",
        text: "Purchases as a business/wholesale customer are not automatically covered by the same consumer rules. Defective or non-conforming goods should be reported promptly with photos and the invoice/order number. Remedies follow the order terms and applicable commercial law — not consumer withdrawal rules.",
      },
      { type: "h", text: "How to claim" },
      {
        type: "ul",
        items: [
          "Email samphone.pt@gmail.com or use the contact form.",
          "Include order number, SKU if known, and photos.",
          "We may ask you to return the item for inspection. Return shipping for warranty claims is confirmed case by case.",
        ],
      },
    ],
  },
  {
    slug: "legal-information",
    path: "/legal-information",
    eyebrowEn: "Home / Legal information",
    eyebrowPt: "Início / Informação legal",
    titleEn: "Legal information",
    titlePt: "Informação legal",
    descriptionEn: "Company details taken from this project. Fields marked [TO FILL] are not in the codebase — do not treat placeholders as official registry data.",
    descriptionPt: "Dados da empresa obtidos neste projeto. Campos [A PREENCHER] não estão no código — não os trate como dados oficiais de registo.",
    blocks: [
      { type: "h", text: "Trader information on this website" },
      {
        type: "ul",
        items: [
          "Trading name: SAMPHONE / Samphone.eu",
          "Store address (as published in this project): Rua da Palma N.221-223, 1100-391 Lisboa, Portugal",
          "Email: samphone.pt@gmail.com",
          "Telephone: +351 937 119 295",
          "Legal company name: [TO FILL]",
          "VAT / NIF: [TO FILL]",
          "Company registration / CRC: [TO FILL]",
          "Share capital (if required on invoices): [TO FILL]",
        ],
      },
      {
        type: "p",
        text: "These pages are storefront copy. Final legal identity, VAT number, and registrations must match official Portuguese filings and invoices.",
      },
    ],
  },
  {
    slug: "complaints",
    path: "/complaints",
    eyebrowEn: "Home / Complaints",
    eyebrowPt: "Início / Reclamações",
    titleEn: "Complaints and consumer disputes",
    titlePt: "Reclamações e resolução de conflitos",
    descriptionEn:
      "Informational summary for consumers in Portugal. Confirm ADR adhesion and any mandatory notices with a Portuguese lawyer. We do not invent an adhesion protocol that is not recorded in this project.",
    descriptionPt:
      "Resumo informativo para consumidores em Portugal. Confirme a adesão a RAL e avisos obrigatórios com um jurista. Não inventamos um protocolo de adesão que não conste neste projeto.",
    blocks: [
      { type: "h", text: "1. Contact us first" },
      {
        type: "p",
        text: "Please write to samphone.pt@gmail.com or use the Contact page with your order number. Many issues can be resolved directly with the store.",
      },
      { type: "h", text: "2. Electronic complaints book (Livro de Reclamações)" },
      {
        type: "p",
        text: "In Portugal, consumers can use the official electronic complaints book: https://www.livroreclamacoes.pt/Inicio . Physical books may also be available at the shop in Lisbon where required.",
      },
      { type: "h", text: "3. Alternative dispute resolution (ADR / RAL)" },
      {
        type: "p",
        text: "Portuguese law (including Law 144/2015) provides a framework for out-of-court consumer dispute resolution. Official orientation: https://www2.gov.pt/en/fichas-de-enquadramento/resolucao-de-conflitos-de-consumo",
      },
      {
        type: "p",
        text: "This codebase does not record whether Samphone has adhered to a specific arbitration centre. Consumers in Lisbon may contact the Lisbon Consumer Conflict Arbitration Centre (https://www.centroarbitragemlisboa.pt) and can seek national information via CNIACC (https://www.cniacc.pt). The competent centre depends on the dispute and the trader’s adhesion — confirm before filing.",
      },
      { type: "h", text: "4. B2B" },
      {
        type: "p",
        text: "Business-to-business disputes are not consumer ADR cases. Use the contact details above and the B2B terms.",
      },
    ],
  },
  {
    slug: "b2b-terms",
    path: "/b2b-terms",
    eyebrowEn: "Home / B2B terms",
    eyebrowPt: "Início / Termos B2B",
    titleEn: "B2B / wholesale terms (draft)",
    titlePt: "Termos B2B / grossista (rascunho)",
    descriptionEn:
      "Draft commercial terms for business accounts. This is not legal advice and must be reviewed before use as a binding contract.",
    descriptionPt:
      "Rascunho de condições comerciais para contas empresariais. Não constitui aconselhamento jurídico e deve ser revisto antes de ser usado como contrato.",
    blocks: [
      {
        type: "p",
        text: "Wholesale prices on this website are shown only after a business account is approved. Guests and B2C customers see retail prices. Pending, rejected, or suspended B2B accounts keep retail pricing until status changes.",
      },
      { type: "h", text: "Account" },
      {
        type: "ul",
        items: [
          "Apply via Create B2B account. Approval is decided by Samphone staff in the existing admin tools.",
          "You must provide accurate company, VAT/NIF, and contact data.",
          "Login is required to add products to the cart and to check out.",
        ],
      },
      { type: "h", text: "Orders and VAT" },
      {
        type: "p",
        text: "Invoices, VAT treatment (including possible intra-EU B2B rules), and credit terms follow the tax configuration of the shop and the data you provide at checkout. This website does not invent reverse-charge or exemption rules. Ask your accountant if you need a specific VAT setup.",
      },
      { type: "h", text: "Returns" },
      {
        type: "p",
        text: "Consumer withdrawal rights generally do not apply to B2B purchases in the same way as B2C. Returns of wholesale goods are handled as commercial claims (wrong item, defect, shortage) as described in the returns policy.",
      },
    ],
  },
];

const LEGAL_ALIASES: Record<string, string> = {
  "/terms": "/terms-conditions",
  "/terms-and-conditions": "/terms-conditions",
  "/privacy": "/privacy-policy",
  "/privacy-policy-and-data-protection": "/privacy-policy",
  "/refunds": "/refund-return-policy",
  "/returns": "/refund-return-policy",
  "/shipping": "/shipping-policy",
  "/cookies": "/cookie-policy",
  "/legal": "/legal-information",
  "/adr": "/complaints",
};

export function legalPageByPath(path: string): LegalDoc | undefined {
  const clean = (path.replace(/\/$/, "") || "/").toLowerCase();
  const canonical = LEGAL_ALIASES[clean] ?? clean;
  return LEGAL_PAGES.find((p) => p.path === canonical || `/${p.slug}` === canonical);
}
