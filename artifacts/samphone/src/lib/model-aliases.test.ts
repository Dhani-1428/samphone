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

  it("matches Redmi accessories that omit Xiaomi", () => {
    assert.ok(hayMatchesModel("Back Cover Redmi Note 13", "xiaomi", "Xiaomi Redmi Note 13"));
    assert.ok(hayMatchesModel("LCD Redmi Note 13", "xiaomi", "Redmi Note 13"));
  });
});
