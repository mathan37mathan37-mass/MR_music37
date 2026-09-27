import { type ReactNode } from 'react';
import { motion } from 'framer-motion';
import { Lock, LogIn, Sparkles, Music2, ShieldCheck } from 'lucide-react';
import { useAuthStore } from '@/store/authStore';

interface ProtectedRouteProps {
  children: ReactNode;
  title?: string;
  description?: string;
}

export function ProtectedRoute({
  children,
  title = 'Sign In Required',
  description = 'Sign in or create a free MR music account to view and synchronize your personal music data.',
}: ProtectedRouteProps) {
  const { user, openAuthModal, loginAsDemoUser } = useAuthStore();

  if (user) {
    return <>{children}</>;
  }

  return (
    <div className="flex items-center justify-center min-h-[70vh] px-6 py-12">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="glass max-w-md w-full p-8 rounded-3xl border border-white/10 text-center shadow-2xl relative overflow-hidden"
      >
        {/* Glow */}
        <div className="absolute top-0 right-0 w-36 h-36 rounded-full bg-violet-600/20 filter blur-3xl pointer-events-none" />
        <div className="absolute bottom-0 left-0 w-36 h-36 rounded-full bg-pink-600/20 filter blur-3xl pointer-events-none" />

        <div className="w-16 h-16 rounded-2xl bg-gradient-to-tr from-violet-600 to-pink-600 flex items-center justify-center mx-auto mb-5 shadow-lg shadow-violet-600/30 text-white">
          <Lock size={28} />
        </div>

        <h2 className="font-display text-2xl font-extrabold text-white tracking-tight mb-2">
          {title}
        </h2>
        <p className="text-sm text-white/50 mb-7 leading-relaxed">
          {description}
        </p>

        <div className="space-y-3">
          <motion.button
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            onClick={() => openAuthModal('login')}
            className="w-full flex items-center justify-center gap-2 py-3.5 rounded-2xl bg-violet-600 hover:bg-violet-500 text-white font-semibold text-sm shadow-xl shadow-violet-600/30 transition-all"
          >
            <LogIn size={18} />
            <span>Sign In to Your Account</span>
          </motion.button>

          <motion.button
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            onClick={() => openAuthModal('signup')}
            className="w-full flex items-center justify-center gap-2 py-3 rounded-2xl bg-white/5 hover:bg-white/10 text-white font-semibold text-xs border border-white/10 transition-all"
          >
            <Sparkles size={16} className="text-pink-400" />
            <span>Create Free Account</span>
          </motion.button>

          <button
            onClick={loginAsDemoUser}
            className="text-xs text-violet-400 hover:text-violet-300 underline font-medium pt-2 transition-colors block mx-auto"
          >
            Or preview as Demo User
          </button>
        </div>

        <div className="flex items-center justify-center gap-1.5 text-[11px] text-white/40 mt-6 pt-5 border-t border-white/5">
          <ShieldCheck size={14} className="text-emerald-400" />
          <span>Secured with Firebase Authentication</span>
        </div>
      </motion.div>
    </div>
  );
}
