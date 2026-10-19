import { test, expect, type Page } from "@playwright/test";
import originalPacks from "../functions/src/legacy-packs.json" with { type: "json" };
const card = {
  id: "test-card",
  name: "Launch Charizard",
  set: "Launch set",
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
};
const pack = {
  id: "launch-pack",
  name: "Launch Test Pack",
  slug: "launch-test",
  description: "A collection for the next prime pull.",
  price: 1,
  category: "pokemon",
  tier: "budget",
  colorAccent: "#dcb65c",
  packCoverUrl: "https://example.com/pack.png",
  items: [
    card,
    { ...card, id: "second-card", name: "Launch Pikachu", odds: 3 },
  ],
  status: "published",
  version: 1,
};
// Browser tests stub transport, not commerce rules. The independent emulator suite exercises real transactions and access control.
async function fixture(
  page: Page,
  role: "visitor" | "member" | "admin" = "visitor",
  fail = false,
) {
  await page.addInitScript(
    ({ role, pack, originals }) => {
      (window as any).__fixtureRole = role;
      (window as any).__data = {
        packs: [
          ...originals.map((p) => ({
            ...p,
            status: "archived",
            version: 1,
            items: p.items.map((i) => ({ ...i, stock: 0 })),
          })),
          pack,
        ],
        pack_drafts: [],
        fulfillments: [],
        admin_audit: [],
        ["wallets/test-user"]: { balanceCents: 1000, frozen: false },
        ["users/test-user/inventory"]: [],
        ["users/test-user/ledger"]: [],
      };
      (window as any).__listeners = [];
    },
    { role, pack, originals: originalPacks },
  );
  await page.route("**/src/lib/firebase.ts", (route) =>
    route.fulfill({
      contentType: "application/javascript",
      body: `
 export const db={};export const auth={};let observer;
 const user={uid:'test-user',email:'collector@example.com',emailVerified:true,displayName:'Collector',getIdTokenResult:async()=>({claims:{admin:window.__fixtureRole==='admin',email_verified:true}})};
 export const subscribeToAuth=cb=>{observer=cb;queueMicrotask(()=>cb(window.__fixtureRole==='visitor'?null:user));return()=>{}};
 export const logOutUser=async()=>observer(null);
 export const signInWithEmail=async()=>observer(user);export const signUpWithEmail=signInWithEmail;export const verifyEmail=async()=>{};export const resetPassword=async()=>{};
 export const callApi=async(name,data)=>{const response=await fetch('/fixture-api/'+name,{method:'POST',body:JSON.stringify(data)});const body=await response.json();if(!response.ok)throw Error(body.message);if(body.items){window.__data['users/test-user/inventory']=body.items;window.__listeners.forEach(f=>f());}return body;};`,
    }),
  );
  await page.route("**/firebase_firestore.js*", (route) =>
    route.fulfill({
      contentType: "application/javascript",
      body: `
 export const collection=(_db,...path)=>({path:path.join('/'),kind:'collection'});export const doc=(_db,...path)=>({path:path.join('/'),kind:'doc'});export const query=(ref,...args)=>ref;export const where=()=>({});export const orderBy=()=>({});export const limit=()=>({});
 export function onSnapshot(ref,callback){let active=true;const emit=()=>{if(!active)return;const data=window.__data[ref.path]||(ref.kind==='doc'?{}:[]);callback(ref.kind==='doc'?{data:()=>data}:{docs:data.map((d,i)=>({id:d.id||d.instanceId||String(i),data:()=>d}))});};window.__listeners.push(emit);queueMicrotask(emit);return()=>{active=false;};}
 `,
    }),
  );
  await page.route("**/fixture-api/**", async (route) => {
    if (fail)
      return route.fulfill({
        status: 503,
        json: { message: "Service unavailable. Retry safely." },
      });
    const data = route.request().postDataJSON();
    if (route.request().url().endsWith("openPack"))
      return route.fulfill({
        json: {
          items: Array.from({ length: data.quantity }, (_, i) => ({
            instanceId: `instance-${i}`,
            card,
            pulledAt: Date.now(),
            packName: pack.name,
            status: "available",
          })),
          balanceCents: 900,
        },
      });
    return route.fulfill({ json: { id: "order-1", version: 2 } });
  });
  await page.goto("/");
  await expect(
    page.getByRole("heading", { name: "The pack lineup" }),
  ).toBeVisible();
}
test("branded storefront renders without fake balances, fairness or admin access", async ({
  page,
}) => {
  const errors: string[] = [];
  page.on("pageerror", (e) => errors.push(e.message));
  await fixture(page);
  await expect(
    page.getByRole("heading", { name: "Your next prime pull." }),
  ).toBeVisible();
  await expect(
    page.getByRole("button", { name: "Add store credit" }),
  ).toContainText("$0.00");
  await expect(
    page.getByRole("button", { name: "Admin", exact: true }),
  ).toHaveCount(0);
  await expect(page.getByText("100% PROVABLY FAIR")).toHaveCount(0);
  expect(errors).toEqual([]);
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth,
    ),
  ).toBe(true);
  await page.screenshot({
    path: `/tmp/primepacks-${test.info().project.name}.png`,
    fullPage: true,
  });
});
test("category filtering has an honest empty state", async ({ page }) => {
  await fixture(page);
  await page.getByRole("button", { name: "Sports", exact: true }).click();
  await expect(
    page.getByRole("heading", { name: "No packs available yet" }),
  ).toBeVisible();
  await expect(
    page.getByRole("heading", { name: "Launch Test Pack" }),
  ).toHaveCount(0);
});
test("published odds normalize weights instead of inventing rarity rates", async ({
  page,
}) => {
  await fixture(page);
  await page.getByRole("button", { name: "View pack & odds" }).click();
  const dialog = page.getByRole("dialog");
  await expect(dialog.getByText("25.0000%")).toBeVisible();
  await expect(dialog.getByText("75.0000%")).toBeVisible();
  await expect(
    dialog.getByText("Each opening awards one card.", { exact: false }),
  ).toBeVisible();
});
test("a successful server opening appears in the account vault", async ({
  page,
}) => {
  await fixture(page, "member");
  await page.getByRole("button", { name: "View pack & odds" }).click();
  await page.getByRole("button", { name: "Confirm opening · $1.00" }).click();
  await expect(page.getByRole("status")).toContainText(
    "Your card is in your vault",
  );
  await page.getByRole("button", { name: "Back to collection" }).click();
  await page.getByRole("button", { name: "Vault (1)" }).click();
  await expect(
    page.getByRole("heading", { name: "Launch Charizard" }),
  ).toBeVisible();
  await expect(page.getByRole("button", { name: "Ship card" })).toBeVisible();
});
test("failed openings do not invent cards and retries preserve the operation ID", async ({
  page,
}) => {
  await fixture(page, "member", true);
  const ids: string[] = [];
  page.on("request", (r) => {
    if (r.url().endsWith("/fixture-api/openPack"))
      ids.push(r.postDataJSON().requestId);
  });
  await page.getByRole("button", { name: "View pack & odds" }).click();
  await page.getByRole("button", { name: "Confirm opening · $1.00" }).click();
  await expect(page.getByRole("alert")).toContainText("Retry safely");
  await page.getByRole("button", { name: "Confirm opening · $1.00" }).click();
  await expect.poll(() => ids.length).toBe(2);
  expect(ids[0]).toBe(ids[1]);
  await expect(page.getByText("Your card is in your vault")).toHaveCount(0);
});
test("admins edit exact weights and stock before publishing", async ({
  page,
}) => {
  await fixture(page, "admin");
  await page.getByRole("button", { name: "Admin", exact: true }).click();
  await page
    .getByRole("button", { name: "Launch Test Pack published · $1.00" })
    .click();
  await page
    .getByRole("spinbutton", { name: "Weight for Launch Charizard" })
    .fill("3");
  await expect(page.getByRole("cell", { name: "50.0000%" })).toHaveCount(2);
  const request = page.waitForRequest("**/fixture-api/managePack");
  await page.getByRole("button", { name: "Publish pack" }).click();
  const payload = (await request).postDataJSON();
  expect(payload.pack.items[0].odds).toBe(3);
  expect(payload.expectedVersion).toBe(1);
  await expect(page.getByRole("status")).toContainText("Pack published");
});
test("shipping form requires a real address and reports backend failures", async ({
  page,
}) => {
  await fixture(page, "member");
  await page.getByRole("button", { name: "View pack & odds" }).click();
  await page.getByRole("button", { name: "Confirm opening · $1.00" }).click();
  await page.getByRole("button", { name: "Back to collection" }).click();
  await page.getByRole("button", { name: "Vault (1)" }).click();
  await page.getByRole("button", { name: "Ship card" }).click();
  await expect(page.getByLabel("Full name")).toHaveValue("");
  await expect(page.getByLabel("Street address")).toHaveValue("");
  await page.getByLabel("Full name").fill("Test Collector");
  await page.getByLabel("Street address").fill("1 Test Street");
  await page.getByLabel("City", { exact: true }).fill("Los Angeles");
  await page.getByLabel("State (2 letters)").fill("ca");
  await page.getByLabel("ZIP code").fill("90210");
  await page.route("**/fixture-api/requestShipment", (route) =>
    route.fulfill({
      status: 503,
      json: { message: "Shipping temporarily unavailable" },
    }),
  );
  await page.getByRole("button", { name: "Confirm shipping request" }).click();
  await expect(page.getByRole("dialog").getByRole("alert")).toContainText(
    "Shipping temporarily unavailable",
  );
  await expect(page.getByRole("dialog")).toBeVisible();
});

