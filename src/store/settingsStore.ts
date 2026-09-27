import { create } from 'zustand';
import { persist } from 'zustand/middleware';

export type Theme = 'dark' | 'light' | 'system';
export type AccentColor = 'violet' | 'pink' | 'cyan' | 'green' | 'orange';
export type AudioQuality = 'low' | 'normal' | 'high' | 'lossless';

export interface SettingsState {
  // Appearance
  theme: Theme;
  accentColor: AccentColor;
  compactMode: boolean;

  // Playback
  audioQuality: AudioQuality;
  autoplay: boolean;
  crossfade: boolean;
  crossfadeDuration: number;
  gaplessPlayback: boolean;
  normalizeVolume: boolean;

  // Notifications
  notifications: boolean;
  notifyNewReleases: boolean;
  notifyRecommendations: boolean;
  notifyPlaylistUpdates: boolean;

  // Privacy
  publicProfile: boolean;
  publicPlaylists: boolean;
  shareListeningActivity: boolean;
  showRecentlyPlayed: boolean;

  // Actions
  setTheme: (theme: Theme) => void;
  setAccentColor: (color: AccentColor) => void;
  setSetting: <K extends keyof Omit<SettingsState,
    'setTheme' | 'setAccentColor' | 'setSetting' | 'applyTheme'>
  >(key: K, value: SettingsState[K]) => void;
  applyTheme: () => void;
}

export const ACCENT_COLORS: Record<AccentColor, { hex: string; label: string; className: string }> = {
  violet: { hex: '#7c3aed', label: 'Violet', className: 'accent-violet' },
  pink:   { hex: '#ec4899', label: 'Pink',   className: 'accent-pink'   },
  cyan:   { hex: '#06b6d4', label: 'Cyan',   className: 'accent-cyan'   },
  green:  { hex: '#22c55e', label: 'Green',  className: 'accent-green'  },
  orange: { hex: '#f97316', label: 'Orange', className: 'accent-orange' },
};

const syncThemeWithDom = (theme: Theme, accentColor: AccentColor, compactMode: boolean) => {
  if (typeof document === 'undefined' || typeof window === 'undefined') return;

  const root = document.documentElement;
  const prefersDark = typeof window.matchMedia === 'function'
    ? window.matchMedia('(prefers-color-scheme: dark)').matches
    : true;
  const isDark = theme === 'dark' || (theme === 'system' && prefersDark);

  root.setAttribute('data-theme', isDark ? 'dark' : 'light');
  root.setAttribute('data-accent', accentColor || 'violet');
  root.setAttribute('data-compact', compactMode ? 'true' : 'false');
  root.style.colorScheme = isDark ? 'dark' : 'light';
};

export const useSettingsStore = create<SettingsState>()(
  persist(
    (set, get) => ({
      // Appearance
      theme: 'dark',
      accentColor: 'violet',
      compactMode: false,

      // Playback
      audioQuality: 'high',
      autoplay: true,
      crossfade: false,
      crossfadeDuration: 4,
      gaplessPlayback: true,
      normalizeVolume: true,

      // Notifications
      notifications: true,
      notifyNewReleases: true,
      notifyRecommendations: true,
      notifyPlaylistUpdates: false,

      // Privacy
      publicProfile: true,
      publicPlaylists: true,
      shareListeningActivity: false,
      showRecentlyPlayed: true,

      setTheme: (theme) => {
        set({ theme });
        get().applyTheme();
      },

      setAccentColor: (accentColor) => {
        set({ accentColor });
        get().applyTheme();
      },

      setSetting: (key, value) => {
        set({ [key]: value } as any);
        if (key === 'compactMode') {
          get().applyTheme();
        }
      },

      applyTheme: () => {
        const { theme, accentColor, compactMode } = get();
        syncThemeWithDom(theme, accentColor, compactMode);
      },
    }),
    {
      name: 'melodix-settings',
      onRehydrateStorage: () => (state) => {
        if (!state) return;
        state.applyTheme();
      },
      partialize: (s) => ({
        theme: s.theme,
        accentColor: s.accentColor,
        compactMode: s.compactMode,
        audioQuality: s.audioQuality,
        autoplay: s.autoplay,
        crossfade: s.crossfade,
        crossfadeDuration: s.crossfadeDuration,
        gaplessPlayback: s.gaplessPlayback,
        normalizeVolume: s.normalizeVolume,
        notifications: s.notifications,
        notifyNewReleases: s.notifyNewReleases,
        notifyRecommendations: s.notifyRecommendations,
        notifyPlaylistUpdates: s.notifyPlaylistUpdates,
        publicProfile: s.publicProfile,
        publicPlaylists: s.publicPlaylists,
        shareListeningActivity: s.shareListeningActivity,
        showRecentlyPlayed: s.showRecentlyPlayed,
      }),
    }
  )
);
