import { initializeApp } from "firebase-admin/app";
import { getAuth } from "firebase-admin/auth";
import { getFirestore, FieldValue } from "firebase-admin/firestore";
import { onCall, onRequest, HttpsError } from "firebase-functions/v2/https";
import {
  defineSecret,
  defineString,
  defineBoolean,
} from "firebase-functions/params";
import { randomBytes, randomUUID } from "node:crypto";
import Stripe from "stripe";
import legacyPacks from "./legacy-packs.json" with { type: "json" };
import {
  ID,
  check,
  text,
  cents,
  httpsUrl,
  validatePack,
  pickWeighted,
  debit,
  validateAddress,
  requireMember,
  requireAdmin,
} from "./domain.js";
initializeApp();
const database = defineString("FIRESTORE_DATABASE_ID", {
  default: "(default)",
});
const siteUrl = defineString("SITE_URL", {
  default: "https://example.invalid",
});
const termsUrl = defineString("STORE_TERMS_URL", {
  default: "https://example.invalid/terms",
});
const enabled = defineBoolean("COMMERCE_ENABLED", { default: false });
const ownerEmail = defineString("OWNER_ADMIN_EMAIL", {
  default: "jhuxf12@outlook.com",
});
const stripeKey = defineSecret("STRIPE_SECRET_KEY");
const webhookKey = defineSecret("STRIPE_WEBHOOK_SECRET");
const db = () => getFirestore(database.value());
const stamp = () => FieldValue.serverTimestamp();
function live() {
  check(enabled.value(), "Purchases are not available yet");
}
function key(value) {
  check(typeof value === "string" && ID.test(value), "Invalid request ID");
  return value;
}
function wrap(handler, options = {}) {
  return onCall(
    { region: "us-central1", maxInstances: 10, ...options },
    async (request) => {
      try {
        if (request.auth?.token?.admin === true) {
          const operator = await getAuth().getUser(request.auth.uid);
          check(
            !operator.disabled &&
              operator.emailVerified &&
              operator.customClaims?.admin === true,
            "Administrator permission changed. Sign in again.",
          );
        }
        return await handler(request);
      } catch (error) {
        if (error instanceof HttpsError) throw error;
        // Do not expose provider responses or PII in callable failures.
        if (error.code === "aborted" || error.code === 10)
          throw new HttpsError(
            "aborted",
            "Data changed. Reload and try again.",
          );
        if (error.constructor === Error)
          throw new HttpsError("failed-precondition", error.message);
        console.error("Commerce operation failed", {
          code: error.code || "unknown",
        });
        throw new HttpsError(
          "internal",
          "The operation could not be completed. Please retry with the same request.",
        );
      }
    },
  );
}
const audit = (tx, actor, action, target, details) =>
  tx.create(db().collection("admin_audit").doc(), {
    actor,
    action,
    target,
    details,
    createdAt: stamp(),
  });

async function restoreOriginalPacks(uid) {
  let restored = 0;
  for (const original of legacyPacks) {
    await db()
      .runTransaction(async (tx) => {
        const target = db().doc(`packs/${original.id}`);
        const [existing, cover, contents] = await Promise.all([
          tx.get(target),
          tx.get(db().doc(`pack_customizations/${original.id}`)),
          tx.get(db().doc(`pack_items/${original.id}`)),
        ]);
        if (existing.exists) return;
        let pack = validatePack(original);
        if (cover.data()?.imageUrl) {
          try {
            pack = validatePack({
              ...pack,
              packCoverUrl: cover.data().imageUrl,
            });
          } catch {
            /* Preserve valid original artwork if a legacy URL is invalid. */
          }
        }
        if (contents.data()?.items?.length) {
          try {
            pack = validatePack({ ...pack, items: contents.data().items });
          } catch {
            /* Invalid legacy data must not break the original catalog. */
          }
        }
        tx.create(target, {
          ...pack,
          items: pack.items.map((item) => ({ ...item, stock: 0 })),
          status: "published",
          version: 1,
          updatedAt: stamp(),
          updatedBy: uid,
        });
        audit(tx, uid, "pack.restored", original.id, {
          source: "original-catalog",
          stockVerified: false,
        });
        return true;
      })
      .then((created) => {
        if (created) restored++;
      });
  }
  return restored;
}

export const restoreLegacyCatalog = wrap(async ({ auth }) => {
  const uid = requireAdmin(auth);
  return { restored: await restoreOriginalPacks(uid) };
});

