# PrimePacks

Collectible-card storefront with published item odds, Firebase account wallets and inventory, Stripe-hosted store-credit checkout, and manual tracked fulfillment. The interface uses the PrimePacks gold/obsidian brand. This replaces the original browser-only simulation; old local balances and inventory are **not** migrated into financial accounts.

## Development

Use Node 22 (the Cloud Functions deployment runtime), Bun 1.4.3, and Java 21 for Firebase emulator tests. The cloud workspace currently also supports Node 24 for local development.

```sh
bun install --frozen-lockfile
npm ci --prefix functions
bun run dev
```

The frontend runs on port 3000. Public Firebase project settings are in `firebase-applet-config.json`; these are not administrator credentials. No payment secrets belong in the frontend or in `VITE_*` variables. The fourteen original packs remain visible as a baseline when the new catalog is empty or unavailable. Existing published records override that baseline, including archived packs. Restored packs start with zero verified physical stock; browsing does not imply that purchases are enabled.

```sh
bun run lint                  # TypeScript
bun run test                  # Domain / odds / money / permission validation
npm --prefix functions run check
bunx playwright install chromium
bun run test:emulators         # Real services: rules, transactions, and purchase-to-tracking browser flow
bun run test:e2e               # Desktop/mobile interface tests using stubbed transport
bun run build
```

On emulator-test failure, the runner names the failed stage and saves its full output under `test-artifacts/emulators/`. CI uploads those logs, browser screenshots, and traces in the `browser-test-results` artifact.

Browser tests deliberately stub transport; they do not establish payment settlement or backend security. The emulator tests, including the real purchase-to-tracking browser flow, use an isolated `demo-primepacks` project and local fixture signing keys; they never call live Stripe. The runner refuses to overwrite an existing emulator config or local secret file. Firebase emulator downloads need `storage.googleapis.com`. `PRIMEPACKS_EXTERNAL_FIRESTORE=1` can use an already-running, verified official Firestore emulator at `127.0.0.1:8080` while Firebase CLI runs Auth and Functions.

See [deployment and launch validation](docs/DEPLOYMENT.md) and [architecture and invariants](docs/ARCHITECTURE.md).

## Admin operations

Open `/admin` directly, or use the Admin button after authorization. Verified users need a server-issued Firebase `admin: true` custom claim. The configured owner, `jhuxf12@outlook.com`, can bootstrap that claim after signing in with a verified email: the backend checks both the authenticated token and the current Firebase Auth record. Other accounts cannot self-promote. A privileged operator can also grant/revoke roles by UID or email using `scripts/admin-role.mjs`. Set `OWNER_ADMIN_EMAIL` to an empty value to disable owner self-bootstrap before permanently revoking the owner role.

Opening `/admin` as an administrator restores missing original catalog records and their valid legacy `pack_customizations` / `pack_items` settings. This operation is idempotent, audited, preserves all existing records (including archives), and never invents physical stock. The default owner bootstrap also restores those records.

- **Packs & odds:** create packs; edit names, descriptions, categories, pricing, artwork, cards, stock, and relative weights; save private drafts; publish or archive. Templates start with zero physical stock. Custom card data can be edited as JSON and is validated on the server.
- **Fulfillment:** view private delivery addresses, enter carrier/tracking, dispatch, or cancel pending requests to return a card to the vault.
- **Account reviews:** look up a collector UID, freeze or restore access with an audit reason. Refunds/disputes automatically freeze affected wallets until reconciled in Stripe.
- **Audit history:** inspect the latest 100 administrative changes. Browser clients cannot alter audit records.

Published odds are `item weight / total weight`. Zero-weight items cannot win. The server uses cryptographic randomness and awards an actual configured card without changing its value or rarity. This is not advertised as a cryptographic commit/reveal fairness protocol.

## Current scope

USD store credit, card-only Stripe Checkout, one card per opening, optional 95% sellback to store credit, and included domestic US shipping. No cash withdrawal, multiplayer battles, upgrader wagers, free balance minting, simulated live drops, or simulated shipment tracking. Those prototype features are excluded from the paid application.

Commerce defaults **off**. A code build or passing emulator suite is not live activation. Stripe onboarding, merchant approval for the purchase model, policies/tax configuration, Firebase production access, verified stock, and the live release checks in the deployment guide remain operator responsibilities.
