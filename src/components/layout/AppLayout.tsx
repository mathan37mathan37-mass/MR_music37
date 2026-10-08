import { useEffect } from 'react';
import { Outlet } from 'react-router-dom';
import { Sidebar } from './Sidebar';
import { Header } from './Header';
import { MusicPlayer } from './MusicPlayer';
import { MiniPlayer } from './MiniPlayer';
import { MobileNavigation } from './MobileNavigation';
import { QueueDrawer } from './QueueDrawer';
import { LyricsDrawer } from './LyricsDrawer';
import { FullscreenPlayer } from './FullscreenPlayer';
import { KeyboardShortcuts } from './KeyboardShortcuts';
import { ToastContainer } from '@/components/ui/Toast';
import { AuthModal } from '@/components/auth/AuthModal';
import { InstallPrompt } from '@/components/pwa/InstallPrompt';
import { OfflineIndicator } from '@/components/common/OfflineIndicator';
import { useAuthStore } from '@/store/authStore';
import { useAdminStore } from '@/store/adminStore';
import { usePlayerStore } from '@/store/playerStore';
import { Ban } from 'lucide-react';

export function AppLayout() {
  const currentUser = useAuthStore((s) => s.user);
  const adminUsers = useAdminStore((s) => s.users);
  const logout = useAuthStore((s) => s.logout);
  const pause = usePlayerStore((s) => s.pause);

  // Check if current user is blocked by admin (by status, id, email, or username)
  const isBlocked = currentUser
    ? (currentUser.status === 'blocked' ||
       adminUsers.some((u) => {
         if (u.status !== 'blocked') return false;
         if (u.id === currentUser.uid) return true;
         if (u.email && currentUser.email && u.email.toLowerCase() === currentUser.email.toLowerCase()) return true;
         if (u.username && currentUser.username && u.username.toLowerCase() === currentUser.username.toLowerCase()) return true;
         return false;
       }))
    : false;

  useEffect(() => {
    if (isBlocked) {
      pause();
    }
  }, [isBlocked, pause]);

  if (isBlocked) {
    return (
      <div className="flex h-screen w-screen items-center justify-center bg-[#080810] px-6">
        <div className="flex flex-col items-center gap-5 text-center max-w-sm">
          <div className="w-20 h-20 rounded-3xl bg-rose-500/10 border border-rose-500/20 flex items-center justify-center">
            <Ban size={36} className="text-rose-400" />
          </div>
          <div className="space-y-2">
            <h1 className="text-2xl font-bold text-white">Account Suspended</h1>
            <p className="text-sm text-white/60 leading-relaxed">
              Your account has been suspended by an administrator. You cannot access the platform at this time.
              Please contact support if you believe this is a mistake.
            </p>
          </div>
          <button
            type="button"
            onClick={() => logout()}
            className="mt-2 px-6 py-2.5 rounded-xl bg-rose-600 hover:bg-rose-500 text-white text-sm font-semibold transition-colors"
          >
            Sign Out
          </button>
        </div>
        <ToastContainer />
      </div>
    );
  }

  return (
    <div className="flex h-screen w-screen overflow-hidden bg-[var(--color-bg-primary)] text-[var(--color-text-primary)]">
      {/* Desktop Sidebar */}
      <Sidebar />

      {/* Main column */}
      <div className="flex flex-col flex-1 min-w-0 overflow-hidden">
        {/* Desktop Header */}
        <Header />

        {/* Page content */}
        <main className="flex-1 overflow-y-auto overflow-x-hidden no-scrollbar">
          <div className="min-h-full pb-20 md:pb-0">
            <Outlet />
          </div>
        </main>

        {/* Desktop Player */}
        <MusicPlayer />
      </div>

      {/* Mobile overlays */}
      <MiniPlayer />
      <MobileNavigation />

      {/* Drawers and Overlays */}
      <QueueDrawer />
      <LyricsDrawer />
      <FullscreenPlayer />
      <KeyboardShortcuts />

      {/* Authentication Modal */}
      <AuthModal />

      {/* PWA Install Prompt */}
      <InstallPrompt />

      {/* Offline Status Indicator */}
      <OfflineIndicator />

      {/* Toast notifications */}
      <ToastContainer />
    </div>
  );
}