export const bootstrapOwnerAdmin = wrap(async ({ auth }) => {
  const uid = requireMember(auth);
  const configured = ownerEmail.value().trim().toLowerCase();
  check(
    configured.length > 0 && auth.token.email?.toLowerCase() === configured,
    "This account is not the configured owner",
  );
  const account = await getAuth().getUser(uid);
  check(
    !account.disabled &&
      account.emailVerified &&
      account.email?.toLowerCase() === configured,
    "Verify the configured owner email before requesting access",
  );
  if (account.customClaims?.admin !== true) {
    await db().collection("admin_audit").add({
      actor: uid,
      action: "admin.owner_grant_requested",
      target: uid,
      createdAt: stamp(),
    });
    await getAuth().setCustomUserClaims(uid, {
      ...account.customClaims,
      admin: true,
    });
  }
  return { granted: true, restored: await restoreOriginalPacks(uid) };
});

export const managePack = wrap(async ({ auth, data }) => {
  const uid = requireAdmin(auth);
  const id = key(data?.pack?.id);
  const action = data.action;
  check(
    ["draft", "publish", "archive"].includes(action),
    "Invalid catalog action",
  );
  const pack = validatePack(data.pack);
  // Stock is entered explicitly by admins; legacy/demo catalogs are never implicitly sellable.
  pack.items = pack.items.map((item, index) => {
    const stock = data.pack.items[index].stock;
    check(
      Number.isSafeInteger(stock) && stock >= 0 && stock <= 1000000,
      "Each card needs a valid stock count",
    );
    return { ...item, stock };
  });
  check(
    Number.isSafeInteger(data.expectedVersion) && data.expectedVersion >= 0,
    "Invalid catalog version",
  );
  const ref = db().doc(`packs/${id}`),
    draft = db().doc(`pack_drafts/${id}`);
  return db().runTransaction(async (tx) => {
    const [existing, previousDraft] = await Promise.all([
      tx.get(ref),
      tx.get(draft),
    ]);
    const old = existing.data();
    check(
      (previousDraft.data()?.draftVersion || 0) ===
        (data.expectedDraftVersion || 0),
      "Draft changed since it was loaded. Reload before saving.",
    );
    check(
      (old?.version || 0) === data.expectedVersion,
      "Pack changed since it was loaded. Reload before saving.",
    );
    if (action === "publish")
      check(
        pack.items.every((i) => i.odds === 0 || i.stock > 0),
        "Stock every eligible card before publishing",
      );
    const payload = {
      ...pack,
      status: action === "archive" ? "archived" : "published",
      version: (old?.version || 0) + 1,
      updatedAt: stamp(),
      updatedBy: uid,
    };
    if (action === "draft")
      tx.set(draft, {
        ...pack,
        baseVersion: data.expectedVersion,
        draftVersion: (previousDraft.data()?.draftVersion || 0) + 1,
        updatedAt: stamp(),
        updatedBy: uid,
      });
    else {
      tx.set(ref, payload);
      tx.delete(draft);
    }
    audit(tx, uid, `pack.${action}`, id, { before: old || null, after: pack });
    return {
      id,
      version: action === "draft" ? data.expectedVersion : payload.version,
      draftVersion:
        action === "draft" ? (previousDraft.data()?.draftVersion || 0) + 1 : 0,
    };
  });
});

