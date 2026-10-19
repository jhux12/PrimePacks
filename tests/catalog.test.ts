import { test } from "node:test";
import assert from "node:assert/strict";
import { mergeOriginalPacks, parsePack } from "../src/lib/catalog";
import originals from "../functions/src/legacy-packs.json" with { type: "json" };
import { PACKS } from "../src/data/cards";
test("the restored catalog preserves all fourteen original pack definitions", () => {
  assert.deepEqual(originals, JSON.parse(JSON.stringify(PACKS)));
  const restored = mergeOriginalPacks([]);
  assert.equal(restored.length, 14);
  assert.deepEqual(
    restored.map((p) => p.id),
    PACKS.map((p) => p.id),
  );
  assert.ok(
    restored.every(
      (p) => p.version === 0 && p.items.every((i) => i.stock === 0),
    ),
  );
});
test("live pack edits, real stock and explicit archives override the original baseline", () => {
  const original = originals[0];
  const live = parsePack({
    ...original,
    name: "Edited original",
    status: "archived",
    version: 9,
    items: original.items.map((i) => ({ ...i, stock: 7 })),
  });
  const merged = mergeOriginalPacks([live]);
  assert.equal(merged.length, 14);
  assert.equal(merged[0].name, "Edited original");
  assert.equal(merged[0].status, "archived");
  assert.equal(merged[0].items[0].stock, 7);
  assert.equal(merged.filter((p) => p.status === "published").length, 13);
});
test("new published packs are retained without duplicating the previous packs", () => {
  const custom = parsePack({
    ...originals[0],
    id: "new-pack",
    status: "published",
    version: 1,
    items: originals[0].items.map((i) => ({ ...i, stock: 3 })),
  });
  const merged = mergeOriginalPacks([custom]);
  assert.equal(merged.length, 15);
  assert.equal(merged.at(-1)?.id, "new-pack");
});
