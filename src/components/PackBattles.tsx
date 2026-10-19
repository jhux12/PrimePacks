import React, { useState, useEffect } from 'react';
import { Pack, CardItem } from '../types';
import { CardView } from './CardView';
import { PACKS } from '../data/cards';
import { rollCardFromPack, generateRandomSeed } from '../utils/provablyFair';
import {
  playCardReveal,
  playHitChime,
  playGrailFanfare,
  playPackRip,
  playHapticTap
} from '../utils/sound';
import { fxSystem } from '../utils/interactiveFX';
import confetti from 'canvas-confetti';
import { Swords, Trophy, Sparkles, Plus, Play, RotateCcw, ShieldCheck, Flame } from 'lucide-react';

interface PackBattlesProps {
  balance: number;
  onDeductBalance: (amount: number) => boolean;
  onAddCardsToVault: (cards: CardItem[]) => void;
  onRecordBattleWin: (won: boolean) => void;
}

interface BattleLobby {
  id: string;
  name: string;
  botName: string;
  botAvatar: string;
  packs: Pack[];
  totalCost: number;
  mode: 'standard' | 'crazy';
}

const PRESET_BATTLES: BattleLobby[] = [
  {
    id: 'battle-rookie',
    name: 'Starter Skirmish (1 Round)',
    botName: 'RipRookie_24',
    botAvatar: 'R',
    packs: [PACKS[0]],
    totalCost: 1,
    mode: 'standard'
  },
  {
    id: 'battle-select-clash',
    name: 'Select 1000x Showdown (2 Rounds)',
    botName: 'PokeKing_Slabs',
    botAvatar: 'P',
    packs: [PACKS[1], PACKS[2]],
    totalCost: 7.5,
    mode: 'standard'
  },
  {
    id: 'battle-grail-wars',
    name: 'Grail Hunter High Stakes (3 Rounds)',
    botName: 'WhaleCollector_PSA',
    botAvatar: 'W',
    packs: [PACKS[4], PACKS[5], PACKS[6]],
    totalCost: 170,
    mode: 'standard'
  },
  {
    id: 'battle-crazy-mode',
    name: 'Crazy Mode: Lowest Value Wins! (2 Rounds)',
    botName: 'UnderdogQueen',
    botAvatar: 'U',
    packs: [PACKS[1], PACKS[3]],
    totalCost: 17.5,
    mode: 'crazy'
  }
];

