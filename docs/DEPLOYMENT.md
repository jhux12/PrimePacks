# Deployment and live activation

Do not enable commerce until the emulator suite, browser checks, Stripe test-mode flow, catalog/stock review, and production configuration below are complete. `COMMERCE_ENABLED` defaults to false. This repository does not deploy or activate live payments automatically.

## 1. Configure the Firebase project

Use a Firebase project with billing enabled for second-generation Cloud Functions. Enable Email/Password authentication, add the production domain to authorized domains, configure email verification/password reset templates, and configure a password policy. Anonymous users cannot transact. Configure quotas, budget alerts and log retention for the project.

The repository currently uses a **named** Firestore database:

```
ai-studio-crowncardsmyster-ca43de05-44a1-4277-9d3d-a170edfe6708
```

Keep `firebase-applet-config.json.firestoreDatabaseId`, `firebase.json.firestore.database`, and the functions `FIRESTORE_DATABASE_ID` parameter identical. If choosing another project/database, replace the public Firebase config with that project's settings and change all three database references together. Do not deploy rules to `(default)` while the application uses the named database.

```sh
bun install --frozen-lockfile
npm ci --prefix functions
cp functions/.env.example functions/.env.YOUR_PROJECT_ID
```

Edit that ignored functions file with the real HTTPS site URL, public terms URL, correct database ID, and `COMMERCE_ENABLED=false`. These are non-secret parameters. Never commit service-account JSON or copy it into the frontend.

## 2. Configure Stripe securely

Confirm Stripe has approved this purchase model and complete the merchant account setup before live activation. Publish your actual business/contact, purchase/credit, refund, privacy, eligibility and shipping policies. Confirm the supported sales territory and tax handling for your business. The implementation currently supports USD and included US domestic shipping; it does not calculate tax or age/territory eligibility automatically. Keep commerce off if additional restrictions or tax collection are required until those are integrated.

Create test-mode Stripe secrets first:

```sh
firebase functions:secrets:set STRIPE_SECRET_KEY --project YOUR_PROJECT_ID
firebase functions:secrets:set STRIPE_WEBHOOK_SECRET --project YOUR_PROJECT_ID
```

Use the secure CLI prompt. Do not enter secret values in chat, Git, frontend environment variables or screenshots. Set the account's public terms/privacy/support URLs in Stripe settings; Checkout requires terms acceptance. Restrict the API key to the minimum permissions Stripe supports for Checkout.

Deploy the functions with commerce off to obtain the `stripeWebhook` HTTPS endpoint. Register these events in the matching Stripe test environment:

- `checkout.session.completed`
- `charge.refunded`
- `charge.dispute.created`

Update the webhook signing secret to the endpoint-specific secret, then redeploy the functions. The webhook needs its raw body intact; Firebase `onRequest` provides `req.rawBody`. The signature must not be disabled behind a custom proxy.

## 3. Grant an administrator role

`/admin` is the administrator entry point, including on a fresh page load. Deploy the updated functions and frontend first. The default `OWNER_ADMIN_EMAIL` is `jhuxf12@outlook.com`; sign up/sign in with that address and verify its email. The backend checks the verified token and the Firebase Auth account before granting the owner an admin claim, preserving unrelated claims, and restoring missing original pack records. Refreshing the token exposes the workspace without a manual UID lookup. An email string in a browser alone never grants access.

The owner bootstrap is available only for the server-configured email. To disable it (including before permanently revoking owner access), set `OWNER_ADMIN_EMAIL` to an empty string and redeploy functions. If Firebase admin credentials are available on a trusted operator machine, the explicit equivalent grant is:

```sh
node scripts/admin-role.mjs YOUR_PROJECT_ID jhuxf12@outlook.com grant
```

Create an account and verify its email. On a trusted operator machine with Application Default Credentials and Firebase Authentication administrator permission:

```sh
node scripts/admin-role.mjs YOUR_PROJECT_ID USER_UID grant
# To revoke:
node scripts/admin-role.mjs YOUR_PROJECT_ID USER_UID revoke
```

