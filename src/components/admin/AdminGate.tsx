import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Shield, Lock, Eye, EyeOff, ArrowLeft, AlertCircle, Sparkles } from 'lucide-react';
import { Link } from 'react-router-dom';

// ── ADMIN PIN CONFIG ─────────────────────────────────────────────────────────
// Change this to your desired admin password/PIN.
// In production, validate against Firebase Custom Claims or a server-side check.
const ADMIN_PIN = import.meta.env.VITE_ADMIN_PIN || 'melodix-admin-2024';
const SESSION_KEY = 'melodix_admin_authed';

interface AdminGateProps {
  children: React.ReactNode;
}

export function AdminGate({ children }: AdminGateProps) {
  const [isAuthed, setIsAuthed] = useState(false);
  const [pin, setPin] = useState('');
  const [showPin, setShowPin] = useState(false);
  const [error, setError] = useState('');
  const [isChecking, setIsChecking] = useState(false);
  const [attempts, setAttempts] = useState(0);
  const [lockUntil, setLockUntil] = useState<number | null>(null);

  const clearAdminSession = () => {
    sessionStorage.removeItem(SESSION_KEY);
    setIsAuthed(false);
    setPin('');
    setError('');
    setShowPin(false);
    setAttempts(0);
    setLockUntil(null);
  };

  // Check session on mount and clear it on unmount so re-entry always requires the admin password.
  useEffect(() => {
    const stored = sessionStorage.getItem(SESSION_KEY);
    if (stored === 'true') {
      setIsAuthed(true);
    }

    return () => {
      sessionStorage.removeItem(SESSION_KEY);
    };
  }, []);

  // Countdown timer for lockout
  useEffect(() => {
    if (!lockUntil) return;
    const interval = setInterval(() => {
      if (Date.now() >= lockUntil) {
        setLockUntil(null);
        setAttempts(0);
      }
    }, 1000);
    return () => clearInterval(interval);
  }, [lockUntil]);

  const isLocked = lockUntil !== null && Date.now() < lockUntil;
  const lockSeconds = lockUntil ? Math.ceil((lockUntil - Date.now()) / 1000) : 0;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isLocked) return;

    setIsChecking(true);
    setError('');

    // Simulate a brief verification delay for UX
    await new Promise((res) => setTimeout(res, 500));

    if (pin === ADMIN_PIN) {
      sessionStorage.setItem(SESSION_KEY, 'true');
      setIsAuthed(true);
    } else {
      const newAttempts = attempts + 1;
      setAttempts(newAttempts);
      setPin('');

      if (newAttempts >= 5) {
        // Lock for 2 minutes after 5 failed attempts
        setLockUntil(Date.now() + 2 * 60 * 1000);
        setError('Too many failed attempts. Locked for 2 minutes.');
      } else {
        setError(`Incorrect password. ${5 - newAttempts} attempt${5 - newAttempts === 1 ? '' : 's'} remaining.`);
      }
    }
    setIsChecking(false);
  };

  if (isAuthed) return <>{children}</>;

  return (
    <div className="min-h-screen bg-[var(--color-bg-primary)] flex items-center justify-center relative overflow-hidden">
      {/* Ambient background */}
      <div className="absolute inset-0 pointer-events-none">
        <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-violet-600/10 rounded-full blur-3xl" />
        <div className="absolute bottom-1/4 right-1/4 w-64 h-64 bg-pink-500/8 rounded-full blur-3xl" />
      </div>

      {/* Back to player */}
      <Link
        to="/"
        onClick={() => clearAdminSession()}
        className="absolute top-6 left-6 flex items-center gap-2 text-[var(--color-text-secondary)] hover:text-[var(--color-text-primary)] text-xs font-semibold transition-colors group"
      >
        <ArrowLeft size={14} className="group-hover:-translate-x-0.5 transition-transform" />
        Back to Player
      </Link>

      <motion.div
        initial={{ opacity: 0, scale: 0.95, y: 16 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        transition={{ duration: 0.4, ease: [0.16, 1, 0.3, 1] }}
        className="relative z-10 w-full max-w-sm mx-4"
      >
        {/* Card */}
        <div className="bg-[var(--color-bg-card)]/90 backdrop-blur-xl border border-[var(--color-border)] rounded-3xl p-8 shadow-2xl shadow-black/60">
          {/* Header */}
          <div className="flex flex-col items-center gap-4 mb-8">
            <div className="relative">
              <div className="w-16 h-16 rounded-2xl bg-gradient-to-tr from-violet-600 to-pink-500 flex items-center justify-center shadow-lg shadow-violet-600/40">
                <Shield size={28} className="text-white" />
              </div>
              <div className="absolute -top-1 -right-1 w-5 h-5 rounded-full bg-[#0f0d19] flex items-center justify-center">
                <Sparkles size={10} className="text-violet-400" />
              </div>
            </div>
            <div className="text-center">
              <h1 className="text-xl font-extrabold text-[var(--color-text-primary)] tracking-tight">Admin Console</h1>
              <p className="text-xs text-[var(--color-text-secondary)] mt-1">Enter your admin password to continue</p>
            </div>
          </div>

          {/* Form */}
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="relative">
              <div className="absolute left-3.5 top-1/2 -translate-y-1/2 text-[var(--color-text-secondary)]">
                <Lock size={15} />
              </div>
              <input
                id="admin-pin-input"
                type={showPin ? 'text' : 'password'}
                value={pin}
                onChange={(e) => { setPin(e.target.value); setError(''); }}
                placeholder="Admin password"
                disabled={isLocked || isChecking}
                autoFocus
                className="w-full bg-[var(--color-bg-overlay)] border border-[var(--color-border)] rounded-2xl pl-10 pr-10 py-3 text-sm text-[var(--color-text-primary)] placeholder-[var(--color-text-muted)] outline-none focus:border-violet-500/60 focus:bg-[var(--color-bg-secondary)] transition-all disabled:opacity-50 disabled:cursor-not-allowed"
              />
              <button
                type="button"
                onClick={() => setShowPin(!showPin)}
                className="absolute right-3.5 top-1/2 -translate-y-1/2 text-[var(--color-text-secondary)] hover:text-[var(--color-text-primary)] transition-colors"
              >
                {showPin ? <EyeOff size={15} /> : <Eye size={15} />}
              </button>
            </div>

            {/* Error message */}
            <AnimatePresence>
              {(error || isLocked) && (
                <motion.div
                  initial={{ opacity: 0, y: -6 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -6 }}
                  className="flex items-center gap-2 px-3 py-2.5 rounded-xl bg-red-500/10 border border-red-500/20 text-red-400 text-xs"
                >
                  <AlertCircle size={13} className="flex-shrink-0" />
                  <span>{isLocked ? `Too many attempts. Try again in ${lockSeconds}s.` : error}</span>
                </motion.div>
              )}
            </AnimatePresence>

            <button
              id="admin-login-btn"
              type="submit"
              disabled={!pin || isChecking || isLocked}
              className="w-full py-3 rounded-2xl bg-gradient-to-r from-violet-600 to-violet-500 hover:from-violet-500 hover:to-violet-400 text-white text-sm font-bold shadow-lg shadow-violet-600/30 transition-all disabled:opacity-40 disabled:cursor-not-allowed flex items-center justify-center gap-2"
            >
              {isChecking ? (
                <>
                  <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  Verifying…
                </>
              ) : (
                <>
                  <Shield size={14} />
                  Access Admin Console
                </>
              )}
            </button>
          </form>

          {/* Footer hint */}
          <p className="mt-6 text-center text-[10px] text-white/20">
            MR music Admin • Restricted Access
          </p>
        </div>
      </motion.div>
    </div>
  );
}