export const openPack = wrap(async ({ auth, data }) => {
  const uid = requireMember(auth);
  live();
  const id = key(data?.packId),
    requestId = key(data.requestId),
    quantity = data.quantity;
  check(
    Number.isSafeInteger(quantity) && quantity >= 1 && quantity <= 10,
    "Choose 1–10 packs",
  );
  const store = db(),
    ref = store.doc(`packs/${id}`),
    wallet = store.doc(`wallets/${uid}`),
    op = store.doc(`users/${uid}/operations/${requestId}`);
  // Generate randomness outside the retrying transaction so a conflict cannot reroll a purchase.
  const rolls = Array.from(
    { length: quantity },
    () => randomBytes(6).readUIntBE(0, 6) / 2 ** 48,
  );
  const instanceIds = Array.from({ length: quantity }, () => randomUUID());
  return store.runTransaction(async (tx) => {
    const [past, packSnap, walletSnap] = await Promise.all([
      tx.get(op),
      tx.get(ref),
      tx.get(wallet),
    ]);
    if (past.exists) {
      const p = past.data();
      check(
        p.kind === "open" && p.packId === id && p.quantity === quantity,
        "Request ID already used",
      );
      return p.result;
    }
    const pack = packSnap.data(),
      account = walletSnap.data();
    check(pack?.status === "published", "This pack is unavailable");
    check(
      pack.version === data.expectedVersion,
      "Pack details changed. Review the latest odds before opening.",
    );
    check(!account?.frozen, "Account is under review. Contact support.");
    check(
      pack.items.every((i) => i.odds === 0 || i.stock >= quantity),
      "This pack needs restocking before opening",
    );
    const cost = cents(pack.price) * quantity;
    const balanceCents = debit(account?.balanceCents || 0, cost);
    const remaining = pack.items.map((i) => ({ ...i }));
    const items = rolls.map((roll, index) => {
      const card = pickWeighted(remaining, roll);
      card.stock--;
      const { stock, ...snapshot } = card;
      return {
        instanceId: instanceIds[index],
        card: snapshot,
        pulledAt: Date.now(),
        packName: pack.name,
        status: "available",
        packId: id,
      };
    });
    const result = { items, balanceCents };
    tx.set(wallet, { balanceCents, updatedAt: stamp() }, { merge: true });
    tx.update(ref, { items: remaining, version: pack.version + 1 });
    for (const item of items)
      tx.create(store.doc(`users/${uid}/inventory/${item.instanceId}`), item);
    tx.create(op, {
      kind: "open",
      packId: id,
      quantity,
      costCents: cost,
      packVersion: pack.version,
      oddsSnapshot: pack.items.map((i) => ({ id: i.id, weight: i.odds })),
      result,
      createdAt: stamp(),
    });
    tx.create(store.doc(`users/${uid}/ledger/${requestId}`), {
      kind: "pack_purchase",
      amountCents: -cost,
      balanceCents,
      createdAt: stamp(),
    });
    return result;
  });
});

export const sellInventory = wrap(async ({ auth, data }) => {
  const uid = requireMember(auth);
  live();
  const requestId = key(data?.requestId);
  check(
    Array.isArray(data.instanceIds) &&
      data.instanceIds.length >= 1 &&
      data.instanceIds.length <= 100,
    "Choose 1–100 cards",
  );
  const ids = [...new Set(data.instanceIds.map(key))].sort();
  const store = db(),
    wallet = store.doc(`wallets/${uid}`),
    op = store.doc(`users/${uid}/operations/${requestId}`);
  return store.runTransaction(async (tx) => {
    const [past, account, ...cards] = await Promise.all([
      tx.get(op),
      tx.get(wallet),
      ...ids.map((id) => tx.get(store.doc(`users/${uid}/inventory/${id}`))),
    ]);
    if (past.exists) {
      check(
        past.data().kind === "sell" &&
          JSON.stringify(past.data().ids) === JSON.stringify(ids),
        "Request ID already used",
      );
      return past.data().result;
    }
    check(!account.data()?.frozen, "Account is under review. Contact support.");
    check(
      cards.every((c) => c.exists && c.data().status === "available"),
      "A card is no longer available to sell",
    );
    const creditCents = cards.reduce(
      (sum, c) => sum + Math.floor((cents(c.data().card.value) * 95) / 100),
      0,
    );
    const balanceCents = (account.data()?.balanceCents || 0) + creditCents;
    for (const c of cards)
      tx.update(c.ref, { status: "sold", soldAt: stamp() });
    tx.set(wallet, { balanceCents, updatedAt: stamp() }, { merge: true });
    const result = { balanceCents, creditCents };
    tx.create(op, { kind: "sell", ids, result, createdAt: stamp() });
    tx.create(store.doc(`users/${uid}/ledger/${requestId}`), {
      kind: "card_sellback",
      amountCents: creditCents,
      balanceCents,
      createdAt: stamp(),
    });
    return result;
  });
});

