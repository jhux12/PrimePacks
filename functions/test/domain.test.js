import { test } from "node:test";
import assert from "node:assert/strict";
import {
  validatePack,
  pickWeighted,
  cents,
  debit,
  validateAddress,
  requireAdmin,
  requireMember,
} from "../src/domain.js";
const card = {
  id: "card-1",
  name: "Test card",
  set: "Test set",
  number: "1",
  year: "2026",
  rarity: "Rare",
  grade: "Raw",
  category: "pokemon",
  value: 2.5,
  usdValue: 2.5,
  imageUrl: "https://example.com/card.png",
  odds: 1,
};
const pack = {
  id: "pack-test",
  name: "Test pack",
  slug: "test-pack",
  description: "Test collection",
  price: 1,
  category: "pokemon",
  tier: "budget",
  colorAccent: "#dcb65c",
  packCoverUrl: "https://example.com/cover.png",
  items: [card],
};
test("weighted selection honors boundaries, zero weights and original card values", () => {
  const items = [
    { ...card, id: "disabled", odds: 0 },
    { ...card, id: "a", odds: 1 },
    { ...card, id: "b", odds: 3 },
  ];
  assert.equal(pickWeighted(items, 0).id, "a");
  assert.equal(pickWeighted(items, 0.249999).id, "a");
  assert.equal(pickWeighted(items, 0.25).id, "b");
  assert.equal(pickWeighted(items, 0.999999).id, "b");
  assert.equal(pickWeighted(items, 0.4), items[2]);
  assert.equal(pickWeighted(items, 0.4).value, 2.5);
});
test("weighted selection matches configured relative weights over a uniform grid", () => {
  const items = [
    { ...card, id: "a", odds: 1 },
    { ...card, id: "b", odds: 3 },
  ];
  let first = 0;
  for (let i = 0; i < 10000; i++)
    if (pickWeighted(items, i / 10000).id === "a") first++;
  assert.equal(first, 2500);
});
test("invalid or empty odds fail closed", () => {
  for (const items of [
    [],
    [{ ...card, odds: 0 }],
    [{ ...card, odds: -1 }],
    [{ ...card, odds: NaN }],
    [{ ...card, odds: Infinity }],
  ])
    assert.throws(() => pickWeighted(items, 0));
  for (const r of [-1, 1, NaN, Infinity])
    assert.throws(() => pickWeighted([card], r));
});
test("pack validation rejects nonfinite values, duplicate IDs, unsafe URLs and empty odds", () => {
  assert.equal(validatePack(pack).price, 1);
  assert.equal(
    validatePack({ ...pack, packCoverUrl: "/pack-cover.svg" }).packCoverUrl,
    "/pack-cover.svg",
  );
  for (const patch of [
    { price: NaN },
    { price: 1.001 },
    { price: -1 },
    { items: [] },
    { items: [card, card] },
    { items: [{ ...card, odds: 0 }] },
    { packCoverUrl: "javascript:alert(1)" },
    { items: [{ ...card, imageUrl: "http://example.com/a" }] },
    { id: "../escape" },
    { items: [{ ...card, value: -1 }] },
  ])
    assert.throws(() => validatePack({ ...pack, ...patch }));
});
test("money uses exact cents and rejects negative or malformed debits", () => {
  assert.equal(cents(0.29), 29);
  assert.equal(debit(100, 99), 1);
  for (const args of [
    [100, 101],
    [100, -1],
    [100, 0],
    [NaN, 1],
    [100.5, 1],
  ])
    assert.throws(() => debit(...args));
  assert.throws(() => cents("1"));
  assert.throws(() => cents(1.001));
});
test("only verified nonanonymous accounts can transact; only claims grant admin", () => {
  const member = {
    uid: "u",
    token: { email_verified: true, firebase: { sign_in_provider: "password" } },
  };
  assert.equal(requireMember(member), "u");
  assert.throws(() => requireAdmin(member));
  assert.equal(
    requireAdmin({ ...member, token: { ...member.token, admin: true } }),
    "u",
  );
  for (const auth of [
    null,
    { ...member, token: {} },
    { ...member, token: { ...member.token, email_verified: false } },
    {
      ...member,
      token: { ...member.token, firebase: { sign_in_provider: "anonymous" } },
    },
  ])
    assert.throws(() => requireMember(auth));
});
test("fulfillment requires a complete US address with valid state and ZIP", () => {
  const address = {
    name: "Collector",
    street: "1 Test St",
    city: "Test",
    state: "CA",
    zip: "90210",
    country: "US",
  };
  assert.equal(validateAddress(address).country, "US");
  for (const patch of [
    { name: "" },
    { zip: "x" },
    { state: "California" },
    { country: "CA" },
    { street: " " },
  ])
    assert.throws(() => validateAddress({ ...address, ...patch }));
});
