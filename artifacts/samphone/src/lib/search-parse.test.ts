import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { classifyCatalogProduct } from "./catalog-taxonomy.ts";
import { parseSearchQuery, productMatchesParsedQuery, rankSearchResults } from "./search-parse.ts";

const catalog = [
  { name: "Back Cover iPhone 17 Pro Max Black" },
  { name: "Silicon Soft Jelly Case iPhone 17 Pro Max" },
  { name: "LCD OLED iPhone 17 Pro Max" },
  { name: "Battery iPhone 17 Pro Max" },
  { name: "Back Cover iPhone 17 Pro" },
  { name: "LCD iPhone 17 Pro" },
  { name: "Back Cover iPhone 16 Pro Max" },
  { name: "Tempered Glass iPhone 16 Pro Max" },
  { name: "LCD iPhone 15" },
  { name: "Back Cover iPhone 15" },
  { name: "Charger USB-C 25W" },
  { name: "Back Cover Galaxy S24 Ultra" },
  { name: "Battery Galaxy S24 Ultra" },
  { name: "LCD Redmi Note 13" },
  { name: "Back Cover Redmi Note 13" },
  { name: "Earphones TWS" },
];

describe("catalog taxonomy", () => {
  it("keeps jelly/covers out of Parts even when tagged Phone Parts", () => {
    const jelly = classifyCatalogProduct({
      name: "Silicon Soft Jelly Cover iPhone 17 Pro Max",
      catalogGroup: "Phone Parts",
      partType: "Screen / LCD Assembly",
    });
    assert.equal(jelly.category, "accessories");
    assert.equal(jelly.subcategory, "case");
    assert.ok(jelly.issues.includes("invalid-combo:accessory-in-phone-parts"));

    const cover = classifyCatalogProduct({
      name: "Back Cover iPhone 17 Pro Max",
      catalogGroup: "Phone Parts",
    });
    assert.equal(cover.category, "accessories");
    assert.equal(cover.subcategory, "back-cover");

    const lcd = classifyCatalogProduct({ name: "Touch + LCD OLED iPhone 17 Pro Max" });
    assert.equal(lcd.category, "parts");
    assert.equal(lcd.subcategory, "screen");
  });

  it("keeps parts and accessories in their own sections even with mixed API tags", () => {
    assert.equal(
      classifyCatalogProduct({ name: "Touch + LCD OLED iPhone 17 Pro Max", catalogGroup: "Original Accessories" }).category,
      "parts",
    );
    assert.equal(classifyCatalogProduct({ name: "Battery iPhone 17 Pro Max", catalogGroup: "Accessories" }).category, "parts");
    assert.equal(
      classifyCatalogProduct({ name: "Silicon Soft Jelly Cover iPhone 17 Pro Max", catalogGroup: "Phone Parts" }).category,
      "accessories",
    );
    assert.equal(
      classifyCatalogProduct({ name: "Tempered Glass iPhone 17 Pro Max", catalogGroup: "Phone Parts" }).category,
      "accessories",
    );
    assert.equal(classifyCatalogProduct({ name: "Back Cover iPhone 17 Pro Max Black", catalogGroup: "Phone Parts" }).category, "accessories");
    assert.equal(classifyCatalogProduct({ name: "MagSafe Case iPhone 17 Pro Max", catalogGroup: "Phone Parts" }).category, "accessories");
    assert.equal(
      classifyCatalogProduct({ name: "Charging Port Flex iPhone 17 Pro Max", catalogGroup: "Original Accessories" }).category,
      "parts",
    );
    assert.equal(classifyCatalogProduct({ name: "Bumper Frame Case iPhone 17 Pro Max" }).category, "accessories");
    assert.equal(classifyCatalogProduct({ name: "iPhone 17 Pro Max Housing", catalogGroup: "Phone Parts" }).category, "parts");
  });

  it("treats case and back cover as distinct", () => {
    assert.equal(classifyCatalogProduct({ name: "MagSafe Case iPhone 17 Pro Max" }).subcategory, "case");
    assert.equal(classifyCatalogProduct({ name: "Back Cover iPhone 17 Pro Max" }).subcategory, "back-cover");
  });
});