export const createCheckout = wrap(
  async ({ auth, data }) => {
    const uid = requireMember(auth);
    live();
    const requestId = key(data?.requestId),
      amount = data.amountCents;
    check(
      [1000, 2500, 5000, 10000, 25000].includes(amount),
      "Choose a supported credit amount",
    );
    const account = await db().doc(`wallets/${uid}`).get();
    check(!account.data()?.frozen, "Account is under review. Contact support.");
    const base = httpsUrl(siteUrl.value(), "Site URL");
    check(
      !base.includes("example.invalid"),
      "Configure SITE_URL before accepting payments",
    );
    const terms = httpsUrl(termsUrl.value(), "Store terms URL");
    check(
      !terms.includes("example.invalid"),
      "Configure store terms before accepting payments",
    );
    const stripe = new Stripe(stripeKey.value());
    const session = await stripe.checkout.sessions.create(
      {
        mode: "payment",
        consent_collection: { terms_of_service: "required" },
        custom_text: {
          terms_of_service_acceptance: {
            message: `I agree to the [PrimePacks terms](${terms}).`,
          },
        },
        payment_method_types: ["card"],
        client_reference_id: uid,
        metadata: { uid, amountCents: String(amount) },
        line_items: [
          {
            price_data: {
              currency: "usd",
              unit_amount: amount,
              product_data: {
                name: "PrimePacks store credit",
                description: "For pack purchases. No cash withdrawals.",
              },
            },
            quantity: 1,
          },
        ],
        success_url: new URL("/?checkout=success", base).href,
        cancel_url: new URL("/?checkout=cancelled", base).href,
      },
      { idempotencyKey: `${uid}:${requestId}` },
    );
    return { url: session.url };
  },
  { secrets: [stripeKey] },
);

export const stripeWebhook = onRequest(
  { region: "us-central1", secrets: [stripeKey, webhookKey], maxInstances: 10 },
  async (req, res) => {
    if (req.method !== "POST") {
      res.status(405).send("Method not allowed");
      return;
    }
    let event;
    try {
      event = new Stripe(stripeKey.value()).webhooks.constructEvent(
        req.rawBody,
        req.headers["stripe-signature"],
        webhookKey.value(),
      );
    } catch {
      res.status(400).send("Invalid signature");
      return;
    }
    try {
      const store = db(),
        receipt = store.doc(`payment_events/${event.id}`);
      if (event.type === "checkout.session.completed") {
        const session = event.data.object,
          uid = session.metadata?.uid,
          amount = Number(session.metadata?.amountCents);
        check(
          typeof uid === "string" && uid.length > 0 && !uid.includes("/"),
          "Invalid customer",
        );
        check(
          session.payment_status === "paid" &&
            session.currency === "usd" &&
            session.amount_total === amount &&
            [1000, 2500, 5000, 10000, 25000].includes(amount),
          "Invalid checkout",
        );
        await store.runTransaction(async (tx) => {
          const payment = store.doc(`payments/${session.id}`),
            wallet = store.doc(`wallets/${uid}`);
          const [seen, paid, account] = await Promise.all([
            tx.get(receipt),
            tx.get(payment),
            tx.get(wallet),
          ]);
          if (seen.exists || paid.exists) return;
          const balanceCents = (account.data()?.balanceCents || 0) + amount;
          tx.set(wallet, { balanceCents, updatedAt: stamp() }, { merge: true });
          tx.create(payment, {
            uid,
            amountCents: amount,
            paymentIntent: session.payment_intent,
            createdAt: stamp(),
          });
          tx.create(receipt, { type: event.type, createdAt: stamp() });
          tx.create(store.doc(`users/${uid}/ledger/${session.id}`), {
            kind: "credit_purchase",
            amountCents: amount,
            balanceCents,
            createdAt: stamp(),
          });
        });
      } else if (
        ["charge.refunded", "charge.dispute.created"].includes(event.type)
      ) {
        const object = event.data.object;
        const intent = object.payment_intent;
        check(typeof intent === "string", "Missing payment intent");
        const payments = await store
          .collection("payments")
          .where("paymentIntent", "==", intent)
          .limit(1)
          .get();
        // Retry if the refund/dispute arrived before checkout settlement.
        check(!payments.empty, "Payment settlement has not arrived yet");
        await store.runTransaction(async (tx) => {
          const seen = await tx.get(receipt);
          if (seen.exists) return;
          tx.set(
            store.doc(`wallets/${payments.docs[0].data().uid}`),
            { frozen: true, reviewReason: event.type, updatedAt: stamp() },
            { merge: true },
          );
          tx.create(receipt, { type: event.type, createdAt: stamp() });
        });
      }
      res.status(200).send("Received");
    } catch {
      console.error("Webhook settlement failed", {
        eventId: event.id,
        type: event.type,
      });
      res.status(500).send("Settlement pending");
    }
  },
);

