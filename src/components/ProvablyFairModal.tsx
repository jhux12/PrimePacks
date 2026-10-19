import React, { useState } from 'react';
import { generateRandomSeed, hashString } from '../utils/provablyFair';
import { ShieldCheck, Copy, Check, RefreshCw, X } from 'lucide-react';

interface ProvablyFairModalProps {
  clientSeed: string;
  serverSeed: string;
  nonce: number;
  onUpdateClientSeed: (newSeed: string) => void;
  onClose: () => void;
}

export const ProvablyFairModal: React.FC<ProvablyFairModalProps> = ({
  clientSeed,
  serverSeed,
  nonce,
  onUpdateClientSeed,
  onClose
}) => {
  const [copied, setCopied] = useState<string | null>(null);
  const [customClientSeed, setCustomClientSeed] = useState(clientSeed);
  const serverSeedHash = hashString(serverSeed);

  const handleCopy = (text: string, label: string) => {
    navigator.clipboard.writeText(text);
    setCopied(label);
    setTimeout(() => setCopied(null), 2000);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/85 backdrop-blur-xl animate-fade-in select-none">
      <div className="bg-[#090d18] border border-white/10 rounded-3xl p-6 sm:p-7 max-w-lg w-full shadow-2xl relative max-h-[90vh] overflow-y-auto">
        <button
          onClick={onClose}
          className="absolute top-4 right-4 w-9 h-9 flex items-center justify-center rounded-xl bg-slate-900 border border-white/10 text-slate-400 hover:text-white"
          aria-label="Close"
        >
          <X className="w-5 h-5" />
        </button>

        <div className="flex items-center gap-2 mb-2">
          <ShieldCheck className="w-6 h-6 text-emerald-400" />
          <h2 className="text-lg font-black text-white font-display">PROVABLY FAIR VERIFIER</h2>
        </div>
        <p className="text-xs text-slate-400 mb-6">
          Every pack rip and roulette spin is mathematically deterministic and cryptographically verified.
          The outcome is established before the roll using an unalterable SHA-256 seed combination.
        </p>

        <div className="space-y-4 text-xs">
          {/* Server Seed Hash */}
          <div>
            <div className="flex items-center justify-between mb-1">
              <span className="font-semibold text-slate-300">Server Seed Hash (Pre-committed SHA-256)</span>
              <button
                onClick={() => handleCopy(serverSeedHash, 'hash')}
                className="text-amber-400 hover:text-amber-300 flex items-center gap-1"
              >
                {copied === 'hash' ? <Check className="w-3 h-3" /> : <Copy className="w-3 h-3" />}
                <span>{copied === 'hash' ? 'Copied' : 'Copy'}</span>
              </button>
            </div>
            <div className="p-2.5 rounded-xl bg-slate-950 border border-slate-800 font-mono text-slate-400 break-all select-all text-[11px]">
              {serverSeedHash}
            </div>
          </div>

          {/* Client Seed */}
          <div>
            <div className="flex items-center justify-between mb-1">
              <span className="font-semibold text-slate-300">Your Client Seed</span>
              <button
                onClick={() => {
                  const gen = generateRandomSeed(16);
                  setCustomClientSeed(gen);
                  onUpdateClientSeed(gen);
                }}
                className="text-amber-400 hover:text-amber-300 flex items-center gap-1"
              >
                <RefreshCw className="w-3 h-3" />
                <span>Randomize</span>
              </button>
            </div>
            <div className="flex gap-2">
              <input
                type="text"
                value={customClientSeed}
                onChange={(e) => setCustomClientSeed(e.target.value)}
                className="flex-1 px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl font-mono text-slate-200 focus:outline-none focus:border-amber-500"
              />
              <button
                onClick={() => onUpdateClientSeed(customClientSeed)}
                className="px-4 py-2 rounded-xl bg-amber-500 hover:bg-amber-400 text-black font-bold font-display text-xs"
              >
                Save
              </button>
            </div>
          </div>

          {/* Nonce */}
          <div className="flex items-center justify-between p-3 rounded-xl bg-slate-950 border border-slate-800">
            <span className="font-semibold text-slate-300">Current Roll Nonce (Spins count)</span>
            <span className="font-mono text-amber-400 font-black text-sm">{nonce}</span>
          </div>

          {/* Explanation formula */}
          <div className="p-3 rounded-xl bg-slate-900 border border-slate-800 text-[11px] text-slate-400 space-y-1">
            <div className="text-slate-300 font-bold">Calculation Formula:</div>
            <div className="font-mono text-emerald-400">
              Roll Float = HMAC_SHA256(ServerSeed, ClientSeed + ":" + Nonce)
            </div>
            <div>
              Because the server seed hash is published before you roll and you control your client seed,
              outcomes can never be manipulated.
            </div>
          </div>
        </div>

        <div className="mt-6 flex justify-end">
          <button
            onClick={onClose}
            className="px-5 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-semibold"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};
