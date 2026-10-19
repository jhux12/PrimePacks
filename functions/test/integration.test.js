import { before, after, test } from "node:test";
import assert from "node:assert/strict";
import { initializeApp, deleteApp } from "firebase-admin/app";
import { getAuth } from "firebase-admin/auth";
import { getFirestore } from "firebase-admin/firestore";
import Stripe from "stripe";
import { randomUUID } from "node:crypto";
const projectId = "demo-primepacks";
const app = initializeApp({ projectId }),
  store = getFirestore(app),
  auth = getAuth(app);
let member, staff, other;
async function identity(admin = false) {
  const id = randomUUID(),
    email = `${id}@example.com`,
    password = "Local-test-password-123";
  const user = await auth.createUser({ email, password, emailVerified: true });
  if (admin) await auth.setCustomUserClaims(user.uid, { admin: true });
  const response = await fetch(
    "http://127.0.0.1:9099/identitytoolkit.googleapis.com/v1/accounts:signInWithPassword?key=demo-key",
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, password, returnSecureToken: true }),
    },
  );
  const body = await response.json();
  assert.ok(body.idToken);
  return { uid: user.uid, token: body.idToken };
}
async function call(name, data, identity = member) {
  const response = await fetch(
    `http://127.0.0.1:5001/${projectId}/us-central1/${name}`,
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        ...(identity ? { Authorization: `Bearer ${identity.token}` } : {}),
      },
      body: JSON.stringify({ data }),
    },
  );
  const body = await response.json();
  if (body.error) throw Error(body.error.message);
  assert.ok(response.ok, JSON.stringify(body));
  return body.result;
}
const card = {
  id: "card-a",
  name: "Real card fixture",
  set: "Collection",
  number: "1",
  year: "2026",
  rarity: "Rare",
  grade: "Raw",
  category: "pokemon",
  value: 1.01,
  usdValue: 1.01,
  imageUrl: "https://example.com/card.png",
  odds: 1,
  stock: 100,
};
const pack = {
  id: "integration-pack",
  name: "Integration pack",
  slug: "integration-pack",
  description: "Pack fixture",
  price: 1,
  category: "pokemon",
  tier: "budget",
  colorAccent: "#dcb65c",
  packCoverUrl: "https://example.com/cover.png",
  items: [card],
};
const current = async () => (await store.doc(`packs/${pack.id}`).get()).data();
async function fund(amount = 10000) {
  await store.doc(`wallets/${member.uid}`).set({ balanceCents: amount });
}
async function open(id = randomUUID(), quantity = 1) {
  const p = await current();
  return call("openPack", {
    packId: pack.id,
    quantity,
    expectedVersion: p.version,
    requestId: id,
  });
}
before(async () => {
  assert.ok(
    process.env.FIRESTORE_EMULATOR_HOST,
    "Run this suite using test:emulators",
  );
  [member, staff, other] = await Promise.all([
    identity(),
    identity(true),
    identity(),
  ]);
  await call(
    "managePack",
    { pack, action: "publish", expectedVersion: 0 },
    staff,
  );
});
after(() => deleteApp(app));
test("catalog mutations require verified administrator claims and reject malformed odds", async () => {
  await assert.rejects(
    call("managePack", { pack, action: "publish", expectedVersion: 1 }),
    /Administrator/,
  );
  await assert.rejects(
    call(
      "managePack",
      {
        pack: { ...pack, items: [{ ...card, odds: -1 }] },
        action: "publish",
        expectedVersion: 1,
      },
      staff,
    ),
    /odds/,
  );
  await assert.rejects(
    call("managePack", { pack, action: "archive", expectedVersion: 0 }, staff),
    /changed/,
  );
});
test("unauthed and unverified users cannot open packs", async () => {
  await assert.rejects(
    call(
      "openPack",
      {
        packId: pack.id,
        quantity: 1,
        requestId: randomUUID(),
        expectedVersion: 1,
      },
      null,
    ),
    /verified/,
  );
  const u = await auth.createUser({
    email: `${randomUUID()}@example.com`,
    password: "Local-test-password-123",
  });
  const token = await auth.createCustomToken(u.uid); // Custom-token exchange retains unverified email claim.
  const res = await fetch(
    "http://127.0.0.1:9099/identitytoolkit.googleapis.com/v1/accounts:signInWithCustomToken?key=demo-key",
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ token, returnSecureToken: true }),
    },
  );
  const body = await res.json();
  await assert.rejects(
    call(
      "openPack",
      { packId: pack.id, quantity: 1, requestId: randomUUID() },
      { uid: u.uid, token: body.idToken },
    ),
    /verified/,
  );
});
test("opening atomically debits cents, creates inventory, reserves stock and replays safely", async () => {
  await fund();
  const before = await current(),
    id = randomUUID();
  const payload = {
    packId: pack.id,
    quantity: 2,
    requestId: id,
    expectedVersion: before.version,
  };
  const result = await call("openPack", payload);
  const replay = await call("openPack", payload);
  assert.deepEqual(result, replay);
  assert.equal(result.items.length, 2);
  assert.equal(result.balanceCents, 9800);
  assert.equal((await current()).items[0].stock, before.items[0].stock - 2);
  assert.equal(
    (
      await store
        .doc(`users/${member.uid}/inventory/${result.items[0].instanceId}`)
        .get()
    ).data().status,
    "available",
  );
  await assert.rejects(
    call("openPack", { ...payload, quantity: 1 }),
    /already used/,
  );
});
test("concurrent purchases cannot overdraw a wallet or silently reroll stale catalog versions", async () => {
  await fund(100);
  const p = await current();
  const outcomes = await Promise.allSettled(
    [1, 2].map(() =>
      call("openPack", {
        packId: pack.id,
        quantity: 1,
        requestId: randomUUID(),
        expectedVersion: p.version,
      }),
    ),
  );
  assert.equal(outcomes.filter((o) => o.status === "fulfilled").length, 1);
  assert.equal(
    (await store.doc(`wallets/${member.uid}`).get()).data().balanceCents,
    0,
  );
});
test("insufficient funds, invalid quantity and stale pack versions produce no inventory", async () => {
  await fund(0);
  await assert.rejects(open(), /Insufficient/);
  await assert.rejects(open(randomUUID(), -1), /1–10/);
  await fund();
  await assert.rejects(
    call("openPack", {
      packId: pack.id,
      quantity: 1,
      requestId: randomUUID(),
      expectedVersion: 0,
    }),
    /details changed/,
  );
});
test("selling is ownership checked, credited exactly once and mutually exclusive with shipping", async () => {
  await fund();
  const result = await open(),
    item = result.items[0],
    requestId = randomUUID();
  await assert.rejects(
    call("sellInventory", { instanceIds: [item.instanceId], requestId }, other),
    /no longer/,
  );
  const sold = await call("sellInventory", {
    instanceIds: [item.instanceId],
    requestId,
  });
  assert.equal(sold.creditCents, 95);
  assert.deepEqual(
    await call("sellInventory", { instanceIds: [item.instanceId], requestId }),
    sold,
  );
  await assert.rejects(
    call("sellInventory", {
      instanceIds: [item.instanceId],
      requestId: randomUUID(),
    }),
    /no longer/,
  );
  await assert.rejects(
    call("requestShipment", {
      instanceId: item.instanceId,
      requestId: randomUUID(),
      address: {
        name: "Test",
        street: "1 Street",
        city: "City",
        state: "CA",
        zip: "90210",
        country: "US",
      },
    }),
    /not available/,
  );
});
test("shipping reserves ownership; only admins can dispatch and audit tracking updates", async () => {
  await fund();
  const result = await open(),
    item = result.items[0];
  const shipment = await call("requestShipment", {
    instanceId: item.instanceId,
    requestId: randomUUID(),
    address: {
      name: "Test",
      street: "1 Street",
      city: "City",
      state: "CA",
      zip: "90210",
      country: "US",
    },
  });
  await assert.rejects(
    call("sellInventory", {
      instanceIds: [item.instanceId],
      requestId: randomUUID(),
    }),
    /no longer/,
  );
  await assert.rejects(
    call("fulfillShipment", {
      id: shipment.id,
      carrier: "USPS",
      trackingNumber: "TEST-TRACKING",
    }),
    /Administrator/,
  );
  await call(
    "fulfillShipment",
    { id: shipment.id, carrier: "USPS", trackingNumber: "TEST-TRACKING" },
    staff,
  );
  assert.equal(
    (
      await store.doc(`users/${member.uid}/inventory/${item.instanceId}`).get()
    ).data().trackingNumber,
    "TEST-TRACKING",
  );
  await assert.rejects(
    call(
      "fulfillShipment",
      { id: shipment.id, carrier: "USPS", trackingNumber: "DUPLICATE" },
      staff,
    ),
    /processed/,
  );
  const audit = await store
    .collection("admin_audit")
    .where("action", "==", "shipment.shipped")
    .get();
  assert.ok(audit.size > 0);
});
test("cancelled shipping returns the card to the vault and is audited", async () => {
  await fund();
  const result = await open(),
    item = result.items[0];
  const shipment = await call("requestShipment", {
    instanceId: item.instanceId,
    requestId: randomUUID(),
    address: {
      name: "Test",
      street: "1 Street",
      city: "City",
      state: "CA",
      zip: "90210",
      country: "US",
    },
  });
  await call(
    "cancelShipment",
    { id: shipment.id, reason: "Customer requested an address correction" },
    staff,
  );
  assert.equal(
    (
      await store.doc(`users/${member.uid}/inventory/${item.instanceId}`).get()
    ).data().status,
    "available",
  );
});
async function webhook(event, valid = true) {
  const payload = JSON.stringify(event);
  const signature = Stripe.webhooks.generateTestHeaderString({
    payload,
    secret: valid ? "whsec_local_fixture_only" : "wrong-signing-key",
  });
  return fetch(`http://127.0.0.1:5001/${projectId}/us-central1/stripeWebhook`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "stripe-signature": signature,
    },
    body: payload,
  });
}
test("Stripe signatures and amount checks protect credit; duplicate deliveries settle once", async () => {
  await fund(0);
  const session = `cs_test_${randomUUID()}`;
  const event = {
    id: `evt_${randomUUID()}`,
    type: "checkout.session.completed",
    data: {
      object: {
        id: session,
        metadata: { uid: member.uid, amountCents: "1000" },
        payment_status: "paid",
        currency: "usd",
        amount_total: 1000,
        payment_intent: "pi_local_fixture",
      },
    },
  };
  assert.equal((await webhook(event, false)).status, 400);
  assert.equal(
    (await store.doc(`wallets/${member.uid}`).get()).data().balanceCents,
    0,
  );
  assert.equal((await webhook(event)).status, 200);
  assert.equal((await webhook(event)).status, 200);
  assert.equal(
    (await webhook({ ...event, id: `evt_${randomUUID()}` })).status,
    200,
  );
  assert.equal(
    (await store.doc(`wallets/${member.uid}`).get()).data().balanceCents,
    1000,
  );
  assert.equal(
    (
      await webhook({
        ...event,
        id: `evt_${randomUUID()}`,
        data: {
          object: { ...event.data.object, id: "bad_session", amount_total: 1 },
        },
      })
    ).status,
    500,
  );
});
test("refunds freeze spending and dispatch until an audited administrator review", async () => {
  const event = {
    id: `evt_${randomUUID()}`,
    type: "charge.refunded",
    data: { object: { payment_intent: "pi_local_fixture" } },
  };
  assert.equal((await webhook(event)).status, 200);
  assert.equal(
    (await store.doc(`wallets/${member.uid}`).get()).data().frozen,
    true,
  );
  await assert.rejects(open(), /under review/);
  await assert.rejects(
    call("reviewCollector", {
      uid: member.uid,
      frozen: false,
      reason: "Review",
    }),
    /Administrator/,
  );
  await call(
    "reviewCollector",
    {
      uid: member.uid,
      frozen: false,
      reason: "Payment dispute reconciled in Stripe",
    },
    staff,
  );
  assert.equal(
    (await call("getCollector", { uid: member.uid }, staff)).frozen,
    false,
  );
});
test("out-of-stock packs cannot award nonexistent physical cards", async () => {
  const p = await current();
  await store
    .doc(`packs/${pack.id}`)
    .update({ items: [{ ...card, stock: 0 }] });
  await fund();
  await assert.rejects(open(), /restocking/);
  await call(
    "managePack",
    { pack, action: "archive", expectedVersion: p.version },
    staff,
  );
  await assert.rejects(open(), /unavailable/);
});
