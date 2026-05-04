/** Deterministic “live” stock per SKU for demo (no backend). */
export function getStockLevel(cartKey: string): { count: number; isLow: boolean } {
  let h = 0;
  for (let i = 0; i < cartKey.length; i++) h = (h * 31 + cartKey.charCodeAt(i)) >>> 0;
  const count = 3 + (h % 118);
  const isLow = count <= 8;
  return { count, isLow };
}

export function isInStock(cartKey: string, requestedQty: number): boolean {
  return requestedQty <= getStockLevel(cartKey).count;
}