export const requestShipment = wrap(async ({ auth, data }) => {
  const uid = requireMember(auth);
  live();
  const id = key(data?.instanceId),
    requestId = key(data.requestId),
    address = validateAddress(data.address);
  const store = db(),
    item = store.doc(`users/${uid}/inventory/${id}`),
    order = store.doc(`fulfillments/${uid}_${requestId}`),
    wallet = store.doc(`wallets/${uid}`);
  return store.runTransaction(async (tx) => {
    const [past, card, account] = await Promise.all([
      tx.get(order),
      tx.get(item),
      tx.get(wallet),
    ]);
    if (past.exists) {
      check(past.data().instanceId === id, "Request ID already used");
      return { id: past.id };
    }
    check(!account.data()?.frozen, "Account is under review. Contact support.");
    check(
      card.data()?.status === "available",
      "Card is not available for shipping",
    );
    tx.create(order, {
      uid,
      instanceId: id,
      card: card.data().card,
      address,
      status: "requested",
      createdAt: stamp(),
    });
    tx.update(item, { status: "shipping_requested", fulfillmentId: order.id });
    return { id: order.id };
  });
});

export const fulfillShipment = wrap(async ({ auth, data }) => {
  const uid = requireAdmin(auth),
    id = text(data?.id, "order ID", 200);
  check(!id.includes("/"), "Invalid order ID");
  const carrier = text(data.carrier, "carrier", 80),
    trackingNumber = text(data.trackingNumber, "tracking number", 120);
  const store = db(),
    ref = store.doc(`fulfillments/${id}`);
  return store.runTransaction(async (tx) => {
    const order = await tx.get(ref);
    check(
      order.data()?.status === "requested",
      "This shipment is already processed or missing",
    );
    const account = await tx.get(store.doc(`wallets/${order.data().uid}`));
    check(!account.data()?.frozen, "Account is under review; do not dispatch");
    tx.update(ref, {
      status: "shipped",
      carrier,
      trackingNumber,
      shippedAt: stamp(),
      shippedBy: uid,
    });
    tx.update(
      store.doc(
        `users/${order.data().uid}/inventory/${order.data().instanceId}`,
      ),
      { status: "shipped", isShipped: true, trackingNumber, carrier },
    );
    audit(tx, uid, "shipment.shipped", id, { carrier, trackingNumber });
    return { id };
  });
});

export const cancelShipment = wrap(async ({ auth, data }) => {
  const uid = requireAdmin(auth),
    id = text(data?.id, "order ID", 200),
    reason = text(data.reason, "reason", 500);
  check(!id.includes("/"), "Invalid order ID");
  const store = db(),
    ref = store.doc(`fulfillments/${id}`);
  return store.runTransaction(async (tx) => {
    const order = await tx.get(ref);
    check(
      order.data()?.status === "requested",
      "Only pending requests can be cancelled",
    );
    tx.update(ref, {
      status: "cancelled",
      cancelReason: reason,
      updatedAt: stamp(),
    });
    tx.update(
      store.doc(
        `users/${order.data().uid}/inventory/${order.data().instanceId}`,
      ),
      { status: "available", fulfillmentId: FieldValue.delete() },
    );
    audit(tx, uid, "shipment.cancelled", id, { reason });
    return { id };
  });
});

export const getCollector = wrap(async ({ auth, data }) => {
  requireAdmin(auth);
  const uid = text(data?.uid, "collector UID", 128);
  check(!uid.includes("/"), "Invalid UID");
  const wallet = await db().doc(`wallets/${uid}`).get();
  return {
    uid,
    balanceCents: wallet.data()?.balanceCents || 0,
    frozen: wallet.data()?.frozen === true,
    reviewReason: wallet.data()?.reviewReason || "",
  };
});
export const reviewCollector = wrap(async ({ auth, data }) => {
  const actor = requireAdmin(auth),
    uid = text(data?.uid, "collector UID", 128),
    reason = text(data.reason, "review reason", 500);
  check(
    !uid.includes("/") && typeof data.frozen === "boolean",
    "Invalid review",
  );
  const store = db();
  await store.runTransaction(async (tx) => {
    const ref = store.doc(`wallets/${uid}`),
      old = await tx.get(ref);
    tx.set(
      ref,
      { frozen: data.frozen, reviewReason: reason, updatedAt: stamp() },
      { merge: true },
    );
    audit(tx, actor, "account.review", uid, {
      before: old.data()?.frozen || false,
      after: data.frozen,
      reason,
    });
  });
  return { uid, frozen: data.frozen };
});
