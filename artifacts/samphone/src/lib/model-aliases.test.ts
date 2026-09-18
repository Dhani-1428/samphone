import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { hayMatchesModel, modelSearchNames } from "./model-aliases.ts";

describe("model aliases for non-Apple titles", () => {
  it("matches Galaxy accessories that omit Samsung", () => {
    const names = modelSearchNames("samsung", "samsung-galaxy-s24-ultra");
    assert.ok(names.some((n) => /s24 ultra/i.test(n)));
    assert.ok(hayMatchesModel("Back Cover Galaxy S24 Ultra Black", "samsung", "Samsung Galaxy S24 Ultra"));
    assert.ok(hayMatchesModel("Silicon Soft Jelly S24 Ultra", "samsung", "Samsung Galaxy S24 Ultra"));
    assert.ok(!hayMatchesModel("Back Cover Galaxy S24", "samsung", "Samsung Galaxy S24 Ultra"));
    assert.ok(!hayMatchesModel("LCD Samsung Galaxy S24 Ultra", "samsung", "Samsung Galaxy S24"));
  });

  it("keeps Xiaomi 17 Pro Max off iPhone 17 Pro Max pages", () => {
    assert.ok(hayMatchesModel("Back Cover iPhone 17 Pro Max Black", "iphone", "iPhone 17 Pro Max"));
    assert.ok(!hayMatchesModel("Xiaomi 17 Pro Max Back Cover Green", "iphone", "iPhone 17 Pro Max"));
    assert.ok(!hayMatchesModel("Xiaomi 17 Pro Max Back Cover Purple", "apple", "iPhone 17 Pro Max"));
    assert.ok(hayMatchesModel("Xiaomi 17 Pro Max Back Cover Green", "xiaomi", "Xiaomi 17 Pro Max"));
    assert.ok(!hayMatchesModel("iPhone 17 Pro Max Back Cover Black", "xiaomi", "Xiaomi 17 Pro Max"));
  });
});
