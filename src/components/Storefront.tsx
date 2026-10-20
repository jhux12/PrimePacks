import { useState } from "react";
import type { InventoryCard } from "../types";
import type { ManagedPack } from "../lib/catalog";
import { CrownHomeScreen } from "./CrownHomeScreen";
import { FloatingPrimeHub } from "./FloatingPrimeHub";
import { InteractiveFXCanvas } from "./InteractiveFXCanvas";
interface Props {
  packs: ManagedPack[];
  balance: number;
  onOpen: (
    pack: ManagedPack,
    quantity: number,
    requestId: string,
  ) => Promise<InventoryCard[]>;
  onFund: () => void;
  onSellCards: (items: InventoryCard[], requestId: string) => Promise<void>;
}
export function Storefront({
  packs,
  balance,
  onOpen,
  onFund,
  onSellCards,
}: Props) {
  const [category, setCategory] = useState("all");
  if (!packs.length)
    return (
      <div className="empty-state">
        <h2>No packs available yet</h2>
      </div>
    );
  return (
    <div className="original-storefront">
      <InteractiveFXCanvas />
      <FloatingPrimeHub
        balance={balance}
        activeCategory={category}
        onSelectCategory={setCategory}
        categories={[
          {
            id: "all",
            label: "All Collections",
            subtitle: "Browse all mystery packs",
            count: packs.length,
            iconName: "all",
          },
          ...(["pokemon", "sports", "vintage"] as const).map((c) => ({
            id: c,
            label:
              c === "pokemon"
                ? "Pokémon TCG"
                : c === "sports"
                  ? "Sports & Kabooms"
                  : "Vintage Grails",
            subtitle: "Browse collection",
            count: packs.filter((p) => p.category === c).length,
            iconName: c,
          })),
        ]}
        onRefillCoins={onFund}
        onOpenDailyRewards={() => {}}
        onOpenProvablyFair={() => {}}
        onOpenVault={() => {}}
        vaultCount={0}
      />
      {!packs.some((p) => category === "all" || p.category === category) ? (
        <div className="empty-state">
          <h2>No packs available yet</h2>
          <button onClick={() => setCategory("all")}>All packs</button>
        </div>
      ) : (
        <CrownHomeScreen
          packs={packs}
          balance={balance}
          onOpen={onOpen}
          onSellCards={onSellCards}
          onNavigateToUpgrader={() => {}}
          onRefillCoins={onFund}
          activeCategory={category}
          onSelectCategory={setCategory}
        />
      )}
    </div>
  );
}
