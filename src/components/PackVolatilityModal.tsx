import type { Pack } from "../types";
import { X } from "lucide-react";
import { useDialog } from "../hooks/useDialog";
export type VolatilityMode = "normal" | "high" | "ultra";
export function PackVolatilityModal({
  pack,
  isOpen,
  onClose,
}: {
  pack: Pack;
  isOpen: boolean;
  currentVolatility: VolatilityMode;
  onClose: () => void;
}) {
  useDialog(isOpen, onClose);
  if (!isOpen) return null;
  const total = pack.items.reduce((sum, item) => sum + item.odds, 0);
  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/85 backdrop-blur-xl">
      <section
        role="dialog"
        aria-modal="true"
        aria-label="Published pack odds"
        className="w-full max-w-lg max-h-[85vh] overflow-auto rounded-3xl bg-[#0b0f19] border border-white/10 p-6 text-white"
      >
        <button
          className="float-right"
          onClick={onClose}
          aria-label="Close odds"
        >
          <X />
        </button>
        <h2 className="text-xl font-black">{pack.name} · Published odds</h2>
        <p className="text-sm text-slate-400 my-4">
          Every purchase uses these server-managed weights. Sellback returns 95%
          of listed value as store credit.
        </p>
        <table className="w-full text-sm">
          <thead>
            <tr>
              <th className="text-left">Card</th>
              <th>Value</th>
              <th>Chance</th>
            </tr>
          </thead>
          <tbody>
            {pack.items.map((item) => (
              <tr key={item.id} className="border-t border-white/10">
                <td className="py-3">{item.name}</td>
                <td>${item.value.toFixed(2)}</td>
                <td>
                  {total > 0 ? ((100 * item.odds) / total).toFixed(4) : "0"}%
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </section>
    </div>
  );
}