Sign out and sign in again after role changes. Grants preserve unrelated custom claims. There is no client-side admin password, secret logo click, public role-write document or unverified-email bypass. Do not grant roles to unverified or shared accounts.

## 4. Validate and deploy with purchases disabled

```sh
bun run lint
bun run test
npm --prefix functions run check
bun run test:emulators
bun run test:e2e
bun run build
firebase deploy --only firestore,functions,hosting --project YOUR_PROJECT_ID
```

Build without `VITE_USE_EMULATORS=true`. Firebase Hosting serves the built SPA with security headers and immutable hashed assets; preview servers are not production servers. HTTPS is required.

Only named-database rules selected in `firebase.json` are deployed. The demo emulator config deliberately uses `(default)` in its isolated project and is never the production deploy config.

## 5. Catalog and fulfillment setup

The fourteen original packs are visible immediately. Owner bootstrap or opening `/admin` as an authorized administrator restores missing server records, reuses valid legacy covers and card lists, and preserves existing published/archived records. Their stock starts at zero until verified; this does not mint inventory or enable purchases.

Open Admin, choose templates or create packs, supply owned/licensed images, confirm card condition/grade and estimated values, set the price and item weights, and enter real allocated stock. Templates have zero stock and cannot be published until eligible items are stocked. Save drafts to review probabilities and expected value, then publish. Archived packs remain in the admin catalog and reject new purchases. Existing acquired card snapshots remain unchanged.

Allocate each physical unit once. A unit cannot back inventory in two different packs. Sellback currently returns store credit and does not automatically replenish the original pack's stock: reconcile the unit's allocation before republishing stock counts. Review the current catalog version before replenishing to avoid overwriting sales.

Use a real test delivery address for end-to-end checks. The admin queue displays private addresses, supports tracking entry after actual dispatch, and can cancel pending requests for corrections. No carrier label purchase or warehouse API integration is implied. No fabricated tracking number is generated.

## 6. Release checks and live activation

Use a staging Firebase project and Stripe test mode first. Temporarily enable commerce in staging and redeploy functions, then verify:

1. An unverified account cannot create checkout, open a pack, sell inventory, or request shipping. A customer cannot read another customer's wallet, inventory, address or ledger; a non-admin cannot change catalog/stock or dispatch orders.
2. A supported Stripe test card purchases credit. Before the signed webhook arrives, redirecting to `?checkout=success` does not credit the wallet. Replay the webhook and verify there is exactly one ledger credit. Check cancelled/failed payments too.
3. Review exact card odds, confirm a pack purchase, and check wallet debit, inventory snapshot and stock decrement. Retry the same operation ID and verify there is no second debit. Attempt two simultaneous purchases with only enough funds for one.
4. Sell one acquired card. Verify its exact cent credit and that a second sell fails. Reserve a different card for shipment; selling it must fail. Enter tracking as admin and confirm the customer sees it. Cancel a pending request and verify the card becomes available again.
5. Refund a credit purchase in Stripe test mode and send a dispute test event. Verify the account hold blocks spending and dispatch, and an admin review is recorded before reactivation.
6. Check the real production domain, mobile layout, email verification/reset delivery, support/policy links in Stripe, named-database permissions, function logs, provider retry alerts, and fulfillment operating procedures. Configure retention for shipping addresses and audit records according to your business policies.

After these pass and required business/provider configuration is complete, set the live Stripe key and the live endpoint signing secret securely, register the live webhook events, set `COMMERCE_ENABLED=true`, and redeploy functions. Perform an authorized small live transaction and reconciliation before broad launch. Never treat emulator tests as proof that live credentials, taxes or merchant eligibility are configured.

Rollback/incident response: set `COMMERCE_ENABLED=false` and redeploy functions. Archive affected packs. Leave the signed webhook active to settle payments already received. Review wallet ledgers, stock allocations and fulfillment before restoring access. Do not roll back to the original public-write Firestore rules.