export const PackBattles: React.FC<PackBattlesProps> = ({
  balance,
  onDeductBalance,
  onAddCardsToVault,
  onRecordBattleWin
}) => {
  const [battleState, setBattleState] = useState<'lobby' | 'in_progress' | 'finished'>('lobby');
  const [activeBattle, setActiveBattle] = useState<BattleLobby | null>(null);
  const [currentRound, setCurrentRound] = useState<number>(0);
  const [playerPulls, setPlayerPulls] = useState<CardItem[]>([]);
  const [botPulls, setBotPulls] = useState<CardItem[]>([]);
  const [playerTotal, setPlayerTotal] = useState<number>(0);
  const [botTotal, setBotTotal] = useState<number>(0);
  const [winner, setWinner] = useState<'player' | 'bot' | 'tie' | null>(null);

  // Custom Battle Creation state
  const [isCreatingCustom, setIsCreatingCustom] = useState(false);
  const [customPacks, setCustomPacks] = useState<Pack[]>([PACKS[1]]);
  const [customMode, setCustomMode] = useState<'standard' | 'crazy'>('standard');

  const startBattle = (battle: BattleLobby, e?: React.MouseEvent) => {
    if (balance < battle.totalCost) return;
    playHapticTap();
    if (e) {
      const rect = e.currentTarget.getBoundingClientRect();
      fxSystem.spawnBurst(rect.left + rect.width / 2, rect.top + rect.height / 2, 'gold', 20);
    }
    const success = onDeductBalance(battle.totalCost);
    if (!success) return;

    setActiveBattle(battle);
    setBattleState('in_progress');
    setCurrentRound(0);
    setPlayerPulls([]);
    setBotPulls([]);
    setPlayerTotal(0);
    setBotTotal(0);
    setWinner(null);
  };

  // Run round
  useEffect(() => {
    if (battleState !== 'in_progress' || !activeBattle) return;

    const roundPack = activeBattle.packs[currentRound];
    if (!roundPack) return;

    playPackRip();

    const timer = setTimeout(() => {
      const pRoll = rollCardFromPack(
        roundPack.items,
        generateRandomSeed(16),
        generateRandomSeed(16),
        currentRound + 1
      );
      const bRoll = rollCardFromPack(
        roundPack.items,
        generateRandomSeed(16),
        generateRandomSeed(16),
        currentRound + 50
      );

      playCardReveal();

      const newPlayerPulls = [...playerPulls, pRoll];
      const newBotPulls = [...botPulls, bRoll];

      setPlayerPulls(newPlayerPulls);
      setBotPulls(newBotPulls);

      const newPlayerTotal = newPlayerPulls.reduce((sum, c) => sum + c.value, 0);
      const newBotTotal = newBotPulls.reduce((sum, c) => sum + c.value, 0);

      setPlayerTotal(newPlayerTotal);
      setBotTotal(newBotTotal);

      // Check if more rounds exist
      if (currentRound + 1 < activeBattle.packs.length) {
        setTimeout(() => {
          setCurrentRound((prev) => prev + 1);
        }, 1800);
      } else {
        // Final round complete! Determine winner
        setTimeout(() => {
          let battleWinner: 'player' | 'bot' | 'tie' = 'tie';
          if (activeBattle.mode === 'standard') {
            if (newPlayerTotal > newBotTotal) battleWinner = 'player';
            else if (newBotTotal > newPlayerTotal) battleWinner = 'bot';
          } else {
            // Crazy mode: Lowest score wins!
            if (newPlayerTotal < newBotTotal) battleWinner = 'player';
            else if (newBotTotal < newPlayerTotal) battleWinner = 'bot';
          }

          setWinner(battleWinner);
          setBattleState('finished');

          if (battleWinner === 'player') {
            playGrailFanfare();
            confetti({
              particleCount: 180,
              spread: 100,
              origin: { y: 0.5 },
              colors: ['#FFD700', '#10B981', '#6366F1', '#EC4899']
            });
            // Winner takes ALL cards from both players!
            onAddCardsToVault([...newPlayerPulls, ...newBotPulls]);
            onRecordBattleWin(true);
          } else {
            playHitChime();
            onRecordBattleWin(false);
          }
        }, 1500);
      }
    }, 1200);

    return () => clearTimeout(timer);
  }, [battleState, currentRound, activeBattle]);

  return (
    <div className="w-full max-w-7xl mx-auto px-3 sm:px-6 py-6 pb-24 select-none">
      {/* Header */}
      <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4 mb-8">
        <div>
          <div className="flex items-center gap-2">
            <Swords className="w-7 h-7 text-amber-400" />
            <h1 className="text-2xl sm:text-3xl font-black text-white font-display tracking-tight">
              PACK BATTLES ARENA
            </h1>
            <div className="hidden xs:flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-emerald-500/15 border border-emerald-500/30 text-[10px] font-mono font-bold text-emerald-400">
              <ShieldCheck className="w-3 h-3" />
              <span>PROVABLY FAIR RNG</span>
            </div>
          </div>
          <p className="text-xs text-slate-400 mt-1">
            Challenge players & bots in 1v1 unsealing showdowns. Winner takes ALL pulled cards into their Vault!
          </p>
        </div>

        {battleState === 'lobby' && (
          <button
            onClick={() => {
              playHapticTap();
              setIsCreatingCustom(!isCreatingCustom);
            }}
            className="px-4 py-2.5 rounded-2xl text-xs font-bold font-display bg-slate-900 border border-white/10 hover:border-amber-400/40 text-amber-300 flex items-center gap-2 transition-all cursor-pointer shadow-md"
          >
            <Plus className="w-4 h-4" />
            <span>{isCreatingCustom ? 'Browse Preset Battles' : 'Create Custom Battle'}</span>
          </button>
        )}
      </div>

      {/* ACTIVE BATTLE VIEW */}
      {battleState !== 'lobby' && activeBattle ? (
        <div className="flex flex-col items-center">
          {/* Battle Header Status */}
          <div className="w-full max-w-4xl bg-[#090d18]/90 border border-white/10 rounded-2xl p-3 sm:p-4 mb-4 sm:mb-6 flex flex-col sm:flex-row sm:items-center justify-between gap-2 shadow-2xl backdrop-blur-md">
            <div className="flex flex-wrap items-center gap-2 sm:gap-3">
              <div className="px-2.5 sm:px-3 py-0.5 sm:py-1 rounded-full bg-amber-500/15 border border-amber-500/30 text-amber-400 text-[10px] sm:text-xs font-mono font-bold">
                {activeBattle.mode === 'crazy' ? 'CRAZY MODE (LOWEST WINS)' : 'STANDARD (HIGHEST WINS)'}
              </div>
              <span className="text-xs sm:text-sm font-bold text-white truncate">{activeBattle.name}</span>
            </div>

            <div className="text-[11px] sm:text-xs font-mono text-slate-400 shrink-0">
              Round {Math.min(currentRound + 1, activeBattle.packs.length)} of {activeBattle.packs.length}:{' '}
              <span className="text-amber-400 font-bold">
                {activeBattle.packs[currentRound]?.name || 'Final'}
              </span>
            </div>
          </div>

          {/* 1v1 Arena Split View */}
          <div className="w-full max-w-4xl grid grid-cols-1 md:grid-cols-2 gap-4 sm:gap-8 items-start">
            {/* PLAYER SIDE */}
            <div
              className={`p-4 sm:p-6 rounded-3xl border transition-all flex flex-col items-center backdrop-blur-md ${
                winner === 'player'
                  ? 'bg-gradient-to-b from-amber-950/40 via-[#090d18] to-[#090d18] border-amber-400 shadow-[0_0_35px_rgba(245,158,11,0.3)]'
                  : 'bg-[#090d18]/90 border-white/10'
              }`}
            >
              <div className="flex items-center justify-between w-full mb-3 sm:mb-4 pb-2 sm:pb-3 border-b border-white/10">
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 rounded-full bg-gradient-to-tr from-amber-500 to-yellow-400 text-black font-black flex items-center justify-center text-xs shrink-0 shadow-md">
                    YOU
                  </div>
                  <span className="font-bold text-sm text-white">You (Challenger)</span>
                </div>
                <div className="text-right">
                  <span className="text-[10px] text-slate-400 uppercase tracking-wider block font-bold">
                    Total Value
                  </span>
                  <span className="text-base font-black font-mono text-amber-400 tabular-nums">
                    ${playerTotal.toLocaleString()}
                  </span>
                </div>
              </div>

              {/* Active Pulled Card */}
              <div className="min-h-[240px] sm:min-h-[290px] flex items-center justify-center">
                {playerPulls[currentRound] ? (
                  <CardView card={playerPulls[currentRound]} size="md" />
                ) : (
                  <div className="w-44 h-64 sm:w-48 sm:h-72 rounded-2xl border-2 border-dashed border-white/15 flex flex-col items-center justify-center p-4 text-center">
                    <Flame className="w-8 h-8 text-amber-500 animate-pulse mb-2" />
                    <span className="text-xs font-mono text-slate-400 font-bold">Unsealing Booster...</span>
                  </div>
                )}
              </div>

              {/* Pulls history thumbnails */}
              <div className="flex items-center gap-1.5 mt-4 overflow-x-auto w-full py-1">
                {playerPulls.map((c, i) => (
                  <div
                    key={i}
                    className="w-10 h-14 rounded-lg border border-white/15 overflow-hidden shrink-0 bg-black"
                    title={`${c.name} - $${c.value}`}
                  >
                    <img src={c.imageUrl} alt={c.name} className="w-full h-full object-contain" />
                  </div>
                ))}
              </div>
            </div>

            {/* BOT OPPONENT SIDE */}
            <div
              className={`p-4 sm:p-6 rounded-3xl border transition-all flex flex-col items-center backdrop-blur-md ${
                winner === 'bot'
                  ? 'bg-gradient-to-b from-rose-950/40 via-[#090d18] to-[#090d18] border-rose-500 shadow-[0_0_35px_rgba(244,63,94,0.3)]'
                  : 'bg-[#090d18]/90 border-white/10'
              }`}
            >
              <div className="flex items-center justify-between w-full mb-3 sm:mb-4 pb-2 sm:pb-3 border-b border-white/10">
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 rounded-full bg-indigo-600 text-white font-black flex items-center justify-center text-xs shrink-0 shadow-md">
                    {activeBattle.botAvatar}
                  </div>
                  <div>
                    <span className="font-bold text-sm text-white block">{activeBattle.botName}</span>
                    <span className="text-[10px] text-slate-400 font-mono">Opponent Bot</span>
                  </div>
                </div>
                <div className="text-right">
                  <span className="text-[10px] text-slate-400 uppercase tracking-wider block font-bold">
                    Total Value
                  </span>
                  <span className="text-base font-black font-mono text-slate-200 tabular-nums">
                    ${botTotal.toLocaleString()}
                  </span>
                </div>
              </div>

              {/* Active Pulled Card */}
              <div className="min-h-[240px] sm:min-h-[290px] flex items-center justify-center">
                {botPulls[currentRound] ? (
                  <CardView card={botPulls[currentRound]} size="md" />
                ) : (
                  <div className="w-44 h-64 sm:w-48 sm:h-72 rounded-2xl border-2 border-dashed border-white/15 flex flex-col items-center justify-center p-4 text-center">
                    <Flame className="w-8 h-8 text-indigo-400 animate-pulse mb-2" />
                    <span className="text-xs font-mono text-slate-400 font-bold">Unsealing Booster...</span>
                  </div>
                )}
              </div>

              {/* Pulls history thumbnails */}
              <div className="flex items-center gap-1.5 mt-4 overflow-x-auto w-full py-1">
                {botPulls.map((c, i) => (
                  <div
                    key={i}
                    className="w-10 h-14 rounded-lg border border-white/15 overflow-hidden shrink-0 bg-black"
                    title={`${c.name} - $${c.value}`}
                  >
                    <img src={c.imageUrl} alt={c.name} className="w-full h-full object-contain" />
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Battle End Victory Banner & Controls */}
          {battleState === 'finished' && (
            <div className="mt-8 flex flex-col items-center text-center p-6 bg-[#090d18]/95 border border-white/15 rounded-3xl w-full max-w-xl shadow-2xl backdrop-blur-xl">
              <Trophy
                className={`w-12 h-12 mb-2 ${
                  winner === 'player' ? 'text-amber-400 animate-bounce' : 'text-slate-500'
                }`}
              />
              <h2 className="text-2xl font-black font-display text-white">
                {winner === 'player'
                  ? 'VICTORY! YOU TOOK ALL CARDS!'
                  : winner === 'bot'
                  ? `${activeBattle.botName} WON THE BATTLE`
                  : 'IT WAS A TIE!'}
              </h2>
              <p className="text-xs text-slate-300 mt-1 max-w-md">
                {winner === 'player'
                  ? `All ${playerPulls.length + botPulls.length} cards from this match have been safely deposited to your Card Vault!`
                  : 'Better luck next battle! Ready to run it back?'}
              </p>

              <div className="flex items-center gap-3 mt-6">
                <button
                  onClick={(e) => startBattle(activeBattle, e)}
                  disabled={balance < activeBattle.totalCost}
                  className="px-5 py-2.5 rounded-2xl text-xs font-bold font-display bg-gradient-to-r from-amber-500 to-yellow-400 hover:brightness-110 text-black shadow-lg shadow-amber-500/20 flex items-center gap-2 transition-all disabled:opacity-50 cursor-pointer"
                >
                  <RotateCcw className="w-4 h-4" />
                  <span>Rematch (${activeBattle.totalCost.toFixed(2)})</span>
                </button>
                <button
                  onClick={() => {
                    playHapticTap();
                    setBattleState('lobby');
                  }}
                  className="px-5 py-2.5 rounded-2xl text-xs font-semibold bg-slate-900 hover:bg-slate-800 text-slate-300 border border-white/10 transition-all cursor-pointer"
                >
                  Back to Lobby
                </button>
              </div>
            </div>
          )}
        </div>
      ) : isCreatingCustom ? (
        /* CUSTOM BATTLE BUILDER */
        <div className="bg-[#090d18]/90 border border-white/10 rounded-3xl p-6 max-w-3xl mx-auto shadow-2xl backdrop-blur-md">
          <h2 className="text-lg font-bold text-white mb-2 font-display">Create Custom Battle</h2>
          <p className="text-xs text-slate-400 mb-6">
            Configure up to 4 rounds of any mystery packs and pick standard or crazy mode.
          </p>

          <div className="mb-6">
            <span className="text-xs font-bold text-slate-300 block mb-2 uppercase">Select Game Mode</span>
            <div className="flex items-center gap-3">
              <button
                onClick={() => {
                  playHapticTap();
                  setCustomMode('standard');
                }}
                className={`px-4 py-2 rounded-2xl text-xs font-bold border transition-all ${
                  customMode === 'standard'
                    ? 'bg-amber-500/20 text-amber-300 border-amber-400 shadow-md'
                    : 'bg-slate-900 text-slate-400 border-white/10'
                }`}
              >
                Standard (Highest Pull Wins)
              </button>
              <button
                onClick={() => {
                  playHapticTap();
                  setCustomMode('crazy');
                }}
                className={`px-4 py-2 rounded-2xl text-xs font-bold border transition-all ${
                  customMode === 'crazy'
                    ? 'bg-rose-500/20 text-rose-300 border-rose-400 shadow-md'
                    : 'bg-slate-900 text-slate-400 border-white/10'
                }`}
              >
                Crazy Mode (Lowest Pull Wins)
              </button>
            </div>
          </div>

          {/* Selected Rounds */}
          <div className="mb-6">
            <span className="text-xs font-bold text-slate-300 block mb-2 uppercase">
              Battle Rounds ({customPacks.length}/4)
            </span>
            <div className="flex flex-wrap items-center gap-3">
              {customPacks.map((pack, idx) => (
                <div
                  key={idx}
                  className="flex items-center gap-2 px-3 py-2 rounded-xl bg-slate-900 border border-white/10 text-xs font-semibold"
                >
                  <span>Round {idx + 1}: {pack.name}</span>
                  <span className="font-mono text-amber-400 font-bold">${pack.price.toFixed(2)}</span>
                  {customPacks.length > 1 && (
                    <button
                      onClick={() => {
                        playHapticTap();
                        setCustomPacks(customPacks.filter((_, i) => i !== idx));
                      }}
                      className="text-slate-400 hover:text-rose-400 ml-1 text-sm font-bold cursor-pointer"
                    >
                      ×
                    </button>
                  )}
                </div>
              ))}
            </div>
          </div>

          {/* Add pack picker */}
          {customPacks.length < 4 && (
            <div className="mb-8">
              <span className="text-xs font-bold text-slate-400 block mb-2">Add a Pack to Rounds:</span>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                {PACKS.map((pack) => (
                  <button
                    key={pack.id}
                    onClick={() => {
                      playHapticTap();
                      setCustomPacks([...customPacks, pack]);
                    }}
                    className="p-2.5 rounded-2xl bg-slate-900/80 hover:bg-slate-800 border border-white/10 text-left text-xs transition-all flex items-center justify-between cursor-pointer"
                  >
                    <span className="truncate pr-1 text-slate-200">{pack.name}</span>
                    <span className="font-mono text-amber-400 font-bold shrink-0">${pack.price.toFixed(2)}</span>
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Total cost & Start */}
          <div className="flex items-center justify-between pt-4 border-t border-white/10">
            <div>
              <span className="text-xs text-slate-400">Total Entry Fee:</span>
              <span className="text-lg font-black font-mono text-amber-400 ml-2">
                ${customPacks.reduce((s, p) => s + p.price, 0).toFixed(2)}
              </span>
            </div>

            <button
              onClick={() => {
                const totalCost = customPacks.reduce((s, p) => s + p.price, 0);
                startBattle({
                  id: `custom-${Date.now()}`,
                  name: `Custom Clash (${customPacks.length} Rounds)`,
                  botName: 'ChallengerBot',
                  botAvatar: 'C',
                  packs: customPacks,
                  totalCost,
                  mode: customMode
                });
              }}
              className="px-6 py-2.5 rounded-2xl text-xs font-black font-display bg-gradient-to-r from-amber-500 to-yellow-400 hover:brightness-110 text-black shadow-lg shadow-amber-500/25 transition-all flex items-center gap-2 cursor-pointer"
            >
              <Play className="w-4 h-4 fill-current" />
              <span>Launch Battle</span>
            </button>
          </div>
        </div>
      ) : (
        /* BATTLE LOBBY - PRESET BATTLES */
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {PRESET_BATTLES.map((battle) => {
            const canAfford = balance >= battle.totalCost;

            return (
              <div
                key={battle.id}
                className="bg-[#090d18]/90 border border-white/10 hover:border-amber-400/40 rounded-3xl p-5 flex flex-col justify-between shadow-xl transition-all backdrop-blur-md"
              >
                <div>
                  <div className="flex items-center justify-between mb-3">
                    <span className="text-[11px] font-bold px-2.5 py-0.5 rounded-full bg-slate-800 text-slate-300 border border-white/10 font-mono">
                      {battle.mode === 'crazy' ? 'CRAZY MODE' : 'STANDARD 1V1'}
                    </span>
                    <span className="text-xs font-mono font-bold text-amber-400">
                      Entry: ${battle.totalCost.toFixed(2)}
                    </span>
                  </div>

                  <h3 className="text-base font-bold text-white font-display">{battle.name}</h3>

                  <div className="flex items-center gap-2 mt-3 text-xs text-slate-400">
                    <div className="w-6 h-6 rounded-full bg-indigo-600 text-white font-bold flex items-center justify-center text-[11px] shadow-sm">
                      {battle.botAvatar}
                    </div>
                    <span>Opponent: <strong className="text-slate-200">{battle.botName}</strong></span>
                  </div>

                  {/* Packs list */}
                  <div className="flex items-center gap-2 mt-4 overflow-x-auto py-1">
                    {battle.packs.map((p, idx) => (
                      <div
                        key={idx}
                        className="px-2.5 py-1 rounded-xl bg-slate-900 text-[11px] font-medium text-slate-300 truncate max-w-[160px] shrink-0 border border-white/10"
                      >
                        Round {idx + 1}: {p.name}
                      </div>
                    ))}
                  </div>
                </div>

                <div className="mt-5 pt-4 border-t border-white/10 flex items-center justify-between">
                  <span className="text-xs text-slate-400">Winner takes all {battle.packs.length * 2} cards</span>
                  <button
                    onClick={(e) => startBattle(battle, e)}
                    disabled={!canAfford}
                    className={`px-4 py-2 rounded-2xl text-xs font-bold font-display flex items-center gap-1.5 transition-all ${
                      canAfford
                        ? 'bg-gradient-to-r from-amber-500 to-yellow-400 text-black shadow-md shadow-amber-500/20 active:scale-95 cursor-pointer'
                        : 'bg-slate-800 text-slate-500 cursor-not-allowed'
                    }`}
                  >
                    <Play className="w-3.5 h-3.5 fill-current" />
                    <span>{canAfford ? 'Fight Bot' : 'Insufficient Balance'}</span>
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};
