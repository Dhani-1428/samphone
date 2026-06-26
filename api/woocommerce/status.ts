import type { VercelRequest, VercelResponse } from "@vercel/node";
import { isWooConfigured } from "../_lib/woocommerce-config";

export default function handler(req: VercelRequest, res: VercelResponse): void {
  if (req.method !== "GET") {
    res.status(405).json({ error: "Method not allowed" });
    return;
  }
  res.setHeader("Cache-Control", "no-store");
  res.json({ configured: isWooConfigured() });
}
