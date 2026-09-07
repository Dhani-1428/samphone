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
];

const LEGAL_ALIASES: Record<string, string> = {
  "/terms": "/terms-conditions",
  "/privacy": "/privacy-policy",
  "/privacy-policy-and-data-protection": "/privacy-policy",
  "/refunds": "/refund-return-policy",
  "/shipping": "/shipping-policy",
};

export function legalPageByPath(path: string): LegalDoc | undefined {
  const clean = (path.replace(/\/$/, "") || "/").toLowerCase();
  const canonical = LEGAL_ALIASES[clean] ?? clean;
  return LEGAL_PAGES.find((p) => p.path === canonical || `/${p.slug}` === canonical);
}
