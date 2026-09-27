import { Suspense, lazy, useEffect, type ReactNode, Component } from 'react';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { useSettingsStore } from '@/store/settingsStore';
import { useAdminStore } from '@/store/adminStore';
import { AppLayout } from '@/components/layout/AppLayout';
import { ProtectedRoute } from '@/components/auth/ProtectedRoute';
import { AdminGate } from '@/components/admin/AdminGate';
import { useUIStore } from '@/store/uiStore';

const Home = lazy(() => import('@/pages/Home'));
const Explore = lazy(() => import('@/pages/Explore'));
const Search = lazy(() => import('@/pages/Search'));
const Library = lazy(() => import('@/pages/Library'));
const Liked = lazy(() => import('@/pages/Liked'));
const RecentlyPlayed = lazy(() => import('@/pages/RecentlyPlayed'));
const Playlists = lazy(() => import('@/pages/Playlists'));
const Artists = lazy(() => import('@/pages/Artists'));
const Albums = lazy(() => import('@/pages/Albums'));
const Settings = lazy(() => import('@/pages/Settings'));
const Downloads = lazy(() => import('@/pages/Downloads'));
const ArtistDetail = lazy(() => import('@/pages/ArtistDetail'));
const AlbumDetail = lazy(() => import('@/pages/AlbumDetail'));
const PlaylistDetail = lazy(() => import('@/pages/PlaylistDetail'));
const Stats = lazy(() => import('@/pages/Stats'));
const Admin = lazy(() => import('@/pages/Admin'));
const NotFound = lazy(() => import('@/pages/NotFound'));

function AppLoadingFallback() {
  return (
    <div className="flex h-screen w-screen items-center justify-center bg-[#080810] text-white">
      <div className="flex flex-col items-center gap-3">
        <div className="h-10 w-10 rounded-full border-2 border-violet-500/30 border-t-violet-400 animate-spin" />
        <p className="text-sm text-white/70">Loading MR music…</p>
      </div>
    </div>
  );
}

class ErrorBoundary extends Component<{ children: ReactNode }, { hasError: boolean }> {
  constructor(props: { children: ReactNode }) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError() {
    return { hasError: true };
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="flex h-screen w-screen items-center justify-center bg-[#080810] px-6 text-center text-white">
          <div className="max-w-md space-y-4 rounded-3xl border border-white/10 bg-white/5 p-8 shadow-2xl">
            <p className="text-sm uppercase tracking-[0.25em] text-violet-300">Unexpected Error</p>
            <h1 className="text-3xl font-bold">Something went wrong</h1>
            <p className="text-sm text-white/60">
              The app hit an unexpected runtime issue. Please refresh and try again.
            </p>
            <button
              type="button"
              onClick={() => window.location.reload()}
              className="rounded-xl bg-violet-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-violet-500"
            >
              Refresh the app
            </button>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

export default function App() {
  const applyTheme = useSettingsStore((s) => s.applyTheme);
  const hydrateCatalog = useAdminStore((s) => s.hydrateCatalog);
  const hydrateUsers = useAdminStore((s) => s.hydrateUsers);

  useEffect(() => {
    applyTheme();
    void hydrateCatalog();
    void hydrateUsers();

    const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
    const listener = () => applyTheme();
    mediaQuery.addEventListener('change', listener);
    return () => mediaQuery.removeEventListener('change', listener);
  }, [applyTheme, hydrateCatalog]);

  return (
    <ErrorBoundary>
      <BrowserRouter>
        <Suspense fallback={<AppLoadingFallback />}>
          <Routes>
            <Route path="/admin" element={<AdminGate><Admin /></AdminGate>} />
            <Route element={<AppLayout />}>
              <Route path="/" element={<Home />} />
              <Route path="/explore" element={<Explore />} />
              <Route path="/search" element={<Search />} />
              <Route path="/library" element={<Library />} />
              <Route
                path="/liked"
                element={
                  <ProtectedRoute title="Your Liked Anthems" description="Sign in to save, synchronize, and access your favorite tracks across all your devices.">
                    <Liked />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/recently-played"
                element={
                  <ProtectedRoute title="Your Listening History" description="Sign in to track your personalized listening history with real-time cloud synchronization.">
                    <RecentlyPlayed />
                  </ProtectedRoute>
                }
              />
              <Route path="/playlists" element={<Playlists />} />
              <Route path="/playlists/:id" element={<PlaylistDetail />} />
              <Route path="/artists" element={<Artists />} />
              <Route path="/artists/:id" element={<ArtistDetail />} />
              <Route path="/albums" element={<Albums />} />
              <Route path="/albums/:id" element={<AlbumDetail />} />
              <Route path="/downloads" element={<Downloads />} />
              <Route path="/stats" element={<Stats />} />
              <Route path="/settings" element={<Settings />} />
              <Route path="*" element={<NotFound />} />
            </Route>
          </Routes>
        </Suspense>
      </BrowserRouter>
    </ErrorBoundary>
  );
}
