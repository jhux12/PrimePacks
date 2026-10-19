import { useDialog } from "./hooks/useDialog";
import { lazy, Suspense, useEffect, useRef, useState } from "react";
import {
  collection,
  doc,
  limit,
  onSnapshot,
  orderBy,
  query,
  where,
} from "firebase/firestore";
import type { User } from "firebase/auth";
import {
  db,
  callApi,
  subscribeToAuth,
  logOutUser,
  signInWithEmail,
  signUpWithEmail,
  verifyEmail,
  resetPassword,
} from "./lib/firebase";
import type { InventoryCard } from "./types";
import { parsePack, money, errorMessage } from "./lib/catalog";
import type { ManagedPack } from "./lib/catalog";
import { Storefront } from "./components/Storefront";
import { AccountVault, Shipment } from "./components/AccountVault";
const AdminPanelModal = lazy(() =>
  import("./components/AdminPanelModal").then((module) => ({
    default: module.AdminPanelModal,
  })),
);
import { PrimePacksLogo } from "./components/PrimePacksLogo";
import {
  ArrowUpRight,
  LogOut,
  ShieldCheck,
  X,
  AlertCircle,
} from "lucide-react";
import "./commerce.css";
interface LedgerEntry {
  id: string;
  kind: string;
  amountCents: number;
  balanceCents: number;
}
export default function App() {
  const [user, setUser] = useState<User | null>(null);
  const [isAdmin, setIsAdmin] = useState(false);
  const [authReady, setAuthReady] = useState(false);
  const [packs, setPacks] = useState<ManagedPack[]>([]);
  const [catalogReady, setCatalogReady] = useState(false);
  const [catalogError, setCatalogError] = useState("");
  const [wallet, setWallet] = useState({ balanceCents: 0, frozen: false });
  const [inventory, setInventory] = useState<InventoryCard[]>([]);
  const [orders, setOrders] = useState<Shipment[]>([]);
  const [ledger, setLedger] = useState<LedgerEntry[]>([]);
  const [tab, setTab] = useState<"packs" | "vault" | "account">("packs");
  const [adminOpen, setAdminOpen] = useState(false);
  const [modal, setModal] = useState<"auth" | "fund" | null>(null);
  const [mode, setMode] = useState<"signin" | "signup">("signin");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [name, setName] = useState("");
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState(false);
  const busyRef = useRef(false);
  const [amount, setAmount] = useState(2500);
  const checkoutId = useRef<string | null>(null);
  useEffect(() => {
    let active = true;
    let generation = 0;
    const stop = subscribeToAuth(async (current) => {
      const serial = ++generation;
      setUser(current);
      setIsAdmin(false);
      setAdminOpen(false);
      setAuthReady(true);
      if (current) {
        try {
          const token = await current.getIdTokenResult();
          if (active && serial === generation)
            setIsAdmin(
              token.claims.admin === true &&
                token.claims.email_verified === true,
            );
        } catch {
          if (active)
            setError("Unable to verify account permissions. Sign in again.");
        }
      }
    });
    return () => {
      active = false;
      stop();
    };
  }, []);
  useEffect(
    () =>
      onSnapshot(
        collection(db, "packs"),
        (snapshot) => {
          try {
            setPacks(
              snapshot.docs.map((d) => {
                const pack = parsePack(d.data());
                if (pack.id !== d.id) throw Error("Catalog ID mismatch");
                return pack;
              }),
            );
            setCatalogError("");
          } catch {
            setPacks([]);
            setCatalogError(
              "The catalog is temporarily unavailable. Please try again later.",
            );
          }
          setCatalogReady(true);
        },
        () => {
          setCatalogReady(true);
          setCatalogError(
            "The catalog is temporarily unavailable. Please try again later.",
          );
        },
      ),
    [],
  );
  useEffect(() => {
    setWallet({ balanceCents: 0, frozen: false });
    setInventory([]);
    setOrders([]);
    setLedger([]);
    if (!user) return;
    const fail = () =>
      setError(
        "Unable to sync your account. Check your connection before making a purchase.",
      );
    const stops = [
      onSnapshot(
        doc(db, "wallets", user.uid),
        (snap) =>
          setWallet({
            balanceCents: snap.data()?.balanceCents || 0,
            frozen: snap.data()?.frozen === true,
          }),
        fail,
      ),
      onSnapshot(
        query(
          collection(db, "users", user.uid, "inventory"),
          orderBy("pulledAt", "desc"),
        ),
        (snap) =>
          setInventory(
            snap.docs.map(
              (d) => ({ ...d.data(), instanceId: d.id }) as InventoryCard,
            ),
          ),
        fail,
      ),
      onSnapshot(
        query(collection(db, "fulfillments"), where("uid", "==", user.uid)),
        (snap) =>
          setOrders(
            snap.docs.map((d) => ({ ...d.data(), id: d.id }) as Shipment),
          ),
        fail,
      ),
      onSnapshot(
        query(
          collection(db, "users", user.uid, "ledger"),
          orderBy("createdAt", "desc"),
          limit(50),
        ),
        (snap) =>
          setLedger(
            snap.docs.map((d) => ({ ...d.data(), id: d.id }) as LedgerEntry),
          ),
        fail,
      ),
    ];
    return () => stops.forEach((stop) => stop());
  }, [user?.uid]);
  useEffect(() => {
    const status = new URLSearchParams(location.search).get("checkout");
    if (status === "success")
      setMessage(
        "Checkout completed. Store credit will appear after payment confirmation.",
      );
    if (status === "cancelled")
      setMessage("Checkout cancelled. No store credit was added.");
  }, []);
  async function run(action: () => Promise<void>) {
    if (busyRef.current) return;
    busyRef.current = true;
    setBusy(true);
    setError("");
    setMessage("");
    try {
      await action();
    } catch (e) {
      setError(errorMessage(e));
    } finally {
      busyRef.current = false;
      setBusy(false);
    }
  }
  const member = () => {
    if (!user) {
      setModal("auth");
      throw Error("Sign in before making a purchase.");
    }
    if (!user.emailVerified)
      throw Error("Verify your email address before making a purchase.");
    if (wallet.frozen)
      throw Error("Your account is under review. Contact support.");
  };
  const fund = () => {
    setError("");
    checkoutId.current = null;
    setModal(user ? "fund" : "auth");
  };
  useDialog(modal !== null, () => setModal(null), busy);
  const published = packs.filter((p) => p.status === "published");
  return (
    <div className="commerce-app">
      <div className="announcement">
        COLLECT WITH CLARITY{" "}
        <span>Published odds. Real cards. Your next PrimePack.</span>
      </div>
      <header className="site-header">
        <button
          className="brand-button"
          aria-label="PrimePacks home"
          onClick={() => setTab("packs")}
        >
          <PrimePacksLogo size="lg" glow={false} />
        </button>
        <nav aria-label="Main navigation">
          {(["packs", "vault", "account"] as const).map((t) => (
            <button
              className={tab === t ? "active" : ""}
              onClick={() => setTab(t)}
              key={t}
            >
              {t === "vault"
                ? `Vault (${inventory.filter((i) => i.status !== "sold").length})`
                : t[0].toUpperCase() + t.slice(1)}
            </button>
          ))}
          {isAdmin && <button onClick={() => setAdminOpen(true)}>Admin</button>}
        </nav>
        <div className="header-actions">
          <button
            className="wallet-button"
            onClick={fund}
            aria-label="Add store credit"
          >
            <small>STORE CREDIT</small>
            <strong>{money(wallet.balanceCents / 100)}</strong>
            <span>+</span>
          </button>
          {!user && (
            <button
              className="primary-button small"
              disabled={!authReady}
              onClick={() => {
                setModal("auth");
                setError("");
              }}
            >
              Sign in
            </button>
          )}
        </div>
      </header>
      {message && (
        <div className="page-notice success-note" role="status">
          {message}
        </div>
      )}
      {error && (
        <div className="page-notice error-note" role="alert">
          <AlertCircle size={16} />
          {error}
          <button
            className="text-button"
            aria-label="Dismiss error"
            onClick={() => setError("")}
          >
            Dismiss
          </button>
        </div>
      )}
      {wallet.frozen && (
        <p className="page-notice error-note">
          Your account is under review. Purchases, sellbacks and shipping
          requests are paused.
        </p>
      )}
      <main>
        {tab === "packs" &&
          (!catalogReady ? (
            <div className="empty-state" role="status">
              Loading the collection…
            </div>
          ) : catalogError ? (
            <div className="empty-state" role="alert">
              {catalogError}
            </div>
          ) : (
            <Storefront
              packs={published}
              balance={wallet.balanceCents / 100}
              onFund={fund}
              onOpen={async (pack, quantity, requestId) => {
                member();
                const result = await callApi<{ items: InventoryCard[] }>(
                  "openPack",
                  {
                    packId: pack.id,
                    quantity,
                    expectedVersion: pack.version,
                    requestId,
                  },
                );
                return result.items;
              }}
            />
          ))}
        {tab === "vault" &&
          (user ? (
            <AccountVault
              key={user.uid}
              items={inventory.filter((i) => i.status !== "sold")}
              orders={orders}
            />
          ) : (
            <div className="empty-state">
              <h1>Your collection, securely stored</h1>
              <p>Sign in to view your cards and shipping requests.</p>
              <button
                className="primary-button"
                onClick={() => setModal("auth")}
              >
                Sign in
              </button>
            </div>
          ))}
        {tab === "account" && (
          <section className="catalog-section">
            <p className="eyebrow">YOUR PRIMEPACKS ACCOUNT</p>
            <h1 className="page-title">Collector profile</h1>
            {user ? (
              <>
                <div className="account-card">
                  <h2>{user.displayName || "Prime Collector"}</h2>
                  <p>{user.email}</p>
                  <p>
                    <ShieldCheck size={16} />{" "}
                    {user.emailVerified
                      ? "Email verified"
                      : "Email verification required"}
                  </p>
                  <strong>
                    {money(wallet.balanceCents / 100)} store credit
                  </strong>
                  <div className="button-row">
                    <button className="primary-button" onClick={fund}>
                      Add credit <ArrowUpRight size={16} />
                    </button>
                    {!user.emailVerified && (
                      <>
                        <button
                          className="secondary-button"
                          disabled={busy}
                          onClick={() =>
                            run(async () => {
                              await verifyEmail();
                              setMessage("Verification email sent.");
                            })
                          }
                        >
                          Send verification email
                        </button>
                        <button
                          className="secondary-button"
                          disabled={busy}
                          onClick={() =>
                            run(async () => {
                              await user.reload();
                              await user.getIdToken(true);
                              setMessage("Account refreshed.");
                            })
                          }
                        >
                          I verified my email
                        </button>
                      </>
                    )}
                    <button
                      className="secondary-button"
                      disabled={busy}
                      onClick={() =>
                        run(async () => {
                          await logOutUser();
                          setTab("packs");
                        })
                      }
                    >
                      <LogOut size={16} /> Sign out
                    </button>
                  </div>
                </div>
                <h2 className="subheading">Store credit activity</h2>
                <p className="muted">
                  Latest 50 entries. Credits are for purchases on PrimePacks and
                  have no cash withdrawal option.
                </p>
                <div className="table-scroll">
                  <table>
                    <thead>
                      <tr>
                        <th>Activity</th>
                        <th>Amount</th>
                        <th>Balance after</th>
                      </tr>
                    </thead>
                    <tbody>
                      {ledger.map((l) => (
                        <tr key={l.id}>
                          <td>{l.kind.replaceAll("_", " ")}</td>
                          <td>{money(l.amountCents / 100)}</td>
                          <td>{money(l.balanceCents / 100)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </>
            ) : (
              <div className="empty-state">
                <p>Sign in or create your collector account.</p>
                <button
                  className="primary-button"
                  onClick={() => setModal("auth")}
                >
                  Sign in
                </button>
              </div>
            )}
          </section>
        )}
      </main>
      <footer className="site-footer">
        <PrimePacksLogo size="sm" glow={false} />
        <p>Know the odds. Build your collection.</p>
        <small>
          Card values are estimates. Store credit is not redeemable for cash.
          Shipping is currently available within the United States.
        </small>
        <span>© {new Date().getFullYear()} PrimePacks</span>
      </footer>
      {modal && (
        <div className="modal-backdrop">
          <section
            className="commerce-modal compact"
            role="dialog"
            aria-modal="true"
            aria-labelledby="account-modal-title"
          >
            <button
              className="icon-button modal-close"
              aria-label="Close account dialog"
              disabled={busy}
              onClick={() => setModal(null)}
            >
              <X />
            </button>
            {modal === "auth" ? (
              <>
                <p className="eyebrow">WELCOME TO THE COLLECTION</p>
                <h2 id="account-modal-title">
                  {mode === "signin"
                    ? "Good to see you."
                    : "Become a Prime collector."}
                </h2>
                <form
                  onSubmit={(e) => {
                    e.preventDefault();
                    run(async () => {
                      if (mode === "signup") {
                        await signUpWithEmail(email, password, name);
                        setMessage(
                          "Account created. Check your inbox to verify your email before purchasing.",
                        );
                      } else await signInWithEmail(email, password);
                      setModal(null);
                    });
                  }}
                >
                  {mode === "signup" && (
                    <label>
                      Collector name
                      <input
                        required
                        autoComplete="nickname"
                        maxLength={100}
                        value={name}
                        onChange={(e) => setName(e.target.value)}
                      />
                    </label>
                  )}
                  <label>
                    Email
                    <input
                      type="email"
                      required
                      autoComplete="email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                    />
                  </label>
                  <label>
                    Password
                    <input
                      type="password"
                      required
                      minLength={mode === "signup" ? 12 : 1}
                      autoComplete={
                        mode === "signup" ? "new-password" : "current-password"
                      }
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                    />
                  </label>
                  <button className="primary-button" disabled={busy}>
                    {busy
                      ? "Please wait…"
                      : mode === "signin"
                        ? "Sign in"
                        : "Create account"}
                  </button>
                </form>
                <button
                  className="text-button"
                  disabled={busy}
                  onClick={() => {
                    setMode(mode === "signin" ? "signup" : "signin");
                    setError("");
                  }}
                >
                  {mode === "signin"
                    ? "New here? Create an account"
                    : "Already a collector? Sign in"}
                </button>
                <button
                  className="text-button"
                  disabled={busy || !email}
                  onClick={() =>
                    run(async () => {
                      await resetPassword(email);
                      setMessage(
                        "If an account exists, a password reset email has been sent.",
                      );
                    })
                  }
                >
                  Reset password
                </button>
              </>
            ) : (
              <>
                <p className="eyebrow">SECURE STRIPE CHECKOUT</p>
                <h2 id="account-modal-title">Add store credit</h2>
                <p>
                  1 USD = 1 USD in store credit. Store credit cannot be
                  withdrawn for cash. Your balance updates after the payment is
                  confirmed.
                </p>
                <label>
                  Credit amount
                  <select
                    value={amount}
                    disabled={busy}
                    onChange={(e) => {
                      setAmount(Number(e.target.value));
                      checkoutId.current = null;
                    }}
                  >
                    {[1000, 2500, 5000, 10000, 25000].map((v) => (
                      <option value={v} key={v}>
                        {money(v / 100)}
                      </option>
                    ))}
                  </select>
                </label>
                <button
                  className="primary-button"
                  disabled={busy}
                  onClick={() =>
                    run(async () => {
                      member();
                      checkoutId.current ||= crypto.randomUUID();
                      const result = await callApi<{ url: string }>(
                        "createCheckout",
                        { amountCents: amount, requestId: checkoutId.current },
                      );
                      const url = new URL(result.url);
                      if (
                        url.protocol !== "https:" ||
                        url.hostname !== "checkout.stripe.com"
                      )
                        throw Error("Invalid checkout destination");
                      location.assign(url.href);
                    })
                  }
                >
                  {busy
                    ? "Opening checkout…"
                    : `Continue to checkout · ${money(amount / 100)}`}
                </button>
              </>
            )}
            {error && (
              <p role="alert" className="error-note">
                {error}
              </p>
            )}
            {message && (
              <p role="status" className="success-note">
                {message}
              </p>
            )}
          </section>
        </div>
      )}
      {adminOpen && isAdmin && (
        <Suspense
          fallback={
            <div className="modal-backdrop">
              <p role="status">Loading admin workspace…</p>
            </div>
          }
        >
          <AdminPanelModal packs={packs} onClose={() => setAdminOpen(false)} />
        </Suspense>
      )}
    </div>
  );
}
