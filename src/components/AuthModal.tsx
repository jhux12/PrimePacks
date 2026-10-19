import React, { useState } from 'react';
import { User } from 'firebase/auth';
import {
  X,
  Sparkles,
  Lock,
  Mail,
  User as UserIcon,
  Eye,
  EyeOff,
  CheckCircle2,
  AlertCircle,
  Loader2,
  ShieldCheck,
  Zap,
  ArrowRight
} from 'lucide-react';
import { signInWithEmail, signUpWithEmail, signInAsGuest } from '../lib/firebase';
import { playHapticTap, playSuccessChime } from '../utils/sound';
import { PrimePacksLogo } from './PrimePacksLogo';

interface AuthModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: (user: User) => void;
  initialMode?: 'signin' | 'signup';
}

export const AuthModal: React.FC<AuthModalProps> = ({
  isOpen,
  onClose,
  onSuccess,
  initialMode = 'signin'
}) => {
  const [mode, setMode] = useState<'signin' | 'signup'>(initialMode);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [username, setUsername] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [guestLoading, setGuestLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccessMessage(null);

    if (!email.trim() || !password) {
      setError('Please fill in both email and password.');
      return;
    }

    if (mode === 'signup' && password.length < 6) {
      setError('Password must be at least 6 characters.');
      return;
    }

    playHapticTap();
    setLoading(true);

    try {
      let user: User;
      if (mode === 'signup') {
        user = await signUpWithEmail(email, password, username);
        playSuccessChime();
        setSuccessMessage('Account created successfully! Welcome to PrimePacks.');
      } else {
        user = await signInWithEmail(email, password);
        playSuccessChime();
        setSuccessMessage('Welcome back, Collector!');
      }

      onSuccess?.(user);
      setTimeout(() => {
        onClose();
      }, 1000);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Authentication failed. Please try again.';
      setError(msg);
    } finally {
      setLoading(false);
    }
  };

  const handleGuestSignIn = async () => {
    playHapticTap();
    setError(null);
    setGuestLoading(true);
    try {
      const user = await signInAsGuest();
      playSuccessChime();
      setSuccessMessage('Signed in as Guest Collector!');
      onSuccess?.(user);
      setTimeout(() => {
        onClose();
      }, 900);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Could not continue as guest.';
      setError(msg);
    } finally {
      setGuestLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/85 backdrop-blur-xl animate-fade-in select-none">
      <div className="w-full max-w-md bg-[#0a0d18] border border-white/15 rounded-3xl p-5 sm:p-7 shadow-[0_0_60px_rgba(0,240,118,0.15)] relative overflow-hidden flex flex-col">
        {/* Ambient Top Glow */}
        <div className="absolute -top-24 left-1/2 -translate-x-1/2 w-64 h-32 bg-[#00F076]/20 blur-3xl pointer-events-none rounded-full" />

        {/* Modal Top Bar */}
        <div className="flex items-center justify-between pb-3 border-b border-white/10 relative z-10">
          <div className="flex items-center gap-2">
            <PrimePacksLogo variant="icon" size="sm" glow={true} />
            <div>
              <h2 className="font-display font-black text-white text-base sm:text-lg flex items-center gap-1.5 leading-none">
                <span>{mode === 'signup' ? 'Create Your Vault Account' : 'Welcome Back'}</span>
              </h2>
              <span className="text-[10px] font-mono text-emerald-400 flex items-center gap-1 mt-0.5">
                <ShieldCheck className="w-3 h-3 text-emerald-400" />
                Firebase Connected Authentication
              </span>
            </div>
          </div>

          <button
            onClick={() => {
              playHapticTap();
              onClose();
            }}
            className="w-8 h-8 rounded-full bg-white/5 hover:bg-white/10 text-slate-400 hover:text-white flex items-center justify-center transition-all cursor-pointer"
            aria-label="Close"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Mode Selector Tabs */}
        <div className="flex rounded-2xl bg-[#121626] p-1 border border-white/10 my-3.5 relative z-10">
          <button
            type="button"
            onClick={() => {
              playHapticTap();
              setMode('signin');
              setError(null);
            }}
            className={`flex-1 py-2 rounded-xl font-display font-bold text-xs transition-all cursor-pointer ${
              mode === 'signin'
                ? 'bg-gradient-to-r from-[#00F076] to-[#10B981] text-black shadow-lg font-black'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            Sign In
          </button>
          <button
            type="button"
            onClick={() => {
              playHapticTap();
              setMode('signup');
              setError(null);
            }}
            className={`flex-1 py-2 rounded-xl font-display font-bold text-xs transition-all cursor-pointer ${
              mode === 'signup'
                ? 'bg-gradient-to-r from-[#00F076] to-[#10B981] text-black shadow-lg font-black'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            Create Account
          </button>
        </div>

        {/* Error / Success Alerts */}
        {error && (
          <div className="mb-3 p-2.5 rounded-xl bg-rose-500/15 border border-rose-500/30 text-rose-300 text-xs flex items-start gap-2 relative z-10 animate-fade-in font-sans">
            <AlertCircle className="w-4 h-4 shrink-0 text-rose-400 mt-0.5" />
            <span className="leading-snug">{error}</span>
          </div>
        )}

        {successMessage && (
          <div className="mb-3 p-2.5 rounded-xl bg-emerald-500/20 border border-emerald-400/40 text-emerald-300 text-xs flex items-center gap-2 relative z-10 animate-fade-in font-sans font-bold">
            <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-400" />
            <span>{successMessage}</span>
          </div>
        )}

        {/* Auth Form */}
        <form onSubmit={handleSubmit} className="flex flex-col gap-3 relative z-10">
          {/* Username (Only for Sign Up) */}
          {mode === 'signup' && (
            <div>
              <label className="block text-[10px] font-mono text-slate-400 uppercase tracking-wider mb-1">
                Collector Username
              </label>
              <div className="relative">
                <UserIcon className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  placeholder="e.g. CharizardKing99"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  maxLength={30}
                  className="w-full pl-9 pr-3 py-2 rounded-xl bg-[#141829] border border-white/10 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-[#00F076] transition-colors font-sans"
                />
              </div>
            </div>
          )}

          {/* Email Address */}
          <div>
            <label className="block text-[10px] font-mono text-slate-400 uppercase tracking-wider mb-1">
              Email Address *
            </label>
            <div className="relative">
              <Mail className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="email"
                required
                placeholder="your.email@domain.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                autoComplete="email"
                className="w-full pl-9 pr-3 py-2 rounded-xl bg-[#141829] border border-white/10 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-[#00F076] transition-colors font-sans"
              />
            </div>
          </div>

          {/* Password */}
          <div>
            <div className="flex items-center justify-between mb-1">
              <label className="text-[10px] font-mono text-slate-400 uppercase tracking-wider">
                Password *
              </label>
              {mode === 'signin' && (
                <span className="text-[10px] text-slate-500">Min 6 characters</span>
              )}
            </div>
            <div className="relative">
              <Lock className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type={showPassword ? 'text' : 'password'}
                required
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                autoComplete={mode === 'signup' ? 'new-password' : 'current-password'}
                className="w-full pl-9 pr-10 py-2 rounded-xl bg-[#141829] border border-white/10 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-[#00F076] transition-colors font-sans"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-white cursor-pointer"
                aria-label="Toggle password visibility"
              >
                {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
          </div>

          {/* Submit Button */}
          <button
            type="submit"
            disabled={loading || !!successMessage}
            className="mt-1 w-full py-2.5 rounded-xl bg-gradient-to-r from-[#00F076] to-[#10B981] hover:brightness-110 active:scale-[0.98] text-black font-display font-black text-xs uppercase tracking-wider shadow-[0_0_20px_rgba(0,240,118,0.35)] transition-all flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
          >
            {loading ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin text-black" />
                <span>{mode === 'signup' ? 'Creating Account...' : 'Signing In...'}</span>
              </>
            ) : (
              <>
                <span>{mode === 'signup' ? 'Join PrimePacks Vault' : 'Sign In To Vault'}</span>
                <ArrowRight className="w-4 h-4" />
              </>
            )}
          </button>
        </form>

        {/* Divider */}
        <div className="relative my-3 flex items-center justify-center">
          <div className="absolute inset-0 flex items-center">
            <div className="w-full border-t border-white/10" />
          </div>
          <span className="relative px-3 bg-[#0a0d18] text-[10px] font-mono text-slate-500 uppercase">
            OR
          </span>
        </div>

        {/* Instant Guest / Anonymous Action */}
        <button
          type="button"
          onClick={handleGuestSignIn}
          disabled={guestLoading || loading}
          className="w-full py-2 rounded-xl bg-slate-900/90 hover:bg-slate-800 border border-white/10 text-slate-300 hover:text-white font-display font-bold text-xs transition-all flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
        >
          {guestLoading ? (
            <>
              <Loader2 className="w-3.5 h-3.5 animate-spin" />
              <span>Entering as Guest...</span>
            </>
          ) : (
            <>
              <Zap className="w-3.5 h-3.5 text-amber-400" />
              <span>Continue Instantly as Guest</span>
            </>
          )}
        </button>

        {/* Security & Provably Fair Note */}
        <div className="mt-3.5 pt-2.5 border-t border-white/10 flex items-center justify-between text-[10px] font-mono text-slate-500">
          <span>🔒 End-to-end encrypted auth</span>
          <span>⚡ 100% Provably Fair</span>
        </div>
      </div>
    </div>
  );
};