test("restores the original fourteen packs when the live collection is empty", async ({
  page,
}) => {
  await fixture(page);
  await page.evaluate(() => {
    (window as any).__data.packs = [];
    (window as any).__listeners.forEach((emit: () => void) => emit());
  });
  await expect(
    page.getByRole("heading", { name: "Pokémon Starter Pack" }),
  ).toBeVisible();
  await expect(page.locator(".pack-tile")).toHaveCount(14);
  await expect(
    page.getByRole("button", { name: "Awaiting restock" }),
  ).toHaveCount(14);
});
test("admin URL requires authentication and cannot grant a customer privileges", async ({
  page,
}) => {
  await fixture(page, "member");
  await page.goto("/admin");
  await expect(
    page.getByRole("heading", { name: "Admin sign in" }),
  ).toBeVisible();
  await expect(
    page.getByText(
      "This account does not currently have administrator access.",
    ),
  ).toBeVisible();
  await expect(
    page.getByRole("heading", { name: "Admin workspace" }),
  ).toHaveCount(0);
});
test("verified administrators can load the workspace directly at admin URL", async ({
  page,
}) => {
  await fixture(page, "admin");
  await page.goto("/admin");
  await expect(
    page.getByRole("heading", { name: "Admin workspace" }),
  ).toBeVisible();
  await page.getByRole("button", { name: "Close administration" }).click();
  await expect(page).toHaveURL("/");
});
