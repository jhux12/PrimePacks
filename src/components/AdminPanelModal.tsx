import { useDialog } from "../hooks/useDialog";
import { useEffect, useRef, useState } from "react";
import {
  collection,
  onSnapshot,
  orderBy,
  query,
  limit,
  where,
} from "firebase/firestore";
import { db, callApi } from "../lib/firebase";
import { PACKS, ALL_CARDS } from "../data/cards";
import { validatePack } from "../../functions/src/domain.js";
import type { ManagedPack } from "../lib/catalog";
import {
  money,
  expectedValue,
  probability,
  errorMessage,
} from "../lib/catalog";
import { X, Plus, Save, Upload, Archive, ClipboardList } from "lucide-react";
interface Audit {
  id: string;
  actor: string;
  action: string;
  target: string;
}
interface Fulfillment {
  id: string;
  uid: string;
  status: string;
  card: { name: string };
  address: Record<string, string>;
  carrier?: string;
  trackingNumber?: string;
}
type Draft = ManagedPack & { baseVersion?: number; draftVersion?: number };
const newPack = (): Draft => ({
  id: `pack-${crypto.randomUUID().slice(0, 8)}`,
  name: "New collection",
  slug: "new-collection",
  description: "Describe this pack and its collection.",
  price: 10,
  category: "pokemon",
  tier: "standard",
  colorAccent: "#dcb65c",
  packCoverUrl: "/pack-cover.svg",
  items: [],
  status: "archived",
  version: 0,
});
export function AdminPanelModal({
  packs,
  onClose,
}: {
  packs: ManagedPack[];
  onClose: () => void;
}) {
  const [tab, setTab] = useState<
    "packs" | "fulfillment" | "accounts" | "audit"
  >("packs");
  const [drafts, setDrafts] = useState<Draft[]>([]);
  const [draft, setDraft] = useState<Draft | null>(null);
  const [jsonText, setJsonText] = useState("");
  const [jsonDirty, setJsonDirty] = useState(false);
  useEffect(() => {
    if (!jsonDirty) setJsonText(JSON.stringify(draft?.items || [], null, 2));
  }, [draft?.items, jsonDirty]);
  const [orders, setOrders] = useState<Fulfillment[]>([]);
  const [fulfillmentStatus, setFulfillmentStatus] = useState("requested");
  const [audit, setAudit] = useState<Audit[]>([]);
  const [busy, setBusy] = useState(false);
  useDialog(true, onClose, busy);
  const lock = useRef(false);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const [search, setSearch] = useState("");
  const [tracking, setTracking] = useState<
    Record<string, { carrier: string; number: string }>
  >({});
  const [collectorUid, setCollectorUid] = useState("");
  const [collector, setCollector] = useState<{
    uid: string;
    balanceCents: number;
    frozen: boolean;
    reviewReason: string;
  } | null>(null);
  const [reviewReason, setReviewReason] = useState("");
  const [cardId, setCardId] = useState(ALL_CARDS[0].id);
  useEffect(() => {
    const fail = (e: unknown) => setError(errorMessage(e));
    const unsub = [
      onSnapshot(
        collection(db, "pack_drafts"),
        (snap) => {
          const rows = snap.docs.flatMap((d) => {
            try {
              validatePack(d.data());
              return [
                {
                  ...d.data(),
                  id: d.id,
                  version: d.data().baseVersion || 0,
                  status: "archived",
                } as Draft,
              ];
            } catch {
              return [];
            }
          });
          setDrafts(rows);
          if (rows.length !== snap.docs.length)
            setError(
              "An invalid saved draft was excluded. Restore it from audit history before editing.",
            );
        },
        fail,
      ),
      onSnapshot(
        query(
          collection(db, "fulfillments"),
          where("status", "==", fulfillmentStatus),
          orderBy(
            "createdAt",
            fulfillmentStatus === "requested" ? "asc" : "desc",
          ),
          limit(100),
        ),
        (snap) =>
          setOrders(
            snap.docs.map((d) => ({ ...d.data(), id: d.id }) as Fulfillment),
          ),
        fail,
      ),
      onSnapshot(
        query(
          collection(db, "admin_audit"),
          orderBy("createdAt", "desc"),
          limit(100),
        ),
        (snap) =>
          setAudit(snap.docs.map((d) => ({ ...d.data(), id: d.id }) as Audit)),
        fail,
      ),
    ];
    return () => unsub.forEach((u) => u());
  }, [fulfillmentStatus]);
  async function run(operation: () => Promise<void>) {
    if (lock.current) return;
    lock.current = true;
    setBusy(true);
    setError("");
    setMessage("");
    try {
      await operation();
    } catch (e) {
      setError(errorMessage(e));
    } finally {
      lock.current = false;
      setBusy(false);
    }
  }
  const edit = (pack: Draft) => {
    setDraft(structuredClone(pack));
    setJsonDirty(false);
    setError("");
    setMessage("");
  };
  const available = [
    ...packs.filter((p) => !drafts.some((d) => d.id === p.id)),
    ...drafts,
  ].filter((p) => p.name.toLowerCase().includes(search.toLowerCase()));
  const valid = (() => {
    try {
      if (!draft) return false;
      validatePack(draft);
      return true;
    } catch {
      return false;
    }
  })();
  async function save(action: "draft" | "publish" | "archive") {
    if (!draft) return;
    if (jsonDirty) {
      setError(
        "Apply or discard the pending JSON edits before saving the pack.",
      );
      return;
    }
    await run(async () => {
      validatePack(draft);
      const response = await callApi<{ version: number; draftVersion: number }>(
        "managePack",
        {
          pack: draft,
          action,
          expectedVersion: draft.version,
          expectedDraftVersion: draft.draftVersion || 0,
        },
      );
      setDraft({
        ...draft,
        version: response.version,
        draftVersion: response.draftVersion,
        status: action === "publish" ? "published" : "archived",
      });
      setMessage(
        action === "draft"
          ? "Draft saved. Public pack unchanged."
          : action === "publish"
            ? "Pack published with these exact weights and stock counts."
            : "Pack archived. New purchases are disabled.",
      );
    });
  }
  return (
    <div className="modal-backdrop admin-backdrop">
      <section
        className="admin-panel"
        role="dialog"
        aria-modal="true"
        aria-labelledby="admin-title"
      >
        <header className="admin-header">
          <div>
            <p className="eyebrow">PRIMEPACKS OPERATIONS</p>
            <h2 id="admin-title">Admin workspace</h2>
          </div>
          <button
            className="icon-button"
            aria-label="Close administration"
            onClick={onClose}
            disabled={busy}
          >
            <X />
          </button>
        </header>
        <div className="admin-tabs">
          {(["packs", "fulfillment", "accounts", "audit"] as const).map((t) => (
            <button
              key={t}
              className={tab === t ? "active" : ""}
              onClick={() => setTab(t)}
            >
              {t === "packs"
                ? "Packs & odds"
                : t === "fulfillment"
                  ? "Fulfillment"
                  : t === "accounts"
                    ? "Account reviews"
                    : "Audit history"}
            </button>
          ))}
        </div>
        {error && (
          <p className="error-note" role="alert">
            {error}
          </p>
        )}
        {message && (
          <p className="success-note" role="status">
            {message}
          </p>
        )}
        {tab === "packs" && (
          <div className="admin-layout">
            <aside>
              <label>
                Find a pack
                <input
                  placeholder="Search packs"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                />
              </label>
              <button
                className="primary-button"
                onClick={() => edit(newPack())}
                disabled={busy}
              >
                <Plus size={16} /> New pack
              </button>
              {available.map((p) => (
                <button
                  disabled={busy}
                  className={`admin-pack ${draft?.id === p.id ? "active" : ""}`}
                  key={p.id}
                  onClick={() => edit(p)}
                >
                  <strong>{p.name}</strong>
                  <small>
                    {drafts.some((d) => d.id === p.id) ? "Draft" : p.status} ·{" "}
                    {money(p.price)}
                  </small>
                </button>
              ))}
              <details>
                <summary>Start from a template</summary>
                <p>
                  Templates are drafts only. Verify card values, images, rights
                  and physical stock before publishing.
                </p>
                {PACKS.map((p) => (
                  <button
                    disabled={busy}
                    className="admin-pack"
                    key={p.id}
                    onClick={() =>
                      edit({
                        ...p,
                        packCoverUrl: "/pack-cover.svg",
                        items: p.items.map((i) => ({ ...i, stock: 0 })),
                        status: "archived",
                        version: packs.find((c) => c.id === p.id)?.version || 0,
                      })
                    }
                  >
                    {p.name}
                  </button>
                ))}
              </details>
            </aside>
            <div className="admin-editor">
              {!draft ? (
                <div className="empty-state">
                  <ClipboardList size={36} />
                  <h3>Build your next collection</h3>
                  <p>
                    Create a pack or choose a template to manage its content,
                    odds and stock.
                  </p>
                </div>
              ) : (
                <>
                  <div className="button-row">
                    <span className="muted">
                      Editing catalog version {draft.version}
                    </span>
                    <button
                      className="text-button"
                      disabled={busy}
                      onClick={() => {
                        const current = packs.find((p) => p.id === draft.id);
                        if (current)
                          edit({
                            ...current,
                            draftVersion:
                              drafts.find((p) => p.id === draft.id)
                                ?.draftVersion || 0,
                          });
                      }}
                    >
                      Reload published version (discard edits)
                    </button>
                  </div>
                  <div className="form-grid">
                    <label>
                      Pack ID
                      <input
                        value={draft.id}
                        disabled={draft.version > 0 || busy}
                        maxLength={64}
                        onChange={(e) =>
                          setDraft({ ...draft, id: e.target.value })
                        }
                      />
                    </label>
                    <label>
                      Name
                      <input
                        value={draft.name}
                        disabled={busy}
                        onChange={(e) =>
                          setDraft({ ...draft, name: e.target.value })
                        }
                      />
                    </label>
                    <label>
                      Slug
                      <input
                        value={draft.slug}
                        disabled={busy}
                        onChange={(e) =>
                          setDraft({ ...draft, slug: e.target.value })
                        }
                      />
                    </label>
                    <label>
                      Price (USD)
                      <input
                        type="number"
                        min="0.50"
                        step="0.01"
                        value={draft.price}
                        disabled={busy}
                        onChange={(e) =>
                          setDraft({ ...draft, price: Number(e.target.value) })
                        }
                      />
                    </label>
                    <label>
                      Category
                      <select
                        value={draft.category}
                        disabled={busy}
                        onChange={(e) =>
                          setDraft({
                            ...draft,
                            category: e.target.value as Draft["category"],
                          })
                        }
                      >
                        {["pokemon", "sports", "vintage", "all"].map((v) => (
                          <option key={v}>{v}</option>
                        ))}
                      </select>
                    </label>
                    <label>
                      Tier
                      <select
                        value={draft.tier}
                        disabled={busy}
                        onChange={(e) =>
                          setDraft({
                            ...draft,
                            tier: e.target.value as Draft["tier"],
                          })
                        }
                      >
                        {["budget", "standard", "high_roller", "whale"].map(
                          (v) => (
                            <option key={v}>{v}</option>
                          ),
                        )}
                      </select>
                    </label>
                    <label>
                      Accent
                      <input
                        type="color"
                        value={draft.colorAccent}
                        disabled={busy}
                        onChange={(e) =>
                          setDraft({ ...draft, colorAccent: e.target.value })
                        }
                      />
                    </label>
                    <label>
                      Badge
                      <input
                        value={draft.badgeText || ""}
                        maxLength={40}
                        disabled={busy}
                        onChange={(e) =>
                          setDraft({ ...draft, badgeText: e.target.value })
                        }
                      />
                    </label>
                  </div>
                  <label>
                    Description
                    <textarea
                      value={draft.description}
                      maxLength={2000}
                      disabled={busy}
                      onChange={(e) =>
                        setDraft({ ...draft, description: e.target.value })
                      }
                    />
                  </label>
                  <label>
                    Cover image (HTTPS or /pack-cover.svg)
                    <input
                      type="text"
                      value={draft.packCoverUrl || ""}
                      disabled={busy}
                      onChange={(e) =>
                        setDraft({ ...draft, packCoverUrl: e.target.value })
                      }
                    />
                  </label>
                  <div className="section-heading">
                    <h3>Cards, odds & inventory</h3>
                    <span>{draft.items.length}/100 cards</span>
                  </div>
                  <p className="muted">
                    Weights are relative. Zero disables a card. Probabilities
                    below are the exact probabilities used by the server.
                    Publishing replaces the listed stock counts; catalog
                    versions prevent overwriting intervening sales.
                  </p>
                  <div className="table-scroll">
                    <table>
                      <thead>
                        <tr>
                          <th>Card</th>
                          <th>Value</th>
                          <th>Weight</th>
                          <th>Chance</th>
                          <th>Stock</th>
                          <th />
                        </tr>
                      </thead>
                      <tbody>
                        {draft.items.map((item, index) => (
                          <tr key={item.id}>
                            <td>
                              {item.name}
                              <small>{item.grade}</small>
                            </td>
                            <td>
                              <input
                                aria-label={`Value for ${item.name}`}
                                type="number"
                                min="0"
                                step="0.01"
                                value={item.value}
                                disabled={busy}
                                onChange={(e) =>
                                  setDraft({
                                    ...draft,
                                    items: draft.items.map((i, n) =>
                                      n === index
                                        ? {
                                            ...i,
                                            value: Number(e.target.value),
                                            usdValue: Number(e.target.value),
                                          }
                                        : i,
                                    ),
                                  })
                                }
                              />
                            </td>
                            <td>
                              <input
                                aria-label={`Weight for ${item.name}`}
                                type="number"
                                min="0"
                                step="0.0001"
                                value={item.odds}
                                disabled={busy}
                                onChange={(e) =>
                                  setDraft({
                                    ...draft,
                                    items: draft.items.map((i, n) =>
                                      n === index
                                        ? { ...i, odds: Number(e.target.value) }
                                        : i,
                                    ),
                                  })
                                }
                              />
                            </td>
                            <td>
                              {valid
                                ? probability(draft, item.odds).toFixed(4)
                                : "—"}
                              %
                            </td>
                            <td>
                              <input
                                aria-label={`Stock for ${item.name}`}
                                type="number"
                                min="0"
                                step="1"
                                value={item.stock}
                                disabled={busy}
                                onChange={(e) =>
                                  setDraft({
                                    ...draft,
                                    items: draft.items.map((i, n) =>
                                      n === index
                                        ? {
                                            ...i,
                                            stock: Number(e.target.value),
                                          }
                                        : i,
                                    ),
                                  })
                                }
                              />
                            </td>
                            <td>
                              <button
                                className="icon-button"
                                aria-label={`Remove ${item.name}`}
                                disabled={busy}
                                onClick={() =>
                                  setDraft({
                                    ...draft,
                                    items: draft.items.filter(
                                      (_, n) => n !== index,
                                    ),
                                  })
                                }
                              >
                                <X size={14} />
                              </button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                  <div className="button-row">
                    <select
                      aria-label="Card catalog"
                      value={cardId}
                      onChange={(e) => setCardId(e.target.value)}
                      disabled={busy}
                    >
                      {ALL_CARDS.map((c) => (
                        <option key={c.id} value={c.id}>
                          {c.name} · {c.grade}
                        </option>
                      ))}
                    </select>
                    <button
                      className="secondary-button"
                      disabled={busy || draft.items.length >= 100}
                      onClick={() => {
                        const c = ALL_CARDS.find((c) => c.id === cardId)!;
                        setDraft({
                          ...draft,
                          items: [
                            ...draft.items,
                            {
                              ...c,
                              id: `card-${crypto.randomUUID().slice(0, 16)}`,
                              stock: 0,
                            },
                          ],
                        });
                      }}
                    >
                      Add card
                    </button>
                  </div>
                  <details>
                    <summary>Custom card / advanced JSON editor</summary>
                    <p>
                      Use the same card fields as the catalog, plus an integer
                      stock count. Validation runs before every save.
                    </p>
                    <textarea
                      aria-label="Pack items JSON"
                      value={jsonText}
                      rows={12}
                      disabled={busy}
                      onChange={(e) => {
                        setJsonText(e.target.value);
                        setJsonDirty(true);
                      }}
                    />
                    <div className="button-row">
                      <button
                        className="secondary-button"
                        disabled={busy || !jsonDirty}
                        onClick={() => {
                          try {
                            const items = JSON.parse(jsonText);
                            validatePack({ ...draft, items });
                            setDraft({ ...draft, items });
                            setJsonDirty(false);
                            setError("");
                          } catch (e) {
                            setError(errorMessage(e));
                          }
                        }}
                      >
                        Apply card JSON
                      </button>
                      <button
                        className="text-button"
                        disabled={busy || !jsonDirty}
                        onClick={() => setJsonDirty(false)}
                      >
                        Discard JSON edits
                      </button>
                    </div>
                  </details>
                  <div className="metrics">
                    <span>
                      Expected card value{" "}
                      <strong>
                        {valid ? money(expectedValue(draft)) : "—"}
                      </strong>
                    </span>
                    <span>
                      Listed value / price{" "}
                      <strong>
                        {valid
                          ? `${((expectedValue(draft) / draft.price) * 100).toFixed(2)}%`
                          : "—"}
                      </strong>
                    </span>
                    <span>
                      Version <strong>{draft.version}</strong>
                    </span>
                  </div>
                  <p className="notice">
                    Publish only cards you can fulfill. Each physical unit must
                    be allocated to one pack inventory. Packs pause
                    automatically when any eligible card lacks stock for the
                    requested quantity.
                  </p>
                  <div className="button-row">
                    <button
                      className="secondary-button"
                      disabled={busy}
                      onClick={() => save("draft")}
                    >
                      <Save size={16} /> Save draft
                    </button>
                    <button
                      className="primary-button"
                      disabled={busy}
                      onClick={() => save("publish")}
                    >
                      <Upload size={16} /> Publish pack
                    </button>
                    <button
                      className="danger-button"
                      disabled={busy || draft.version === 0}
                      onClick={() => save("archive")}
                    >
                      <Archive size={16} /> Archive
                    </button>
                  </div>
                </>
              )}
            </div>
          </div>
        )}
        {tab === "fulfillment" && (
          <div>
            <label>
              Request status
              <select
                value={fulfillmentStatus}
                onChange={(e) => setFulfillmentStatus(e.target.value)}
              >
                <option value="requested">Pending — oldest first</option>
                <option value="shipped">Shipped</option>
                <option value="cancelled">Cancelled</option>
              </select>
            </label>
            <p className="muted">
              Pending requests are shown oldest first (up to 100). Shipped and
              cancelled requests show the latest 100. Addresses are private to
              the customer and administrators.
            </p>
            {orders.length === 0 ? (
              <div className="empty-state">No fulfillment requests yet.</div>
            ) : (
              orders.map((order) => (
                <article className="fulfillment-card" key={order.id}>
                  <div>
                    <small>{order.id}</small>
                    <h3>{order.card.name}</h3>
                    <p>
                      {order.address.name}
                      <br />
                      {order.address.street}
                      <br />
                      {order.address.city}, {order.address.state}{" "}
                      {order.address.zip}
                      <br />
                      {order.address.country}
                    </p>
                    <strong>{order.status}</strong>
                  </div>
                  {order.status === "requested" ? (
                    <form
                      onSubmit={(e) => {
                        e.preventDefault();
                        run(async () => {
                          await callApi("fulfillShipment", {
                            id: order.id,
                            carrier: tracking[order.id]?.carrier,
                            trackingNumber: tracking[order.id]?.number,
                          });
                          setMessage(
                            "Shipment marked as dispatched. Tracking is visible to the customer.",
                          );
                        });
                      }}
                    >
                      <label>
                        Carrier
                        <input
                          required
                          value={tracking[order.id]?.carrier || ""}
                          onChange={(e) =>
                            setTracking({
                              ...tracking,
                              [order.id]: {
                                ...tracking[order.id],
                                carrier: e.target.value,
                              },
                            })
                          }
                        />
                      </label>
                      <label>
                        Tracking number
                        <input
                          required
                          value={tracking[order.id]?.number || ""}
                          onChange={(e) =>
                            setTracking({
                              ...tracking,
                              [order.id]: {
                                ...tracking[order.id],
                                number: e.target.value,
                              },
                            })
                          }
                        />
                      </label>
                      <button className="primary-button" disabled={busy}>
                        Mark shipped
                      </button>
                      <button
                        type="button"
                        className="text-button"
                        disabled={busy}
                        onClick={() => {
                          const reason = window.prompt(
                            "Reason for cancelling this shipping request (card returns to the vault):",
                          );
                          if (reason?.trim())
                            run(async () => {
                              await callApi("cancelShipment", {
                                id: order.id,
                                reason,
                              });
                              setMessage(
                                "Shipping request cancelled. Card returned to the collector vault.",
                              );
                            });
                        }}
                      >
                        Cancel request / correct address
                      </button>
                    </form>
                  ) : (
                    <p>
                      {order.carrier} · {order.trackingNumber}
                    </p>
                  )}
                </article>
              ))
            )}
          </div>
        )}
        {tab === "accounts" && (
          <section>
            <h3>Collector account review</h3>
            <p className="muted">
              Refund and dispute notifications freeze affected accounts
              automatically. Reconcile the payment in Stripe before restoring
              access. Every review is audited.
            </p>
            <form
              onSubmit={(e) => {
                e.preventDefault();
                run(async () =>
                  setCollector(
                    await callApi("getCollector", { uid: collectorUid }),
                  ),
                );
              }}
            >
              <label>
                Collector UID
                <input
                  required
                  value={collectorUid}
                  onChange={(e) => {
                    setCollectorUid(e.target.value);
                    setCollector(null);
                  }}
                />
              </label>
              <button className="secondary-button" disabled={busy}>
                Look up account
              </button>
            </form>
            {collector && (
              <div className="account-card">
                <p>{collector.uid}</p>
                <strong>{money(collector.balanceCents / 100)}</strong>
                <p>
                  {collector.frozen ? "Frozen for review" : "Active"} ·{" "}
                  {collector.reviewReason}
                </p>
                <form
                  onSubmit={(e) => {
                    e.preventDefault();
                    run(async () => {
                      await callApi("reviewCollector", {
                        uid: collector.uid,
                        frozen: !collector.frozen,
                        reason: reviewReason,
                      });
                      setCollector({
                        ...collector,
                        frozen: !collector.frozen,
                        reviewReason,
                      });
                      setMessage("Account review saved.");
                    });
                  }}
                >
                  <label>
                    Reason for review
                    <textarea
                      required
                      value={reviewReason}
                      onChange={(e) => setReviewReason(e.target.value)}
                    />
                  </label>
                  <button className="primary-button" disabled={busy}>
                    {collector.frozen
                      ? "Restore account access"
                      : "Freeze account"}
                  </button>
                </form>
              </div>
            )}
          </section>
        )}
        {tab === "audit" && (
          <>
            <p className="muted">
              Latest 100 administrative changes. History is written by the
              server and cannot be edited by browser clients.
            </p>
            <div className="table-scroll">
              <table>
                <thead>
                  <tr>
                    <th>Action</th>
                    <th>Target</th>
                    <th>Administrator UID</th>
                  </tr>
                </thead>
                <tbody>
                  {audit.map((entry) => (
                    <tr key={entry.id}>
                      <td>{entry.action}</td>
                      <td>{entry.target}</td>
                      <td>{entry.actor}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </>
        )}
      </section>
    </div>
  );
}
