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

export function AppLayout() {
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

      {/* Toast notifications */}
      <ToastContainer />
    </div>
  );
}
