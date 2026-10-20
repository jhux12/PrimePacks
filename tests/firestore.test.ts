import { before, after, beforeEach, test } from "node:test";
import { readFile } from "node:fs/promises";
import {
  initializeTestEnvironment,
  assertSucceeds,
  assertFails,
  type RulesTestEnvironment,
} from "@firebase/rules-unit-testing";
import {
  doc,
  setDoc,
  getDoc,
  collection,
  getDocs,
  query,
  where,
} from "firebase/firestore";
let env: RulesTestEnvironment;
before(async () => {
  env = await initializeTestEnvironment({
    projectId: "demo-primepacks",
    firestore: {
      host: "127.0.0.1",
      port: 8080,
      rules: await readFile("firestore.rules", "utf8"),
    },
  });
});
after(async () => {
  await env.cleanup();
});
beforeEach(async () => {
  await env.clearFirestore();
  await env.withSecurityRulesDisabled(async (c) => {
    const db = c.firestore();
    await Promise.all([
      setDoc(doc(db, "packs", "p"), { name: "Pack", status: "published" }),
      setDoc(doc(db, "pack_drafts", "p"), { name: "Draft" }),
      setDoc(doc(db, "users", "alice"), {
        uid: "alice",
        email: "alice@example.com",
        displayName: "Alice",
      }),
      setDoc(doc(db, "wallets", "alice"), { balanceCents: 100 }),
      setDoc(doc(db, "users", "alice", "inventory", "i"), {
        status: "available",
      }),
      setDoc(doc(db, "fulfillments", "order"), {
        uid: "alice",
        address: { street: "Private" },
      }),
      setDoc(doc(db, "admin_audit", "a"), { actor: "admin" }),
    ]);
  });
});
test("visitors can browse published packs but cannot read private records", async () => {
  const db = env.unauthenticatedContext().firestore();
  await assertSucceeds(getDoc(doc(db, "packs", "p")));
  for (const path of [
    "pack_drafts/p",
    "users/alice",
    "wallets/alice",
    "users/alice/inventory/i",
    "fulfillments/order",
    "admin_audit/a",
  ])
    await assertFails(getDoc(doc(db, path)));
});
test("customers can read only their own wallet, inventory and fulfillment", async () => {
  const db = env
    .authenticatedContext("alice", {
      email: "alice@example.com",
      email_verified: true,
    })
    .firestore();
  for (const path of [
    "users/alice",
    "wallets/alice",
    "users/alice/inventory/i",
    "fulfillments/order",
  ])
    await assertSucceeds(getDoc(doc(db, path)));
  const bob = env
    .authenticatedContext("bob", {
      email: "bob@example.com",
      email_verified: true,
    })
    .firestore();
  for (const path of [
    "users/alice",
    "wallets/alice",
    "users/alice/inventory/i",
    "fulfillments/order",
  ])
    await assertFails(getDoc(doc(bob, path)));
  await assertSucceeds(
    getDocs(query(collection(db, "fulfillments"), where("uid", "==", "alice"))),
  );
  await assertFails(getDocs(collection(db, "fulfillments")));
});
test("even administrators cannot mutate financial, stock, audit or fulfillment data directly", async () => {
  for (const context of [
    env.unauthenticatedContext(),
    env.authenticatedContext("alice", { email_verified: true }),
    env.authenticatedContext("admin", { admin: true, email_verified: true }),
  ]) {
    const db = context.firestore();
    for (const path of [
      "packs/p",
      "pack_drafts/p",
      "wallets/alice",
      "users/alice/inventory/i",
      "users/alice/ledger/x",
      "users/alice/operations/x",
      "fulfillments/order",
      "admin_audit/a",
      "pack_items/p",
      "pack_customizations/p",
    ])
      await assertFails(setDoc(doc(db, path), { forged: true }));
  }
});
test("admin claims require verified email and grant read access to operations", async () => {
  const good = env
    .authenticatedContext("admin", { admin: true, email_verified: true })
    .firestore();
  const bad = env
    .authenticatedContext("admin", { admin: true, email_verified: false })
    .firestore();
  for (const path of ["pack_drafts/p", "fulfillments/order", "admin_audit/a"]) {
    await assertSucceeds(getDoc(doc(good, path)));
    await assertFails(getDoc(doc(bad, path)));
  }
});
test("profiles cannot escalate privileges or impersonate another customer", async () => {
  const db = env
    .authenticatedContext("alice", { email: "alice@example.com" })
    .firestore();
  await assertSucceeds(
    setDoc(doc(db, "users", "alice"), {
      uid: "alice",
      email: "alice@example.com",
      displayName: "Collector",
    }),
  );
  await assertFails(
    setDoc(doc(db, "users", "alice"), {
      uid: "alice",
      email: "alice@example.com",
      displayName: "Collector",
      admin: true,
    }),
  );
  await assertFails(
    setDoc(doc(db, "users", "bob"), {
      uid: "bob",
      email: "alice@example.com",
      displayName: "Collector",
    }),
  );
});
