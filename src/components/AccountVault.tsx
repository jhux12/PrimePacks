import { useDialog } from "../hooks/useDialog";
import { useRef, useState } from "react";
import type { InventoryCard } from "../types";
import { money, errorMessage } from "../lib/catalog";
import { callApi } from "../lib/firebase";
import { Package, Truck, X } from "lucide-react";
export interface Shipment {
  id: string;
  instanceId: string;
  status: string;
  card: { name: string };
  carrier?: string;
  trackingNumber?: string;
}
export function AccountVault({
  items,
  orders,
}: {
  items: InventoryCard[];
  orders: Shipment[];
}) {
  const [shipping, setShipping] = useState<InventoryCard | null>(null);
  const [busy, setBusy] = useState(false);
  const lock = useRef(false);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const [address, setAddress] = useState({
    name: "",
    street: "",
    city: "",
    state: "",
    zip: "",
    country: "US",
  });
  useDialog(!!shipping, () => setShipping(null), busy);
  const pending = useRef(new Map<string, string>());
  async function execute(
    key: string,
    command: string,
    data: Record<string, unknown>,
  ) {
    if (lock.current) return false;
    lock.current = true;
    setBusy(true);
    setError("");
    setMessage("");
    if (!pending.current.has(key))
      pending.current.set(key, crypto.randomUUID());
    try {
      await callApi(command, { ...data, requestId: pending.current.get(key) });
      pending.current.delete(key);
      return true;
    } catch (e) {
      setError(errorMessage(e));
      return false;
    } finally {
      setBusy(false);
      lock.current = false;
    }
  }
  return (
    <section className="catalog-section">
      <p className="eyebrow">YOUR COLLECTION, ALL IN ONE PLACE</p>
      <h1 className="page-title">The vault</h1>
      <p className="muted">
        Your cards belong to your account. Shipping is available in the United
        States and included in pack pricing.
      </p>
      {message && (
        <p className="success-note" role="status">
          {message}
        </p>
      )}
      {error && (
        <p className="error-note" role="alert">
          {error}
        </p>
      )}
      {items.length === 0 ? (
        <div className="empty-state">
          <Package size={36} />
          <h3>Your collection starts here</h3>
          <p>Cards from your pack openings will appear in your vault.</p>
        </div>
      ) : (
        <div className="vault-grid">
          {items.map((item) => (
            <article className="vault-tile" key={item.instanceId}>
              <img
                src={item.card.imageUrl}
                alt={item.card.name}
                loading="lazy"
              />
              <div>
                <small>
                  {item.card.grade} · {item.card.rarity}
                </small>
                <h3>{item.card.name}</h3>
                <strong>{money(item.card.value)}</strong>
                <p>
                  {item.status === "available"
                    ? "In your vault"
                    : item.status === "shipping_requested"
                      ? "Shipping requested"
                      : item.status === "shipped"
                        ? `Shipped · ${item.carrier || ""} ${item.trackingNumber || ""}`
                        : "Sold for store credit"}
                </p>
                {item.status === "available" && (
                  <div className="button-row">
                    <button
                      className="secondary-button"
                      disabled={busy}
                      onClick={async () => {
                        if (
                          await execute(
                            `sell:${item.instanceId}`,
                            "sellInventory",
                            { instanceIds: [item.instanceId] },
                          )
                        )
                          setMessage(
                            "Sellback confirmed. Your store credit balance has been updated.",
                          );
                      }}
                    >
                      Sell for{" "}
                      {money(
                        Math.floor(Math.round(item.card.value * 100) * 0.95) /
                          100,
                      )}
                    </button>
                    <button
                      className="secondary-button"
                      disabled={busy}
                      onClick={() => {
                        setShipping(item);
                        setError("");
                      }}
                    >
                      Ship card <Truck size={14} />
                    </button>
                  </div>
                )}
              </div>
            </article>
          ))}
        </div>
      )}
      {orders.length > 0 && (
        <>
          <h2 className="subheading">Shipping requests</h2>
          <div className="table-scroll">
            <table>
              <thead>
                <tr>
                  <th>Card</th>
                  <th>Status</th>
                  <th>Tracking</th>
                </tr>
              </thead>
              <tbody>
                {orders.map((order) => (
                  <tr key={order.id}>
                    <td>{order.card.name}</td>
                    <td>{order.status}</td>
                    <td>
                      {order.carrier}{" "}
                      {order.trackingNumber || "Awaiting dispatch"}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      )}
      {shipping && (
        <div className="modal-backdrop">
          <section
            className="commerce-modal compact"
            role="dialog"
            aria-modal="true"
            aria-labelledby="shipping-title"
          >
            <button
              className="icon-button modal-close"
              aria-label="Close shipping form"
              disabled={busy}
              onClick={() => setShipping(null)}
            >
              <X />
            </button>
            <h2 id="shipping-title">Ship {shipping.card.name}</h2>
            <p>
              Enter a US delivery address. Confirming reserves this card for
              fulfillment, so it can no longer be sold.
            </p>
            <form
              onSubmit={async (e) => {
                e.preventDefault();
                if (
                  await execute(
                    `ship:${shipping.instanceId}`,
                    "requestShipment",
                    { instanceId: shipping.instanceId, address },
                  )
                ) {
                  setShipping(null);
                  setMessage(
                    "Shipping requested. Your tracking details will appear here after dispatch.",
                  );
                }
              }}
            >
              {(["name", "street", "city", "state", "zip"] as const).map(
                (field) => (
                  <label key={field}>
                    {
                      {
                        name: "Full name",
                        street: "Street address",
                        city: "City",
                        state: "State (2 letters)",
                        zip: "ZIP code",
                      }[field]
                    }
                    <input
                      required
                      maxLength={field === "state" ? 2 : 200}
                      autoComplete={
                        {
                          name: "name",
                          street: "street-address",
                          city: "address-level2",
                          state: "address-level1",
                          zip: "postal-code",
                        }[field]
                      }
                      value={address[field]}
                      onChange={(e) =>
                        setAddress({
                          ...address,
                          [field]:
                            field === "state"
                              ? e.target.value.toUpperCase()
                              : e.target.value,
                        })
                      }
                    />
                  </label>
                ),
              )}
              <p>United States · Shipping included</p>
              <button disabled={busy} className="primary-button">
                {busy ? "Requesting…" : "Confirm shipping request"}
              </button>
              {error && (
                <p className="error-note" role="alert">
                  {error}
                </p>
              )}
            </form>
          </section>
        </div>
      )}
    </section>
  );
}