describe("search parser", () => {
  it("is order-independent for covers + 17 pro max", () => {
    const queries = ["covers 17 pro max", "17 pro max covers", "pro max 17 cover", "17promax cover"];
    for (const q of queries) {
      const parsed = parseSearchQuery(q);
      assert.equal(parsed.model?.id, "iphone-17-pro-max");
      assert.equal(parsed.type?.id, "back-cover");
      const hits = rankSearchResults(q, catalog);
      assert.ok(hits.length >= 1);
      assert.ok(hits.every((p) => /17 pro max/i.test(p.name) && /cover|case|jelly|capa/i.test(p.name)));
      assert.ok(!hits.some((p) => /lcd/i.test(p.name)));
    }
  });

  it("resolves aliases and typos as a fallback", () => {
    assert.equal(parseSearchQuery("17pm covers").model?.id, "iphone-17-pro-max");
    assert.equal(parseSearchQuery("iphone17promax").model?.id, "iphone-17-pro-max");
    const typo = parseSearchQuery("iphone 17 pro maxx");
    assert.equal(typo.model?.id, "iphone-17-pro-max");
    assert.equal(typo.modelExact, false);
  });

  it("handles model-only queries across five models", () => {
    const cases = [
      ["iphone 17 pro max", "iphone-17-pro-max"],
      ["17 pro", "iphone-17-pro"],
      ["16 pro max", "iphone-16-pro-max"],
      ["iphone 15", "iphone-15"],
      ["s24 ultra", "galaxy-s24-ultra"],
      ["redmi note 13", "redmi-note-13"],
    ] as const;
    for (const [q, id] of cases) {
      const parsed = parseSearchQuery(q);
      assert.equal(parsed.model?.id, id);
      assert.equal(parsed.type, null);
      const hits = rankSearchResults(q, catalog);
      assert.ok(hits.length >= 1);
      assert.ok(hits.every((p) => productMatchesParsedQuery(p, parsed)));
    }
  });

  it("handles type-only queries", () => {
    const parsed = parseSearchQuery("covers");
    assert.equal(parsed.model, null);
    assert.equal(parsed.type?.id, "back-cover");
    const hits = rankSearchResults("covers", catalog);
    assert.ok(hits.length >= 4);
    assert.ok(hits.every((p) => /cover|case|jelly|capa|magsafe/i.test(p.name)));
  });

  it("matches generation numbers and translated cover words", () => {
    assert.equal(parseSearchQuery("17").model, null);
    const seventeen = rankSearchResults("17", catalog);
    assert.ok(seventeen.some((p) => /iphone 17/i.test(p.name)));
    assert.ok(seventeen.some((p) => /17 pro max/i.test(p.name)));
    assert.ok(seventeen.every((p) => /(?:^|[^0-9])17(?:[^0-9]|$)/.test(p.name)));

    const capas = rankSearchResults("capas", catalog);
    assert.ok(capas.length >= 4);
    assert.ok(capas.every((p) => /cover|case|jelly|capa|magsafe/i.test(p.name)));
    assert.ok(!capas.some((p) => /\blcd\b/i.test(p.name)));

    const ordered = rankSearchResults("17", [
      { name: "Back Cover Galaxy S17" },
      { name: "Back Cover iPhone 17" },
      { name: "Back Cover Redmi 17" },
    ]);
    assert.deepEqual(
      ordered.map((p) => p.name),
      ["Back Cover iPhone 17", "Back Cover Galaxy S17", "Back Cover Redmi 17"],
    );
  });

  it("compound queries per model stay on that model and type", () => {
    const rows = [
      ["battery galaxy s24 ultra", "galaxy-s24-ultra", "battery"],
      ["lcd redmi note 13", "redmi-note-13", "screen"],
      ["cover iphone 15", "iphone-15", "back-cover"],
      ["tempered 16 pro max", "iphone-16-pro-max", "screen-protector"],
      ["lcd 17 pro", "iphone-17-pro", "screen"],
    ] as const;
    for (const [q, modelId, typeId] of rows) {
      const parsed = parseSearchQuery(q);
      assert.equal(parsed.model?.id, modelId, q);
      assert.equal(parsed.type?.id, typeId, q);
      const hits = rankSearchResults(q, catalog);
      assert.ok(hits.length >= 1, q);
      assert.ok(hits.every((p) => productMatchesParsedQuery(p, parsed)), q);
    }
  });
});
