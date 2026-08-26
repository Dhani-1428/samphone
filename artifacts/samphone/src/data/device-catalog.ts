/** Direct API queries for /phones and /tablets — do not scan the full 16k catalog. */

export const SMARTPHONE_FETCH_QUERIES: Record<string, string>[] = [{ category: "SMARTPHONES" }];

export const TABLET_FETCH_QUERIES: Record<string, string>[] = [
  { category_group: "Tablet" },
  { category_group: "Tab" },
  { category_group: "iPad" },
  { category: "iPad" },
  { category_group: "Galaxy Tab" },
  { category_group: "Mate Pad" },
  { category_group: "Xiaomi Pad" },
  { category_group: "Lenovo Tab" },
];
