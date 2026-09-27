import { useNavigate, Link } from 'react-router-dom';
import { ChevronLeft, ChevronRight, Search, Bell, BarChart3, Flame, LogIn, Shield } from 'lucide-react';
import { motion } from 'framer-motion';
import { useUIStore } from '@/store/uiStore';
import { useAnalyticsStore } from '@/store/analyticsStore';
import { useAuthStore } from '@/store/authStore';

export function Header() {
  const navigate = useNavigate();
  const currentStreakDays = useAnalyticsStore((s) => s.currentStreakDays);
  const { user, openAuthModal } = useAuthStore();

  return (
    <header className="hidden md:flex items-center gap-4 px-6 py-4 flex-shrink-0">
      {/* Back/Forward */}
      <div className="flex items-center gap-2">
        <button
          onClick={() => navigate(-1)}
          className="w-8 h-8 rounded-full bg-black/40 flex items-center justify-center text-white/60 hover:text-white hover:bg-black/60 transition-all"
        >
          <ChevronLeft size={18} />
        </button>
        <button
          onClick={() => navigate(1)}
          className="w-8 h-8 rounded-full bg-black/40 flex items-center justify-center text-white/60 hover:text-white hover:bg-black/60 transition-all"
        >
          <ChevronRight size={18} />
        </button>
      </div>

      {/* Search bar */}
      <div className="flex-1 max-w-md">
        <div className="relative">
          <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-white/30" />
          <input
            type="text"
            aria-label="Search songs, artists, or albums"
            placeholder="Search songs, artists, albums..."
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                const val = (e.target as HTMLInputElement).value;
                if (val.trim()) {
                  navigate(`/search?q=${encodeURIComponent(val.trim())}`);
                }
              }
            }}
            onFocus={() => {
              if (window.location.pathname !== '/search') {
                navigate('/search');
              }
            }}
            className="w-full bg-white/5 border border-white/8 rounded-xl pl-9 pr-4 py-2.5 text-sm text-white placeholder:text-white/30 outline-none focus:border-violet-500/50 focus:bg-white/8 transition-all"
          />
        </div>
      </div>

      <div className="flex-1" />

      {/* Right actions */}
      <div className="flex items-center gap-3">
        {/* Admin Portal Link */}
        <Link
          to="/admin"
          className="h-9 px-3 rounded-xl bg-violet-600/15 hover:bg-violet-600/25 border border-violet-500/30 flex items-center gap-1.5 text-xs font-semibold text-violet-300 hover:text-white transition-all shadow-sm"
          title="Open Admin Portal"
        >
          <Shield size={14} className="text-violet-400" />
          <span className="hidden sm:inline">Admin</span>
        </Link>

        {/* Analytics & Streak Link */}
        <Link
          to="/stats"
          className="h-9 px-3 rounded-xl bg-white/5 hover:bg-white/10 flex items-center gap-2 text-xs font-semibold text-white/70 hover:text-white transition-all border border-white/5"
          title="View Listening Stats & Achievements"
        >
          <BarChart3 size={15} className="text-violet-400" />
          <div className="flex items-center gap-1 text-orange-400">
            <Flame size={13} className="fill-orange-400" />
            <span className="tabular-nums font-mono text-[11px]">{currentStreakDays}d</span>
          </div>
          <span className="hidden xl:inline">Stats</span>
        </Link>

        <button
          type="button"
          onClick={() => useUIStore.getState().toggleShortcuts()}
          aria-label="Open keyboard shortcuts"
          className="h-9 px-2.5 rounded-xl bg-white/5 flex items-center gap-1.5 text-xs text-white/50 hover:text-white hover:bg-white/10 transition-all border border-white/5"
          title="Keyboard shortcuts (?)"
        >
          <kbd className="text-[10px] font-mono px-1 rounded bg-white/10">?</kbd>
          <span className="hidden lg:inline">Shortcuts</span>
        </button>

        <button
          type="button"
          aria-label="Check notifications"
          onClick={() => useUIStore.getState().addToast('No new notifications right now', 'info')}
          className="w-9 h-9 rounded-xl bg-white/5 flex items-center justify-center text-white/50 hover:text-white hover:bg-white/10 transition-all relative"
        >
          <Bell size={17} />
          <span className="absolute top-2 right-2 w-1.5 h-1.5 bg-violet-500 rounded-full" />
        </button>

        {/* User Account / Sign In */}
        {user ? (
          <div className="relative group">
            <button
              onClick={() => navigate('/settings')}
              className="flex items-center gap-2.5 bg-white/5 hover:bg-white/10 border border-white/8 rounded-xl px-2.5 py-1.5 transition-all"
            >
              {user.photoURL ? (
                <img
                  src={user.photoURL}
                  alt={user.displayName || 'User'}
                  loading="lazy"
                  decoding="async"
                  onError={(event) => {
                    const target = event.currentTarget;
                    target.onerror = null;
                    target.src = 'https://images.unsplash.com/photo-1517849845537-4d257902454a?auto=format&fit=crop&w=200&q=80';
                  }}
                  className="w-7 h-7 rounded-full object-cover shadow ring-1 ring-violet-500/50"
                />
              ) : (
                <div className="w-7 h-7 rounded-full bg-gradient-to-br from-violet-600 to-pink-600 flex items-center justify-center text-xs font-bold text-white shadow">
                  {(user.displayName || user.email || 'U')[0].toUpperCase()}
                </div>
              )}
              <span className="text-xs text-white font-medium max-w-[100px] truncate hidden sm:inline">
                {user.displayName || user.username}
              </span>
            </button>
          </div>
        ) : (
          <button
            onClick={() => openAuthModal('login')}
            className="flex items-center gap-2 bg-violet-600 hover:bg-violet-500 text-white text-xs font-semibold px-4 py-2 rounded-xl shadow-lg shadow-violet-600/30 transition-all"
          >
            <LogIn size={15} />
            <span>Sign In</span>
          </button>
        )}
      </div>
    </header>
  );
}
