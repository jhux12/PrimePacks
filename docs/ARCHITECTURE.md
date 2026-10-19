# Commerce architecture

The React client reads the published Firestore catalog and its own wallet/inventory. Every catalog, financial, stock, and fulfillment mutation runs through authenticated Firebase callable functions. Firestore rules reject direct browser writes even from administrators. The old `pack_items` and `pack_customizations` collections are no longer public writable APIs.

## Data and guarantees

| Collection | Purpose | Access |
| --- | --- | --- |
| `packs/{id}` | Published or archived catalog, version, per-card stock and weights | Public read; server write |
| `pack_drafts/{id}` | Private candidate catalog, base catalog version and draft version | Admin read; server write |
| `wallets/{uid}` | Integer-cent balance and account hold | Owner/admin read; server write |
| `users/{uid}/inventory/{id}` | Immutable acquired card snapshot and disposition | Owner/admin read; server write |
| `users/{uid}/operations/{requestId}` | Idempotency receipt and result | Owner/admin read; server write |
| `users/{uid}/ledger/{id}` | Wallet debit/credit history | Owner/admin read; server write |
| `payments/{sessionId}` | Stripe session deduplication and payment-intent mapping | Server only |
| `payment_events/{eventId}` | Webhook event deduplication | Server only |
| `fulfillments/{id}` | Delivery address, reserved card, status and tracking | Owner/admin read; server write |
| `admin_audit/{id}` | Actor, action, target, before/after or reason | Admin read; append by server |

`openPack` validates verified account membership, the kill switch, account holds, quantity, current pack version, price and physical stock. It generates cryptographic random values once, outside the retrying Firestore transaction. The transaction atomically debits the wallet, reserves stock, writes the acquired inventory, records the exact odds snapshot, and persists an idempotency result. A repeated operation ID returns the original result. A different quantity or pack cannot reuse the same ID.

Catalog versions change when stock changes. The UI requires a fresh review if a pack changed before buying; the server repeats the version check. Each eligible card must have enough stock for the full quantity, preserving the advertised distribution even in the worst-case draw. No unavailable item is silently dropped from the odds pool. When stock is too low, purchase is rejected instead of substituting a different card.

`managePack` uses both catalog and draft versions to reject stale edits. Publishing is an intentional replacement of the entered stock allocation. Never count the same physical unit in multiple packs. There is no automatic warehouse/SKU synchronization; allocate units to a pack before publishing.

Sellback only accepts owned `available` inventory IDs; it reads the value from the stored card snapshot, floors the 95% return to cents, and marks the card sold in the same transaction as the wallet credit. It cannot sell shipped/reserved items or mint credit from a client-supplied card value. Inventory is never populated from local storage.

`requestShipment` atomically moves an owned card to `shipping_requested`. Only an admin can mark it shipped or cancel a pending request. Shipping is blocked for accounts under review, including immediately before dispatch. Cancelling a pending request returns the card to available inventory. Addresses are never stored in a public collection or browser local storage.

## Payments and holds

`createCheckout` accepts only fixed USD amounts and a caller-generated idempotency key. Stripe handles card details. The webhook verifies the signature against the raw request body, checks the paid state/currency/amount, and deduplicates both event ID and checkout session ID before crediting the wallet. Redirect query strings never grant money.

Refund/dispute events freeze the wallet. They do not guess how to claw back stock already shipped or credit already spent. Operators reconcile refunds/disputes in Stripe, review the ledger and fulfillment status, and then explicitly restore or retain the hold with an audit reason. There is no cash withdrawal endpoint. Balances are store credit, not bank balances.

The kill switch disables purchases, openings, sellbacks, and new shipping requests. Webhooks continue to settle already-paid sessions, and operators can complete or cancel existing fulfillment. A stalled webhook returns failure so Stripe retries. Alert on repeated failures and held accounts.

## Validation boundaries

Domain tests exercise exact odds boundaries, zero/invalid weights, cent arithmetic, pack validation, account permissions and address validation. The emulator suite exercises actual Firestore rules, concurrent transactions, replay, stock, sellback ownership, shipping, webhook signatures and account holds. Desktop/mobile browser tests cover UI behavior with stubbed transport. A separate browser test inside the emulator runner signs in, buys a pack, requests shipping, dispatches as admin, and observes customer tracking against the real local services. Live Stripe Checkout, production named-database deployment, live refunds, email delivery and actual parcel delivery require the separate release checks.
