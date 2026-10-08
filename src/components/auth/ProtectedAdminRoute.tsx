/**
 * ProtectedAdminRoute.tsx
 *
 * Route guard for administrator views (/admin).
 * Strictly authorizes requests against backend user roles (role === 'admin').
 * Unauthorized users are denied entry with a secure error screen.
 */

import { type ReactNode } from 'react';
import { Link } from 'react-router-dom';
import { Shield, Lock, Loader2, ArrowLeft } from 'lucide-react';
import { useAdmin } from '@/hooks/useAdmin';
import { useAuthStore } from '@/store/authStore';

interface ProtectedAdminRouteProps {
  children: ReactNode;
}

export function ProtectedAdminRoute({ children }: ProtectedAdminRouteProps) {
  const { isAdmin, authLoading, user } = useAdmin();
  const { openAuthModal } = useAuthStore();

  if (authLoading) {
    return (
      <div className="min-h-screen bg-[#080810] flex items-center justify-center">
        <div className="flex flex-col items-center gap-3 text-white">
          <Loader2 size={36} className="animate-spin text-violet-400" />
          <p className="text-sm font-medium text-white/70">Verifying administrator credentials…</p>
        </div>
      </div>
    );
  }

  // Not logged in
  if (!user) {
    return (
      <div className="min-h-screen bg-[#080810] flex items-center justify-center px-4">
        <div className="text-center space-y-4 max-w-sm bg-white/5 border border-white/10 rounded-3xl p-8 shadow-2xl backdrop-blur-xl">
          <div className="w-16 h-16 rounded-2xl bg-violet-600/15 border border-violet-500/30 flex items-center justify-center mx-auto">
            <Lock size={28} className="text-violet-400" />
          </div>
          <h1 className="text-xl font-bold text-white">Admin Authentication Required</h1>
          <p className="text-xs text-white/60 leading-relaxed">
            The Admin Console is restricted to authorized personnel. Please sign in with an administrator account to continue.
          </p>
          <div className="pt-2 flex flex-col gap-2">
            <button
              onClick={() => openAuthModal('login')}
              className="w-full py-2.5 rounded-xl bg-violet-600 hover:bg-violet-500 text-white text-xs font-semibold shadow-lg shadow-violet-600/30 transition-all cursor-pointer"
            >
              Sign In as Admin
            </button>
            <Link
              to="/"
              className="w-full py-2.5 rounded-xl bg-white/5 hover:bg-white/10 text-white/70 hover:text-white text-xs font-medium transition-colors inline-flex items-center justify-center gap-1.5"
            >
              <ArrowLeft size={13} /> Back to Player
            </Link>
          </div>
        </div>
      </div>
    );
  }

  // Logged in but not admin
  if (!isAdmin) {
    return (
      <div className="min-h-screen bg-[#080810] flex items-center justify-center px-4">
        <div className="text-center space-y-4 max-w-sm bg-white/5 border border-red-500/20 rounded-3xl p-8 shadow-2xl backdrop-blur-xl">
          <div className="w-16 h-16 rounded-2xl bg-red-500/10 border border-red-500/30 flex items-center justify-center mx-auto">
            <Shield size={28} className="text-red-400" />
          </div>
          <h1 className="text-xl font-bold text-white">Access Denied</h1>
          <p className="text-xs text-white/60 leading-relaxed">
            Your account (<span className="text-white/80 font-medium">{user.email || user.username}</span>) does not have administrator privileges.
          </p>
          <div className="pt-2">
            <Link
              to="/"
              className="inline-flex items-center justify-center gap-1.5 w-full py-2.5 rounded-xl bg-white/10 hover:bg-white/20 text-white text-xs font-semibold transition-all"
            >
              <ArrowLeft size={13} /> Back to MR Music
            </Link>
          </div>
        </div>
      </div>
    );
  }

  return <>{children}</>;
}
