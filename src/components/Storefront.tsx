import { useDialog } from "../hooks/useDialog";
import { useRef, useState } from "react";
import type { InventoryCard } from "../types";
import type { ManagedPack } from "../lib/catalog";
import { money, probability, errorMessage } from "../lib/catalog";
import { CardView } from "./CardView";
import { PackageOpen, ArrowRight, X, ShieldCheck } from "lucide-react";
interface Props {
  packs: ManagedPack[];
  balance: number;
  onOpen: (
    pack: ManagedPack,
    quantity: number,
    requestId: string,
  ) => Promise<InventoryCard[]>;
  onFund: () => void;
}
export function Storefront({ packs, balance, onOpen, onFund }: Props) {
  const [selected, setSelected] = useState<ManagedPack | null>(null);
  const [quantity, setQuantity] = useState(1);
  const [category, setCategory] = useState("all");
  const [results, setResults] = useState<InventoryCard[]>([]);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  useDialog(!!selected, () => setSelected(null), busy);
  const lock = useRef(false);
  const retry = useRef<{ key: string; id: string } | null>(null);
  const choose = (pack: ManagedPack) => {
    setSelected(pack);
    setQuantity(1);
    setResults([]);
    setError("");
    retry.current = null;
  };
  const buy = async () => {
    if (!selected || lock.current) return;
    lock.current = true;
    setBusy(true);
    setError("");
    // Keep the operation ID on failure: a lost response must never charge twice.
    const key = `${selected.id}:${quantity}`;
    if (retry.current?.key !== key)
      retry.current = { key, id: crypto.randomUUID() };
    try {
      const items = await onOpen(selected, quantity, retry.current.id);
      setResults(items);
      retry.current = null;
    } catch (e) {
      setError(errorMessage(e));
    } finally {
      lock.current = false;
      setBusy(false);
    }
  };
  const current = selected ? packs.find((p) => p.id === selected.id) : null;
  const shown = packs.filter(
    (p) => category === "all" || p.category === category,
  );
  return (
    <>
      <section className="brand-hero">
        <div>
          <p className="eyebrow">THE NEXT CARD IN YOUR COLLECTION</p>
          <h1>
            Your next
            <br />
            <span>prime pull.</span>
          </h1>
          <p>
            Explore the lineup. Know the odds. Keep your cards in the vault or
            request delivery to your door.
          </p>
          <a className="primary-button" href="#packs">
            Explore packs <ArrowRight size={18} />
          </a>
        </div>
        <div className="hero-art" aria-hidden="true">
          <div className="hero-card back" />
          <div className="hero-card front">
            <PackageOpen size={66} />
            <strong>
              PRIME
              <br />
              PACKS
            </strong>
            <span>THE COLLECTION STARTS HERE</span>
          </div>
          <div className="hero-seal">
            COLLECT.
            <br />
            REVEAL.
            <br />
            REPEAT.
          </div>
        </div>
      </section>
      <section className="trust-strip" aria-label="How PrimePacks works">
        <span>
          <ShieldCheck size={18} /> Published item odds
        </span>
        <span>Secure Stripe checkout</span>
        <span>Tracked US fulfillment</span>
      </section>
      <section id="packs" className="catalog-section">
        <div className="section-heading">
          <div>
            <p className="eyebrow">FIND YOUR NEXT FAVORITE</p>
            <h2>The pack lineup</h2>
          </div>
          <span>{packs.length} published packs</span>
        </div>
        <div className="filter-row">
          {["all", "pokemon", "sports", "vintage"].map((c) => (
            <button
              key={c}
              className={category === c ? "active" : ""}
              onClick={() => setCategory(c)}
            >
              {c === "pokemon" ? "Pokémon" : c[0].toUpperCase() + c.slice(1)}
            </button>
          ))}
        </div>
        {shown.length === 0 ? (
          <div className="empty-state">
            <PackageOpen size={36} />
            <h3>No packs available yet</h3>
            <p>Check back when the next collection is published.</p>
          </div>
        ) : (
          <div className="pack-grid">
            {shown.map((pack) => {
              const available = pack.items.filter((i) => i.odds > 0);
              const stocked = available.every((i) => i.stock > 0);
              return (
                <article className="pack-tile" key={pack.id}>
                  <button
                    className="pack-art"
                    style={
                      {
                        "--pack-accent": pack.colorAccent,
                      } as React.CSSProperties
                    }
                    onClick={() => choose(pack)}
                    aria-label={`View ${pack.name}`}
                  >
                    <img
                      src={pack.packCoverUrl}
                      alt=""
                      loading="lazy"
                      onError={(e) => {
                        e.currentTarget.src = "/pack-cover.svg";
                        e.currentTarget.onerror = null;
                      }}
                    />
                    <span>{pack.badgeText || pack.category}</span>
                  </button>
                  <div className="pack-info">
                    <h3>{pack.name}</h3>
                    <p>{pack.description}</p>
                    <div className="pack-price">
                      <strong>{money(pack.price)}</strong>
                      <span>{available.length} possible cards</span>
                    </div>
                    <button
                      className="secondary-button"
                      onClick={() => choose(pack)}
                    >
                      {stocked ? "View pack & odds" : "Awaiting restock"}{" "}
                      <ArrowRight size={16} />
                    </button>
                  </div>
                </article>
              );
            })}
          </div>
        )}
      </section>
      {selected && (
        <div className="modal-backdrop" role="presentation">
          <section
            className="commerce-modal"
            role="dialog"
            aria-modal="true"
            aria-labelledby="pack-heading"
          >
            <button
              className="icon-button modal-close"
              aria-label="Close pack"
              disabled={busy}
              onClick={() => setSelected(null)}
            >
              <X />
            </button>
            <p className="eyebrow">PACK DETAILS</p>
            <h2 id="pack-heading">{selected.name}</h2>
            <p>{selected.description}</p>
            {results.length > 0 ? (
              <>
                <div className="success-note" role="status">
                  Your {results.length === 1 ? "card is" : "cards are"} in your
                  vault. Sell back for store credit or request shipping from the
                  Vault tab.
                </div>
                <div className="results-grid">
                  {results.map((item) => (
                    <CardView
                      key={item.instanceId}
                      card={item.card}
                      interactive={false}
                    />
                  ))}
                </div>
                <button
                  className="primary-button"
                  onClick={() => setSelected(null)}
                >
                  Back to collection
                </button>
              </>
            ) : (
              <>
                <div className="notice">
                  Each opening awards one card. Card values are estimates.
                  Sellback returns 95% of the listed value as store credit;
                  credits cannot be withdrawn for cash. US shipping is included.
                </div>
                <h3>Published drop rates</h3>
                <div className="table-scroll">
                  <table>
                    <thead>
                      <tr>
                        <th>Card</th>
                        <th>Grade</th>
                        <th>Value</th>
                        <th>Chance</th>
                      </tr>
                    </thead>
                    <tbody>
                      {selected.items.map((item) => (
                        <tr key={item.id}>
                          <td>
                            {item.name}
                            <small>{item.set}</small>
                          </td>
                          <td>{item.grade}</td>
                          <td>{money(item.value)}</td>
                          <td>
                            {probability(selected, item.odds).toFixed(4)}%
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
                <div className="purchase-row">
                  <label>
                    Quantity
                    <select
                      value={quantity}
                      disabled={busy}
                      onChange={(e) => {
                        setQuantity(Number(e.target.value));
                        retry.current = null;
                      }}
                    >
                      {Array.from({ length: 10 }, (_, i) => (
                        <option key={i + 1}>{i + 1}</option>
                      ))}
                    </select>
                  </label>
                  <strong>{money(selected.price * quantity)}</strong>
                </div>
                {(!current || current.version !== selected.version) &&
                !retry.current ? (
                  <div className="error-note">
                    This pack changed. Close and reopen it to review the latest
                    odds.
                  </div>
                ) : (
                  <button
                    className="primary-button"
                    disabled={
                      busy ||
                      selected.items.some(
                        (i) => i.odds > 0 && i.stock < quantity,
                      )
                    }
                    onClick={buy}
                  >
                    {busy
                      ? "Confirming purchase…"
                      : `Confirm opening · ${money(selected.price * quantity)}`}
                  </button>
                )}
                {balance < selected.price * quantity && (
                  <button
                    className="text-button"
                    onClick={onFund}
                    disabled={busy}
                  >
                    Add store credit
                  </button>
                )}
                {error && (
                  <p role="alert" className="error-note">
                    {error}
                  </p>
                )}
              </>
            )}
          </section>
        </div>
      )}
    </>
  );
}
