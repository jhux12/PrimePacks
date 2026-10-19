import React from 'react';
import { UserStats } from '../types';
import { User as FirebaseUser } from 'firebase/auth';
import {
  User,
  ShieldCheck,
  Trophy,
  Sparkles,
  Volume2,
  VolumeX,
  X,
  Flame,
  LogOut,
  LogIn,
  UserPlus,
  Mail,
  Copy,
  Check
} from 'lucide-react';
import { logOutUser } from '../lib/firebase';
import { playHapticTap, playSuccessChime } from '../utils/sound';

interface ProfileModalProps {
  stats: UserStats;
  balance: number;
  inventoryCount: number;
  soundOn: boolean;
  onToggleSound: () => void;
  onOpenProvablyFair: () => void;
  currentUser: FirebaseUser | null;
  onOpenAuth: (mode?: 'signin' | 'signup') => void;
  onClose: () => void;
}

export const ProfileModal: React.FC<ProfileModalProps> = ({
  stats,
  balance,
  inventoryCount,
  soundOn,
  onToggleSound,
  onOpenProvablyFair,
  currentUser,
  onOpenAuth,
  onClose
}) => {
  const [copiedUid, setCopiedUid] = React.useState(false);

  const handleCopyUid = () => {
    if (currentUser?.uid) {
      navigator.clipboard.writeText(currentUser.uid);
      setCopiedUid(true);
      playSuccessChime();
      setTimeout(() => setCopiedUid(false), 2000);
    }
  };

  const handleSignOut = async () => {
    playHapticTap();
    await logOutUser();
    onClose();
  };

  const displayName =
    currentUser?.displayName ||
    (currentUser?.email ? currentUser.email.split('@')[0] : null) ||
    (currentUser?.isAnonymous ? 'Guest Collector' : 'Prime Collector');

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/85 backdrop-blur-xl p-3 sm:p-4 animate-fade-in select-none">
      <div className="w-full max-w-md bg-[#090d18] border border-white/10 rounded-3xl p-5 sm:p-6 shadow-2xl relative overflow-hidden">
        {/* Ambient glow in background */}
        <div className="absolute -top-20 -right-20 w-48 h-48 rounded-full bg-emerald-500/15 blur-3xl pointer-events-none" />

        {/* Header with Avatar & User Info */}
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-[#00F076] to-emerald-400 text-black font-black flex items-center justify-center text-xl shadow-[0_0_20px_rgba(0,240,118,0.35)]">
              {displayName.charAt(0).toUpperCase()}
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-base font-black text-white font-display truncate max-w-[180px]">
                  {displayName}
                </h3>
                {currentUser?.isAnonymous ? (
                  <span className="px-1.5 py-0.2 rounded bg-amber-500/20 text-amber-300 font-mono text-[9px] font-bold border border-amber-500/30">
                    GUEST
                  </span>
                ) : currentUser ? (
                  <span className="px-1.5 py-0.2 rounded bg-emerald-500/20 text-emerald-300 font-mono text-[9px] font-bold border border-emerald-500/30">
                    VERIFIED
                  </span>
                ) : (
                  <span className="px-1.5 py-0.2 rounded bg-slate-800 text-slate-400 font-mono text-[9px]">
                    OFFLINE
                  </span>
                )}
              </div>

              <div className="flex items-center gap-1.5 text-[10px] font-mono font-bold text-slate-400 mt-0.5">
                {currentUser?.email ? (
                  <span className="truncate max-w-[200px] text-slate-300">{currentUser.email}</span>
                ) : (
                  <span className="text-amber-400">Temporary Guest Session</span>
                )}
              </div>
            </div>
          </div>

          <button
            onClick={() => {
              playHapticTap();
              onClose();
            }}
            className="w-8 h-8 rounded-full bg-white/5 hover:bg-white/10 text-slate-400 hover:text-white flex items-center justify-center cursor-pointer transition-all"
            aria-label="Close"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* UID Copy Chip if signed in */}
        {currentUser?.uid && (
          <div className="mb-4 flex items-center justify-between p-2 rounded-xl bg-slate-900/80 border border-white/5 text-[10px] font-mono">
            <span className="text-slate-400 truncate pr-2">
              ID: {currentUser.uid}
            </span>
            <button
              onClick={handleCopyUid}
              className="text-slate-300 hover:text-[#00F076] flex items-center gap-1 cursor-pointer shrink-0"
              title="Copy User ID"
            >
              {copiedUid ? <Check className="w-3 h-3 text-[#00F076]" /> : <Copy className="w-3 h-3" />}
              <span>{copiedUid ? 'Copied' : 'Copy'}</span>
            </button>
          </div>
        )}

        {/* Guest conversion banner if anonymous or signed out */}
        {(!currentUser || currentUser.isAnonymous) && (
          <div className="mb-4 p-3 rounded-2xl bg-gradient-to-r from-emerald-950/60 to-slate-900/80 border border-[#00F076]/30 flex flex-col gap-2">
            <div className="flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-[#00F076] shrink-0" />
              <span className="text-xs font-bold text-white">Save Your Vault & Balances</span>
            </div>
            <p className="text-[11px] text-slate-300 leading-snug">
              Sign up with Firebase to sync your pulled cards and coin balance across all your devices permanently.
            </p>
            <div className="flex items-center gap-2 mt-1">
              <button
                onClick={() => {
                  playHapticTap();
                  onClose();
                  onOpenAuth('signup');
                }}
                className="flex-1 py-1.5 rounded-xl bg-gradient-to-r from-[#00F076] to-[#10B981] text-black font-display font-black text-xs uppercase tracking-wider flex items-center justify-center gap-1 cursor-pointer active:scale-95 shadow-md"
              >
                <UserPlus className="w-3.5 h-3.5" />
                <span>Create Account</span>
              </button>
              <button
                onClick={() => {
                  playHapticTap();
                  onClose();
                  onOpenAuth('signin');
                }}
                className="flex-1 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-white font-display font-bold text-xs uppercase tracking-wider flex items-center justify-center gap-1 cursor-pointer active:scale-95"
              >
                <LogIn className="w-3.5 h-3.5" />
                <span>Sign In</span>
              </button>
            </div>
          </div>
        )}

        {/* Stats Grid */}
        <div className="grid grid-cols-2 gap-2 mb-4">
          <div className="p-3 bg-slate-900/90 border border-white/10 rounded-2xl flex flex-col shadow-inner">
            <span className="text-[10px] text-slate-400 font-mono font-bold uppercase tracking-wider">
              TOTAL BALANCE
            </span>
            <span className="font-mono text-base font-black text-amber-400 mt-0.5">
              ${balance.toFixed(2)}
            </span>
          </div>

          <div className="p-3 bg-slate-900/90 border border-white/10 rounded-2xl flex flex-col shadow-inner">
            <span className="text-[10px] text-slate-400 font-mono font-bold uppercase tracking-wider">
              CARDS IN VAULT
            </span>
            <span className="font-mono text-base font-black text-white mt-0.5">
              {inventoryCount}
            </span>
          </div>

          <div className="p-3 bg-slate-900/90 border border-white/10 rounded-2xl flex flex-col shadow-inner">
            <span className="text-[10px] text-slate-400 font-mono font-bold uppercase tracking-wider">
              PACKS UNSEALED
            </span>
            <span className="font-mono text-base font-black text-white mt-0.5">
              {stats.totalPacksOpened}
            </span>
          </div>

          <div className="p-3 bg-slate-900/90 border border-white/10 rounded-2xl flex flex-col shadow-inner">
            <span className="text-[10px] text-slate-400 font-mono font-bold uppercase tracking-wider">
              BATTLES WON
            </span>
            <span className="font-mono text-base font-black text-[#00F076] mt-0.5">
              {stats.battlesWon} / {stats.battlesPlayed}
            </span>
          </div>
        </div>

        {/* Quick Settings & Provably Fair Toggle */}
        <div className="space-y-2 pt-2 border-t border-white/10">
          <div className="flex items-center justify-between p-2.5 rounded-2xl bg-slate-900/60 border border-white/10">
            <div className="flex items-center gap-2 text-xs text-slate-200 font-semibold">
              {soundOn ? (
                <Volume2 className="w-4 h-4 text-amber-400" />
              ) : (
                <VolumeX className="w-4 h-4 text-slate-500" />
              )}
              <span>Sound Effects</span>
            </div>
            <button
              onClick={() => {
                playHapticTap();
                onToggleSound();
              }}
              className={`px-3 py-1 rounded-xl text-xs font-mono font-bold cursor-pointer transition-all ${
                soundOn
                  ? 'bg-amber-500/20 text-amber-400 border border-amber-500/40'
                  : 'bg-slate-800 text-slate-400'
              }`}
            >
              {soundOn ? 'ENABLED' : 'MUTED'}
            </button>
          </div>

          <div className="flex items-center justify-between p-2.5 rounded-2xl bg-slate-900/60 border border-white/10">
            <div className="flex items-center gap-2 text-xs text-slate-200 font-semibold">
              <ShieldCheck className="w-4 h-4 text-[#00F076]" />
              <span>Provably Fair RNG</span>
            </div>
            <button
              onClick={() => {
                playHapticTap();
                onClose();
                onOpenProvablyFair();
              }}
              className="px-3 py-1 rounded-xl bg-[#00F076]/15 hover:bg-[#00F076]/25 text-[#00F076] border border-[#00F076]/30 text-xs font-mono font-bold transition-all cursor-pointer"
            >
              VERIFY SEEDS
            </button>
          </div>

          {/* Sign Out Action if logged in */}
          {currentUser && (
            <button
              onClick={handleSignOut}
              className="w-full mt-2 py-2 rounded-xl bg-rose-500/10 hover:bg-rose-500/20 text-rose-300 border border-rose-500/25 text-xs font-display font-bold flex items-center justify-center gap-1.5 transition-all cursor-pointer"
            >
              <LogOut className="w-3.5 h-3.5" />
              <span>Sign Out of Account</span>
            </button>
          )}
        </div>
      </div>
    </div>
  );
};
