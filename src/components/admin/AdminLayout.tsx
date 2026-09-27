import { useState } from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import {
  LayoutDashboard, Music, Mic2, Disc, Users, UploadCloud,
  ChevronLeft, ArrowLeft, Shield, Sparkles, LogOut,
  Bell, ExternalLink, Menu, X
} from 'lucide-react';
import { useAdminStore } from '@/store/adminStore';
import { useAuthStore } from '@/store/authStore';
import type { AdminTab } from '@/types/admin';

interface AdminLayoutProps {
  children: React.ReactNode;
}

export function AdminLayout({ children }: AdminLayoutProps) {
  const { activeTab, setActiveTab } = useAdminStore();
  const { user } = useAuthStore();

  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  const navItems: { tab: AdminTab; label: string; icon: React.ComponentType<{ size?: number; className?: string }> }[] = [
    { tab: 'overview', label: 'Overview', icon: LayoutDashboard },
    { tab: 'songs', label: 'Songs', icon: Music },
    { tab: 'artists', label: 'Artists', icon: Mic2 },
    { tab: 'albums', label: 'Albums', icon: Disc },
    { tab: 'users', label: 'Users', icon: Users },
  ];

  return (
    <div className="h-screen overflow-hidden bg-[var(--color-bg-primary)] text-[var(--color-text-primary)] flex flex-col md:flex-row">
      {/* ── Desktop Admin Sidebar ───────────────────────────────────────────── */}
      <aside className="hidden md:flex flex-col w-64 bg-[var(--color-bg-card)] border-r border-[var(--color-border)] p-5 flex-shrink-0 justify-between overflow-y-auto">
        <div className="space-y-6">
          {/* Logo & Platform Tag */}
          <div>
            <div className="flex items-center gap-2.5">
              <div className="w-9 h-9 rounded-2xl bg-gradient-to-tr from-violet-600 to-pink-500 flex items-center justify-center text-white shadow-lg shadow-violet-600/30">
                <Shield size={18} />
              </div>
              <div>
                <span className="font-display font-extrabold text-base tracking-tight text-[var(--color-text-primary)]">
                  MR music
                </span>
                <span className="text-[10px] uppercase font-bold text-violet-400 block tracking-widest">
                  Admin Console
                </span>
              </div>
            </div>

            <div className="mt-4 px-3 py-1.5 rounded-xl bg-[var(--color-bg-overlay)] border border-[var(--color-border)] flex items-center justify-between text-[11px]">
              <span className="text-[var(--color-text-secondary)]">Environment</span>
              <span className="flex items-center gap-1.5 text-emerald-400 font-semibold">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                Live Cloud
              </span>
            </div>
          </div>

          {/* Navigation Links */}
          <nav className="space-y-1">
            {navItems.map((item) => {
              const Icon = item.icon;
              const isActive = activeTab === item.tab;

              return (
                <button
                  key={item.tab}
                  onClick={() => setActiveTab(item.tab)}
                  className={`w-full flex items-center gap-3 px-3.5 py-2.5 rounded-2xl text-xs font-semibold transition-all text-left ${
                    isActive
                      ? 'bg-violet-600 text-white shadow-lg shadow-violet-600/30'
                      : 'text-[var(--color-text-secondary)] hover:text-[var(--color-text-primary)] hover:bg-[var(--color-bg-overlay)]'
                  }`}
                >
                  <Icon size={16} className={isActive ? 'text-white' : 'text-[var(--color-text-secondary)]'} />
                  <span>{item.label}</span>
                </button>
              );
            })}
          </nav>
        </div>

        {/* Bottom Sidebar: Return to Player & Admin Profile */}
        <div className="space-y-3 pt-4 border-t border-white/5">
          <Link
            to="/"
            onClick={() => sessionStorage.removeItem('melodix_admin_authed')}
            className="flex items-center justify-between p-2.5 rounded-2xl bg-[var(--color-bg-overlay)] hover:bg-[var(--color-bg-secondary)] text-[var(--color-text-secondary)] hover:text-[var(--color-text-primary)] border border-[var(--color-border)] text-xs font-semibold transition-all group"
          >
            <span className="flex items-center gap-2">
              <ArrowLeft size={14} className="group-hover:-translate-x-0.5 transition-transform" />
              Music Player
            </span>
            <ExternalLink size={12} className="text-[var(--color-text-muted)]" />
          </Link>

          <div className="flex items-center gap-3 p-2 rounded-2xl bg-[var(--color-bg-overlay)] border border-[var(--color-border)]">
            <div className="w-8 h-8 rounded-xl overflow-hidden bg-violet-600/30 flex items-center justify-center font-bold text-xs text-violet-300">
              {user?.displayName ? user.displayName.charAt(0) : 'A'}
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-xs font-semibold text-[var(--color-text-primary)] truncate">
                {user?.displayName || 'Administrator'}
              </p>
              <p className="text-[10px] text-[var(--color-text-secondary)] truncate">
                {user?.email || 'admin@melodix.fm'}
              </p>
            </div>
          </div>
        </div>
      </aside>

      {/* ── Mobile Admin Header & Drawer ────────────────────────────────────── */}
      <div className="md:hidden flex items-center justify-between p-4 bg-[var(--color-bg-card)] border-b border-[var(--color-border)]">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-xl bg-violet-600 flex items-center justify-center text-white">
            <Shield size={16} />
          </div>
          <span className="font-bold text-sm text-[var(--color-text-primary)]">MR music Admin</span>
        </div>

        <div className="flex items-center gap-2">
          <Link to="/" className="p-2 rounded-xl bg-[var(--color-bg-overlay)] text-[var(--color-text-secondary)] hover:text-[var(--color-text-primary)] text-xs">
            <ArrowLeft size={16} />
          </Link>
          <button
            onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
            className="p-2 rounded-xl bg-[var(--color-bg-overlay)] text-[var(--color-text-primary)]"
          >
            {isMobileMenuOpen ? <X size={18} /> : <Menu size={18} />}
          </button>
        </div>
      </div>

      {isMobileMenuOpen && (
        <div className="md:hidden bg-[var(--color-bg-card)] border-b border-[var(--color-border)] p-4 space-y-1">
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = activeTab === item.tab;
            return (
              <button
                key={item.tab}
                onClick={() => {
                  setActiveTab(item.tab);
                  setIsMobileMenuOpen(false);
                }}
                className={`w-full flex items-center gap-3 px-3 py-2 rounded-xl text-xs font-semibold ${
                  isActive ? 'bg-violet-600 text-white' : 'text-[var(--color-text-secondary)] hover:text-[var(--color-text-primary)]'
                }`}
              >
                <Icon size={16} />
                <span>{item.label}</span>
              </button>
            );
          })}
        </div>
      )}

      {/* ── Main Admin Content Surface ──────────────────────────────────────── */}
      <main className="flex-1 flex flex-col min-w-0 overflow-y-auto">
        {/* Top Navbar */}
        <header className="h-16 px-6 border-b border-[var(--color-border)] flex items-center justify-between bg-[var(--color-bg-primary)]/80 backdrop-blur-md sticky top-0 z-30">
          <div className="flex items-center gap-3">
            <span className="text-xs font-semibold uppercase tracking-wider text-[var(--color-text-secondary)]">
              Admin /
            </span>
            <h1 className="text-sm font-bold text-[var(--color-text-primary)] capitalize">
              {activeTab} Management
            </h1>
          </div>

          <div className="flex items-center gap-3">
            <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-[var(--color-bg-overlay)] border border-[var(--color-border)] text-xs text-[var(--color-text-secondary)]">
              <span className="w-2 h-2 rounded-full bg-emerald-400" />
              <span>Catalog Synced</span>
            </div>

            <button
              type="button"
              onClick={() => {
                sessionStorage.removeItem('melodix_admin_authed');
                window.location.href = '/';
              }}
              className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl bg-violet-600 hover:bg-violet-500 text-white text-xs font-semibold shadow transition-all"
            >
              <span>Exit Admin</span>
            </button>
          </div>
        </header>

        {/* Content Body */}
        <div className="p-6 md:p-8 max-w-7xl w-full mx-auto space-y-8">
          {children}
        </div>
      </main>
    </div>
  );
}
