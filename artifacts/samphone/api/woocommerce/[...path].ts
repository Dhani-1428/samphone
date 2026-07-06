import type { VercelRequest, VercelResponse } from "@vercel/node";
import { handleWooCommerceProxy } from "../_lib/woocommerce-proxy";

export default async function handler(req: VercelRequest, res: VercelResponse): Promise<void> {
  await handleWooCommerceProxy(req, res);
}
