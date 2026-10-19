import { test, expect, type Page } from "@playwright/test";
import { createRequire } from "node:module";
import { randomUUID } from "node:crypto";
const require = createRequire(
  new URL("../functions/package.json", import.meta.url),
);
const { initializeApp, deleteApp } = require("firebase-admin/app");
const { getAuth } = require("firebase-admin/auth");
const { getFirestore } = require("firebase-admin/firestore");
const password = "Local-browser-test-password-123";
let app: any, memberEmail: string, adminEmail: string;
const packId = "browser-integration-pack";
test.beforeAll(async () => {
  if (
    !process.env.FIRESTORE_EMULATOR_HOST ||
    !process.env.FIREBASE_AUTH_EMULATOR_HOST
  )
    throw Error(
      "Run through test:emulators; live services must never be used.",
    );
  app = initializeApp({ projectId: "demo-primepacks" }, "browser-fixture");
  const auth = getAuth(app),
    db = getFirestore(app);
  memberEmail = `member-${randomUUID()}@example.com`;
  adminEmail = `admin-${randomUUID()}@example.com`;
  const [member, admin] = await Promise.all([
    auth.createUser({ email: memberEmail, password, emailVerified: true }),
    auth.createUser({ email: adminEmail, password, emailVerified: true }),
  ]);
  await auth.setCustomUserClaims(admin.uid, { admin: true });
  for (const name of ["packs", "pack_drafts"]) {
    const previous = await db.collection(name).get();
    await Promise.all(
      previous.docs.map((document: any) => document.ref.delete()),
    );
  }
  await db
    .doc(`wallets/${member.uid}`)
    .set({ balanceCents: 1000, frozen: false });
  await db.doc(`packs/${packId}`).set({
    id: packId,
    name: "Browser Release Pack",
    slug: "browser-release",
    description: "A local release-validation pack.",
    price: 1,
    category: "pokemon",
    tier: "budget",
    colorAccent: "#dcb65c",
    packCoverUrl: "https://example.com/pack.svg",
    status: "published",
    version: 1,
    items: [
      {
        id: "browser-card",
        name: "Browser Release Card",
        set: "Local test set",
        number: "1",
        year: "2026",
        rarity: "Rare",
        grade: "Raw",
        category: "pokemon",
        value: 2.5,
        usdValue: 2.5,
        imageUrl: "https://example.com/card.png",
        odds: 1,
        stock: 10,
      },
    ],
  });
});
test.afterAll(async () => {
  if (app) await deleteApp(app);
});
async function login(page: Page, email: string) {
  await page.goto("/");
  await page.getByRole("button", { name: "Sign in", exact: true }).click();
  const dialog = page.getByRole("dialog");
  await dialog.getByLabel("Email", { exact: true }).fill(email);
  await dialog.getByLabel("Password", { exact: true }).fill(password);
  await dialog.getByRole("button", { name: "Sign in", exact: true }).click();
  await expect(dialog).toHaveCount(0);
}
test("real Firebase purchase, vault reservation, admin fulfillment and customer tracking", async ({
  page,
  browser,
}) => {
  const errors: string[] = [];
  page.on("pageerror", (e) => errors.push(e.message));
  await login(page, memberEmail);
  await expect(
    page.getByRole("button", { name: "Add store credit" }),
  ).toContainText("$10.00");
  const tile = page.locator("article").filter({
    has: page.getByRole("heading", { name: "Browser Release Pack" }),
  });
  await tile.getByRole("button", { name: "View pack & odds" }).click();
  await page.getByRole("button", { name: "Confirm opening · $1.00" }).click();
  await expect(page.getByRole("status")).toContainText(
    "Your card is in your vault",
  );
  await expect(
    page.getByRole("button", { name: "Add store credit" }),
  ).toContainText("$9.00");
  await page.getByRole("button", { name: "Back to collection" }).click();
  await page.getByRole("button", { name: "Vault (1)" }).click();
  await page.getByRole("button", { name: "Ship card" }).click();
  await page.getByLabel("Full name").fill("Local Test Collector");
  await page.getByLabel("Street address").fill("1 Local Test Street");
  await page.getByLabel("City", { exact: true }).fill("Los Angeles");
  await page.getByLabel("State (2 letters)").fill("CA");
  await page.getByLabel("ZIP code").fill("90210");
  await page.getByRole("button", { name: "Confirm shipping request" }).click();
  await expect(page.getByRole("dialog")).toHaveCount(0);
  await expect(
    page.getByText("Shipping requested", { exact: true }),
  ).toBeVisible();
  const context = await browser.newContext();
  const admin = await context.newPage();
  await login(admin, adminEmail);
  await admin.getByRole("button", { name: "Admin", exact: true }).click();
  await admin.getByRole("button", { name: "Fulfillment", exact: true }).click();
  const order = admin.locator(".fulfillment-card").filter({
    has: admin.getByRole("heading", { name: "Browser Release Card" }),
  });
  await expect(order).toContainText("Local Test Collector");
  await order.getByLabel("Carrier", { exact: true }).fill("LOCAL TEST CARRIER");
  await order
    .getByLabel("Tracking number", { exact: true })
    .fill("LOCAL-TEST-TRACKING-123");
  await order.getByRole("button", { name: "Mark shipped" }).click();
  await expect(admin.getByRole("status")).toContainText(
    "Shipment marked as dispatched",
  );
  await expect(page.locator(".vault-tile")).toContainText(
    "LOCAL-TEST-TRACKING-123",
  );
  await context.close();
  expect(errors).toEqual([]);
});
